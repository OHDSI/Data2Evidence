import { Cell } from "starboard-notebook/dist/src/types";
/**
 * This comments out %magic commands, and handles some of them that signify a cell type.
 * The input cell is mutated.
 * @param cell
 */
export declare function translateMagics(cell: Cell): void;
/**
 * This uncomments out %magic commands
 * The input cell is mutated.
 * @param cell
 */
export declare function reverseTranslateMagics(cell: Cell): void;
