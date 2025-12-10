import { Cell } from "starboard-notebook/dist/src/types";
export declare function convertMathjaxToKatex(cell: Cell): void;
export declare function convertKatexToMathJax(cell: Cell): void;
/**
 * In Jupyter notebooks you can specify a block as
 * \begin{...}
 * a = 1 + 2
 * \end{...}
 *
 * $$  G_0 \frac{1}{\sqrt{2}} \left[ \begin{array}{c}  1 \\ 1  \end{array} \right] +
 * G_1 \frac{1}{\sqrt{2}} \left[ \begin{array}{c}  1 \\ -1  \end{array} \right] $$
 *
 *
 *
 * This is not valid in Starboard (for good reason), here we do a best effort add $$ around it.
 */
export declare function convertLatexBlocksInMarkdown(cell: Cell): void;
