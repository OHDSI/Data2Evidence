/**
 * Resolve a plain-English term to the EXACT token a `category`/text attribute
 * stores, for the deep-link (PA-not-mounted) cohort surface.
 *
 * Why this exists as a ladder rather than one search: the analytics-svc
 * `/values` search runs in the database (a HANA `LIKE_REGEXPR` over the stored
 * column), so it matches stored TEXT, not meaning. "ER Visit" is not a substring
 * of "Emergency Room Visit"; "female" can miss a stored "Female" on a
 * case-sensitive backend; "women" matches nothing when the column stores "F".
 * A single search that comes back empty therefore says nothing at all about
 * whether the value exists — and the assistant reporting it as "no value
 * matching X was found, the dataset must use a different naming convention" is
 * the exact failure this module closes.
 *
 * This mirrors what `pa_search_attribute_values` already does on the live
 * WebMCP surface (plugins/ui/apps/vue-mri-ui-lib/src/ai/webmcpServer.ts) so the
 * two surfaces answer the same question the same way — keep them in step.
 *
 * Pure except for the injected fetcher, so the ladder is unit-testable offline.
 */

export interface ValueRow {
  /** Display text. */
  label: string;
  /** The token the bookmark expression must carry. */
  value: string;
}

/** Query the `/values` endpoint. `""` asks for the attribute's whole domain. */
export type ValueFetcher = (searchQuery: string) => Promise<ValueRow[]>;

export type MatchedVia =
  /** The endpoint's own search returned rows. */
  | "search"
  /** The search was empty; scanning the full domain locally found matches. */
  | "domain-scan"
  /** The search was empty; a rewritten query (casing/abbreviation) matched. */
  | "alternate-query"
  /** Nothing matched — these rows ARE the attribute's complete value list. */
  | "domain"
  /** Nothing matched and the domain could not be enumerated. */
  | "none";

export interface ValueSearchResult {
  rows: ValueRow[];
  matchedVia: MatchedVia;
  /** The query string that actually produced `rows`. */
  matchedQuery: string;
  /** Size of the attribute's full value list, when it could be enumerated. */
  domainTotal?: number;
}

/** Default cap on rows handed to the model; the model picks, it doesn't page. */
export const DEFAULT_VALUE_LIMIT = 50;
export const MAX_VALUE_LIMIT = 200;

export function normalizeToken(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s._\-/(),]+/g, " ")
    .trim();
}

/**
 * Interchangeable tokens for the low-cardinality demographic columns every
 * cohort starts from: a dataset stores sex as "FEMALE", "Female" or "F", and the
 * user says "women". Deliberately narrow — demographics and booleans only.
 */
const SYNONYM_GROUPS: string[][] = [
  ["female", "f", "fem", "woman", "women", "girl", "girls"],
  ["male", "m", "man", "men", "boy", "boys"],
  ["unknown", "u", "unk", "not known", "no matching concept"],
  ["other", "o"],
  ["yes", "y", "true"],
  ["no", "n", "false"],
];

// ---------------------------------------------------------------------------
// The matching below has a browser-side twin:
// plugins/ui/apps/vue-mri-ui-lib/src/ai/valueResolution.ts, which does the same
// job for the pa_* WebMCP tools (the surface that exists while Patient Analytics
// IS mounted). The two cannot share a module — that one is bundled by Vite, this
// one runs on Deno, and nothing crosses that boundary in this repo — so they are
// kept in step by a shared table of query→expected-row vectors that BOTH suites
// read: ./__fixtures__/value-resolution-vectors.json.
//
// Exported names deliberately match the FE file so the two are diffable side by
// side. If you change the ranking here, change it there, and add the case to the
// vectors rather than to only one suite.
// ---------------------------------------------------------------------------

