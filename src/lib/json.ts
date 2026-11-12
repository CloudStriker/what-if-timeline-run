// Parses the first complete JSON object in `text`, ignoring anything around or after it
// (the model sometimes appends extra lines after a valid answer).
export function parseFirstJson(text: string): unknown {
  const start = text.indexOf("{");
  if (start === -1) throw new SyntaxError("no JSON object found");
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === "\\") i++; // skip the escaped character
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return JSON.parse(text.slice(start, i + 1));
  }
  throw new SyntaxError("unterminated JSON object");
}
