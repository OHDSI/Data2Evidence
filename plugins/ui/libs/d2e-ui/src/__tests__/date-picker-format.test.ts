import { describe, expect, it } from "vitest";
import {
  formatDate,
  hasTime,
  isWithinDays,
  parseDate,
  withTimeOf,
} from "../components/datePickerFormat";

const localParts = (date: Date | null) =>
  date && [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  ];

describe("formatDate", () => {
  it("writes the date in the given format from local parts", () => {
    expect(formatDate(new Date(2026, 9, 2), "YYYY-MM-DD")).toBe("2026-10-02");
    expect(formatDate(new Date(2026, 9, 2), "DD.MM.YYYY")).toBe("02.10.2026");
    expect(formatDate(new Date(2026, 9, 2), "MM/DD/YYYY")).toBe("10/02/2026");
  });

  it("writes the time when the format has one", () => {
    expect(
      formatDate(new Date(2026, 9, 2, 7, 5, 9), "YYYY-MM-DD HH:mm:ss")
    ).toBe("2026-10-02 07:05:09");
  });

  it("writes nothing for no date or an invalid date", () => {
    expect(formatDate(null, "YYYY-MM-DD")).toBe("");
    expect(formatDate(new Date(NaN), "YYYY-MM-DD")).toBe("");
  });
});

describe("parseDate", () => {
  it("reads a date typed in the given format", () => {
    expect(localParts(parseDate("02.10.2026", "DD.MM.YYYY"))).toEqual([
      2026, 10, 2, 0, 0, 0,
    ]);
    expect(localParts(parseDate("10/02/2026", "MM/DD/YYYY"))).toEqual([
      2026, 10, 2, 0, 0, 0,
    ]);
  });

  it("reads the time when the format has one", () => {
    expect(
      localParts(parseDate("2026-10-02 14:30:15", "YYYY-MM-DD HH:mm:ss"))
    ).toEqual([2026, 10, 2, 14, 30, 15]);
  });

  it("accepts the date alone for a format with a time, at midnight", () => {
    expect(localParts(parseDate("2026-10-02", "YYYY-MM-DD HH:mm:ss"))).toEqual([
      2026, 10, 2, 0, 0, 0,
    ]);
  });

  it("ignores spaces around the text", () => {
    expect(localParts(parseDate("  2026-10-02 ", "YYYY-MM-DD"))).toEqual([
      2026, 10, 2, 0, 0, 0,
    ]);
  });

  it("rejects a date that does not exist", () => {
    expect(parseDate("2026-02-30", "YYYY-MM-DD")).toBeNull();
    expect(parseDate("13/45/2026", "MM/DD/YYYY")).toBeNull();
    expect(parseDate("2026-10-02 24:00:00", "YYYY-MM-DD HH:mm:ss")).toBeNull();
  });

  it("rejects text in another format", () => {
    expect(parseDate("2026-10-02", "DD.MM.YYYY")).toBeNull();
    expect(parseDate("2-10-2026", "DD-MM-YYYY")).toBeNull();
    expect(parseDate("not a date", "YYYY-MM-DD")).toBeNull();
  });

  it("reads empty text as no date", () => {
    expect(parseDate("", "YYYY-MM-DD")).toBeNull();
    expect(parseDate("   ", "YYYY-MM-DD")).toBeNull();
  });
});

describe("hasTime", () => {
  it("tells a date format from a date and time format", () => {
    expect(hasTime("YYYY-MM-DD")).toBe(false);
    expect(hasTime("YYYY-MM-DD HH:mm")).toBe(true);
    expect(hasTime("DD.MM.YYYY HH:mm:ss")).toBe(true);
  });
});

describe("withTimeOf", () => {
  it("keeps the picked day and takes the time of the current value", () => {
    const picked = new Date(2026, 9, 12);
    const current = new Date(2025, 0, 1, 14, 30, 15);
    expect(localParts(withTimeOf(picked, current))).toEqual([
      2026, 10, 12, 14, 30, 15,
    ]);
  });

  it("puts the picked day at midnight when there is no current value", () => {
    const picked = new Date(2026, 9, 12, 9, 0, 0);
    expect(localParts(withTimeOf(picked, null))).toEqual([
      2026, 10, 12, 0, 0, 0,
    ]);
  });

  it("does not change the picked date", () => {
    const picked = new Date(2026, 9, 12);
    withTimeOf(picked, new Date(2025, 0, 1, 14, 30, 15));
    expect(picked.getHours()).toBe(0);
  });
});

describe("isWithinDays", () => {
  const day = new Date(2026, 9, 2, 23, 59, 59);

  it("accepts any day when no bound is set", () => {
    expect(isWithinDays(day, null, null)).toBe(true);
    expect(isWithinDays(day, undefined, undefined)).toBe(true);
  });

  it("accepts the bound days themselves whatever their time", () => {
    expect(isWithinDays(day, new Date(2026, 9, 2, 12), null)).toBe(true);
    expect(isWithinDays(day, null, new Date(2026, 9, 2, 0))).toBe(true);
  });

  it("rejects a day before min or after max", () => {
    expect(isWithinDays(day, new Date(2026, 9, 3), null)).toBe(false);
    expect(isWithinDays(day, null, new Date(2026, 9, 1))).toBe(false);
  });

  it("rejects a day after max inside a range", () => {
    expect(
      isWithinDays(
        new Date(2026, 11, 1),
        new Date(2026, 8, 1),
        new Date(2026, 9, 1)
      )
    ).toBe(false);
  });
});
