/**
 * Build the cohort filter catalog from a Patient Analytics frontend config
 * (the getMyConfig `config` object).
 *
 * The catalog is the set of filter cards + attributes the PA cohort builder
 * will actually accept, derived by applying the SAME visibility rules the
 * loader uses (MriFrontendConfig / MriConfigAttribute, mri-pa-ui):
 *   - a filter card is usable when its `filtercard` is absent or
 *     `filtercard.visible === true`;
 *   - an attribute is filterable when `filtercard.visible === true`
 *     (MriConfigAttribute.isVisibleInFilterCard).
 *
 * Enumerating from the same config the loader validates against is what makes
 * every (card, attribute) we expose loadable by construction: the build step
 * can only ever reference paths PA's isValidFilterCardAttribute would accept,
 * which is the guarantee that prevents a bookmark referencing an attribute the
 * dataset doesn't have (the class of bug where a card silently fails to load).
 */

export type AttributeKind = "num" | "category" | "conceptSet" | "datetime";

export interface CatalogAttribute {
  /** Config key, e.g. "Age", "condition_occ_concept_name". */
  key: string;
  /** Full path used in the bookmark, e.g. "patient.attributes.Age". */
  configPath: string;
  /** Display name, e.g. "Age", "Condition concept Name". */
  name: string;
  /** Raw config type: num | text | datetime | time | conceptSet. */
  type: string;
  /** How the value is supplied when building a constraint. */
  kind: AttributeKind;
  /**
   * Config `cohortDefinitionKey`. The card's PRIMARY concept set is the
   * conceptSet attribute with `cohortDefinitionKey === "CodesetId"` — that is
   * the attribute a clause's `concept` maps to.
   */
  cohortDefinitionKey?: string;
  /** Config `domainFilter` (e.g. "Visit", "Procedure"); may be empty. */
  domainFilter?: string;
}

export interface CatalogCard {
  /** "patient" or an interaction key, e.g. "conditionoccurrence". */
  key: string;
  /** "patient" or "patient.interactions.<key>". */
  configPath: string;
  /** "Basic Data" or the interaction's display name. */
  name: string;
  attributes: CatalogAttribute[];
}

// A type alias (not interface) so it is assignable to the MCP SDK's
// structuredContent `{ [x: string]: unknown }` shape.
export type CohortCatalog = {
  cards: CatalogCard[];
};

/** Config stores names as a string or an array of { lang, value }. */
function resolveName(nameVal: unknown, fallbackKey: string): string {
  if (typeof nameVal === "string" && nameVal) return nameVal;
  if (Array.isArray(nameVal) && nameVal.length > 0 && (nameVal[0] as any)?.value) {
    return String((nameVal[0] as any).value);
  }
  return fallbackKey.charAt(0).toUpperCase() + fallbackKey.slice(1);
}

/** Map the raw config `type` to how the resolver must supply a value. */
function attrKind(type: string): AttributeKind {
  switch (type) {
    case "num":
      return "num";
    case "conceptSet":
      return "conceptSet";
    case "datetime":
    case "time":
      return "datetime";
    default:
      // text + any coded categorical (gender, race, concept names)
      return "category";
  }
}

/** An attribute is filterable iff filtercard.visible === true. */
function isAttrVisible(attr: any): boolean {
  return !!(attr?.filtercard && attr.filtercard.visible === true);
}

function buildAttributes(
  attrs: Record<string, any> | undefined,
  basePath: string,
): CatalogAttribute[] {
  const out: CatalogAttribute[] = [];
  for (const [key, attr] of Object.entries(attrs ?? {})) {
    if (!isAttrVisible(attr)) continue;
    const type = String(attr?.type ?? "text");
    out.push({
      key,
      configPath: `${basePath}.attributes.${key}`,
      name: resolveName(attr?.name, key),
      type,
      kind: attrKind(type),
      cohortDefinitionKey: attr?.cohortDefinitionKey || undefined,
      domainFilter: attr?.domainFilter || undefined,
    });
  }
  return out;
}

/**
 * Turn a getMyConfig `config` object into the cohort filter catalog.
 * The patient ("Basic Data") card is always present; interaction cards are
 * included when visible. Attributes are filtered to the visible-in-filtercard
 * set, matching the loader.
 */
export function buildCohortCatalog(config: any): CohortCatalog {
  const cards: CatalogCard[] = [];

  // Patient card — always present; its name is conventional ("Basic Data"),
  // mirroring getFilterCardName in mriQuery.ts (config.patient has no `name`).
  cards.push({
    key: "patient",
    configPath: "patient",
    name: "Basic Data",
    attributes: buildAttributes(config?.patient?.attributes, "patient"),
  });

  // Interaction cards — visible when filtercard is absent or visible === true.
  const interactions = config?.patient?.interactions ?? {};
  for (const [key, inter] of Object.entries<any>(interactions)) {
    const fc = inter?.filtercard;
    const visible = fc === undefined || fc.visible === true;
    if (!visible) continue;
    const basePath = `patient.interactions.${key}`;
    cards.push({
      key,
      configPath: basePath,
      name: resolveName(inter?.name, key),
      attributes: buildAttributes(inter?.attributes, basePath),
    });
  }

  return { cards };
}

/**
 * Compact human/LLM-readable summary of the catalog: one line per card listing
 * each attribute as `Name[kind]`, so the model can ground its filter choices on
 * the real cards/attributes before calling the build tool.
 */
export function summarizeCatalog(catalog: CohortCatalog): string {
  const lines = catalog.cards.map((c) => {
    const attrs = c.attributes.map((a) => `${a.name}[${a.kind}]`).join(", ");
    return `- ${c.name}: ${attrs || "(no filterable attributes)"}`;
  });
  return (
    "Filter cards available on this dataset (use only these cards and " +
    "attributes when composing cohort filters):\n" +
    lines.join("\n")
  );
}
