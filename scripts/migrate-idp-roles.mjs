#!/usr/bin/env node
//
// One-time migration from Logto-held roles to trex application roles.
//
// Two things move: usermgmt's users are re-keyed from the Logto subject id to
// the trex user id, and their group memberships are written into trex as
// application roles. Users are matched by email because the two stores share no
// identifier — which is the whole reason a migration is needed.
//
// canonicalRoleNames, the ROLES/LOGTO_ROLES/LOGTO_ROLE_NAMES maps, and
// datasetResearcherScopes below are deliberate duplicates of the functions and
// constants of the same behaviour in
// plugins/functions/alp-usermgmt/src/services/UserGroupService.ts and
// plugins/functions/alp-usermgmt/src/const.ts. This script runs under plain
// Node; that package is Deno-only TypeScript (typedi, Deno.env, jsr: imports),
// so it cannot be imported from here. Keep the two copies in sync by hand —
// each is covered by its own tests pinning the same canonical strings.
//
// Dry run by default. --apply writes a rollback file before re-keying anyone
// (see rollbackFilePath), but the role assignments it makes in trex are not
// undone by it.

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

// ROLES (the internal role constants) and LOGTO_ROLES / LOGTO_ROLE_NAMES (the
// canonical role-name strings) below are deliberate duplicates of
// plugins/functions/alp-usermgmt/src/const.ts. See the file header for why.
const ROLES = {
  ALP_USER_ADMIN: "ALP_USER_ADMIN",
  ALP_SYSTEM_ADMIN: "ALP_SYSTEM_ADMIN",
  ALP_DASHBOARD_VIEWER: "ALP_DASHBOARD_VIEWER",
  ETL_MAPPING_CONTRIBUTOR: "ETL_MAPPING_CONTRIBUTOR",
  TENANT_ADMIN: "TENANT_ADMIN",
  TENANT_VIEWER: "TENANT_VIEWER",
  STUDY_ADMIN: "STUDY_ADMIN",
  STUDY_RESEARCHER: "RESEARCHER",
  STUDY_WRITE_DQD_RESEARCHER: "STUDY_WRITE_DQD_RESEARCHER",
  STUDY_RESULTS_READ_RESEARCHER: "STUDY_RESULTS_READ_RESEARCHER",
  ALP_SHARED: "ALP_SHARED",
};

const LOGTO_ROLES = {
  USER_ADMIN: "role.useradmin",
  SYSTEM_ADMIN: "role.systemadmin",
  DASHBOARD_VIEWER: "role.dashboardviewer",
  TENANT_VIEWER: "role.viewer",
  RESEARCHER: "role.researcher",
  JOB_RUNNER: "role.jobrunner",
  STUDY_RESULTS_READER: "role.studyresultsreader",
  ETL_MAPPING_CONTRIBUTOR: "role.etlmappingcontributor",
};

// Internal ROLES.* -> canonical role.* name. Roles with no entry here
// (TENANT_ADMIN, STUDY_ADMIN, ALP_SHARED) fall back to their raw name, exactly
// as LOGTO_ROLE_NAMES[role] || role does in UserGroupService.ts.
const LOGTO_ROLE_NAMES = {
  [ROLES.ALP_USER_ADMIN]: LOGTO_ROLES.USER_ADMIN,
  [ROLES.ALP_SYSTEM_ADMIN]: LOGTO_ROLES.SYSTEM_ADMIN,
  [ROLES.ALP_DASHBOARD_VIEWER]: LOGTO_ROLES.DASHBOARD_VIEWER,
  [ROLES.TENANT_VIEWER]: LOGTO_ROLES.TENANT_VIEWER,
  [ROLES.STUDY_RESEARCHER]: LOGTO_ROLES.RESEARCHER,
  [ROLES.STUDY_WRITE_DQD_RESEARCHER]: LOGTO_ROLES.JOB_RUNNER,
  [ROLES.STUDY_RESULTS_READ_RESEARCHER]: LOGTO_ROLES.STUDY_RESULTS_READER,
  [ROLES.ETL_MAPPING_CONTRIBUTOR]: LOGTO_ROLES.ETL_MAPPING_CONTRIBUTOR,
};

