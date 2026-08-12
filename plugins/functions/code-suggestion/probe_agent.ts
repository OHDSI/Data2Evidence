// TEMPORARY probe — deleted after use.
//
// Exercises everything the /agent route does EXCEPT the gateway-protected MCP
// call: the real Azure model, the cohort system prompt, a client-side pa_* tool
// declared without an executor, and the UI message stream piped into a Node
// ServerResponse. Proves the response the drawer consumes and that a browser tool
// call actually reaches the wire.
import { jsonSchema, pipeUIMessageStreamToResponse, stepCountIs, streamText, tool, toUIMessageStream } from "ai";
import { getAgentModel } from "./src/agent/models.ts";
import { getCohortAgentPrompt } from "./src/agent/cohortAgentPrompt.ts";

const { model, error } = await getAgentModel(Deno.env.get("AI_MODEL"));
if (!model) throw new Error(`no model: ${error}`);

// The same shape paToolBridge publishes for pa_get_cohort_result.
const tools = {
  pa_get_cohort_result: tool({
    description:
      "Return the LIVE computed RESULT of the current cohort: matched patient count, total, " +
      "active chart type, and the binned chart data.",
    inputSchema: jsonSchema({ type: "object", properties: {} } as any),
    // No execute: must be forwarded to the browser.
  }),
};

const chunks: string[] = [];
const res: any = {
  writeHead: (status: number, headers: Record<string, string>) => {
    console.log(`writeHead ${status} content-type=${headers?.["content-type"] ?? headers?.["Content-Type"]}`);
    return res;
  },
  write: (chunk: string) => {
    chunks.push(typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk));
    return true;
  },
  end: () => {},
  on: () => res,
  once: () => res,
  emit: () => false,
  removeListener: () => res,
};

const result = streamText({
  model,
  system: getCohortAgentPrompt({
    datasetId: "probe-ds",
    paToolsAvailable: true,
    paToolNames: ["pa_get_cohort_result"],
  }),
  messages: [
    { role: "user", content: "How many patients are in the cohort currently open? Use your tools." },
  ],
  tools,
  stopWhen: stepCountIs(3),
  onError: ({ error: e }) => console.log("STREAM ERROR:", String(e).slice(0, 300)),
});

await pipeUIMessageStreamToResponse({
  response: res,
  stream: toUIMessageStream({ stream: result.stream, tools }),
});

const body = chunks.join("");
const events = body
  .split("\n")
  .filter((l) => l.startsWith("data: "))
  .map((l) => l.slice(6))
  .filter((l) => l && l !== "[DONE]")
  .map((l) => {
    try {
      return JSON.parse(l);
    } catch {
      return { type: "unparsed", raw: l };
    }
  });

console.log(`\nstream frames: ${events.length}`);
console.log("frame types:", [...new Set(events.map((e: any) => e.type))].join(", "));

const text = events
  .filter((e: any) => e.type === "text-delta")
  .map((e: any) => e.delta ?? e.text ?? "")
  .join("");
if (text.trim()) console.log("\nassistant text:", text.trim().slice(0, 300));

const toolFrames = events.filter((e: any) => typeof e.type === "string" && e.type.startsWith("tool-"));
console.log("\ntool frames:", JSON.stringify(toolFrames).slice(0, 500));
