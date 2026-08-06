import { describe, it, expect } from 'vitest'
import { alternateQueries, rankValues, MAX_ALTERNATE_QUERIES, type ValueRow } from '../valueResolution'

// The rules are written as query → expected-rows vectors rather than as assertions
// about the implementation, because the same table has to hold for a SECOND
// implementation: the mcp-server resolver that answers the deep-link surface (the
// cohort tools that exist when PA is not mounted). The two cannot share a module —
// that one is Deno, this one is bundled by Vite, and nothing crosses that boundary
// in this repo — so a shared table is what keeps them in step.
//
// The vectors live here for now because that resolver is not in this branch. When it
// lands, MOVE this table to
// plugins/functions/mcp-server/src/lib/__fixtures__/value-resolution-vectors.json
// and have both suites read it: while the rules exist in only one suite, a ranking
// change can improve one surface and silently leave the other behind — which is
// exactly what had happened (the backend resolved "ER visit" and these tools did not).
//
// THE RULES, best match first. Each is a property of the two strings or of the
// column, not a list of terms someone thought of, so they hold on a dataset nobody
// here has seen:
//   0  the row IS the term            after casing and demographic-synonym expansion
//   1  the row CONTAINS the term      as a substring, 3+ characters
//   2  the term ABBREVIATES the row   read from the row's FIRST word, each query word
//                                     consuming either the next row word or the
//                                     initials of the next several
//      …or the row IS the term's CODE the same initials rule read the other way
//                                     ('F' <- Female)
//   3  every DISTINCTIVE word is present
//   4  some distinctive word is present
//
// A word is distinctive when it separates one row of THIS column from another —
// measured as the share of rows carrying it (>= 60%, over columns of 4+ rows, is
// filler). Below that the rules fall back to a small seeded list, because a frequency
// over two rows means nothing.
//
// Two things stay seeded and cannot be derived: demographic synonyms ("women" ->
// "female"; no structure gets you there) and abbreviations whose expansion is NOT in
// the row ("ICU" where the column says "Intensive Care"). The seeds also drive the
// blind-retry path, which has no rows to measure — an abbreviation cannot be inverted
// into a search term without a lexicon.

/**
 * `rows` use a neutral shape { value, label }; the backend suite maps the same table
 * onto its own row type. Row counts matter: a case written with two rows is testing
 * the seeded fallback, not the measured rule.
 */
interface RankingVector {
  name: string
  /** Why the case exists. Documentation — no assertion reads it. */
  why?: string
  query: string
  rows: Array<{ value: string; label: string }>
  /** The `value` of every row that must match, best first. Empty = nothing may match. */
  expectedOrder: string[]
}

/** The retry queries used when the attribute's domain cannot be enumerated. */
interface AlternateQueryVector {
  name: string
  why?: string
  query: string
  mustInclude?: string[]
  mustNotInclude?: string[]
  maxLength?: number
}

