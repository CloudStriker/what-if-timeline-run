import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { parseFirstJson } from "./json.ts";

// shortcut: shells out to the local `agy` CLI (local use only), swap for an API client before deploying.
const MODEL = "gemini-3.8-flash-high";
const TIMEOUT_SECONDS = 600; // the model's thinking time varies from 20s to over 5 minutes

// Message that is safe to show the user; anything else becomes a generic error.
export class PublicError extends Error {}

export async function runAgy(prompt: string, schema: object, onStatus: (text: string) => void, signal: AbortSignal): Promise<unknown> {
  // empty scratch dir per call so the sandboxed agent has nothing to read
  const dir = await mkdtemp(join(tmpdir(), "agy-job-"));
  try {
    const child = spawn(
      "agy",
      [
        "--mode", "plan",
        "--sandbox",
        "--print-timeout", `${TIMEOUT_SECONDS}s`,
        "--model", MODEL,
        "--output-format", "stream-json",
        "--json-schema", JSON.stringify(schema),
        "--settings", JSON.stringify({ permissions: { allow: ["command(pwd && ls -la)", "command(pwd)", "command(ls)", "command(ls -la)"] } }),
        "-p", `${prompt}\nReply with only the JSON object that matches the schema, with no markdown or other text.`,
      ],
      { cwd: dir, stdio: ["ignore", "pipe", "pipe"], signal, timeout: (TIMEOUT_SECONDS + 10) * 1000 },
    );

    let result: { status?: string; response?: string; error?: string } | undefined;
    let finished: unknown; // structured output the agent passes to its `finish` tool
    child.stderr.resume(); // errors are also reported in the result event
    createInterface({ input: child.stdout }).on("line", (line) => {
      let e;
      try {
        e = JSON.parse(line);
      } catch {
        return; // non-JSON noise
      }
      const step = e.step_update;
      if (e.event === "init") onStatus("Agent started");
      else if (e.event === "result") result = e.result;
      else if (step?.step_type === "tool" && step.tool_name === "finish") finished ??= step.tool_info?.parameters;
      else if (step?.step_type === "tool" && step.state === "ACTIVE") {
        const query = step.tool_info?.parameters?.query;
        onStatus(typeof query === "string" ? `Searching: ${query.slice(0, 100)}` : `Using tool: ${step.tool_name}`);
      } else if (step?.step_type === "agent_response" && step.state === "DONE") onStatus("Drafting response");
    });

    await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("close", resolve);
    });
    if (result?.status !== "SUCCESS") {
      if (/timeout/i.test(result?.error ?? "")) {
        throw new PublicError(`The agent did not finish within ${TIMEOUT_SECONDS / 60} minutes. No energy was spent, please try again.`);
      }
      throw new Error(`agy failed: ${result?.error ?? "no result"}`);
    }
    // After a web search the plain-text response can be markdown, so prefer the `finish` payload.
    return finished ?? parseFirstJson(result.response ?? "");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// shortcut: one job at a time per server process to protect CLI quota, use a real queue/rate limit when multi-user.
let busy = false;

// Runs `work` and streams its progress as NDJSON; the result is spread into a final {type:"result"} event.
export function streamJob<R extends object>(work: (onStatus: (text: string) => void, signal: AbortSignal) => Promise<R>): Response {
  if (busy) return Response.json({ error: "Another job is running. Try again shortly." }, { status: 429 });
  busy = true;

  const abort = new AbortController();
  let closed = false;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: object) => {
        if (!closed) controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
      };
      try {
        const result = await work((text) => send({ type: "status", text }), abort.signal);
        send({ type: "result", ...result });
      } catch (err) {
        if (!closed) console.error("agy job failed:", err);
        send({ type: "error", error: err instanceof PublicError ? err.message : "Could not complete the request. Please try again." });
      } finally {
        busy = false;
        if (!closed) controller.close();
      }
    },
    // client cancelled or disconnected: stop the agent process
    cancel() {
      closed = true;
      abort.abort();
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
}