/**
 * Expansions that cannot be derived from the row being matched, because the row
 * does not spell the abbreviation out in full: a column storing "Intensive Care"
 * gives you nothing to recover the "U" of ICU from, and "IP"/"OP"/"AMB" are
 * contractions of a single word rather than initials of several.
 *
 * This is a SEED, not the rule. An abbreviation whose expansion IS in the row is
 * matched structurally by `abbreviates()` below, so unlisted acronyms (NICU,
 * ASC, LTACH, whatever a given dataset uses) resolve without an entry here. The
 * seeds also carry the blind-retry path (`alternateQueries`), where there are no
 * rows to derive anything from — an abbreviation cannot be inverted into a
 * search term without a lexicon.
 *
 * Care settings only: administrative vocabulary, not clinical judgement.
 * Clinical abbreviations (MI, CA, RA, MS, …) are deliberately absent — those are
 * genuinely ambiguous, and expanding one to a near-miss concept is a silent
 * clinical error, so they route through concept sets and the vocabulary tools
 * where the user gets to confirm what was chosen.
 */
const ABBREVIATION_SEEDS: Record<string, string[]> = {
  er: ["emergency room", "emergency department", "emergency"],
  ed: ["emergency department", "emergency room", "emergency"],
  ip: ["inpatient"],
  op: ["outpatient"],
  icu: ["intensive care unit", "intensive care"],
  snf: ["skilled nursing facility"],
  ltc: ["long term care"],
  amb: ["ambulatory"],
};

function tokensOf(s: string): string[] {
  return normalizeToken(s).split(" ").filter(Boolean);
}

// ---------------------------------------------------------------------------
// Which words in a query carry signal
//
// A word is filler when it fails to tell one row of THIS column from another —
// which is a property of the column, not of the word. "Visit" is filler in a
// visit-type column because every row has it, and is the whole answer in a
// column where one row does. So it is measured on the rows being matched rather
// than read off a list of words someone thought of in advance.
// ---------------------------------------------------------------------------

/**
 * Grammar words. No column anywhere is discriminated by these, so they are the
 * only words hard-coded.
 */
const STOP_WORDS = new Set([
  "the",
  "of",
  "and",
  "or",
  "a",
  "an",
  "for",
  "to",
  "with",
]);

/**
 * The fallback for when there is no column to learn from: the blind-retry path,
 * and columns with too few rows for a frequency to mean anything. Rows overrule
 * these wherever there are enough of them.
 */
const SEED_FILLER = new Set([
  "visit",
  "visits",
  "encounter",
  "encounters",
  "patient",
  "patients",
  "concept",
  "name",
  "value",
]);

/** A word this share of the column's rows carry cannot tell you WHICH row. */
const FILLER_DOCUMENT_FREQUENCY = 0.6;
/** Under this many rows a frequency is noise, so the seeds stand in. */
const MIN_ROWS_FOR_FREQUENCY = 4;

/** How often each word occurs across the rows being ranked. */
export interface ValueCorpus {
  size: number;
  /** word -> number of rows containing it */
  documentFrequency: Map<string, number>;
}

export function buildCorpus(rowTexts: string[][]): ValueCorpus {
  const documentFrequency = new Map<string, number>();
  for (const texts of rowTexts) {
    for (const token of new Set(texts.flatMap(tokensOf))) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }
  return { size: rowTexts.length, documentFrequency };
}

/** Only ever used to LOOSEN a match, never to reject a candidate. */
function isFiller(token: string, corpus?: ValueCorpus): boolean {
  if (STOP_WORDS.has(token)) return true;
  if (corpus && corpus.size >= MIN_ROWS_FOR_FREQUENCY) {
    const df = corpus.documentFrequency.get(token) ?? 0;
    return df / corpus.size >= FILLER_DOCUMENT_FREQUENCY;
  }
  return SEED_FILLER.has(token);
}

// ---------------------------------------------------------------------------
// Abbreviations, derived from the two strings rather than listed
// ---------------------------------------------------------------------------

/** ["emergency", "room"] -> "er" */
function initialsOf(words: string[]): string {
  return words.map((w) => w[0]).join("");
}

/** Value labels are a few words; a runaway input is not. */
const MAX_ABBREVIATED_WORDS = 5;

