import { Cell as JupyterCell, JupyterNotebook } from "./nbformat/v4";
import { NotebookContent, Cell as StarboardCell } from 'starboard-notebook/dist/src/types';
import { JupystarOptions } from "./options";
export declare function guessStarboardCellType(cell: JupyterCell, nb: JupyterNotebook): "raw" | "markdown" | "python";
export declare function convertJupyterCellToStarboardCell(cell: JupyterCell, nb: JupyterNotebook, opts: JupystarOptions): StarboardCell;
export declare function convertStarboardCellToJupyterCell(cell: StarboardCell, nb: NotebookContent, opts: JupystarOptions): JupyterCell;
export declare function convertJupyterToStarboard(jnb: JupyterNotebook, partialOpts: Partial<JupystarOptions>): NotebookContent;
export declare function convertStarboardToJupyter(snb: NotebookContent, partialOpts: Partial<JupystarOptions>): JupyterNotebook;
