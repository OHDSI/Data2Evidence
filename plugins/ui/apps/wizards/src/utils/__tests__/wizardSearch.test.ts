import { describe, expect, it } from "vitest";
import type { WizardDefinition } from "../../types/wizard";
import { filterWizards } from "../wizardSearch";

function wizard(id: string, name: string, description: string): WizardDefinition {
  return { id, name, description, fields: [], steps: [] };
}

const wizards = [
  wizard("incidence", "Calculate incidence", "Find the first occurrence of a clinical condition."),
  wizard("mortality", "Calculate mortality", "Calculate rates using death dates."),
];

describe("filterWizards", () => {
  it("returns all wizards for an empty search", () => {
    expect(filterWizards(wizards, "  ")).toBe(wizards);
  });

  it("matches wizard names without regard to case", () => {
    expect(filterWizards(wizards, "INCIDENCE")).toEqual([wizards[0]]);
  });

  it("matches wizard descriptions", () => {
    expect(filterWizards(wizards, "death dates")).toEqual([wizards[1]]);
  });
});