// Kebab-case because Logto rejected spaces in scope names; trex stores the
// canonical sec_role names directly. Mirrors WEBAPI_RESEARCHER_SCOPES in
// plugins/functions/alp-usermgmt/src/const.ts.
const WEBAPI_RESEARCHER_SCOPES = ["cohort-reader", "cohort-creator", "concept-set-creator"];

// Mirrors sourceUserScopeName in plugins/functions/alp-usermgmt/src/const.ts.
function sourceUserScopeName(datasetId) {
  return `source-user-${datasetId}`;
}

// Mirrors datasetResearcherScopes in plugins/functions/alp-usermgmt/src/const.ts.
function datasetResearcherScopes(roleName, datasetId, type) {
  const scopes = [roleName, `role.researcher.${datasetId}`];
  if (type === "webapi") {
    scopes.push(sourceUserScopeName(datasetId), ...WEBAPI_RESEARCHER_SCOPES);
  }
  return scopes;
}

/**
 * The canonical names one group grants, from its role and scope pair.
 *
 * Mirrors canonicalRoleNames in
 * plugins/functions/alp-usermgmt/src/services/UserGroupService.ts. See the
 * file header for why this is a duplicate rather than a shared import.
 */
export function canonicalRoleNames(role, scopes) {
  const sourceUser = /^source-user-(.+)$/;
  const kebab = {
    "cohort-reader": "cohort reader",
    "cohort-creator": "cohort creator",
    "concept-set-creator": "concept set creator",
  };

  const expand = (name) => {
    const match = sourceUser.exec(name);
    if (match) return `Source user (${match[1]})`;
    // Unknown scopes pass through: a name nothing maps is recoverable, a
    // dropped grant is not.
    return kebab[name] ?? name;
  };

  return [...new Set([role, ...scopes].map(expand))];
}

/**
 * Reconstructs the {role, scopes} pair buildLogtoRoleName (UserGroupService.ts)
 * derives per group, for a group row read from usermgmt.user_group /
 * usermgmt.b2c_group. usermgmt.user_group has no scopes column — scopes are
 * computed here from the dataset a RESEARCHER group is scoped to, exactly as
 * buildLogtoRoleName does via a dataset lookup, rather than read from a column
 * that does not exist.
 *
 * The role name itself goes through LOGTO_ROLE_NAMES first, same as
 * buildLogtoRoleName: a dataset-scoped researcher group is
 * "role.researcher.<tokenDatasetCode>", not "RESEARCHER.<tokenDatasetCode>" —
 * ROLES.STUDY_RESEARCHER is the internal value stored in b2c_group.role, but
 * LOGTO_ROLES.RESEARCHER ("role.researcher") is the name trex actually stores.
 *
 * Returns null when a RESEARCHER group's dataset cannot be resolved, matching
 * buildLogtoRoleName's own skip-and-warn behaviour — such a group contributes
 * no role assignment rather than one built from missing data.
 */
export function buildGroupRoleAndScopes(group, datasetsById) {
  const logtoRole = LOGTO_ROLE_NAMES[group.role] || group.role;

  if (group.role === ROLES.STUDY_RESEARCHER && group.studyId) {
    const dataset = datasetsById.get(group.studyId);
    if (!dataset?.tokenDatasetCode) {
      return null;
    }
    const role = `${logtoRole}.${dataset.tokenDatasetCode}`;
    return { role, scopes: datasetResearcherScopes(role, group.studyId, dataset.type) };
  }
  return { role: logtoRole, scopes: [logtoRole] };
}

