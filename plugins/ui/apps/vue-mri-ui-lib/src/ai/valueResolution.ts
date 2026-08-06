// Query → stored-value matching for pa_search_attribute_values.
//
// A zero-row search is NOT evidence that a value is absent. The /values search runs in
// the database: a HANA/SQL LIKE is case-sensitive, and it matches the stored
// token rather than the clinical word for it — so "women" misses "FEMALE". When a
// search comes back empty, the tool re-reads the attribute's UNFILTERED domain and
// matches it HERE.
//
// ---------------------------------------------------------------------------
// This is the browser-side twin of the mcp-server's cohortValueResolver.ts,
// which does the same job for the deep-link surface (the tools that exist when
// PA is NOT mounted). That file is not in this branch yet. The two cannot share
// a module — that one is Deno, this one is bundled by Vite, and nothing crosses
// that boundary in this repo — so they are kept in step by a shared table of
// query→expected-row vectors that both suites read. Until the backend lands,
// that table lives in __tests__/valueResolution.test.ts; the header there says
// where it moves to.
//
// Exported names deliberately match the BE file so the two are diffable side by
// side.
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
  er: ['emergency room', 'emergency department', 'emergency'],
  ed: ['emergency department', 'emergency room', 'emergency'],
  ip: ['inpatient'],
  op: ['outpatient'],
  icu: ['intensive care unit', 'intensive care'],
  snf: ['skilled nursing facility'],
  ltc: ['long term care'],
  amb: ['ambulatory'],
}

const tokensOf = (s: string): string[] => normalizeToken(s).split(' ').filter(Boolean)

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
const STOP_WORDS = new Set(['the', 'of', 'and', 'or', 'a', 'an', 'for', 'to', 'with'])

/**
 * The fallback for when there is no column to learn from: the blind-retry path,
 * and columns with too few rows for a frequency to mean anything. Rows overrule
 * these wherever there are enough of them.
 */
const SEED_FILLER = new Set([
  'visit',
  'visits',
  'encounter',
  'encounters',
  'patient',
  'patients',
  'concept',
  'name',
  'value',
])

/** A word this share of the column's rows carry cannot tell you WHICH row. */
const FILLER_DOCUMENT_FREQUENCY = 0.6
/** Under this many rows a frequency is noise, so the seeds stand in. */
const MIN_ROWS_FOR_FREQUENCY = 4

/** How often each word occurs across the rows being ranked. */
export interface ValueCorpus {
  size: number
  /** word -> number of rows containing it */
  documentFrequency: Map<string, number>
}

export function buildCorpus(rowTexts: string[][]): ValueCorpus {
  const documentFrequency = new Map<string, number>()
  for (const texts of rowTexts) {
    for (const token of new Set(texts.flatMap(tokensOf))) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1)
    }
  }
  return { size: rowTexts.length, documentFrequency }
}

/** Only ever used to LOOSEN a match, never to reject a candidate. */
function isFiller(token: string, corpus?: ValueCorpus): boolean {
  if (STOP_WORDS.has(token)) return true
  if (corpus && corpus.size >= MIN_ROWS_FOR_FREQUENCY) {
    const df = corpus.documentFrequency.get(token) ?? 0
    return df / corpus.size >= FILLER_DOCUMENT_FREQUENCY
  }
  return SEED_FILLER.has(token)
}

// ---------------------------------------------------------------------------
// Abbreviations, derived from the two strings rather than listed
// ---------------------------------------------------------------------------

/** ["emergency", "room"] -> "er" */
const initialsOf = (words: string[]): string => words.map(w => w[0]).join('')

/** Value labels are a few words; a runaway input is not. */
const MAX_ABBREVIATED_WORDS = 5

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
  if (!queryWords.length || !rowWords.length) return false
  if (rowWords.length > 12) return false

  const walk = (qi: number, ri: number, abbreviated: boolean): boolean => {
    if (qi === queryWords.length) return abbreviated
    if (ri === rowWords.length) return false
    const word = queryWords[qi]
    if (word === rowWords[ri] && walk(qi + 1, ri + 1, abbreviated)) return true
    const span = Math.min(MAX_ABBREVIATED_WORDS, rowWords.length - ri)
    for (let k = 2; k <= span; k += 1) {
      if (word === initialsOf(rowWords.slice(ri, ri + k)) && walk(qi + 1, ri + k, true)) return true
    }
    return false
  }
  return walk(0, 0, false)
}

