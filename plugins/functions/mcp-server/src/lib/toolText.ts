/**
 * Text renderings of tool payloads.
 *
 * THE MODEL NEVER SEES `structuredContent`. @ai-sdk/mcp converts a tool result
 * with `mcpToModelOutput`, which maps `result.content` and drops everything else;
 * the one path that would read `structuredContent` (`extractStructuredContent`)
 * runs only when the CALLER passes explicit per-tool schemas to `.tools()`, and
 * the cohort agent calls `.tools()` with none. Declaring an `outputSchema` on the
 * server does not change this — and if the caller ever did pass schemas, it would
 * make the model receive the raw JSON *instead of* the curated text, which is why
 * the text-first tools here deliberately declare none (same reasoning as the
 * comment on `list_cohort_filters`).
 *
 * The cost of getting this wrong is not subtle: `list_concept_sets` returned
 * "Found 2 concept sets matching 'alzheimer'" with the ids only in
 * structuredContent. Never having seen ids 39 and 40, the model re-called the
 * tool 13 times and then guessed ids 1 and 2 — which 400'd.
 *
 * So the rule these helpers enforce: whatever the model must ACT on — ids above
 * all — goes in the TEXT. Keep them pure so the shape stays under test.
 */

export interface ConceptSetListItem {
  id: number;
  name: string;
  shared?: boolean | null;
}

/** `- 39 Alzheimer's disease [shared]`, one per line. */
export function formatConceptSetListing(sets: ConceptSetListItem[]): string {
  if (!Array.isArray(sets) || sets.length === 0) return "(none)";
  return sets
    .map((cs) => `- ${cs.id} ${cs.name}${cs.shared ? " [shared]" : ""}`)
    .join("\n");
}

/**
 * The saved concept expression, one row per item, with the flags that change
 * what the set MEANS — descendants widen it, an exclusion carves out of it.
 * A count ("3 concepts in expression") cannot support the only judgement being
 * asked of the model here: whether this is the right set for the user's term.
 */
export function formatConceptSetExpression(concepts: unknown): string {
  if (!Array.isArray(concepts) || concepts.length === 0) return "(empty)";
  return concepts
    .map((item: any) => {
      const flags = [
        item?.useDescendants ? "+descendants" : null,
        item?.useMapped ? "+mapped" : null,
        item?.isExcluded ? "EXCLUDED" : null,
      ].filter(Boolean);
      const id = item?.id ?? item?.conceptId ?? "?";
      const label = item?.name ?? item?.conceptName ?? "";
      return `- ${id}${label ? ` ${label}` : ""}${
        flags.length ? ` [${flags.join(", ")}]` : ""
      }`;
    })
    .join("\n");
}

/** `- 123 Type 2 diabetes mellitus`, one per line. */
export function formatPhenotypeListing(phenotypes: unknown): string {
  if (!Array.isArray(phenotypes) || phenotypes.length === 0) return "(no matches)";
  return phenotypes
    .map((p: any) => `- ${p?.cohortId} ${p?.cohortName ?? ""}`.trimEnd())
    .join("\n");
}
