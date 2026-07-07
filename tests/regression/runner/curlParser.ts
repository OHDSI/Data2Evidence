import type { Scenario } from "./harParser.js";
import { substituteConfig } from "./substituteConfig.js";

// Parses a single curl command string into a Scenario.
// Supports: -X / --request, -H / --header, -d / --data / --data-raw, and the URL.
export function parseCurl(name: string, curl: string): Scenario {
  const args = tokenize(substituteConfig(curl));

  let method = "GET";
  let url = "";
  const headers: Record<string, string> = {};
  let body: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-X" || arg === "--request") {
      method = args[++i];
    } else if (arg === "-H" || arg === "--header") {
      const raw = args[++i];
      const colon = raw.indexOf(":");
      if (colon !== -1) {
        headers[raw.slice(0, colon).trim()] = raw.slice(colon + 1).trim();
      }
    } else if (arg === "-d" || arg === "--data" || arg === "--data-raw") {
      body = args[++i];
      if (method === "GET") method = "POST";
    } else if (!arg.startsWith("-") && arg !== "curl") {
      url = arg;
    }
  }

  return { name, method, url, headers, body };
}

// Splits a shell command into tokens, respecting single and double quotes.
function tokenize(cmd: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i];
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if (ch === "\\" && inDouble) {
      current += cmd[++i] ?? "";
    } else if (ch === "\\" && !inSingle) {
      // Shell line-continuation: backslash followed by newline is whitespace
      if (cmd[i + 1] === "\n") {
        i++;
      } else {
        current += ch;
      }
    } else if ((ch === " " || ch === "\t" || ch === "\n") && !inSingle && !inDouble) {
      if (current) { tokens.push(current); current = ""; }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}
