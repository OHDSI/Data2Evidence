import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { createAgent } from "langchain";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getModels } from "../utils/utils";
import { env } from "../env";
import { getCohortPrompting } from "./prompts";
import {
  COHORT_EVAL_FIXTURES,
  type CohortEvalExpectation,
  type CohortEvalFixture,
} from "./cohort-eval.fixtures";

/**
 * Prompt eval for the cohort-builder system prompt (DATA-2305 T4).
 *
 * Runs the REAL agent (real model, real getCohortPrompting) against a STUB tool
 * that mirrors build_d2e_cohort_deeplink's name/description/schema and records
 * the arguments it is called with. The stub isolates what we are testing — the
 * prompt's age/gender extraction — from the mcp-server, analytics-svc, and the
 * deep-link builder (all covered elsewhere).
 *
 * Needs an API-backed AI_MODEL (OpenAI/Azure/Anthropic/etc.). When only the
 * 'local' fallback is available it cannot drive tool calls, so the eval is
 * skipped rather than failed.
 */

const TOOL_NAME = "build_d2e_cohort_deeplink";

// Mirror the real tool's surface — the model's tool-calling depends on it.
const stubSchema = z.object({
  ageMin: z.number().int().nonnegative().optional()
    .describe("Inclusive minimum age, e.g. 60 for 'over 60' use 60."),
  ageMax: z.number().int().nonnegative().optional()
    .describe("Inclusive maximum age."),
  gender: z.string().optional().describe("Patient gender: FEMALE or MALE."),
});

const TOOL_DESCRIPTION =
  "Build a Patient Analytics cohort builder deep link from an age range " +
  "and/or gender. Supports ONLY age (ageMin/ageMax) and gender (FEMALE or " +
  "MALE) for now. Returns a URL that opens the PA cohort builder with the " +
  "filter card pre-filled. Provide at least an age bound or a gender.";

interface CapturedCall {
  ageMin?: number;
  ageMax?: number;
  gender?: string;
}

export interface CohortEvalResult {
  fixture: CohortEvalFixture;
  calls: CapturedCall[];
  pass: boolean;
  reason: string;
}

/** Compare the agent's tool call against the fixture's expectation. */
function score(
  calls: CapturedCall[],
  expected: CohortEvalExpectation | null,
): { pass: boolean; reason: string } {
  if (expected === null) {
    return calls.length === 0
      ? { pass: true, reason: "no tool call, as expected" }
      : { pass: false, reason: `expected no call but got ${JSON.stringify(calls)}` };
  }

  if (calls.length === 0) {
    return { pass: false, reason: "expected a tool call but none was made" };
  }

  // If the agent called more than once, judge the last call.
  const call = calls[calls.length - 1];
  const gotGender = call.gender ? String(call.gender).toUpperCase() : undefined;
  const mismatches: string[] = [];
  if (call.ageMin !== expected.ageMin) mismatches.push(`ageMin ${call.ageMin} != ${expected.ageMin}`);
  if (call.ageMax !== expected.ageMax) mismatches.push(`ageMax ${call.ageMax} != ${expected.ageMax}`);
  if (gotGender !== expected.gender) mismatches.push(`gender ${gotGender} != ${expected.gender}`);

  return mismatches.length === 0
    ? { pass: true, reason: `matched ${JSON.stringify(expected)}` }
    : { pass: false, reason: mismatches.join("; ") };
}

/** Run one fixture through a fresh agent + stub tool, capturing the call args. */
async function runFixture(model: any, fixture: CohortEvalFixture): Promise<CohortEvalResult> {
  const calls: CapturedCall[] = [];
  const stub = tool(
    async (args: CapturedCall) => {
      calls.push(args);
      // Return a plausible link so the agent finishes its turn.
      return `Deep link created: /portal/researcher/cohort?query=stub`;
    },
    { name: TOOL_NAME, description: TOOL_DESCRIPTION, schema: stubSchema },
  );

  const agent = createAgent({ model, tools: [stub] });
  try {
    await agent.invoke({
      messages: [
        new SystemMessage(getCohortPrompting(fixture.input)),
        new HumanMessage(fixture.input),
      ],
    });
  } catch (error) {
    return {
      fixture,
      calls,
      pass: false,
      reason: `agent threw: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const { pass, reason } = score(calls, fixture.expected);
  return { fixture, calls, pass, reason };
}

/**
 * Run the full seed set. Returns one result per fixture. Caller decides how to
 * report / assert (the Deno.test below asserts 100%).
 */
export async function runCohortEval(model: any): Promise<CohortEvalResult[]> {
  const results: CohortEvalResult[] = [];
  for (const fixture of COHORT_EVAL_FIXTURES) {
    // Sequential on purpose: keeps the log readable and avoids hammering the
    // model provider's rate limit.
    results.push(await runFixture(model, fixture));
  }
  return results;
}

Deno.test("cohort prompt extracts age/gender on the seed set", async () => {
  const model = await getModels(env.AI_MODEL);
  if (typeof model === "string") {
    console.warn(
      `[cohort-eval] SKIPPED: no API-backed AI_MODEL configured (got '${model}'). ` +
        "Set AI_MODEL (e.g. anthropic:claude-...) + the provider key to run this eval.",
    );
    return;
  }

  const results = await runCohortEval(model);

  let passed = 0;
  for (const r of results) {
    const tag = r.pass ? "PASS" : "FAIL";
    console.log(`[cohort-eval] ${tag}  "${r.fixture.input}"  -> ${r.reason}`);
    if (r.pass) passed++;
  }
  const total = results.length;
  console.log(`[cohort-eval] score: ${passed}/${total}`);

  if (passed !== total) {
    const failed = results.filter((r) => !r.pass).map((r) => r.fixture.name);
    throw new Error(`cohort prompt eval failed ${total - passed}/${total}: ${failed.join(", ")}`);
  }
});
