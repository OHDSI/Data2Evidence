import { describe, expect, it } from "vitest";
import {
  SELECT_MENU_CHECKBOX_WIDTH,
  SELECT_MENU_LETTER_SPACING,
  SELECT_MENU_ROW_PADDING,
  SELECT_MENU_SCROLLBAR_WIDTH,
  selectMenuWidth,
} from "../components/selectMenuWidth";

const byLength = (text: string) => text.length * 10;
const ROW_CHROME = SELECT_MENU_ROW_PADDING + SELECT_MENU_SCROLLBAR_WIDTH;
const spacing = (text: string) => text.length * SELECT_MENU_LETTER_SPACING;

describe("selectMenuWidth", () => {
  it("fits the longest label plus the row padding and a scrollbar", () => {
    const longest = "Dummy C (default, no access)";
    expect(selectMenuWidth(["Demo", longest], byLength)).toBe(
      Math.ceil(280 + spacing(longest) + ROW_CHROME)
    );
  });

  it("leaves room for the checkbox on a multiple select", () => {
    expect(selectMenuWidth(["Jane Doe"], byLength, true)).toBe(
      Math.ceil(80 + spacing("Jane Doe") + ROW_CHROME + SELECT_MENU_CHECKBOX_WIDTH)
    );
  });

  it("adds the list title letter-spacing the measurement leaves out", () => {
    const author =
      "Bob the extraordinarily long-named author from the research department";
    const canvasWidth = 529.2;
    const renderedTitle = 540;
    const rowChromeAroundTitle = 104;
    const width = selectMenuWidth([author], () => canvasWidth, true);
    expect(width! - rowChromeAroundTitle).toBeGreaterThanOrEqual(renderedTitle);
  });

  it("picks the widest label after letter-spacing", () => {
    const short = "ab";
    const long = "a".repeat(200);
    const measure = (text: string) => (text === short ? 100 : 90);
    expect(selectMenuWidth([short, long], measure)).toBe(
      Math.ceil(90 + spacing(long) + ROW_CHROME)
    );
  });

  it("rounds up to a whole pixel", () => {
    expect(selectMenuWidth(["ab"], () => 100.2)).toBe(
      Math.ceil(100.2 + spacing("ab") + ROW_CHROME)
    );
  });

  it("gives no width when there are no labels", () => {
    expect(selectMenuWidth([], byLength)).toBeUndefined();
    expect(selectMenuWidth([], byLength, true)).toBeUndefined();
  });
});
