import { assertEquals, assertThrows } from "jsr:@std/assert";
import { idpModeOf, InvalidIdpModeError, upgradeEnvForIdpMode } from "../idp-mode-env.ts";

const gen = { password: () => "PW", rootKey: () => "RK" };

const preTrex = [
  "PROJECT_NAME=d2e",
  "LOGTO__D2E_APP__CLIENT_ID=app",
  "LOGTO__D2E_APP__CLIENT_SECRET=appsecret",
  "USER_MGMT__ROLE_SOURCE=logto",
  "DB_CREDENTIALS__INTERNAL__PUBLIC_KEY='-----BEGIN PUBLIC KEY-----",
  "abc",
  "-----END PUBLIC KEY-----'",
  "",
].join("\n");

Deno.test("idpModeOf reads the mode line, if any", () => {
  assertEquals(idpModeOf("A=1\nD2E_IDP_MODE=logto-federated\n"), "logto-federated");
  assertEquals(idpModeOf("D2E_IDP_MODE=trex"), "trex");
  assertEquals(idpModeOf("A=1"), undefined);
});

Deno.test("a pre-trex env becomes federated and gains what trex needs", () => {
  const out = upgradeEnvForIdpMode(preTrex, gen);
  assertEquals(out.mode, "logto-federated");
  assertEquals(out.added, [
    "D2E_IDP_MODE", "D2E_IDP", "TREX__OIDC__WEBAPI_CLIENT_ID", "TREX__OIDC__WEBAPI_CLIENT_SECRET", "TREX_ROOT_KEY", "USER_MGMT__ROLE_SOURCE",
  ]);
  assertEquals(out.content.startsWith(preTrex.replace("USER_MGMT__ROLE_SOURCE=logto\n", "")), true);
  for (const line of [
    "D2E_IDP_MODE=logto-federated", "D2E_IDP=trex", "TREX__OIDC__WEBAPI_CLIENT_ID=d2e-webapi",
    "TREX__OIDC__WEBAPI_CLIENT_SECRET=PW", "TREX_ROOT_KEY=RK", "USER_MGMT__ROLE_SOURCE=trex",
  ]) {
    assertEquals(out.content.includes(`\n${line}\n`), true, line);
  }
  assertEquals(out.content.includes("USER_MGMT__ROLE_SOURCE=logto"), false);
  assertEquals(out.content.includes("D2E__SEED_USER"), false);
});

Deno.test("an existing trex secret is kept", () => {
  const out = upgradeEnvForIdpMode(preTrex + "TREX_ROOT_KEY=keep\n", gen);
  assertEquals(out.content.includes("TREX_ROOT_KEY=keep"), true);
  assertEquals(out.content.includes("TREX_ROOT_KEY=RK"), false);
});

// The oldest installations - the ones with the most Logto users to keep -
// predate the ALP -> D2E rename and name only LOGTO__ALP_APP__*. Reading just
// the new name would call them fresh installs and cut those users off.
Deno.test("a pre-rename env naming only LOGTO__ALP_APP__* is federated too", () => {
  const legacy = preTrex
    .replace("LOGTO__D2E_APP__CLIENT_ID=", "LOGTO__ALP_APP__CLIENT_ID=")
    .replace("LOGTO__D2E_APP__CLIENT_SECRET=", "LOGTO__ALP_APP__CLIENT_SECRET=");
  assertEquals(legacy.includes("LOGTO__D2E_APP__"), false);
  const out = upgradeEnvForIdpMode(legacy, gen);
  assertEquals(out.mode, "logto-federated");
  assertEquals(out.content.includes("\nD2E_IDP_MODE=logto-federated\n"), true);
  assertEquals(out.content.includes("USER_MGMT__ROLE_SOURCE=logto"), false);
});

Deno.test("an env written on trex is stamped trex and otherwise untouched", () => {
  const env = "LOGTO__D2E_APP__CLIENT_SECRET=x\nD2E_IDP=trex\n";
  assertEquals(upgradeEnvForIdpMode(env, gen), { mode: "trex", content: env + "D2E_IDP_MODE=trex\n", added: ["D2E_IDP_MODE"] });
});

Deno.test("an env that already names a mode is never changed", () => {
  const env = preTrex + "D2E_IDP_MODE=trex\n";
  assertEquals(upgradeEnvForIdpMode(env, gen), { mode: "trex", content: env, added: [] });
});

Deno.test("an env with neither Logto nor trex markers is treated as trex", () => {
  assertEquals(upgradeEnvForIdpMode("A=1", gen).mode, "trex");
});

Deno.test("a quoted D2E_IDP_MODE is recognised and never re-stamped", () => {
  const env = preTrex + "D2E_IDP_MODE='trex'\n";
  assertEquals(upgradeEnvForIdpMode(env, gen), { mode: "trex", content: env, added: [] });
});

Deno.test("an inline comment after D2E_IDP_MODE is recognised and never re-stamped", () => {
  const env = preTrex + "D2E_IDP_MODE=logto-federated # set by ops\n";
  assertEquals(
    upgradeEnvForIdpMode(env, gen),
    { mode: "logto-federated", content: env, added: [] },
  );
});

Deno.test("an empty D2E_IDP_MODE is rejected rather than silently re-stamped", () => {
  assertThrows(
    () => upgradeEnvForIdpMode("D2E_IDP_MODE=\n", gen),
    InvalidIdpModeError,
  );
});

Deno.test("an unrecognised D2E_IDP_MODE value is rejected rather than silently re-stamped", () => {
  assertThrows(
    () => upgradeEnvForIdpMode("D2E_IDP_MODE=logto\n", gen),
    InvalidIdpModeError,
  );
});

Deno.test("an empty trex secret is filled in rather than left duplicated", () => {
  const out = upgradeEnvForIdpMode(preTrex + "TREX_ROOT_KEY=\n", gen);
  assertEquals(out.content.includes("\nTREX_ROOT_KEY=RK\n"), true);
  assertEquals(out.content.match(/^TREX_ROOT_KEY=/gm)?.length, 1);
  assertEquals(out.added.includes("TREX_ROOT_KEY"), true);
});
