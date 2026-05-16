import { Response } from "express";

export class StreamPump {
  constructor(private res: Response) {}

  async pump(stream: any) {
    for await (const [token, metadata] of stream) {
      // 1. Handle Text Tokens
      if (metadata.langgraph_node === "model_request") {
        const text = token.contentBlocks?.[0]?.text;
        if (text) {
          this.writeEvent("token", { delta: text });
        }

        // Handle tool calls in the message chunk
        const toolCalls = token.tool_calls;
        if (toolCalls && toolCalls.length > 0) {
          for (const tc of toolCalls) {
            this.writeEvent("tool_call_start", {
              id: tc.id,
              name: tc.name,
              args: tc.args,
            });
          }
        }
      }

      // 2. Handle Tool Outputs (for tool status and artifacts)
      if (metadata.langgraph_node === "tools") {
        // token here is the ToolMessage
        this.writeEvent("tool_call_end", {
          id: token.tool_call_id,
          name: token.name,
          ok: !token.is_error,
          summary:
            typeof token.content === "string"
              ? token.content.substring(0, 100)
              : "Structured output",
        });

        // ARTIFACT EXTRACTION: Detect cohort creation
        if (token.name === "create_atlas_cohort_definition" && !token.is_error) {
          this.writeEvent("artifact", {
            kind: "atlas_cohort_created",
            payload: { raw: token.content },
          });
        }
      }
    }

    this.writeEvent("done", {});
    this.res.end();
  }

  private writeEvent(event: string, data: any) {
    this.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}
