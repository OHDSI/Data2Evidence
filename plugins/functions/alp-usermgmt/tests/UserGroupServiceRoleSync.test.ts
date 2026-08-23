import { assertEquals } from "jsr:@std/assert";
import { canonicalRoleNames, resolveRoleStore } from "../src/services/UserGroupService.ts";

Deno.test("the role store defaults to trex and is explicit about logto", () => {
  assertEquals(resolveRoleStore(undefined), "trex");
  assertEquals(resolveRoleStore(""), "trex");
  assertEquals(resolveRoleStore("trex"), "trex");
  assertEquals(resolveRoleStore("logto"), "logto");
  // An unrecognised value must not silently pick a store: a typo here would
  // send role writes somewhere nobody reads.
  assertEquals(resolveRoleStore("logtoo"), "trex");
});

Deno.test("an unscoped role is stored under its own name", () => {
  assertEquals(canonicalRoleNames("USER_ADMIN", ["USER_ADMIN"]), ["USER_ADMIN"]);
});

Deno.test("kebab scopes become the sec_role names they stood for", () => {
  // Logto rejected spaces in scope names, so d2e stored these hyphenated and a
  // JWT customizer expanded them. trex holds the real names, so they are
  // expanded here instead.
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
  // The role name is also the first scope, so a naive concat duplicates it.
  assertEquals(canonicalRoleNames("USER_ADMIN", ["USER_ADMIN", "USER_ADMIN"]), ["USER_ADMIN"]);
});

Deno.test("an unrecognised scope is passed through untouched", () => {
  // Better a name nothing maps than a silently dropped grant.
  assertEquals(canonicalRoleNames("X", ["X", "some-future-scope"]), ["X", "some-future-scope"]);
});

// --- LOGTO__ROLES_SCOPES fan-out (docker-compose.yml): under Logto these two
// roles also carried a webapi.sec_role name that is not a role/scope name of
// its own. That pairing lived only in Logto's configuration, so it must be
// reproduced here or the trex path silently drops it.

Deno.test("role.systemadmin also grants the WebAPI admin role", () => {
  const names = canonicalRoleNames("role.systemadmin", ["role.systemadmin"]);
  assertEquals(names, ["role.systemadmin", "admin"]);
});

Deno.test("role.viewer also grants the WebAPI anonymous role", () => {
  const names = canonicalRoleNames("role.viewer", ["role.viewer"]);
  assertEquals(names, ["role.viewer", "anonymous"]);
});

Deno.test("the researcher expansion is unaffected by the fan-out and still yields its full six names", () => {
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
