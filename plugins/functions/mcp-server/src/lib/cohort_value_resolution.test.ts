/**
 * Value resolution for the deep-link (PA-not-mounted) cohort surface.
 *
 * These pin the two failures that made the assistant hand back a non-answer for
 * "a cohort of women who had ER visits under 80":
 *   1. "ER Visit" is not a substring of "Emergency Room Visit", so the /values
 *      search returned nothing and the assistant reported the value as absent
 *      and asked the user to go and check the naming convention themselves;
 *   2. an age constraint aimed at the Visit card was rejected with a bare "no
 *      such attribute", and the assistant concluded age was not filterable —
 *      Age is on the patient card, one clause away.
 *
 * The fetcher is stubbed, so the ladder is pinned without the values endpoint.
 *
 * Run (deno lives in the trex container, not on the host):
 *   docker exec d2e-trex deno test --allow-read --sloppy-imports --no-check \
 *     /usr/src/functions/mcp-server/src/lib/cohort_value_resolution.test.ts
 */

import {
  buildCohortCatalog,
  findAttributeAcrossCards,
  summarizeCatalog,
} from "./cohortCatalog.ts";
import {
  resolveClausesToConstraints,
  type ResolverDeps,
} from "./cohortResolver.ts";
import {
  alternateQueries,
  formatValueRows,
  MAX_ALTERNATE_QUERIES,
  rankValues,
  renderValueListing,
  resolveCategoryValue,
  searchAttributeValues,
  type ValueFetcher,
  type ValueRow,
} from "./cohortValueResolver.ts";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error("ASSERT FAILED: " + msg);
}
function eq(actual: unknown, expected: unknown, msg: string) {
  if (actual !== expected) {
    throw new Error(
      `ASSERT FAILED: ${msg} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}
async function rejects(
  fn: () => Promise<unknown>,
  includes: string[],
  msg: string,
): Promise<string> {
  let message = "";
  try {
    await fn();
  } catch (e) {
    message = String((e as Error)?.message ?? e);
  }
  assert(message, `${msg} — expected a throw, got none`);
  for (const needle of includes) {
    assert(
      message.toLowerCase().includes(needle.toLowerCase()),
      `${msg} — error should mention "${needle}", got: ${message}`,
    );
  }
  return message;
}

const row = (v: string): ValueRow => ({ label: v, value: v });

/**
 * A stand-in for the analytics `/values` endpoint: a case-sensitive substring
 * search over a fixed domain, which is what makes an empty result meaningless.
 * `enumerable: false` models a column too large to list (a 204/TOO_MANY_RESULTS).
 */
function stubEndpoint(
  domain: string[],
  { enumerable = true }: { enumerable?: boolean } = {},
): { fetch: ValueFetcher; calls: string[] } {
  const calls: string[] = [];
  const fetch: ValueFetcher = (q: string) => {
    calls.push(q);
    if (!q) return Promise.resolve(enumerable ? domain.map(row) : []);
    return Promise.resolve(domain.filter((v) => v.includes(q)).map(row));
  };
  return { fetch, calls };
}

const VISIT_TYPES = [
  "Inpatient Visit",
  "Outpatient Visit",
  "Emergency Room Visit",
  "Emergency Room and Inpatient Visit",
  "Non-hospital institution Visit",
];

Deno.test('"ER Visit" resolves to the stored emergency-room token', async () => {
  const { fetch, calls } = stubEndpoint(VISIT_TYPES);
  const value = await resolveCategoryValue(fetch, "Visit concept name", "ER Visit");
  eq(value, "Emergency Room Visit", "resolved token");
  // The endpoint's own search must have come back empty first — otherwise this
  // test isn't exercising the fallback that the failure was about.
  eq(calls[0], "ER Visit", "searched the raw term first");
  assert(calls.includes(""), "fell back to reading the full domain");
});

Deno.test("demographic synonyms: women -> the stored gender token", async () => {
  const { fetch } = stubEndpoint(["FEMALE", "MALE", "UNKNOWN"]);
  eq(
    await resolveCategoryValue(fetch, "Gender", "women"),
    "FEMALE",
    "women -> FEMALE",
  );
  eq(
    await resolveCategoryValue(fetch, "Gender", "female"),
    "FEMALE",
    "casing is not absence",
  );
});

Deno.test("an exact hit wins over a longer value containing it", async () => {
  const { fetch } = stubEndpoint(VISIT_TYPES);
  eq(
    await resolveCategoryValue(fetch, "Visit concept name", "Emergency Room Visit"),
    "Emergency Room Visit",
    "exact match preferred",
  );
});

Deno.test(
  "several equally plausible values are handed back, not silently picked",
  async () => {
    const { fetch } = stubEndpoint(VISIT_TYPES);
    const message = await rejects(
      () => resolveCategoryValue(fetch, "Visit concept name", "Emergency"),
      [
        "Emergency Room Visit",
        "Emergency Room and Inpatient Visit",
        'op: "in"',
      ],
      "ambiguous term",
    );
    assert(
      !message.includes("Inpatient Visit\n") || message.includes("Emergency"),
      "candidates are the emergency ones, not the whole column",
    );
  },
);

Deno.test(
  "nothing matches: the error carries the COMPLETE value list",
  async () => {
    const { fetch } = stubEndpoint(VISIT_TYPES);
    await rejects(
      () => resolveCategoryValue(fetch, "Visit concept name", "telehealth"),
      [
        "complete value list",
        "Inpatient Visit",
        "Emergency Room Visit",
        "do not ask the user",
      ],
      "absent term",
    );
  },
);

Deno.test(
  "a column too large to enumerate is retried with the distinctive word",
  async () => {
    const { fetch, calls } = stubEndpoint(VISIT_TYPES, { enumerable: false });
    const value = await resolveCategoryValue(fetch, "Visit concept name", "ER Visit");
    eq(value, "Emergency Room Visit", "resolved via a rewritten query");
    assert(
      calls.some((c) => c.toLowerCase().startsWith("emergency")),
      `retried an expanded query, calls=${JSON.stringify(calls)}`,
    );
    assert(calls.length <= 12, `bounded retries, calls=${calls.length}`);
  },
);

Deno.test("searchAttributeValues reports HOW rows were found", async () => {
  const { fetch } = stubEndpoint(VISIT_TYPES);

  const scanned = await searchAttributeValues(fetch, "ER Visit");
  eq(scanned.matchedVia, "domain-scan", "empty search -> local domain scan");
  eq(scanned.domainTotal, VISIT_TYPES.length, "domain size reported");

  const missed = await searchAttributeValues(fetch, "telehealth");
  eq(missed.matchedVia, "domain", "no match -> the whole column comes back");
  eq(missed.rows.length, VISIT_TYPES.length, "every value returned");

  const listed = await searchAttributeValues(fetch, "");
  eq(listed.matchedVia, "domain", "no query -> the whole column");

  const hit = await searchAttributeValues(fetch, "Inpatient");
  eq(hit.matchedVia, "search", "endpoint match");
  eq(hit.rows.length, 2, "Inpatient matches two visit types");
});

Deno.test("ranking: exact, substring, then token-subset", () => {
  const ranked = rankValues(VISIT_TYPES.map(row), "ER visit");
  eq(ranked[0].row.value, "Emergency Room Visit", "best candidate first");
  eq(ranked[0].rank, 0, "expanded phrase is an exact hit");
  assert(
    ranked.every((r) => r.row.value.includes("Emergency")),
    `only emergency rows match, got ${JSON.stringify(ranked.map((r) => r.row.value))}`,
  );
});

Deno.test("formatValueRows shows the token when it differs from the label", () => {
  eq(formatValueRows([{ label: "Female", value: "F" }], 5), "- Female (value: F)", "label+value");
  eq(formatValueRows([row("FEMALE")], 5), "- FEMALE", "identical -> once");
  eq(formatValueRows([], 5), "(none)", "empty");
});

Deno.test(
  "the rendered listing says whether rows are matches or the whole column",
  async () => {
    const { fetch } = stubEndpoint(VISIT_TYPES);
    const render = async (query: string) =>
      renderValueListing({
        cardName: "Visit",
        attributeName: "Visit concept name",
        query,
        result: await searchAttributeValues(fetch, query),
        cap: 50,
      });

    const missed = await render("telehealth");
    assert(
      missed.includes("these are ALL 5 values"),
      `a miss returns the whole column, got: ${missed}`,
    );
    assert(
      missed.includes("- Emergency Room Visit"),
      "…and lists it so the model can pick",
    );
    assert(
      missed.toLowerCase().includes("rather than asking the"),
      "…and says not to hand the question back to the user",
    );

    const scanned = await render("ER Visit");
    assert(
      scanned.includes("never proof a value is absent"),
      `a domain scan explains itself, got: ${scanned}`,
    );
    assert(
      scanned.includes("- Emergency Room Visit"),
      "…and carries the token verbatim",
    );

    const listed = await render("");
    assert(
      listed.includes("complete value list (5 values)"),
      `no query lists everything, got: ${listed}`,
    );
  },
);

Deno.test("a truncated listing says to narrow, not to page", async () => {
  const { fetch } = stubEndpoint(VISIT_TYPES);
  const text = renderValueListing({
    cardName: "Visit",
    attributeName: "Visit concept name",
    query: "",
    result: await searchAttributeValues(fetch, ""),
    cap: 2,
  });
  assert(text.includes("and 3 more"), `reports what was cut, got: ${text}`);
  assert(text.includes("Narrow the query"), "tells the model what to do next");
});

// ---------------------------------------------------------------------------
// Resolver integration, against the real captured PA config.
// ---------------------------------------------------------------------------

const STAMP = { configId: "test-config", configVersion: "A" };
const stubDeps: ResolverDeps = {
  resolveValue: (_card, _attr, raw) => Promise.resolve(raw.toUpperCase()),
  conceptSetExists: () => Promise.resolve(true),
};

async function loadCatalog() {
  const configText = await Deno.readTextFile(
    new URL("./__fixtures__/pa-frontend-config.json", import.meta.url),
  );
  return buildCohortCatalog(JSON.parse(configText));
}

Deno.test(
  "age aimed at an event card says which card actually has it",
  async () => {
    const catalog = await loadCatalog();
    await rejects(
      () =>
        resolveClausesToConstraints(
          [{ card: "Visit", constraints: [{ attribute: "Age", op: "<", value: 80 }] }],
          catalog,
          stubDeps,
        ),
      ["has no attribute", "Basic Data", "own clause"],
      "age on the Visit card",
    );
  },
);

Deno.test("findAttributeAcrossCards locates a demographic", async () => {
  const catalog = await loadCatalog();
  const hits = findAttributeAcrossCards(catalog, "Age");
  eq(hits.length, 1, "Age exists on exactly one card");
  eq(hits[0].card.name, "Basic Data", "…the patient card");
});

Deno.test("the catalog summary tells the model where demographics live", async () => {
  const catalog = await loadCatalog();
  const summary = summarizeCatalog(catalog);
  assert(summary.includes("Basic Data"), "names the patient card");
  assert(summary.includes("Age[num]"), "tags Age as numeric");
  assert(
    summary.includes("list_cohort_filter_values"),
    "points category attributes at the value tool",
  );
  assert(
    summary.toLowerCase().includes("event cards"),
    "warns that event cards have no demographics",
  );
});

Deno.test('op "in" OR-s the tokens on one attribute', async () => {
  const catalog = await loadCatalog();
  const constraints = await resolveClausesToConstraints(
    [
      {
        card: "Visit",
        constraints: [
          {
            attribute: "Visit concept name",
            op: "in",
            value: ["Emergency Room Visit", "Emergency Room and Inpatient Visit"],
          },
        ],
      },
    ],
    catalog,
    stubDeps,
  );
  eq(constraints.length, 1, "one attribute constraint");
  eq(constraints[0].combine, "OR", "alternatives are OR-ed");
  eq(constraints[0].expressions.length, 2, "one expression per token");
  eq(constraints[0].expressions[0].value, "EMERGENCY ROOM VISIT", "resolved token");
  eq(constraints[0].expressions[0].operator, "=", "inclusion operator");
});

Deno.test('op "not in" AND-s the exclusions', async () => {
  const catalog = await loadCatalog();
  const constraints = await resolveClausesToConstraints(
    [
      {
        card: "Visit",
        constraints: [
          {
            attribute: "Visit concept name",
            op: "not in",
            value: ["Inpatient Visit", "Outpatient Visit"],
          },
        ],
      },
    ],
    catalog,
    stubDeps,
  );
  eq(constraints[0].combine, "AND", "neither A nor B is an AND");
  eq(constraints[0].expressions[0].operator, "!=", "negated operator");
  eq(constraints[0].expressions.length, 2, "both exclusions kept");
});

Deno.test("an unsupported operator on a text attribute is rejected", async () => {
  const catalog = await loadCatalog();
  await rejects(
    () =>
      resolveClausesToConstraints(
        [
          {
            card: "Visit",
            constraints: [
              { attribute: "Visit concept name", op: ">", value: "Inpatient Visit" },
            ],
          },
        ],
        catalog,
        stubDeps,
      ),
    ["unsupported operator", '"in"'],
    "numeric op on text",
  );
});

Deno.test(
  "the whole cohort resolves: women under 80 with ER visits",
  async () => {
    const catalog = await loadCatalog();
    const constraints = await resolveClausesToConstraints(
      [
        {
          card: "Basic Data",
          constraints: [
            { attribute: "Age", op: "<", value: 80 },
            { attribute: "Gender", op: "=", value: "FEMALE" },
          ],
        },
        {
          card: "Visit",
          constraints: [
            { attribute: "Visit concept name", op: "=", value: "Emergency Room Visit" },
          ],
        },
      ],
      catalog,
      stubDeps,
    );
    eq(constraints.length, 3, "three resolved constraints");
    const patient = constraints.filter((c) => c.cardConfigPath === "patient");
    eq(patient.length, 2, "age and gender merge into the one patient card");
    eq(
      new Set(constraints.map((c) => c.cardInstanceKey)).size,
      2,
      "patient card + one visit card",
    );
    assert(
      constraints.some((c) =>
        c.attributeConfigPath.endsWith("attributes.Age") &&
        c.expressions[0].operator === "<" &&
        c.expressions[0].value === 80
      ),
      "age constraint landed on the patient card",
    );
    // Serialisable with the stamp the deep link carries.
    assert(STAMP.configId, "stamp present");
  },
);

// ---------------------------------------------------------------------------
// The contract shared with the browser-side twin
// (plugins/ui/apps/vue-mri-ui-lib/src/ai/valueResolution.ts). Both suites read
// the SAME vectors, so a ranking change cannot improve one surface and silently
// leave the other behind — which is what had happened: this resolver handled
// "ER visit" and the pa_* tools did not.
// ---------------------------------------------------------------------------

interface RankingVector {
  name: string;
  query: string;
  rows: Array<{ value: string; label: string }>;
  expectedOrder: string[];
}

interface AlternateQueryVector {
  name: string;
  query: string;
  mustInclude?: string[];
  mustNotInclude?: string[];
  maxLength?: number;
}

const VECTORS: {
  ranking: RankingVector[];
  alternateQueries: AlternateQueryVector[];
} = JSON.parse(
  Deno.readTextFileSync(
    new URL("./__fixtures__/value-resolution-vectors.json", import.meta.url),
  ),
);

Deno.test("shared vectors: ranking matches the browser-side twin", () => {
  assert(VECTORS.ranking.length > 0, "vectors loaded");
  for (const v of VECTORS.ranking) {
    const ranked = rankValues(v.rows, v.query).map((m) => String(m.row.value));
    eq(
      ranked.join("|"),
      v.expectedOrder.join("|"),
      `ranking vector "${v.name}"`,
    );
  }
});

Deno.test("shared vectors: retry queries match the browser-side twin", () => {
  assert(VECTORS.alternateQueries.length > 0, "vectors loaded");
  for (const v of VECTORS.alternateQueries) {
    const queries = alternateQueries(v.query);
    for (const expected of v.mustInclude ?? []) {
      assert(
        queries.includes(expected),
        `retry vector "${v.name}" — expected to retry ${JSON.stringify(expected)}, got ${JSON.stringify(queries)}`,
      );
    }
    for (const forbidden of v.mustNotInclude ?? []) {
      assert(
        !queries.includes(forbidden),
        `retry vector "${v.name}" — must not retry ${JSON.stringify(forbidden)}`,
      );
    }
    assert(
      queries.length <= (v.maxLength ?? MAX_ALTERNATE_QUERIES),
      `retry vector "${v.name}" — ${queries.length} queries exceeds the bound`,
    );
  }
});
