import { describe, expect, it } from "vitest";
import { nextTick, reactive } from "vue";
import { useDatePickerText } from "../components/useDatePickerText";

const FORMAT = "YYYY-MM-DD HH:mm";

function setup(modelValue: Date | null) {
  const props = reactive({
    modelValue,
    format: FORMAT,
    min: null as Date | null,
    max: null as Date | null,
    errorMessages: undefined as string | string[] | undefined,
    invalidDateText: "Invalid date",
  });
  const emitted: (Date | null)[] = [];
  const api = useDatePickerText(props, (value) => emitted.push(value));
  return { api, emitted, props };
}

describe("typed text", () => {
  it("is not edited while it shows the value", () => {
    const { api } = setup(new Date(2026, 9, 12, 15, 30));
    expect(api.text.value).toBe("2026-10-12 15:30");
    expect(api.isEdited.value).toBe(false);
  });

  it("stays edited until it is committed", () => {
    const { api, emitted } = setup(new Date(2026, 9, 12, 15, 30));
    api.onType("2026-10-14 09:00");
    expect(api.isEdited.value).toBe(true);
    expect(emitted).toEqual([]);

    const committed = api.commitText();

    expect(committed).toEqual(new Date(2026, 9, 14, 9, 0));
    expect(emitted).toEqual([new Date(2026, 9, 14, 9, 0)]);
    expect(api.text.value).toBe("2026-10-14 09:00");
    expect(api.isEdited.value).toBe(false);
  });

  it("keeps invalid text and its error after a commit", () => {
    const { api, emitted } = setup(new Date(2026, 9, 12, 15, 30));
    api.onType("2026-10-14 9");

    expect(api.commitText()).toBeUndefined();

    expect(emitted).toEqual([]);
    expect(api.text.value).toBe("2026-10-14 9");
    expect(api.isEdited.value).toBe(true);
    expect(api.shownErrors.value).toEqual(["Invalid date"]);
  });

  it("is no longer edited once a picked value is shown", () => {
    const { api } = setup(new Date(2026, 9, 12, 15, 30));
    api.onType("2026-10-14 09:00");
    api.show(new Date(2026, 9, 20, 15, 30));
    expect(api.isEdited.value).toBe(false);
    expect(api.commitText()).toBeUndefined();
  });

  it("marks invalid text until a value is shown", () => {
    const { api } = setup(new Date(2026, 9, 12, 15, 30));
    api.onType("2026-10-14 9");
    api.commitText();
    expect(api.isInvalid.value).toBe(true);

    api.show(new Date(2026, 9, 12, 15, 30));

    expect(api.isInvalid.value).toBe(false);
  });
});

describe("value from the parent", () => {
  it("keeps typed text when the parent passes an equal date again", async () => {
    const { api, props } = setup(new Date(2026, 9, 12, 15, 30));
    api.onType("2026-10-14 9");
    api.commitText();

    props.modelValue = new Date(2026, 9, 12, 15, 30);
    await nextTick();

    expect(api.text.value).toBe("2026-10-14 9");
    expect(api.isInvalid.value).toBe(true);
  });

  it("shows a different date from the parent", async () => {
    const { api, props } = setup(new Date(2026, 9, 12, 15, 30));
    api.onType("2026-10-14 9");

    props.modelValue = new Date(2026, 9, 20, 8, 0);
    await nextTick();

    expect(api.text.value).toBe("2026-10-20 08:00");
    expect(api.isEdited.value).toBe(false);
  });
});

describe("reading typed text", () => {
  it("returns the typed date and does not emit it", () => {
    const { api, emitted } = setup(new Date(2026, 9, 12, 15, 30));
    api.onType("2026-10-14 09:00");

    expect(api.readText()).toEqual(new Date(2026, 9, 14, 9, 0));
    expect(emitted).toEqual([]);
  });

  it("returns null for empty text", () => {
    const { api, emitted } = setup(new Date(2026, 9, 12, 15, 30));
    api.onType("  ");

    expect(api.readText()).toBeNull();
    expect(emitted).toEqual([]);
  });

  it("marks invalid text and returns nothing", () => {
    const { api } = setup(new Date(2026, 9, 12, 15, 30));
    api.onType("2026-10-14 25:00");

    expect(api.readText()).toBeUndefined();
    expect(api.isInvalid.value).toBe(true);
  });
});
