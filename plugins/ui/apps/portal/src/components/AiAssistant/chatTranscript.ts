import type { LanguageMappings } from "../../contexts";
import { i18nKeys } from "../../contexts/app-context/states";
import { downloadFile } from "../../utils/downloadResource";
import { AssistantRichContent, ChatMessage, ConceptSelection, ToolActivity } from "./types";

type GetText = (phraseKey: keyof LanguageMappings, params?: string[]) => string;

// Markdown, because that is what the conversation already is: the model answers in it,
// the drawer renders it, and it stays readable as plain text if nothing renders it at all.
const FILE_TYPE = "text/markdown;charset=utf-8";

const pad = (value: number): string => String(value).padStart(2, "0");

const formatValue = (value: unknown): string => {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2) ?? "";
  } catch {
    // Tool payloads cross the wire as JSON so a cycle should not reach here, but a
    // throw in a download handler would look like the menu item doing nothing.
    return String(value);
  }
};

// Unlike the collapsed tool row in the conversation, nothing here is truncated — a
// record of the run that silently drops the tail of a concept search is not a record.
const codeBlock = (value: unknown): string => {
  const text = formatValue(value);
  // A payload that itself contains a fence would close ours early; CommonMark lets a
  // longer fence hold shorter ones.
  const longestFence = Math.max(0, ...[...text.matchAll(/`{3,}/g)].map((match) => match[0].length));
  const fence = "`".repeat(Math.max(3, longestFence + 1));
  return `${fence}${typeof value === "string" ? "" : "json"}\n${text}\n${fence}`;
};

const checkbox = (checked: boolean): string => `- [${checked ? "x" : " "}]`;

const toolBlocks = (tool: ToolActivity, getText: GetText): string[] => {
  const verbKey =
    tool.state === "running"
      ? i18nKeys.AI_ASSISTANT__TOOL_RUNNING
      : tool.state === "error"
      ? i18nKeys.AI_ASSISTANT__TOOL_FAILED
      : i18nKeys.AI_ASSISTANT__TOOL_RAN;
  const blocks = [`**${getText(verbKey)} \`${tool.name}\`**`];

  if (tool.input != null) {
    blocks.push(`${getText(i18nKeys.AI_ASSISTANT__TOOL_REQUEST)}:`, codeBlock(tool.input));
  }
  const failed = tool.state === "error";
  const output = failed ? tool.errorText : tool.output;
  if (output != null) {
    blocks.push(
      `${getText(failed ? i18nKeys.AI_ASSISTANT__TOOL_ERROR : i18nKeys.AI_ASSISTANT__TOOL_RESPONSE)}:`,
      codeBlock(output)
    );
  }
  return blocks;
};

// Which concepts were ticked is the cohort's clinical meaning, so the transcript keeps
// the excluded rows too — an unticked concept is part of what was decided.
const conceptSelectionBlocks = (selection: ConceptSelection, getText: GetText): string[] => {
  const selected = new Set(selection.selectedIds);
  const rows = selection.concepts.map((concept) => {
    const code = [concept.vocabularyId, concept.conceptCode ?? concept.conceptId].filter(Boolean).join(" ");
    return `${checkbox(selected.has(concept.conceptId))} ${concept.conceptName}${code ? ` — ${code}` : ""}`;
  });

  return [
    selection.intro || getText(i18nKeys.AI_ASSISTANT__CONCEPTS_INTRO),
    `**${selection.name}**`,
    rows.join("\n"),
    getText(
      selection.resolved ? i18nKeys.AI_ASSISTANT__CONCEPTS_INCLUDED : i18nKeys.AI_ASSISTANT__CONCEPTS_SELECTED_COUNT,
      [String(selection.selectedIds.length), String(selection.concepts.length)]
    ),
  ];
};

// Mirrors MessageBubble's rich layout: intro -> bold filter label + bullets -> question
// -> option cards -> footer.
const richBlocks = (rich: AssistantRichContent): string[] => {
  const blocks: string[] = [];
  if (rich.intro) blocks.push(rich.intro);
  if (rich.filterLabel) blocks.push(`**${rich.filterLabel}**`);
  if (rich.filterItems?.length) blocks.push(rich.filterItems.map((item) => `- ${item}`).join("\n"));
  if (rich.question) blocks.push(rich.question);
  if (rich.options?.length) {
    blocks.push(
      rich.options
        .map((option) => {
          const index = option.index == null ? "" : `${option.index}. `;
          const subtitle = option.subtitle ? ` — ${option.subtitle}` : "";
          return `${checkbox(Boolean(option.selected))} ${index}${option.title}${subtitle}`;
        })
        .join("\n")
    );
  }
  if (rich.footer) blocks.push(rich.footer);
  return blocks;
};

// Tools first, as they appear above the reply they produced in the conversation.
const messageBlocks = (message: ChatMessage, getText: GetText): string[] => [
  `## ${getText(message.role === "user" ? i18nKeys.AI_ASSISTANT__TRANSCRIPT_YOU : i18nKeys.AI_ASSISTANT__TITLE)}`,
  ...(message.tools ?? []).flatMap((tool) => toolBlocks(tool, getText)),
  ...(message.text ? [message.text] : []),
  ...(message.rich ? richBlocks(message.rich) : []),
  ...(message.conceptSelection ? conceptSelectionBlocks(message.conceptSelection, getText) : []),
];

/** The conversation as a markdown document, including the tool calls it ran. */
export const buildChatTranscript = (messages: ChatMessage[], getText: GetText, exportedAt: Date): string => {
  const blocks = [
    `# ${getText(i18nKeys.AI_ASSISTANT__TRANSCRIPT_TITLE)}`,
    `_${getText(i18nKeys.AI_ASSISTANT__TRANSCRIPT_EXPORTED, [exportedAt.toLocaleString()])}_`,
    ...messages.flatMap((message) => messageBlocks(message, getText)),
  ];
  return `${blocks.join("\n\n")}\n`;
};

export const transcriptFileName = (exportedAt: Date): string =>
  `d2e-ai-chat-${exportedAt.getFullYear()}-${pad(exportedAt.getMonth() + 1)}-${pad(exportedAt.getDate())}-${pad(
    exportedAt.getHours()
  )}${pad(exportedAt.getMinutes())}.md`;

/**
 * Saves the conversation to the user's machine. The drawer holds the transcript in
 * memory only — a refresh or "New conversation" takes it — so this is the only way to
 * keep the reasoning behind a cohort that was built here.
 */
export const downloadChatHistory = (messages: ChatMessage[], getText: GetText, exportedAt = new Date()): void => {
  downloadFile({
    data: buildChatTranscript(messages, getText, exportedAt),
    fileName: transcriptFileName(exportedAt),
    fileType: FILE_TYPE,
  });
};