/** A code is short and alphabetic; "9201" and "Female" are not codes. */
const CODE_PATTERN = /^[a-z]{1,4}$/

/**
 * Is the row the term's CODE? Columns store "F" for Female, "S" for Single,
 * "ICU" for Intensive Care Unit — the same initials rule read in the other
 * direction, which is what makes it cover any coded column rather than the
 * demographic ones a synonym table can enumerate.
 */
function isCodeFor(haystack: string, queryWords: string[]): boolean {
  if (!CODE_PATTERN.test(haystack)) return false
  if (haystack.length !== queryWords.length) return false
  // A one- or two-letter query matching a one- or two-letter row is exactness,
  // not an abbreviation, and it is handled a tier above.
  if (queryWords.some(w => w.length < 3)) return false
  return haystack === initialsOf(queryWords)
}

/**
 * Everything a query might legitimately be stored as.
 *
 * `exact` are matched by equality only — a two-letter synonym like "f" would
 * substring-match half the column. `phrases` (3+ chars) may also match as a
 * substring.
 */
export interface QueryExpansion {
  normalized: string
  /** The words of the query as written, for the abbreviation rules. */
  queryWords: string[]
  exact: string[]
  phrases: string[]
  /** Distinctive (non-filler) token sets, one per variant. */
  tokenSets: string[][]
}

/**
 * `corpus` is the column being matched against, and is what makes filler a
 * measurement rather than a guess. Omit it on the blind-retry path, where there
 * is no column to measure.
 */
export function expandQuery(query: string, corpus?: ValueCorpus): QueryExpansion {
  const normalized = normalizeToken(query)
  const variants = new Set<string>()
  if (normalized) variants.add(normalized)

  // Demographic synonyms, whole-query only ("women" -> "female").
  const group = SYNONYM_GROUPS.find(g => g.includes(normalized))
  for (const s of group ?? []) variants.add(s)

  // Seeded abbreviations, expanded in place ("er visit" -> "emergency room
  // visit") and standalone ("emergency room"), so both a phrase match and a
  // token match can land. Abbreviations the row spells out need no seed — see
  // `abbreviates`.
  const tokens = tokensOf(normalized)
  for (let i = 0; i < tokens.length; i += 1) {
    for (const expansion of ABBREVIATION_SEEDS[tokens[i]] ?? []) {
      const replaced = [...tokens]
      replaced[i] = expansion
      variants.add(replaced.join(' '))
      variants.add(expansion)
    }
  }

  const all = [...variants]
  const distinctive = (variant: string): string[] => {
    const words = tokensOf(variant)
    const kept = words.filter(t => !isFiller(t, corpus))
    // A query made entirely of the column's common words still has to reach
    // something; a weak match beats reporting the value absent.
    return kept.length ? kept : words
  }

  return {
    normalized,
    queryWords: tokens,
    exact: all,
    phrases: all.filter(v => v.length >= 3),
    tokenSets: all.map(distinctive).filter(ts => ts.length > 0),
  }
}

/**
 * How well a row answers the query. Lower is better; `undefined` is no match.
 *  0 the row IS the term                  3 every distinctive word is present
 *  1 the row contains the term            4 some distinctive word is present
 *  2 the term abbreviates the row, or the row is the term's code
 */
export function rankValueRow(row: ValueRow, ex: QueryExpansion): number | undefined {
  const haystacks = [row?.text, row?.display_value, row?.value].map(normalizeToken).filter(Boolean)
  if (!haystacks.length) return undefined
  if (!ex.normalized) return undefined

  if (haystacks.some(h => ex.exact.includes(h))) return 0
  if (haystacks.some(h => ex.phrases.some(v => h.includes(v)))) return 1
  if (haystacks.some(h => abbreviates(ex.queryWords, tokensOf(h)) || isCodeFor(h, ex.queryWords))) return 2

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
  const corpus = buildCorpus(
    rows.map(r => [String(r?.text ?? ''), String(r?.display_value ?? ''), String(r?.value ?? '')])
  )
  const ex = expandQuery(query, corpus)
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
