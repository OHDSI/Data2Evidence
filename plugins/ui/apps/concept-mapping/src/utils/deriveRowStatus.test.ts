import { describe, expect, test } from "vitest";
import { deriveRowStatus } from "./deriveRowStatus";

describe("deriveRowStatus", () => {
  test("approved when any suggestion is approved", () => {
    expect(deriveRowStatus({ flagged: false, suggestions: [{ isApproved: false }, { isApproved: true }] }))
      .toEqual({ status: "approved", count: 2, flagged: false });
  });
  test("suggested when >=1 suggestion and none approved", () => {
    expect(deriveRowStatus({ flagged: true, suggestions: [{ isApproved: false }] }))
      .toEqual({ status: "suggested", count: 1, flagged: true });
  });
  test("unchecked when no suggestions", () => {
    expect(deriveRowStatus({ flagged: false, suggestions: [] }))
      .toEqual({ status: "unchecked", count: 0, flagged: false });
  });
});
