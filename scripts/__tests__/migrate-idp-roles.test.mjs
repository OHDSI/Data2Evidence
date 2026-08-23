import { assertEquals } from "jsr:@std/assert";
import { buildGroupRoleAndScopes, canonicalRoleNames, planMigration } from "../migrate-idp-roles.mjs";

Deno.test("matches users by email and plans a re-key plus role assignments", () => {
  const plan = planMigration(
    [{ id: "um-1", email: "a@x.test", idpUserId: "logto-a" }],
    [{ id: "trex-a", email: "a@x.test" }],
    [{ userId: "um-1", role: "USER_ADMIN" }],
  );
  assertEquals(plan.rekey, [{ email: "a@x.test", from: "logto-a", to: "trex-a" }]);
  assertEquals(plan.assign, [{ email: "a@x.test", userId: "trex-a", role: "USER_ADMIN" }]);
  assertEquals(plan.unmatched, []);
});

Deno.test("a user with no trex account is reported, never guessed at", () => {
  const plan = planMigration(
    [{ id: "um-1", email: "gone@x.test", idpUserId: "logto-a" }],
    [],
    [{ userId: "um-1", role: "USER_ADMIN" }],
  );
  assertEquals(plan.unmatched, ["gone@x.test"]);
  assertEquals(plan.rekey, []);
  assertEquals(plan.assign, []);
});

Deno.test("email matching ignores case, which the two stores disagree on", () => {
  const plan = planMigration(
    [{ id: "um-1", email: "A@X.test", idpUserId: "logto-a" }],
    [{ id: "trex-a", email: "a@x.TEST" }],
    [],
  );
  assertEquals(plan.rekey.length, 1);
});

Deno.test("a user already re-keyed is left alone, so the run is repeatable", () => {
  const plan = planMigration(
    [{ id: "um-1", email: "a@x.test", idpUserId: "trex-a" }],
    [{ id: "trex-a", email: "a@x.test" }],
    [],
  );
  assertEquals(plan.rekey, []);
});

// --- canonicalRoleNames: this file's own copy, must behave like the one in
// UserGroupService.ts (pinned there by that package's own tests).

Deno.test("an unscoped role is stored under its own name", () => {
  assertEquals(canonicalRoleNames("USER_ADMIN", ["USER_ADMIN"]), ["USER_ADMIN"]);
});

Deno.test("kebab scopes become the sec_role names they stood for", () => {
  const names = canonicalRoleNames("RESEARCHER.Demo", [
    "RESEARCHER.Demo",
    "role.researcher.7dffaaeb-c3cd-434c-bd2c-08cb34267acc",
    "source-user-7dffaaeb-c3cd-434c-bd2c-08cb34267acc",
    "cohort-reader",
    "cohort-creator",
    "concept-set-creator",
  ]);
  assertEquals(names, [
    "RESEARCHER.Demo",
    "role.researcher.7dffaaeb-c3cd-434c-bd2c-08cb34267acc",
    "Source user (7dffaaeb-c3cd-434c-bd2c-08cb34267acc)",
    "cohort reader",
    "cohort creator",
    "concept set creator",
  ]);
});

Deno.test("names are unique and keep their order", () => {
  assertEquals(canonicalRoleNames("USER_ADMIN", ["USER_ADMIN", "USER_ADMIN"]), ["USER_ADMIN"]);
});

Deno.test("an unrecognised scope is passed through untouched", () => {
  assertEquals(canonicalRoleNames("X", ["X", "some-future-scope"]), ["X", "some-future-scope"]);
});

// --- buildGroupRoleAndScopes: reconstructs the {role, scopes} pair that
// usermgmt.user_group cannot store directly, since it has no scopes column.

Deno.test("a non-researcher group is its own role and sole scope", () => {
  const built = buildGroupRoleAndScopes({ role: "ALP_USER_ADMIN", studyId: null }, new Map());
  assertEquals(built, { role: "ALP_USER_ADMIN", scopes: ["ALP_USER_ADMIN"] });
});

Deno.test("a dataset-scoped researcher group expands to the full scope set for a webapi dataset", () => {
  const datasetsById = new Map([
    ["ds-1", { id: "ds-1", tokenDatasetCode: "Demo", type: "webapi" }],
  ]);
  const built = buildGroupRoleAndScopes({ role: "RESEARCHER", studyId: "ds-1" }, datasetsById);
  assertEquals(built.role, "RESEARCHER.Demo");
  assertEquals(built.scopes, [
    "RESEARCHER.Demo",
    "role.researcher.ds-1",
    "source-user-ds-1",
    "cohort-reader",
    "cohort-creator",
    "concept-set-creator",
  ]);
});

Deno.test("a non-webapi dataset gets the base researcher scopes only", () => {
  const datasetsById = new Map([
    ["ds-1", { id: "ds-1", tokenDatasetCode: "Demo", type: "hana" }],
  ]);
  const built = buildGroupRoleAndScopes({ role: "RESEARCHER", studyId: "ds-1" }, datasetsById);
  assertEquals(built.scopes, ["RESEARCHER.Demo", "role.researcher.ds-1"]);
});

Deno.test("a researcher group whose dataset cannot be resolved is skipped, not guessed at", () => {
  assertEquals(buildGroupRoleAndScopes({ role: "RESEARCHER", studyId: "missing" }, new Map()), null);
  assertEquals(
    buildGroupRoleAndScopes(
      { role: "RESEARCHER", studyId: "ds-1" },
      new Map([["ds-1", { id: "ds-1", tokenDatasetCode: null, type: "webapi" }]]),
    ),
    null,
  );
});

// --- End-to-end: a researcher group's full scope set must all reach assign(),
// not just the group's own role — this is the failure the migration exists to
// prevent.

Deno.test("a researcher group contributes every canonical name it grants, not just its role", () => {
  const datasetsById = new Map([
    ["ds-1", { id: "ds-1", tokenDatasetCode: "Demo", type: "webapi" }],
  ]);
  const built = buildGroupRoleAndScopes({ role: "RESEARCHER", studyId: "ds-1" }, datasetsById);
  const plan = planMigration(
    [{ id: "um-1", email: "a@x.test", idpUserId: "logto-a" }],
    [{ id: "trex-a", email: "a@x.test" }],
    [{ userId: "um-1", role: built.role, scopes: built.scopes }],
  );
  assertEquals(
    plan.assign.map((a) => a.role),
    [
      "RESEARCHER.Demo",
      "role.researcher.ds-1",
      "Source user (ds-1)",
      "cohort reader",
      "cohort creator",
      "concept set creator",
    ],
  );
});
