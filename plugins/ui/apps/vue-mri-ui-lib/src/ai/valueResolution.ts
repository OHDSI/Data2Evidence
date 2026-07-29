// Query → stored-value matching for pa_search_attribute_values.
//
// A zero-row search is NOT evidence that a value is absent, and treating it as
// such is how "a cohort of women who had ER visits" ended with the assistant
// asking the user how their dataset spells "female". The /values search runs in
// the database: a HANA/SQL LIKE is case-sensitive, and it matches the stored
// token rather than the clinical word for it — so "female" misses "Female",
// "women" misses "FEMALE", and "ER Visit" misses "Emergency Room Visit" (it is
// not even a substring). When a search comes back empty, the tool re-reads the
// attribute's UNFILTERED domain and matches it HERE, where the rules are ours.
//
// ---------------------------------------------------------------------------
// This is the browser-side twin of
// plugins/functions/mcp-server/src/lib/cohortValueResolver.ts, which does the
// same job for the deep-link surface (the tools that exist when PA is NOT
// mounted). The two cannot share a module — that one is Deno, this one is
// bundled by Vite, and nothing crosses that boundary in this repo — so they are
// kept in step by a shared table of query→expected-row vectors that BOTH suites
// read: mcp-server/src/lib/__fixtures__/value-resolution-vectors.json.
//
// Exported names deliberately match the BE file so the two are diffable
// side by side. If you change the ranking here, change it there, and add the
// case to the vectors rather than to only one suite.
// ---------------------------------------------------------------------------

/** A row as the /values endpoint returns it. `text`/`display_value` are labels. */
export interface ValueRow {
  value?: string | number
  text?: string
  display_value?: string
}

// pa_search_attribute_values caps how many tokens it returns. A coded catalog
// search (a drug/condition on a non-OMOP dataset) routinely matches thousands of
// tokens across code systems (RxNorm/NDC/ATC/SNOMED) and every strength/form —
// e.g. "gemfibrozil" resolved to 1,602 tokens — which floods the model's context
// and makes it guess which one to pick. Return a bounded slice + a count + a
// routing note instead. Callers can raise `limit` (bounded by MAX) if they truly
// need the full list.
export const DEFAULT_VALUE_LIMIT = 50
export const MAX_VALUE_LIMIT = 200

/**
 * How the returned rows were arrived at. Reported to the model because "these
 * are matches", "these are every value the column can take" and "the column
 * could not be read at all" call for completely different next moves.
 */
export type MatchedVia =
  /** The /values endpoint's own search returned these rows. */
  | 'search'
  /** The search found nothing; these matched when we scanned the full list here. */
  | 'domain-scan'
  /** The search found nothing until it was retried with a rewritten query. */
  | 'alternate-query'
  /** No query, OR nothing matched — these rows ARE the complete value list. */
  | 'domain'
  /** Nothing matched and the domain could not be enumerated. */
  | 'none'

export function normalizeToken(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s._\-/(),]+/g, ' ')
    .trim()
}

/**
 * Interchangeable tokens for the low-cardinality demographic columns every
 * cohort starts from. A dataset stores sex as "FEMALE", "Female", "F" or a
 * concept id depending on the backend, and the user says "women".
 *
 * Deliberately narrow — demographics and booleans only. Clinical terms are NOT
 * synonym-expanded: a near-miss concept is a silent clinical error, so those
 * still route through concept sets / the vocabulary tools.
 */
const SYNONYM_GROUPS: string[][] = [
  ['female', 'f', 'fem', 'woman', 'women', 'girl', 'girls'],
  ['male', 'm', 'man', 'men', 'boy', 'boys'],
  ['unknown', 'u', 'unk', 'not known', 'no matching concept'],
  ['other', 'o'],
  ['yes', 'y', 'true'],
  ['no', 'n', 'false'],
]

/**
 * Everyday care-SETTING abbreviations. These are administrative vocabulary, not
 * clinical judgement: "ER" is an emergency room encounter on every dataset, and
 * making the user spell that out is the tool failing at its job.
 *
 * Clinical abbreviations (MI, CA, RA, MS, …) are deliberately absent. Those are
 * genuinely ambiguous, and expanding one to a near-miss concept is a silent
 * clinical error — they route through concept sets and the vocabulary tools,
 * where the user gets to confirm what was chosen.
 */
const SETTING_ABBREVIATIONS: Record<string, string[]> = {
  er: ['emergency room', 'emergency department', 'emergency'],
  ed: ['emergency department', 'emergency room', 'emergency'],
  ip: ['inpatient'],
  op: ['outpatient'],
  icu: ['intensive care unit', 'intensive care'],
  snf: ['skilled nursing facility'],
  ltc: ['long term care'],
  amb: ['ambulatory'],
}

/**
 * Words that carry no discriminating power in a value column, dropped when
 * matching by token so "ER Visit" can reach "Emergency Room Visit". Only ever
 * used to LOOSEN a match, never to reject a candidate.
 */