/**
 * Plans the migration: which usermgmt users need re-keying to their trex user
 * id, which role assignments their existing groups translate to, and which
 * usermgmt users have no matching trex account at all.
 *
 * usermgmtUsers: [{ id, email, idpUserId }]
 * trexUsers: [{ id, email }]
 * groups: [{ userId, role, scopes? }] — one entry per usermgmt.user_group row,
 *   userId is the usermgmt user id, scopes already resolved (see
 *   buildGroupRoleAndScopes).
 */
export function planMigration(usermgmtUsers, trexUsers, groups) {
  const byEmail = new Map(
    trexUsers.map((u) => [String(u.email ?? "").trim().toLowerCase(), u]),
  );

  const rekey = [];
  const assign = [];
  const unmatched = [];

  for (const user of usermgmtUsers) {
    const email = String(user.email ?? "").trim().toLowerCase();
    const trexUser = byEmail.get(email);
    if (!trexUser) {
      unmatched.push(user.email);
      continue;
    }

    // Skip users already pointing at trex so the command can be re-run after a
    // partial failure without producing spurious changes.
    if (user.idpUserId !== trexUser.id) {
      rekey.push({ email: user.email, from: user.idpUserId, to: trexUser.id });
    }

    for (const group of groups.filter((g) => g.userId === user.id)) {
      // Every name the group granted, not just its role: the scopes carried
      // authorization too, and are what webapi.sec_external_role_map matches.
      for (const role of canonicalRoleNames(group.role, group.scopes ?? [])) {
        assign.push({ email: user.email, userId: trexUser.id, role });
      }
    }
  }

  return { rekey, assign, unmatched };
}

function escapeSqlLiteral(value) {
  return String(value).replace(/'/g, "''");
}

function psqlContainer() {
  return `${process.env.PROJECT_NAME || "d2e"}-minerva-postgres-1`;
}

function psqlArgs(extra) {
  const database = process.env.PG_DB_NAME || "alp";
  const user = process.env.PG_SUPER_USER || "postgres";
  return ["exec", psqlContainer(), "psql", "-h", "localhost", "-U", user, "-d", database, ...extra];
}

// Runs a read-only query and returns its rows as parsed JSON. Wraps the query
// so a single psql invocation always yields exactly one JSON array, empty rows
// included, regardless of the underlying result shape.
function queryJson(sql) {
  const wrapped = `SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (${sql}) t;`;
  const out = execFileSync("docker", psqlArgs(["-tAc", wrapped]), { encoding: "utf-8" });
  return JSON.parse(out.trim() || "[]");
}

function execSql(sql) {
  execFileSync("docker", psqlArgs(["-c", sql]), { stdio: "inherit" });
}

async function assignRole(userId, role) {
  const baseUrl = process.env.TREX__ADMIN_URL;
  if (!baseUrl) {
    throw new Error("TREX__ADMIN_URL is not set; cannot assign roles in trex");
  }
  const res = await fetch(`${baseUrl}/assign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.TREX__SERVICE_ROLE_KEY ?? ""}`,
    },
    body: JSON.stringify({ userId, role }),
  });
  if (!res.ok) {
    throw new Error(`trex role assign failed for user ${userId}, role "${role}": ${res.status}`);
  }
}

function printPlan(plan) {
  console.log(`\nRe-key (${plan.rekey.length}):`);
  for (const r of plan.rekey) {
    console.log(`  ${r.email}: ${r.from ?? "(none)"} -> ${r.to}`);
  }
  console.log(`\nRole assignments (${plan.assign.length}):`);
  for (const a of plan.assign) {
    console.log(`  ${a.email} (${a.userId}): ${a.role}`);
  }
  console.log(`\nUnmatched usermgmt users, no trex account by email (${plan.unmatched.length}):`);
  for (const email of plan.unmatched) {
    console.log(`  ${email}`);
  }
  if (plan.rekey.length > 0) {
    console.log(
      `\n--apply will write a rollback file (idp-rekey-<timestamp>.json) recording ` +
        `{ username, from, to } for every user above before re-keying any of them.`,
    );
  }
}

