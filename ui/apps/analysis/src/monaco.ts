import * as monaco from "monaco-editor/esm/vs/editor/editor.api.js";
// import { pluginMetadata } from "~/FlowApp";

// self.MonacoEnvironment = {
//   getWorkerUrl: function (moduleId, label) {
//     const baseUrl = pluginMetadata?.data?.dataflowUiUrl || "/";
//     if (label === "json") {
//       return `${baseUrl}json.worker.js`;
//     }
//     if (label === "css" || label === "scss" || label === "less") {
//       return `${baseUrl}css.worker.js`;
//     }
//     if (label === "html" || label === "handlebars" || label === "razor") {
//       return `${baseUrl}html.worker.js`;
//     }
//     if (label === "typescript" || label === "javascript") {
//       return `${baseUrl}ts.worker.js`;
//     }
//     return `${baseUrl}editor.worker.js`;
//   },
// };

export const DEFAULT_MONACO_OPTIONS: monaco.editor.IEditorConstructionOptions =
  {
    acceptSuggestionOnCommitCharacter: true,
    acceptSuggestionOnEnter: "on",
    accessibilitySupport: "auto",
    automaticLayout: true,
    codeLens: true,
    colorDecorators: true,
    contextmenu: true,
    cursorBlinking: "blink",
    cursorStyle: "line",
    disableLayerHinting: false,
    disableMonospaceOptimizations: false,
    dragAndDrop: false,
    fixedOverflowWidgets: false,
    folding: true,
    foldingStrategy: "auto",
    fontLigatures: false,
    formatOnPaste: false,
    formatOnType: false,
    hideCursorInOverviewRuler: false,
    links: true,
    minimap: { enabled: false },
    mouseWheelZoom: false,
    multiCursorMergeOverlapping: true,
    multiCursorModifier: "alt",
    overviewRulerBorder: true,
    overviewRulerLanes: 2,
    quickSuggestions: true,
    quickSuggestionsDelay: 100,
    readOnly: false,
    renderControlCharacters: false,
    renderLineHighlight: "all",
    renderWhitespace: "none",
    revealHorizontalRightPadding: 30,
    roundedSelection: true,
    rulers: [],
    scrollBeyondLastColumn: 5,
    scrollBeyondLastLine: true,
    selectOnLineNumbers: true,
    selectionClipboard: true,
    selectionHighlight: true,
    showFoldingControls: "mouseover",
    smoothScrolling: false,
    suggestOnTriggerCharacters: true,
    wordSeparators: "~!@#$%^&*()-=+[{]}|;:'\",.<>/?",
    wordWrap: "off",
    wordWrapBreakAfterCharacters: "\t})]?|&,;",
    wordWrapBreakBeforeCharacters: "{([+",
    wordWrapColumn: 80,
    wrappingIndent: "none",
  };
