import { describe, expect, it } from "vitest";
import { DIALOG_SIZE_MAP } from "../components/dialogSizes";
import { tokens } from "../tokens/tokens";

describe("modal size scale", () => {
  it("matches the Figma Modal variables", () => {
    expect(tokens.modal).toEqual({ s: 540, l: 900, xl: 1200 });
  });

  it("has no 600 anywhere — that size was invented", () => {
    expect(Object.values(tokens.modal)).not.toContain(600);
  });

  it("exposes the same scale to Dialog", () => {
    expect(DIALOG_SIZE_MAP).toEqual(tokens.modal);
  });
});
