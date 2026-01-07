import { Cell } from "starboard-notebook/dist/src/types";
/**
 * Takes a given Starboard cell and changes its type to
 * "raw", "markdown" or "code"
 * This modifies the input cell.
 *
 * @param cell
 */
export declare function convertStarboardCellTypeIntoJupyterCellType(cell: Cell): void;
