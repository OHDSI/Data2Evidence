import assert from "node:assert/strict";

import { waitForDatabaseCredentials } from "./dbCredentials.ts";

/** Fake clock + sleep so the tests never actually wait. */
function fakeTimers() {
  let t = 0;
  return {
    now: () => t,
    sleep: (ms: number) => {
      t += ms;
      return Promise.resolve();
    },
    elapsed: () => t,
  };
}

Deno.test("waitForDatabaseCredentials returns a populated registry without sleeping", async () => {
  const timers = fakeTimers();
  let calls = 0;
  const creds = await waitForDatabaseCredentials(
    () => {
      calls++;
      return [{ code: "demo_database" }];
    },
    { timeoutMs: 60_000, intervalMs: 2_000, now: timers.now, sleep: timers.sleep },
  );

  assert.deepEqual(creds, [{ code: "demo_database" }]);
  assert.equal(calls, 1);
  assert.equal(timers.elapsed(), 0, "must not delay when credentials are already there");
});

Deno.test("waitForDatabaseCredentials polls until the trex registry sync lands", async () => {
  const timers = fakeTimers();
  let calls = 0;
  const creds = await waitForDatabaseCredentials(
    () => {
      calls++;
      // The boot-time dbm sync lands on the 3rd read.
      return calls < 3 ? [] : [{ code: "demo_database" }, { code: "d2e_fhir" }];
    },
    { timeoutMs: 60_000, intervalMs: 2_000, now: timers.now, sleep: timers.sleep },
  );

  assert.equal(creds.length, 2);
  assert.equal(calls, 3);
  assert.equal(timers.elapsed(), 4_000);
});

Deno.test("waitForDatabaseCredentials gives up at the timeout and reports empty", async () => {
  const timers = fakeTimers();
  let calls = 0;
  const creds = await waitForDatabaseCredentials(
    () => {
      calls++;
      return [];
    },
    { timeoutMs: 10_000, intervalMs: 2_000, now: timers.now, sleep: timers.sleep },
  );

  assert.deepEqual(creds, []);
  // Bounded: one read per interval within the budget, not an unbounded spin.
  assert.equal(calls, 6);
  assert.ok(timers.elapsed() <= 10_000, `elapsed ${timers.elapsed()} must stay in budget`);
});

Deno.test("waitForDatabaseCredentials keeps polling when the registry read throws", async () => {
  const timers = fakeTimers();
  let calls = 0;
  const creds = await waitForDatabaseCredentials(
    () => {
      calls++;
      if (calls < 2) throw new Error("Trex.DatabaseManager not ready");
      return [{ code: "demo_database" }];
    },
    { timeoutMs: 60_000, intervalMs: 2_000, now: timers.now, sleep: timers.sleep },
  );

  assert.equal(creds.length, 1);
  assert.equal(calls, 2);
});

Deno.test("waitForDatabaseCredentials awaits a promise-returning registry read", async () => {
  const timers = fakeTimers();
  const creds = await waitForDatabaseCredentials(
    () => Promise.resolve([{ code: "demo_database" }]),
    { timeoutMs: 60_000, intervalMs: 2_000, now: timers.now, sleep: timers.sleep },
  );

  assert.equal(creds.length, 1);
});
