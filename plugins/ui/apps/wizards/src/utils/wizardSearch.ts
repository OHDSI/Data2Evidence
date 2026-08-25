import type { WizardDefinition } from "../types/wizard";

export function filterWizards(wizards: WizardDefinition[], query: string): WizardDefinition[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return wizards;

  return wizards.filter((wizard) =>
    `${wizard.name} ${wizard.description}`.toLocaleLowerCase().includes(normalizedQuery),
  );
}
