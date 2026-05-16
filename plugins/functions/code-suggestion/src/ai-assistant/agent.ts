import { getModels } from "../utils/utils";
import { createStaticMcpTools } from "../mcp/staticTools";
import { createAgent } from "langchain";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { Session } from "./session-store";
import { getSystemPrompt } from "./prompts";
import { env } from "../env";

export class AgentService {
  async getStream(session: Session, userInput: string, token?: string) {
    const model = await getModels(env.AI_MODEL);
    if (!model) throw new Error("LLM Model not found");

    // Restrict to cohort-related tools for v1
    const tools = createStaticMcpTools(token, session.datasetId);
    const cohortTools = tools.filter(
      (t) =>
        t.name.includes("cohort") ||
        t.name.includes("phenotype") ||
        t.name.includes("validate") ||
        t.name.includes("before_cohort") ||
        t.name.includes("fetch_templates")
    );

    const agent = createAgent({
      model: model,
      tools: cohortTools,
    });

    const messages = [
      new SystemMessage(getSystemPrompt(session.datasetId, session.initialContext)),
      ...session.history,
      new HumanMessage(userInput),
    ];

    return await agent.stream({ messages }, { streamMode: "messages" });
  }
}