const RANKING_VECTORS: RankingVector[] = [
  {
    name: 'an exact token beats a longer value that merely contains it',
    query: 'F',
    rows: [
      { value: 'FEMALE_RELATIVE', label: 'Female relative' },
      { value: 'F', label: 'Female' },
    ],
    expectedOrder: ['F', 'FEMALE_RELATIVE'],
  },
  {
    name: 'casing alone never hides a value',
    why: 'The /values search runs a case-sensitive LIKE in the database.',
    query: 'female',
    rows: [{ value: '8532', label: 'FEMALE' }],
    expectedOrder: ['8532'],
  },
  {
    name: 'the value column is matched too, not only the label',
    query: 'sinusitis',
    rows: [{ value: 'Acute sinusitis', label: '' }],
    expectedOrder: ['Acute sinusitis'],
  },
  {
    name: 'a demographic synonym resolves to the stored token',
    why:
      'The user says "women"; the column stores "F". Never ask the user how their data spells it. ' +
      'Not derivable — this one is seeded.',
    query: 'women',
    rows: [
      { value: 'M', label: 'Male' },
      { value: 'F', label: 'Female' },
    ],
    expectedOrder: ['F'],
  },

  {
    name: 'a term reaches a row it is not a substring of, by abbreviating it',
    why: 'The reported failure: the /values search found nothing and the assistant reported the value absent.',
    query: 'ER Visit',
    rows: [
      { value: '9203', label: 'Emergency Room Visit' },
      { value: '9201', label: 'Inpatient Visit' },
      { value: '9202', label: 'Outpatient Visit' },
    ],
    expectedOrder: ['9203'],
  },
  {
    name: 'an acronym no list contains still reaches its expansion',
    why:
      'The point of deriving the rule: NICU is in no table here, and neither will be whatever a given dataset ' +
      'uses (ASC, LTACH, PCP). The initials must come out of the row itself.',
    query: 'NICU',
    rows: [
      { value: '581379', label: 'Neonatal Intensive Care Unit' },
      { value: '32037', label: 'Intensive Care Unit' },
      { value: '9201', label: 'Inpatient Visit' },
      { value: '8717', label: 'Nursing Home' },
    ],
    expectedOrder: ['581379'],
  },
  {
    name: 'initials are read from the START of the row, never from inside it',
    why:
      'Precision over recall, the same trade this module makes everywhere: reading initials from anywhere ' +
      'inside a row lets an acronym claim rows it does not name, and a near-miss value is a silent clinical ' +
      'error. A row an acronym does not reach is still shown — nothing matching returns the whole column.',
    query: 'ASC',
    rows: [
      { value: '581379', label: 'Ambulatory Surgical Center' },
      { value: '8940', label: 'Hospital Ambulatory Surgical Center' },
      { value: '9201', label: 'Inpatient Visit' },
    ],
    expectedOrder: ['581379'],
  },
  {
    name: 'a seeded abbreviation covers an expansion the row does not spell out',
    why:
      'The column says "Intensive Care"; there is no "U" in the row to derive the U of ICU from. This is why ' +
      'the seed list still exists.',
    query: 'ICU',
    rows: [
      { value: '32037', label: 'Intensive Care' },
      { value: '9201', label: 'Inpatient Visit' },
    ],
    expectedOrder: ['32037'],
  },
  {
    name: "a coded column is reached by the term's own initials",
    why:
      'Not a demographics rule: marital status, discharge status and yes/no flags are all stored as bare ' +
      "letters, and no synonym table can enumerate them. The row's code has to be derived FROM the term.",
    query: 'single',
    rows: [
      { value: 'S', label: 'S' },
      { value: 'M', label: 'M' },
      { value: 'W', label: 'W' },
      { value: 'D', label: 'D' },
    ],
    expectedOrder: ['S'],
  },

  {
    name: 'a word nearly every row carries stops discriminating',
    why: '"Visit" cannot tell you which visit type is meant when four rows in five say it.',
    query: 'intensive care visit',
    rows: [
      { value: '9201', label: 'Inpatient Visit' },
      { value: '9202', label: 'Outpatient Visit' },
      { value: '9203', label: 'Emergency Room Visit' },
      { value: '581379', label: 'Inpatient Intensive Care' },
      { value: '262', label: 'Emergency Room and Inpatient Visit' },
    ],
    expectedOrder: ['581379'],
  },
  {
    name: 'the same word still discriminates in a column that does not repeat it',
    why:
      'The converse, and the reason filler is measured rather than listed: here "visit" is what separates one ' +
      'row from the other, so the row carrying it must rank first.',
    query: 'emergency visit',
    rows: [
      { value: '9203', label: 'Emergency Room Visit' },
      { value: '8870', label: 'Emergency Room - Hospital' },
      { value: '4021', label: 'Operating Room' },
      { value: '32037', label: 'Intensive Care' },
      { value: '8717', label: 'Nursing Home' },
    ],
    expectedOrder: ['9203', '8870'],
  },
  {
    name: 'a column too short to measure falls back to the seeded filler words',
    why:
      'Two rows is not a frequency. Without the fallback "visit" would count as distinctive and the target ' +
      'row, which lacks it, would drop below a row that has nothing else in common.',
    query: 'intensive care visit',
    rows: [
      { value: '581379', label: 'Inpatient Intensive Care' },
      { value: '9202', label: 'Outpatient Visit' },
    ],
    expectedOrder: ['581379'],
  },
  {
    name: 'a row sharing only one distinctive word ranks below the phrase matches',
    query: 'emergency room',
    rows: [
      { value: '8870', label: 'Emergency Room - Hospital' },
      { value: '9203', label: 'Emergency Room and Inpatient Visit' },
      { value: '4021', label: 'Operating Room' },
    ],
    expectedOrder: ['8870', '9203', '4021'],
  },

  {
    name: 'an unrelated term matches nothing rather than something close',
    why: 'A near-miss clinical concept is a silent clinical error; better to return the whole column.',
    query: 'diabetes',
    rows: [
      { value: '9201', label: 'Inpatient Visit' },
      { value: 'F', label: 'Female' },
    ],
    expectedOrder: [],
  },
  {
    name: 'an empty query matches nothing (the caller asks for the whole domain instead)',
    query: '',
    rows: [{ value: 'F', label: 'Female' }],
    expectedOrder: [],
  },
]

