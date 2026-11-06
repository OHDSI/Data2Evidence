import { describe, expect, it } from "vitest";
import {
  HOUR_OPTIONS,
  MINUTE_OPTIONS,
  padTimePart,
  selectedHour,
  selectedMinute,
  withDay,
  withHour,
  withMinute,
} from "../components/timePicker";

const localParts = (date: Date) => [
  date.getFullYear(),
  date.getMonth() + 1,
  date.getDate(),
  date.getHours(),
  date.getMinutes(),
  date.getSeconds(),
];

const today = new Date(2026, 10, 2, 9, 41, 17);

describe("time options", () => {
  it("lists the 24 hours from 00", () => {
    expect(HOUR_OPTIONS).toHaveLength(24);
    expect(HOUR_OPTIONS[0]).toBe(0);
    expect(HOUR_OPTIONS[23]).toBe(23);
  });

  it("lists the minutes in steps of 5", () => {
    expect(MINUTE_OPTIONS).toEqual([
      0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55,
    ]);
  });

  it("writes two digits", () => {
    expect(padTimePart(0)).toBe("00");
    expect(padTimePart(7)).toBe("07");
    expect(padTimePart(23)).toBe("23");
  });
});

describe("selected items", () => {
  it("selects nothing without a value", () => {
    expect(selectedHour(null)).toBeNull();
    expect(selectedMinute(null)).toBeNull();
  });

  it("selects the hour and a minute that is a step", () => {
    const value = new Date(2026, 9, 12, 15, 30);
    expect(selectedHour(value)).toBe(15);
    expect(selectedMinute(value)).toBe(30);
  });

  it("selects no minute for a typed minute that is not a step", () => {
    const value = new Date(2026, 9, 12, 14, 32);
    expect(selectedHour(value)).toBe(14);
    expect(selectedMinute(value)).toBeNull();
  });
});

describe("draft changes", () => {
  it("takes a picked day and keeps the draft time without seconds", () => {
    const draft = new Date(2026, 9, 12, 15, 30, 45);
    expect(localParts(withDay(new Date(2026, 9, 20), draft))).toEqual([
      2026, 10, 20, 15, 30, 0,
    ]);
  });

  it("starts a picked day at 00:00 without a draft", () => {
    expect(localParts(withDay(new Date(2026, 9, 20, 8, 15), null))).toEqual([
      2026, 10, 20, 0, 0, 0,
    ]);
  });

  it("takes a picked hour and keeps the draft day and minute", () => {
    const draft = new Date(2026, 9, 12, 15, 32, 45);
    expect(localParts(withHour(draft, 9, today))).toEqual([
      2026, 10, 12, 9, 32, 0,
    ]);
  });

  it("takes a picked minute and keeps the draft day and hour", () => {
    const draft = new Date(2026, 9, 12, 15, 32, 45);
    expect(localParts(withMinute(draft, 45, today))).toEqual([
      2026, 10, 12, 15, 45, 0,
    ]);
  });

  it("uses today for a picked time without a draft", () => {
    expect(localParts(withHour(null, 9, today))).toEqual([
      2026, 11, 2, 9, 0, 0,
    ]);
    expect(localParts(withMinute(null, 45, today))).toEqual([
      2026, 11, 2, 0, 45, 0,
    ]);
  });

  it("does not change the draft it was given", () => {
    const draft = new Date(2026, 9, 12, 15, 30);
    const before = draft.getTime();
    withDay(new Date(2026, 9, 20), draft);
    withHour(draft, 9, today);
    withMinute(draft, 45, today);
    expect(draft.getTime()).toBe(before);
  });
});