/**
 * Does the query read as an abbreviation of the row? Reading the row from its
 * FIRST word, each query word must consume either the next row word or the
 * INITIALS of the next two or more — "er visit" is "Emergency Room" followed by
 * "Visit". At least one word must actually be abbreviated, so a plain
 * word-subset stays at its own (lower) tier.
 *
 * The row may say more at the END than the query does (an acronym rarely covers
 * a value's trailing "Visit"), but nothing may be skipped before or between:
 * initials taken from the middle of a row let an acronym claim rows it does not
 * name — "ICU" would take "Neonatal Intensive Care Unit" — and a near-miss value
 * is a silent clinical error. Precision over recall: a row this misses is still
 * shown to the caller, because nothing matching returns the whole column.
 */
function abbreviates(queryWords: string[], rowWords: string[]): boolean {
  if (!queryWords.length || !rowWords.length) return false;
  if (rowWords.length > 12) return false;

  const walk = (qi: number, ri: number, abbreviated: boolean): boolean => {
    if (qi === queryWords.length) return abbreviated;
    if (ri === rowWords.length) return false;
    const word = queryWords[qi];
    if (word === rowWords[ri] && walk(qi + 1, ri + 1, abbreviated)) return true;
    const span = Math.min(MAX_ABBREVIATED_WORDS, rowWords.length - ri);
    for (let k = 2; k <= span; k++) {
      if (
        word === initialsOf(rowWords.slice(ri, ri + k)) &&
        walk(qi + 1, ri + k, true)
      ) {
        return true;
      }
    }
    return false;
  };
  return walk(0, 0, false);
}

/** A code is short and alphabetic; "9201" and "Female" are not codes. */
const CODE_PATTERN = /^[a-z]{1,4}$/;

/**
 * Is the row the term's CODE? Columns store "F" for Female, "S" for Single,
 * "ICU" for Intensive Care Unit — the same initials rule read in the other
 * direction, which is what makes it cover any coded column rather than the
 * demographic ones a synonym table can enumerate.
 */
function isCodeFor(haystack: string, queryWords: string[]): boolean {
  if (!CODE_PATTERN.test(haystack)) return false;
  if (haystack.length !== queryWords.length) return false;
  // A one- or two-letter query matching a one- or two-letter row is exactness,
  // not an abbreviation, and it is handled a tier above.
  if (queryWords.some((w) => w.length < 3)) return false;
  return haystack === initialsOf(queryWords);
}

/**
 * Everything a query might legitimately be stored as.
 *
 * `exact` are matched by equality only — a two-letter synonym like "f" would
 * substring-match half the column. `phrases` (3+ chars) may also match as a
 * substring.
 */
export interface QueryExpansion {
  normalized: string;
  /** The words of the query as written, for the abbreviation rules. */
  queryWords: string[];
  exact: string[];
  phrases: string[];
  /** Distinctive (non-filler) token sets, one per variant. */
  tokenSets: string[][];
}

/**
 * `corpus` is the column being matched against, and is what makes filler a
 * measurement rather than a guess. Omit it on the blind-retry path, where there
 * is no column to measure.
 */
export function expandQuery(
  query: string,
  corpus?: ValueCorpus,
): QueryExpansion {
  const normalized = normalizeToken(query);
  const variants = new Set<string>();
  if (normalized) variants.add(normalized);

  // Demographic synonyms, whole-query only ("women" -> "female").
  const group = SYNONYM_GROUPS.find((g) => g.includes(normalized));
  for (const s of group ?? []) variants.add(s);

  // Seeded abbreviations, expanded in place ("er visit" -> "emergency room
  // visit") and standalone ("emergency room"), so both a phrase match and a
  // token match can land. Abbreviations the row spells out need no seed — see
  // `abbreviates`.
  const tokens = tokensOf(normalized);
  for (let i = 0; i < tokens.length; i++) {
    for (const expansion of ABBREVIATION_SEEDS[tokens[i]] ?? []) {
      const replaced = [...tokens];
      replaced[i] = expansion;
      variants.add(replaced.join(" "));
      variants.add(expansion);
    }
  }

  const all = [...variants];
  const distinctive = (variant: string): string[] => {
    const words = tokensOf(variant);
    const kept = words.filter((t) => !isFiller(t, corpus));
    // A query made entirely of the column's common words still has to reach
    // something; a weak match beats reporting the value absent.
    return kept.length ? kept : words;
  };

  return {
    normalized,
    queryWords: tokens,
    exact: all,
    phrases: all.filter((v) => v.length >= 3),
    tokenSets: all.map(distinctive).filter((ts) => ts.length > 0),
  };
}

