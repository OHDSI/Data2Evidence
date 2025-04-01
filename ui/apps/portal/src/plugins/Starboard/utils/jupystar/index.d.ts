import { JupystarOptions } from "./options";
export { convertJupyterToStarboard, convertStarboardToJupyter } from "./convert";
export { textToNotebookContent } from "starboard-notebook/dist/src/content/parsing";
export { notebookContentToText } from "starboard-notebook/dist/src/content/serialization";
export { parseJupyterNotebook } from "./parseJupyter";
export { JUPYSTAR_VERSION } from "./version";
/**
 * End to end conversion from Jupyter notebook file (ipynb) to Starboard notebook format.
 */
export declare function convertJupyterStringToStarboardString(content: string, opts?: Partial<JupystarOptions>): string;
/**
 * End to end conversion from Starboard notebook format to Jupyter notebook format (ipynb).
 */
export declare function convertStarboardStringToJupyterString(content: string, opts?: Partial<JupystarOptions>): string;