const ALTERNATE_QUERY_VECTORS: AlternateQueryVector[] = [
  {
    name: 'a phrase the endpoint cannot match is retried by its expansions',
    why: 'Title case first: a stored concept name usually looks like "Emergency Room Visit".',
    query: 'ER visit',
    mustInclude: ['Emergency Room Visit', 'Emergency Room', 'ER VISIT'],
    mustNotInclude: ['visit', 'Visit', 'VISIT'],
  },
  {
    name: 'casings are swept for a case-sensitive LIKE',
    query: 'female',
    mustInclude: ['Female', 'FEMALE'],
  },
  {
    name: 'bounded, so a failed search cannot fan out into many endpoint calls',
    query: 'acute upper respiratory infection of the intensive care unit',
    maxLength: 9,
  },
]

// The neutral { value, label } row shape onto what the /values endpoint returns.
const toValueRow = ({ value, label }: { value: string; label: string }): ValueRow => ({
  value,
  text: label,
  display_value: label,
})

describe('valueResolution — the contract shared with the backend resolver', () => {
  it.each(RANKING_VECTORS)('$name', ({ query, rows, expectedOrder }) => {
    const ranked = rankValues(rows.map(toValueRow), query).map(m => String(m.row.value))
    expect(ranked).toEqual(expectedOrder)
  })

  it.each(ALTERNATE_QUERY_VECTORS)('$name', ({ query, mustInclude, mustNotInclude, maxLength }) => {
    const queries = alternateQueries(query)
    for (const expected of mustInclude ?? []) expect(queries).toContain(expected)
    for (const forbidden of mustNotInclude ?? []) expect(queries).not.toContain(forbidden)
    expect(queries.length).toBeLessThanOrEqual(maxLength ?? MAX_ALTERNATE_QUERIES)
  })
})

// Browser-side specifics, not part of the shared contract.
describe('valueResolution', () => {
  it('never returns the query itself as an alternate — it has already been tried', () => {
    expect(alternateQueries('Female')).not.toContain('Female')
  })

  it('ignores a row with no label and no value', () => {
    expect(rankValues([{ value: '', text: '', display_value: '' }], 'female')).toEqual([])
  })

  // A two-letter synonym as a substring rule would match half the column ("f" is
  // in "Left foot"), so short variants are matched by equality only.
  it('does not substring-match a short synonym', () => {
    const ranked = rankValues([{ value: 'LF', text: 'Left foot', display_value: 'Left foot' }], 'female')
    expect(ranked).toEqual([])
  })
})
