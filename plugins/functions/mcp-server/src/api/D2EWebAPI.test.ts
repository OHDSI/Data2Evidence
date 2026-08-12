/**
 * createConceptSet's two-call write, and how each half fails.
 *
 * The row and its concepts are written by separate requests, so "the create
 * failed" and "the set exists but is empty" are different outcomes that must be
 * reported differently. Saying "nothing was saved" when an empty set is sitting
 * in the dataset is the bug this pins: an empty set can still be picked and
 * filtered on, and it returns zero patients while looking like a valid result.
 *
 * Run (deno lives in the trex container, not on the host):
 *   docker exec d2e-trex sh -c 'cd /usr/src/plugins/d2ef/mcp-server && \
 *     deno test --allow-env --allow-read --sloppy-imports --no-check src/api/D2EWebAPI.test.ts'
 */

import {
  assertEquals,
  assertInstanceOf,
  assertRejects,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// BaseAPI reads both of these in its constructor, so they must exist before
// D2EWebAPI is imported.
Deno.env.set(
  "SERVICE_ROUTES",
  JSON.stringify({ "d2e-webapi": "http://webapi.test" }),
);

interface Call {
  method: string;
  url: string;
  body?: unknown;
}

const calls: Call[] = [];
/** Set per test to decide what the stubbed transport does. */
let respond: (call: Call) => { data: unknown; status: number };

(globalThis as any).Trex = {
  tokioChannel: () => ({
    get: (url: string) => {
      const call = { method: "get", url };
      calls.push(call);
      return Promise.resolve(respond(call));
    },
    post: (url: string, body: unknown) => {
      const call = { method: "post", url, body };
      calls.push(call);
      return Promise.resolve(respond(call));
    },
    put: (url: string, body: unknown) => {
      const call = { method: "put", url, body };
      calls.push(call);
      return Promise.resolve(respond(call));
    },
  }),
};

const { D2EWebAPI, ConceptSetItemsNotSavedError } = await import(
  "./D2EWebAPI.ts"
);

const items = [
  { conceptId: 201820, includeDescendants: true, includeMapped: false, isExcluded: false },
];

const httpError = (status: number, message?: string) =>
  Object.assign(new Error(`Request failed with status ${status}`), {
    response: { status, data: message ? { message } : {} },
  });

function setup(handler: (call: Call) => { data: unknown; status: number }) {
  calls.length = 0;
  respond = handler;
  return new D2EWebAPI();
}

Deno.test("both calls succeed: the created set comes back", async () => {
  const api = setup((call) =>
    call.method === "post"
      ? { data: { id: "webapi:7", externalId: 7, source: "webapi" }, status: 200 }
      : { data: {}, status: 200 }
  );

  assertEquals(await api.createConceptSet("token", "ds", { name: "Diabetes", items }), {
    id: "webapi:7",
    externalId: 7,
    source: "webapi",
  });
  assertEquals(calls.map((c) => c.method), ["post", "put"]);
});

Deno.test("the items PUT failing reports an EMPTY set, not a failed create", async () => {
  const api = setup((call) => {
    if (call.method === "post") {
      return { data: { id: "webapi:9", externalId: 9, source: "webapi" }, status: 200 };
    }
    throw httpError(500);
  });

  const error = await assertRejects(
    () => api.createConceptSet("token", "ds", { name: "Diabetes", items }),
  );

  assertInstanceOf(error, ConceptSetItemsNotSavedError);
  // The ref has to survive: it is the only way the user can find and delete the
  // empty set that is now sitting in their dataset.
  assertEquals(error.ref, "webapi:9");
  assertStringIncludes(error.message, "was created as ref webapi:9");
  assertStringIncludes(error.message, "EMPTY");
  assertStringIncludes(error.message, "d2e-webapi returned a server error");
});

Deno.test("the create POST failing does not claim a set exists", async () => {
  const api = setup(() => {
    throw httpError(500);
  });

  const error = await assertRejects(
    () => api.createConceptSet("token", "ds", { name: "Diabetes", items }),
    Error,
  );

  // Must NOT be the partial-write error: nothing was written, so there is no ref
  // to report and no empty set to clean up.
  assertEquals(error instanceof ConceptSetItemsNotSavedError, false);
  assertStringIncludes(error.message, "d2e-webapi returned a server error");
  // The items PUT must not be attempted once the create failed.
  assertEquals(calls.map((c) => c.method), ["post"]);
});

Deno.test("a duplicate name is still reported as a name clash", async () => {
  const api = setup(() => {
    throw httpError(409);
  });

  const error = await assertRejects(
    () => api.createConceptSet("token", "ds", { name: "Diabetes", items }),
    Error,
  );
  assertStringIncludes(error.message, "already exists in this dataset");
});

Deno.test("no items means no PUT, so there is nothing to half-write", async () => {
  const api = setup(() => ({
    data: { id: "webapi:3", externalId: 3, source: "webapi" },
    status: 200,
  }));

  await api.createConceptSet("token", "ds", { name: "Empty on purpose" });
  assertEquals(calls.map((c) => c.method), ["post"]);
});
