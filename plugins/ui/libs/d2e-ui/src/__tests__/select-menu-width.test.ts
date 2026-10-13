import { describe, expect, it } from "vitest";
import {
  SELECT_MENU_CHECKBOX_WIDTH,
  SELECT_MENU_ROW_PADDING,
  SELECT_MENU_SCROLLBAR_WIDTH,
  selectMenuWidth,
} from "../components/selectMenuWidth";

const byLength = (text: string) => text.length * 10;
const ROW_CHROME = SELECT_MENU_ROW_PADDING + SELECT_MENU_SCROLLBAR_WIDTH;

describe("selectMenuWidth", () => {
  it("fits the longest label plus the row padding and a scrollbar", () => {
    expect(
      selectMenuWidth(["Demo", "Dummy C (default, no access)"], byLength)
    ).toBe(280 + ROW_CHROME);
  });

  it("leaves room for the checkbox on a multiple select", () => {
    expect(selectMenuWidth(["Jane Doe"], byLength, true)).toBe(
      80 + ROW_CHROME + SELECT_MENU_CHECKBOX_WIDTH
    );
  });

  it("rounds up to a whole pixel", () => {
    expect(selectMenuWidth(["ab"], () => 100.2)).toBe(
      Math.ceil(100.2 + ROW_CHROME)
    );
  });

  it("gives no width when there are no labels", () => {
    expect(selectMenuWidth([], byLength)).toBeUndefined();
    expect(selectMenuWidth([], byLength, true)).toBeUndefined();
  });
});
