import { ChatMessage, QuickReply } from "./types";

// UI-only canned data. Once the assistant is wired to the backend these helpers are
// replaced by real streamed responses; the drawer components stay the same.

let counter = 0;
export const nextId = (prefix = "msg"): string => {
  counter += 1;
  return `${prefix}-${counter}`;
};

// The rich "build a cohort" reply shown in the Figma conversation mock
// (node 1475:130902). Returned for any user message while there is no backend.
export const buildAssistantReply = (): ChatMessage => ({
  id: nextId("assistant"),
  role: "assistant",
  rich: {
    intro: "Got it. I found a few things to clarify before building your cohort.",
    filterLabel: "This is the basic filter:",
    filterItems: ["Gender: Female", "Age: 60 and above"],
    question: 'For "Type 2 diabetes", I found 2 similar concept sets. Which one did you mean?',
    options: [
      {
        id: "opt-1",
        index: 1,
        title: "Type 2 diabetes mellitus (SNOMED 44054006)",
        subtitle: "Most commonly used in OMOP datasets",
      },
      {
        id: "opt-2",
        index: 2,
        title: "Diabetes mellitus type 2 without complications (SNOMED 359642000)",
        subtitle: "More specific — excludes patients with diabetic complications",
        selected: true,
      },
      {
        id: "opt-3",
        index: 3,
        title: "Include both concept set",
      },
    ],
    footer: "Reply with 1 or 2, or let me know if neither fits.",
  },
});

// Quick-reply chips shown above the composer while the assistant is awaiting a choice.
export const buildQuickReplies = (): QuickReply[] => [
  { id: "qr-1", label: "1. Type 2 diabetes mellitus" },
  { id: "qr-2", label: "2. T2DM without complications", selected: true },
  { id: "qr-3", label: "3. Both" },
  { id: "qr-4", label: "Neither fits", dismiss: true },
];