/**
 * How well a row answers the query. Lower is better; `undefined` is no match.
 *  0 the row IS the term                  3 every distinctive word is present
 *  1 the row contains the term            4 some distinctive word is present
 *  2 the term abbreviates the row, or the row is the term's code
 */
export function rankValueRow(
  row: ValueRow,
  ex: QueryExpansion,
): number | undefined {
  const haystacks = [row?.label, row?.value].map(normalizeToken).filter(Boolean);
  if (!haystacks.length) return undefined;
  if (!ex.normalized) return undefined;

  if (haystacks.some((h) => ex.exact.includes(h))) return 0;
  if (haystacks.some((h) => ex.phrases.some((v) => h.includes(v)))) return 1;
  if (
    haystacks.some((h) =>
      abbreviates(ex.queryWords, tokensOf(h)) || isCodeFor(h, ex.queryWords)
    )
  ) {
    return 2;
  }

  const haystackTokens = haystacks.flatMap((h) => h.split(" ").filter(Boolean));
  const has = (t: string) => haystackTokens.includes(t);
  if (ex.tokenSets.some((ts) => ts.every(has))) return 3;
  if (ex.tokenSets.some((ts) => ts.some((t) => t.length >= 3 && has(t)))) {
    return 4;
  }
  return undefined;
}

export interface RankedValue {
  row: ValueRow;
  rank: number;
}

/** Rows that match `query`, best first (stable within a rank). */
export function rankValues(rows: ValueRow[], query: string): RankedValue[] {
  const corpus = buildCorpus(
    rows.map((r) => [String(r?.label ?? ""), String(r?.value ?? "")]),
  );
  const ex = expandQuery(query, corpus);
  return rows
    .map((row) => ({ row, rank: rankValueRow(row, ex) }))
    .filter((m): m is RankedValue => m.rank !== undefined)
    .sort((a, b) => a.rank - b.rank);
}

/** Title case first: stored concept names usually look like "Emergency Room Visit". */
function casings(phrase: string): string[] {
  const lower = phrase.toLowerCase();
  const title = lower.replace(/\b[a-z]/g, (c) => c.toUpperCase());
  return [...new Set([title, lower, phrase.toUpperCase()])];
}

/**
 * Each retry is another 20s-timeout call to the values endpoint, so this branch
 * (domain not enumerable AND the direct search failed) has to stay bounded.
 */
export const MAX_ALTERNATE_QUERIES = 9;

/**
 * Queries to retry the endpoint with when the domain can't be enumerated: the
 * term as written in every casing, then its expansions and distinctive words.
 * Searching the one distinctive word ("emergency") is what finds a value the
 * user's phrase ("ER visit") is not a substring of, and the casing sweep covers
 * a backend whose LIKE is case-sensitive.
 */
export function alternateQueries(query: string): string[] {
  const ex = expandQuery(query);
  const phrases: string[] = [ex.normalized];
  const add = (p: string) => {
    if (p && !phrases.includes(p)) phrases.push(p);
  };
  for (const p of ex.phrases) add(p);
  for (const ts of ex.tokenSets) {
    for (const t of ts) if (t.length >= 3) add(t);
  }

  const out = new Set<string>();
  for (const phrase of phrases) {
    for (const variant of casings(phrase)) {
      if (variant !== query) out.add(variant);
    }
  }
  return [...out].slice(0, MAX_ALTERNATE_QUERIES);
}

/**
 * The ladder. Returns rows for the model to pick from, and says HOW they were
 * found — never "not found" while the attribute still has values the caller
 * hasn't been shown.
 */
