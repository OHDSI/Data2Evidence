import type { ChatHistoryTurn } from "../type.ts";

const CHARS_PER_TOKEN = 4;
const MESSAGE_OVERHEAD_TOKENS = 4;

function estimateTokens(message: ChatHistoryTurn): number {
  return (
    Math.ceil(message.content.length / CHARS_PER_TOKEN) +
    MESSAGE_OVERHEAD_TOKENS
  );
}

/**
 * Keep cohort history within an approximate token budget while retaining the
 * latest messages verbatim. If compaction removes the latest assistant plan,
 * preserve it as a clearly labelled memory anchor.
 */
export function compactCohortHistory(
  history: ChatHistoryTurn[],
  maxTokens = 4_000,
): ChatHistoryTurn[] {
  const nonBlank = history.filter((message) => message.content?.trim());
  const totalTokens = nonBlank.reduce(
    (total, message) => total + estimateTokens(message),
    0,
  );
  if (totalTokens <= maxTokens) return nonBlank;

  const recent: ChatHistoryTurn[] = [];
  let usedTokens = 0;
  for (let i = nonBlank.length - 1; i >= 0; i--) {
    const messageTokens = estimateTokens(nonBlank[i]);
    if (recent.length > 0 && usedTokens + messageTokens > maxTokens) break;
    recent.unshift(nonBlank[i]);
    usedTokens += messageTokens;
  }

  const firstRecentIndex = nonBlank.length - recent.length;
  const latestOmittedPlan = nonBlank
    .slice(0, firstRecentIndex)
    .findLast((message) => message.role === "assistant");
  if (!latestOmittedPlan) return recent;

  const prefix = "Earlier cohort plan (preserve unless the user changed it):\n";
  const fullAnchor: ChatHistoryTurn = {
    role: "assistant",
    content: prefix + latestOmittedPlan.content,
  };
  const fullAnchorTokens = estimateTokens(fullAnchor);
  while (
    recent.length > 1 &&
    usedTokens + fullAnchorTokens > maxTokens
  ) {
    usedTokens -= estimateTokens(recent.shift()!);
  }
  if (usedTokens + fullAnchorTokens <= maxTokens) {
    return [fullAnchor, ...recent];
  }

  const availableTokens = maxTokens - usedTokens - MESSAGE_OVERHEAD_TOKENS;
  const availableChars = availableTokens * CHARS_PER_TOKEN - prefix.length;
  if (availableChars <= 0) return recent;

  const plan = latestOmittedPlan.content.slice(0, availableChars);
  return [{ role: "assistant", content: prefix + plan }, ...recent];
}
