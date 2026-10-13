import { describe, expect, it } from "vitest";
import { selectMenuWidth } from "../components/selectMenuWidth";

const byLength = (text: string) => text.length * 10;

describe("selectMenuWidth", () => {
  it("fits the longest label plus the row padding", () => {
    expect(
      selectMenuWidth(["Demo", "Dummy C (default, no access)"], byLength)
    ).toBe(280 + 48);
  });

  it("rounds up to a whole pixel", () => {
    expect(selectMenuWidth(["ab"], () => 100.2)).toBe(149);
  });

  it("gives no width when there are no labels", () => {
    expect(selectMenuWidth([], byLength)).toBeUndefined();
  });
});