export async function searchAttributeValues(
  fetchValues: ValueFetcher,
  query: string,
): Promise<ValueSearchResult> {
  const q = String(query ?? "").trim();

  // No query: the caller wants the whole column. For a low-cardinality
  // attribute (gender, visit type) this is the fastest and most reliable route
  // and cannot produce a false negative.
  if (!q) {
    const domain = await fetchValues("");
    return {
      rows: domain,
      matchedVia: "domain",
      matchedQuery: "",
      domainTotal: domain.length,
    };
  }

  const direct = await fetchValues(q);
  if (direct.length > 0) {
    return { rows: direct, matchedVia: "search", matchedQuery: q };
  }

  // Empty search: re-read the unfiltered domain and match it here, where the
  // rules are ours (casing, synonyms, abbreviations, token subsets).
  const domain = await fetchValues("");
  if (domain.length > 0) {
    const local = rankValues(domain, q);
    if (local.length > 0) {
      return {
        rows: local.map((m) => m.row),
        matchedVia: "domain-scan",
        matchedQuery: q,
        domainTotal: domain.length,
      };
    }
    // Hand back the COMPLETE list rather than "not found", so the caller can
    // pick (or rule the attribute out) in this same step.
    return {
      rows: domain,
      matchedVia: "domain",
      matchedQuery: q,
      domainTotal: domain.length,
    };
  }

  // The domain isn't enumerable (too large, or the endpoint only answers
  // searches), so retry the search itself with the rewritten queries.
  for (const alt of alternateQueries(q)) {
    const rows = await fetchValues(alt);
    if (rows.length > 0) {
      return { rows, matchedVia: "alternate-query", matchedQuery: alt };
    }
  }

  return { rows: [], matchedVia: "none", matchedQuery: q };
}

/** `- Emergency Room Visit` / `- Female (value: F)` when the token differs. */
export function formatValueRows(rows: ValueRow[], limit: number): string {
  if (rows.length === 0) return "(none)";
  return rows
    .slice(0, limit)
    .map((r) =>
      normalizeToken(r.label) === normalizeToken(r.value)
        ? `- ${r.value}`
        : `- ${r.label} (value: ${r.value})`,
    )
    .join("\n");
}

/**
 * Render a value listing as the text the model acts on (the model never sees
 * `structuredContent` — see toolText.ts).
 *
 * The header says WHAT the rows are: matches, or the attribute's whole value
 * list because nothing matched. That distinction is the whole point — told only
 * "0 results", a model reports the value as missing from the dataset; shown the
 * complete column, it picks the row that means what the user asked for.
 */
export function renderValueListing(opts: {
  cardName: string;
  attributeName: string;
  query: string;
  result: ValueSearchResult;
  cap: number;
}): string {
  const { cardName, attributeName, query, result, cap } = opts;
  const { rows, matchedVia, matchedQuery, domainTotal } = result;
  const shown = Math.min(rows.length, cap);
  const head = `${attributeName} (card "${cardName}")`;
  const lines: string[] = [];

  if (rows.length === 0) {
    return (
      `${head}: no value matched "${query}", and the attribute's full value ` +
      `list could not be enumerated (the column is too large to list).\n` +
      `Search a narrower or more distinctive word, or filter this card on a ` +
      `concept set instead. Do NOT conclude the term is absent from the dataset.`
    );
  }

  if (matchedVia === "domain" && query) {
    lines.push(
      `${head}: nothing matched "${query}", so these are ALL ${domainTotal} ` +
        `values the attribute can take — no further search will find anything ` +
        `else here. Pick the row that expresses "${query}"; if genuinely none ` +
        `does, say what the column actually contains rather than asking the ` +
        `user for another spelling.`,
    );
  } else if (matchedVia === "domain") {
    lines.push(`${head}: complete value list (${rows.length} values).`);
  } else if (matchedVia === "domain-scan") {
    lines.push(
      `${head}: the endpoint's search for "${query}" returned nothing, but ` +
        `matching its full value list (${domainTotal} values) locally found ` +
        `${rows.length} — the search matches stored text, not meaning, so an ` +
        `empty result is never proof a value is absent.`,
    );
  } else if (matchedVia === "alternate-query") {
    lines.push(
      `${head}: "${query}" returned nothing but "${matchedQuery}" matched ` +
        `${rows.length} values.`,
    );
  } else {
    lines.push(`${head}: ${rows.length} values matching "${query}".`);
  }

  lines.push("Pass one of these values verbatim as a constraint value:");
  lines.push(formatValueRows(rows, cap));
  if (rows.length > shown) {
    lines.push(
      `… and ${rows.length - shown} more. Narrow the query rather than raising ` +
        `\`limit\` — a broad term matches many tokens, and one of them is rarely ` +
        `the whole answer. To match several at once use { op: "in", value: [...] }.`,
    );
  }
  return lines.join("\n");
}