const FILLER_TOKENS = new Set([
  'visit',
  'visits',
  'encounter',
  'encounters',
  'patient',
  'patients',
  'concept',
  'name',
  'value',
  'the',
  'of',
  'and',
  'or',
  'a',
  'an',
])

const tokensOf = (s: string): string[] => normalizeToken(s).split(' ').filter(Boolean)

/**
 * Everything a query might legitimately be stored as.
 *
 * `exact` are matched by equality only — a two-letter synonym like "f" would
 * substring-match half the column. `phrases` (3+ chars) may also match as a
 * substring.
 */
export interface QueryExpansion {
  normalized: string
  exact: string[]
  phrases: string[]
  /** Distinctive (non-filler) token sets, one per variant. */
  tokenSets: string[][]
}

export function expandQuery(query: string): QueryExpansion {
  const normalized = normalizeToken(query)
  const variants = new Set<string>()
  if (normalized) variants.add(normalized)

  // Demographic synonyms, whole-query only ("women" -> "female").
  const group = SYNONYM_GROUPS.find(g => g.includes(normalized))
  for (const s of group ?? []) variants.add(s)

  // Setting abbreviations, expanded in place ("er visit" -> "emergency room
  // visit") and standalone ("emergency room"), so both a phrase match and a
  // token match can land.
  const tokens = tokensOf(normalized)
  for (let i = 0; i < tokens.length; i += 1) {
    for (const expansion of SETTING_ABBREVIATIONS[tokens[i]] ?? []) {
      const replaced = [...tokens]
      replaced[i] = expansion
      variants.add(replaced.join(' '))
      variants.add(expansion)
    }
  }

  const all = [...variants]
  return {
    normalized,
    exact: all,
    phrases: all.filter(v => v.length >= 3),
    tokenSets: all.map(v => tokensOf(v).filter(t => !FILLER_TOKENS.has(t))).filter(ts => ts.length > 0),
  }
}

/**
 * How well a row answers the query. Lower is better; `undefined` is no match.
 *  0 the row IS the term            3 every distinctive word is present
 *  1 the row contains the term      4 some distinctive word is present
 */
export function rankValueRow(row: ValueRow, ex: QueryExpansion): number | undefined {
  const haystacks = [row?.text, row?.display_value, row?.value].map(normalizeToken).filter(Boolean)
  if (!haystacks.length) return undefined
  if (!ex.normalized) return undefined

  if (haystacks.some(h => ex.exact.includes(h))) return 0
  if (haystacks.some(h => ex.phrases.some(v => h.includes(v)))) return 1

  const haystackTokens = haystacks.flatMap(h => h.split(' ').filter(Boolean))
  const has = (t: string) => haystackTokens.includes(t)
  if (ex.tokenSets.some(ts => ts.every(has))) return 3
  if (ex.tokenSets.some(ts => ts.some(t => t.length >= 3 && has(t)))) return 4
  return undefined
}

export interface RankedValue {
  row: ValueRow
  rank: number
}

/** Rows that match `query`, best first (stable within a rank). */
export function rankValues(rows: ValueRow[], query: string): RankedValue[] {
  const ex = expandQuery(query)
  return rows
    .map(row => ({ row, rank: rankValueRow(row, ex) }))
    .filter((m): m is RankedValue => m.rank !== undefined)
    .sort((a, b) => a.rank - b.rank)
}

/** Title case first: stored concept names usually look like "Emergency Room Visit". */
const casings = (phrase: string): string[] => {
  const lower = phrase.toLowerCase()
  const title = lower.replace(/\b[a-z]/g, c => c.toUpperCase())
  return [...new Set([title, lower, phrase.toUpperCase()])]
}

/**
 * Each retry is another call to the values endpoint, so this branch (domain not
 * enumerable AND the direct search failed) has to stay bounded.
 */
export const MAX_ALTERNATE_QUERIES = 9

/**
 * Queries to retry the endpoint with when the domain can't be enumerated: the
 * term as written in every casing, then its expansions and distinctive words.
 * Searching the one distinctive word ("emergency") is what finds a value the
 * user's phrase ("ER visit") is not a substring of, and the casing sweep covers
 * a backend whose LIKE is case-sensitive.
 */
export function alternateQueries(query: string): string[] {
  const ex = expandQuery(query)
  const phrases: string[] = [ex.normalized]
  const add = (p: string) => {
    if (p && !phrases.includes(p)) phrases.push(p)
  }
  for (const p of ex.phrases) add(p)
  for (const ts of ex.tokenSets) {
    for (const t of ts) if (t.length >= 3) add(t)
  }

  const out = new Set<string>()
  for (const phrase of phrases) {
    for (const variant of casings(phrase)) {
      if (variant !== query) out.add(variant)
    }
  }
  return [...out].slice(0, MAX_ALTERNATE_QUERIES)
}
