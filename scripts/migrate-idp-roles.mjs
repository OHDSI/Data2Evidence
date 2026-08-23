#!/usr/bin/env node
//
// One-time migration from Logto-held roles to trex application roles.
//
// Two things move: usermgmt's users are re-keyed from the Logto subject id to
// the trex user id, and their group memberships are written into trex as
// application roles. Users are matched by email because the two stores share no
// identifier — which is the whole reason a migration is needed.
//
// canonicalRoleNames and datasetResearcherScopes below are deliberate
// duplicates of the functions of the same behaviour in
// plugins/functions/alp-usermgmt/src/services/UserGroupService.ts and
// plugins/functions/alp-usermgmt/src/const.ts. This script runs under plain
// Node; that package is Deno-only TypeScript (typedi, Deno.env, jsr: imports),
// so it cannot be imported from here. Keep the two copies in sync by hand —
// each is covered by its own tests pinning the same canonical strings.
//
// Dry run by default. Nothing about this is reversible once applied.

import { execFileSync } from "node:child_process";

// ROLES.STUDY_RESEARCHER in plugins/functions/alp-usermgmt/src/const.ts.
const STUDY_RESEARCHER_ROLE = "RESEARCHER";

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
 * Returns null when a RESEARCHER group's dataset cannot be resolved, matching
 * buildLogtoRoleName's own skip-and-warn behaviour — such a group contributes
 * no role assignment rather than one built from missing data.
 */
export function buildGroupRoleAndScopes(group, datasetsById) {
  if (group.role === STUDY_RESEARCHER_ROLE && group.studyId) {
    const dataset = datasetsById.get(group.studyId);
    if (!dataset?.tokenDatasetCode) {
      return null;
    }
    const role = `${STUDY_RESEARCHER_ROLE}.${dataset.tokenDatasetCode}`;
    return { role, scopes: datasetResearcherScopes(role, group.studyId, dataset.type) };
  }
  return { role: group.role, scopes: [group.role] };
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
  // user_metadata does not exist on usermgmt."user" yet: this migration is
  // what first needs it, so it is created here rather than in a separate
  // migration this script would then depend on.
  execSql(`ALTER TABLE usermgmt."user" ADD COLUMN IF NOT EXISTS user_metadata JSONB DEFAULT '{}'::jsonb;`);
  const usermgmtById = new Map(usermgmtUsers.map((u) => [String(u.email ?? "").trim().toLowerCase(), u]));
  for (const r of plan.rekey) {
    const source = usermgmtById.get(r.email.trim().toLowerCase());
    if (!source) continue;
    execSql(`
      UPDATE usermgmt."user"
         SET user_metadata = COALESCE(user_metadata, '{}'::jsonb)
                           || jsonb_build_object('previousIdpUserId', idp_user_id),
             idp_user_id = '${escapeSqlLiteral(r.to)}'
       WHERE id = '${escapeSqlLiteral(source.id)}'
    `);
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