/** Cap on how many candidates an error message lists before it stops helping. */
const ERROR_LIST_LIMIT = 25;

function listForError(rows: ValueRow[]): string {
  const shown = formatValueRows(rows, ERROR_LIST_LIMIT);
  return rows.length > ERROR_LIST_LIMIT
    ? `${shown}\n… and ${rows.length - ERROR_LIST_LIMIT} more`
    : shown;
}

/**
 * Resolve one term to one stored token, or throw an error the model can act on
 * in its next call.
 *
 * The auto-pick rule is deliberately tight: a unique best candidate, or an
 * exact hit. Where several rows are equally plausible ("Emergency Room Visit"
 * vs "Emergency Room and Inpatient Visit") the choice changes which patients
 * are in the cohort, so the caller is handed the candidates instead of a
 * silently-picked first row — which is what the previous `values[0]` did.
 */
export async function resolveCategoryValue(
  fetchValues: ValueFetcher,
  attributeName: string,
  raw: string,
): Promise<string> {
  const q = String(raw ?? "").trim();
  if (!q) {
    throw new Error(`Empty value for "${attributeName}".`);
  }

  const result = await searchAttributeValues(fetchValues, q);

  if (result.rows.length === 0) {
    throw new Error(
      `No value for "${attributeName}" matching "${q}", and the attribute's ` +
        `full value list could not be enumerated (the column is too large to ` +
        `list). Search a narrower or more distinctive term with ` +
        `list_cohort_filter_values, or filter this card on a concept set instead.`,
    );
  }

  const ranked = rankValues(result.rows, q);

  if (ranked.length === 0) {
    // matchedVia "domain": nothing matched, but here is everything there is.
    throw new Error(
      `No value of "${attributeName}" matches "${q}". Below is the attribute's ` +
        `COMPLETE value list (${result.domainTotal ?? result.rows.length} ` +
        `values) — no further search will find anything else here, so pick the ` +
        `row that expresses "${q}" and pass its value, or use a different ` +
        `attribute / concept set. Do not ask the user to guess a spelling.\n` +
        listForError(result.rows),
    );
  }

  const best = ranked[0].rank;
  const tied = ranked.filter((m) => m.rank === best);

  // Distinct rows can carry the same token (label variants of one value).
  const distinct = tied.filter(
    (m, i) => tied.findIndex((o) => o.row.value === m.row.value) === i,
  );
  if (distinct.length === 1) return distinct[0].row.value;

  // A tie at rank 0 is still a tie when it was the EXPANSION that matched:
  // "ER" reaches both "Emergency Room Visit" and "Emergency Department Visit",
  // and those are different cohorts. Only a literal hit on what the caller
  // actually wrote decides it.
  const ex = expandQuery(q);
  const literal = distinct.filter((m) =>
    [m.row.label, m.row.value].map(normalizeToken).includes(ex.normalized),
  );
  if (literal.length === 1) return literal[0].row.value;

  throw new Error(
    `"${q}" matches ${tied.length} values of "${attributeName}" and they are ` +
      `not the same cohort, so pick explicitly rather than letting this guess. ` +
      `Pass one of these values exactly, or several at once with ` +
      `{ op: "in", value: [...] } if the user meant any of them:\n` +
      listForError(tied.map((m) => m.row)),
  );
}
