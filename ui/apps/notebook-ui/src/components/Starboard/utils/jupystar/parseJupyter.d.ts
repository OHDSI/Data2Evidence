import { Demo as V3Notebook } from "./nbformat/v3";
import { JupyterNotebook as V4Notebook } from "./nbformat/v4";
/**
 * Parses given string as JSON, and converts it to nbformat v4 if it is currently v3.
 * @param textContent
 */
export declare function parseJupyterNotebook(textContent: string): V4Notebook;
/**
 * Takes as input a nbformat v3 or v4 notebook JSON, returns it in v4 format.
 */
export declare function readIpynbContentFileAsV4(nb: V3Notebook | V4Notebook): V4Notebook;
