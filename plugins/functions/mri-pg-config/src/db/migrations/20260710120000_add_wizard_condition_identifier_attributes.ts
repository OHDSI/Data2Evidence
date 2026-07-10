import { Knex } from "knex";
import { env } from "../../env";

/**
 * Wizards dashboards pass the selected condition identifier to parquet-export.
 * The condition typeahead must return concept_id for non-HANA (duckdb) datasets
 * and concept_code for HANA datasets, while still displaying the concept name.
 *
 * The 03_Config seed adds these attributes for fresh installs, but the seed is
 * insert-ignore on (Id, Version), so existing environments keep their stored
 * config. This migration patches the stored config JSON in place, adding the new
 * attributes only when absent (non-destructive to any admin customisations).
 */

const TABLE = "ConfigDbModels_Config";
const CONDITION_INTERACTION = "patient.interactions.conditionoccurrence";

const disabledLangName = ["en", "de", "fr", "es", "pt", "zh"].map((lang) => ({
  lang,
  value: "",
  visible: true,
}));

// duckdb / non-HANA: return concept_id, search by concept name
const duckdbConceptIdAttribute = {
  name: [{ lang: "", value: "Condition concept Id" }],
  disabledLangName,
  type: "text",
  expression: "@REF.CONCEPT_ID",
  defaultPlaceholder: "@REF",
  defaultFilter: "@REF.concept_id = @COND.condition_concept_id",
  referenceFilter:
    "@REF.DOMAIN_ID = 'Condition' AND @REF.STANDARD_CONCEPT = 'S' AND JARO_SIMILARITY(lower(@REF.CONCEPT_NAME), lower('@SEARCH_QUERY')) >= 0.65",
  referenceExpression: "@REF.CONCEPT_ID",
  order: 11,
  domainFilter: "",
  standardConceptCodeFilter: "",
  cohortDefinitionKey: "CodesetId",
  conceptIdentifierType: "id",
  useRefValue: true,
  useRefText: true,
};

// HANA: return concept_code, search by concept name
const hanaConceptCodeAttribute = {
  name: [{ lang: "", value: "Condition concept code" }],
  disabledLangName,
  type: "text",
  expression: "@REF.CONCEPT_CODE",
  defaultPlaceholder: "@REF",
  defaultFilter: "@REF.concept_id = @COND.condition_concept_id",
  referenceFilter:
    "@REF.DOMAIN_ID = 'Condition' AND @REF.STANDARD_CONCEPT = 'S' AND (@REF.CONCEPT_NAME) LIKE_REGEXPR '@SEARCH_QUERY' FLAG 'i'",
  referenceExpression: "@REF.CONCEPT_CODE",
  order: 12,
  domainFilter: "",
  standardConceptCodeFilter: "",
  cohortDefinitionKey: "CodesetId",
  conceptIdentifierType: "name",
  useRefValue: true,
  useRefText: true,
};

const paEntry = (attributeName: string, order: number, modelName: string) => ({
  source: `${CONDITION_INTERACTION}.attributes.${attributeName}`,
  ordered: false,
  cached: true,
  useRefText: true,
  useRefValue: true,
  category: true,
  measure: false,
  filtercard: { initial: false, visible: true, order },
  patientlist: { initial: false, visible: true, linkColumn: false },
  modelName,
});

// CDW rows: Id/Version -> [attributeName, attributeObject]
const CDW_TARGETS: Array<{
  id: string;
  version: string;
  attributeName: string;
  attribute: object;
}> = [
  {
    id: "e10f83a0-ade9-4a33-90ae-cf760813943c", // OMOP_DM (duckdb)
    version: "1",
    attributeName: "condition_occ_concept_id",
    attribute: duckdbConceptIdAttribute,
  },
  {
    id: "d10f83a0-ade9-4a33-90ae-cf760813953b", // OMOP_HANA_DM
    version: "1",
    attributeName: "conditionconceptcode",
    attribute: hanaConceptCodeAttribute,
  },
  {
    id: "9b9229cf-2ed0-4357-92fc-6bfbab76e9d2", // OMOP_HANA_LEAN_DM
    version: "1",
    attributeName: "conditionconceptcode",
    attribute: hanaConceptCodeAttribute,
  },
];