// One JSON array of { username, from, to } per re-keyed user, named with the
// UTC time the run started so repeated runs never collide. Written before the
// first UPDATE — an admin who needs to reverse the re-key later has the old
// idp_user_id for every affected user, without usermgmt owning a metadata
// column purely to hold it.
function rollbackFilePath() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return resolve(process.cwd(), `idp-rekey-${timestamp}.json`);
}

export function rollbackRows(rekey) {
  return rekey.map((r) => ({ username: r.email, from: r.from, to: r.to }));
}

function writeRollbackFile(filePath, rekey) {
  writeFileSync(filePath, JSON.stringify(rollbackRows(rekey), null, 2));
}

/**
 * Reads the current state of usermgmt and trex, plans the migration, prints
 * it, and — only with apply: true — performs it: role assignments first, then
 * the re-key, so a run that fails partway leaves affected users still on
 * Logto with some roles already copied (recoverable by re-running) rather than
 * on trex with none (locked out).
 */
export async function runMigration({ apply = false } = {}) {
  const usermgmtUsers = queryJson(
    `SELECT id, username AS email, idp_user_id AS "idpUserId" FROM usermgmt."user"`,
  );
  const trexUsers = queryJson(`SELECT id, email FROM trexdb."user"`);
  const groupRows = queryJson(`
    SELECT ug.user_id AS "userId", bg.role AS role, bg.study_id AS "studyId"
    FROM usermgmt.user_group ug
    JOIN usermgmt.b2c_group bg ON bg.id = ug.b2c_group_id
    WHERE bg.role IS NOT NULL
  `);
  const datasetRows = queryJson(
    `SELECT id, token_dataset_code AS "tokenDatasetCode", type FROM portal.dataset`,
  );
  const datasetsById = new Map(datasetRows.map((d) => [d.id, d]));

  const groups = [];
  for (const group of groupRows) {
    const built = buildGroupRoleAndScopes(group, datasetsById);
    if (!built) {
      console.warn(
        `Skipping group for usermgmt user ${group.userId}: role "${group.role}" has no resolvable dataset (studyId=${group.studyId})`,
      );
      continue;
    }
    groups.push({ userId: group.userId, role: built.role, scopes: built.scopes });
  }

  const plan = planMigration(usermgmtUsers, trexUsers, groups);
  printPlan(plan);

  if (!apply) {
    console.log("\nDry run only. Re-run with --apply to perform these changes.");
    return plan;
  }

  console.log(`\nApplying ${plan.assign.length} role assignment(s)...`);
  for (const a of plan.assign) {
    await assignRole(a.userId, a.role);
  }

  console.log(`Applying ${plan.rekey.length} re-key(s)...`);
  let rollbackPath = null;
  if (plan.rekey.length > 0) {
    // Written before the first UPDATE: usermgmt owns its own table's schema
    // (migrations, ORM) and this CLI must not alter it, so the previous
    // idp_user_id is preserved out-of-band instead of in a new column.
    rollbackPath = rollbackFilePath();
    writeRollbackFile(rollbackPath, plan.rekey);
  }
  const usermgmtById = new Map(usermgmtUsers.map((u) => [String(u.email ?? "").trim().toLowerCase(), u]));
  for (const r of plan.rekey) {
    const source = usermgmtById.get(r.email.trim().toLowerCase());
    if (!source) continue;
    execSql(`
      UPDATE usermgmt."user"
         SET idp_user_id = '${escapeSqlLiteral(r.to)}'
       WHERE id = '${escapeSqlLiteral(source.id)}'
    `);
  }
  if (rollbackPath) {
    console.log(`\nWrote rollback file: ${rollbackPath}`);
  }

  console.log("\nMigration complete.");
  return plan;
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const apply = process.argv.slice(2).includes("--apply");
  runMigration({ apply }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
