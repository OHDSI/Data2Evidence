/**
 * Which store `create_concept_set` writes to, and what it does about name clashes.
 *
 * The store choice is the whole point of these tests. Two concept-set stores exist
 * and d2e-webapi can read both, but everything that CONSUMES a set — the Concepts
 * page, the cohort builder's filter card, and query-gen-svc when it resolves a
 * cohort — goes through terminology-svc, which only knows its own. A set written to
 * d2e-webapi is created perfectly and then resolves to nothing downstream, which
 * reaches the user as a filter card showing no concepts.
 *
 * Run (deno lives in the trex container, not on the host):
 *   docker exec d2e-trex sh -c 'cd /usr/src/plugins/d2ef/mcp-server && \
 *     deno test --allow-env --allow-read --sloppy-imports --no-check src/tools/conceptSetCreate.test.ts'
 */

import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const TERMINOLOGY = "http://terminology.test";
const WEBAPI = "http://webapi.test";

Deno.env.set(
  "SERVICE_ROUTES",
  JSON.stringify({
    terminology: TERMINOLOGY,
    "d2e-webapi": WEBAPI,
    usermgmt: "http://usermgmt.test",
  }),
);

interface Call {
  method: string;
  url: string;
  body?: unknown;
}

let calls: Call[] = [];
/** Concept sets the stubbed terminology-svc currently holds. */
let store: Array<{ id: number; name: string; concepts: unknown[] }> = [];
/** Set per test to make the create call fail. */
let createFails: Error | null = null;

const respond = (call: Call) => {
  calls.push(call);

  if (call.url.endsWith("/me")) {
    return { data: { username: "tester" }, status: 200 };
  }
  // GET /concept-set/{id}
  const byId = call.url.match(/\/concept-set\/(\d+)\?/);
  if (call.method === "get" && byId) {
    const found = store.find((cs) => cs.id === Number(byId[1]));
    if (!found) throw Object.assign(new Error("not found"), { response: { status: 404 } });
    return { data: found, status: 200 };
  }
  if (call.method === "get") {
    return { data: store.map(({ id, name }) => ({ id, name })), status: 200 };
  }
  if (call.method === "post") {
    if (createFails) throw createFails;
    return { data: 51, status: 200 };
  }
  throw new Error(`unexpected call ${call.method} ${call.url}`);
};

(globalThis as any).Trex = {
  tokioChannel: () => ({
    get: (url: string) => Promise.resolve(respond({ method: "get", url })),
    post: (url: string, body: unknown) =>
      Promise.resolve(respond({ method: "post", url, body })),
    put: (url: string, body: unknown) =>
      Promise.resolve(respond({ method: "put", url, body })),
  }),
};

const { registerConceptSetManagementTools } = await import(
  "./concept-set-management.tools.ts"
);

// Capture the tool handlers the way the MCP server would register them.
const handlers: Record<string, any> = {};
registerConceptSetManagementTools({
  registerTool: (name: string, _def: unknown, handler: unknown) => {
    handlers[name] = handler;
  },
} as any);

const createConceptSet = (args: unknown) =>
  handlers.create_concept_set(args, {
    requestInfo: { headers: { authorization: "Bearer t", datasetid: "ds-1" } },
  });

const items = [
  { conceptId: 201820, includeDescendants: true, includeMapped: false, isExcluded: false },
  { conceptId: 4019513, includeDescendants: false, includeMapped: true, isExcluded: true },
];

function reset() {
  calls = [];
  store = [];
  createFails = null;
}

const textOf = (result: any) => result.content.map((p: any) => p.text).join("\n");

Deno.test("the set is written to terminology-svc, never to d2e-webapi", async () => {
  reset();
  const result = await createConceptSet({ name: "Diabetes", items });

  const post = calls.find((c) => c.method === "post");
  // The regression this file exists for: a POST to d2e-webapi creates a set that
  // the cohort builder's filter card cannot resolve.
  assertEquals(post?.url.startsWith(TERMINOLOGY), true);
  assertEquals(calls.some((c) => c.url.startsWith(WEBAPI)), false);
  assertStringIncludes(textOf(result), "with ID 51");
});

Deno.test("items are mapped to the store's concept shape", async () => {
  reset();
  await createConceptSet({ name: "Diabetes", items });

  assertEquals(calls.find((c) => c.method === "post")?.body, {
    name: "Diabetes",
    shared: false,
    userName: "tester",
    concepts: [
      { id: 201820, useDescendants: true, useMapped: false, isExcluded: false },
      { id: 4019513, useDescendants: false, useMapped: true, isExcluded: true },
    ],
  });
});

Deno.test("an identical set with the same name is reused, not recreated", async () => {
  reset();
  // The store has a UNIQUE index on name, so re-creating is a hard failure. A retry
  // should land on the existing set instead of erroring.
  store = [{
    id: 42,
    name: "Diabetes",
    concepts: [
      { id: 201820, useDescendants: true, useMapped: false, isExcluded: false },
      { id: 4019513, useDescendants: false, useMapped: true, isExcluded: true },
    ],
  }];

  const result = await createConceptSet({ name: "diabetes", items });

  assertEquals(calls.some((c) => c.method === "post"), false);
  assertStringIncludes(textOf(result), "already exists with ID 42");
  assertStringIncludes(textOf(result), "nothing was created");
});

Deno.test("the same name with different concepts fails without overwriting", async () => {
  reset();
  store = [{
    id: 42,
    name: "Diabetes",
    concepts: [{ id: 999, useDescendants: true, useMapped: false, isExcluded: false }],
  }];

  const error = await assertRejects(
    () => createConceptSet({ name: "Diabetes", items }),
    Error,
  );

  assertStringIncludes(error.message, "already exists (ID 42)");
  assertStringIncludes(error.message, "nothing was created");
  // The existing set may already be filtering someone's saved cohort.
  assertEquals(calls.some((c) => c.method === "post"), false);
});

Deno.test("a failed create says plainly that nothing was saved", async () => {
  reset();
  createFails = Object.assign(new Error("boom"), { response: { status: 500 } });

  const error = await assertRejects(
    () => createConceptSet({ name: "Diabetes", items }),
    Error,
  );

  assertStringIncludes(error.message, "was NOT created and nothing was saved");
  // The wording the model is given has to rule out narrating success.
  assertStringIncludes(error.message, "Do not describe the set as created");
});
