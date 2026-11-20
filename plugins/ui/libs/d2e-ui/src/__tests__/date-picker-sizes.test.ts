import { describe, expect, it } from "vitest";
import { DATE_PICKER_SIZE_MAP } from "../components/datePickerSizes";

describe("D2eDatePicker size map", () => {
  it("maps sizes to the Figma outlined box heights", () => {
    expect(DATE_PICKER_SIZE_MAP.sm).toEqual({ height: 32 });
    expect(DATE_PICKER_SIZE_MAP.md).toEqual({ height: 40 });
  });
});