// PA rows: Id/Version -> attribute entry
const PA_TARGETS: Array<{
  id: string;
  version: string;
  attributeName: string;
  entry: object;
}> = [
  {
    id: "4fce3cb7-32bf-4b46-8cba-32e4f77a14dd", // OMOP (duckdb)
    version: "A",
    attributeName: "condition_occ_concept_id",
    entry: paEntry("condition_occ_concept_id", 12, "Condition concept Id"),
  },
  {
    id: "92d7c6f8-3118-4256-ab22-f2f7fd19d4e7", // OMOP_HANA
    version: "A",
    attributeName: "conditionconceptcode",
    entry: paEntry("conditionconceptcode", 12, "Condition concept code"),
  },
  {
    id: "71b04cd8-5ebf-4688-b306-f6217b301b2d", // OMOP_HANA_LEAN
    version: "A",
    attributeName: "conditionconceptcode",
    entry: paEntry("conditionconceptcode", 5, "Condition concept code"),
  },
];

function parseData(raw: unknown): any {
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

async function readData(knex: Knex, id: string, version: string): Promise<any | null> {
  const row = await knex
    .withSchema(env.PG_SCHEMA)
    .from(TABLE)
    .where({ Id: id, Version: version })
    .first("Data");
  return row ? parseData(row.Data) : null;
}

async function writeData(knex: Knex, id: string, version: string, data: any) {
  await knex
    .withSchema(env.PG_SCHEMA)
    .from(TABLE)
    .where({ Id: id, Version: version })
    .update({ Data: JSON.stringify(data) });
}

export async function up(knex: Knex): Promise<void> {
  for (const t of CDW_TARGETS) {
    const data = await readData(knex, t.id, t.version);
    const attrs =
      data?.patient?.interactions?.conditionoccurrence?.attributes;
    if (!attrs || attrs[t.attributeName]) continue; // missing interaction or already present
    attrs[t.attributeName] = t.attribute;
    await writeData(knex, t.id, t.version, data);
  }

  for (const t of PA_TARGETS) {
    const data = await readData(knex, t.id, t.version);
    const filtercards: any[] = data?.filtercards;
    if (!Array.isArray(filtercards)) continue;
    const card = filtercards.find((c) => c?.source === CONDITION_INTERACTION);
    if (!card || !Array.isArray(card.attributes)) continue;
    const sourcePath = `${CONDITION_INTERACTION}.attributes.${t.attributeName}`;
    if (card.attributes.some((a: any) => a?.source === sourcePath)) continue;
    card.attributes.push(t.entry);
    await writeData(knex, t.id, t.version, data);
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const t of CDW_TARGETS) {
    const data = await readData(knex, t.id, t.version);
    const attrs =
      data?.patient?.interactions?.conditionoccurrence?.attributes;
    if (!attrs || !attrs[t.attributeName]) continue;
    delete attrs[t.attributeName];
    await writeData(knex, t.id, t.version, data);
  }

  for (const t of PA_TARGETS) {
    const data = await readData(knex, t.id, t.version);
    const filtercards: any[] = data?.filtercards;
    if (!Array.isArray(filtercards)) continue;
    const card = filtercards.find((c) => c?.source === CONDITION_INTERACTION);
    if (!card || !Array.isArray(card.attributes)) continue;
    const sourcePath = `${CONDITION_INTERACTION}.attributes.${t.attributeName}`;
    card.attributes = card.attributes.filter((a: any) => a?.source !== sourcePath);
    await writeData(knex, t.id, t.version, data);
  }
}
