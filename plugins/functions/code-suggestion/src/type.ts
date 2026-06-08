export interface IUICodeSnippet {
  code: string;
  model: string;
}
export interface ChatHistoryTurn {
  role: "user" | "assistant";
  content: string;
}

export interface IChatSnippet {
  context: string;
  userInput: string;
  model: string;
  /** Prior conversation turns, oldest-first. Optional for backwards compat. */
  history?: ChatHistoryTurn[];
}
