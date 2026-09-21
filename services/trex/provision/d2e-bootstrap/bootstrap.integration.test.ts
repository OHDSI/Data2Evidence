// Opt-in: set TEST_PG_URL to run. CI supplies one (see trex-provision-tests.yml).
import { assertEquals } from "jsr:@std/assert";
import pg from "npm:pg@8.11.3";
const { Pool } = pg;
import { buildBootstrapStatements, type BootstrapConfig } from "./bootstrap.ts";

const url = Deno.env.get("TEST_PG_URL");

Deno.test({
  name: "bootstrap SQL is idempotent against a live Postgres",
  ignore: !url,
  fn: async () => {
    const pool = new Pool({ connectionString: url });
    try {
      const cfg: BootstrapConfig = {
        manageConfig: {
          databases: {
            "+postgres": { schemas: { "+portal": {}, "+usermgmt": {}, "+logto": {} } },
          },
        },
        manageUsers: {
          postgres: {
            manager: "it_admin_user",
            managerPassword: "m-pa$$w'ord",
            reader: "it_read_user",
            readerPassword: "r-pass",
            writer: "it_write_user",
            writerPassword: "w-pass",
            logtoManager: "it_logto_user",
            logtoManagerPassword: "l-pass",
          },
        },
        grantRolesUsers: {},
      };
      const statements = buildBootstrapStatements(cfg);

      // Two consecutive passes must both succeed — the second proves idempotency.
      for (let pass = 1; pass <= 2; pass++) {
        for (const sql of statements) {
          await pool.query(sql);
        }
      }

      const roles = await pool.query(
        `SELECT rolname FROM pg_roles WHERE rolname IN
           ('anon','authenticated','service_role','it_admin_user','it_read_user','it_write_user','it_logto_user')`,
      );
      assertEquals(roles.rowCount, 7);

      const schemas = await pool.query(
        "SELECT nspname FROM pg_namespace WHERE nspname IN ('portal','usermgmt','logto')",
      );
      assertEquals(schemas.rowCount, 3);

      // Schema-level grants actually landed. The logto manage role needs CREATE
      // on its own schema or alp-logto cannot migrate a fresh database.
      const schemaPrivs = await pool.query(
        `SELECT has_schema_privilege('it_admin_user','portal','CREATE') AS admin_create,
                has_schema_privilege('it_logto_user','logto','CREATE')  AS logto_create,
                has_schema_privilege('it_logto_user','logto','USAGE')   AS logto_usage,
                has_schema_privilege('it_write_user','portal','USAGE')  AS write_usage,
                has_schema_privilege('it_read_user','portal','USAGE')   AS read_usage`,
      );
      assertEquals(schemaPrivs.rows[0], {
        admin_create: true,
        logto_create: true,
        logto_usage: true,
        write_usage: true,
        read_usage: true,
      });

      // Table-level grants: create a probe table, re-apply (the ON ALL TABLES
      // grants only cover objects that already exist), then read the ACL back.
      await pool.query("CREATE TABLE IF NOT EXISTS portal.grant_probe (id int)");
      for (const sql of statements) await pool.query(sql);

      const tableGrants = await pool.query(
        `SELECT grantee, privilege_type FROM information_schema.role_table_grants
          WHERE table_schema = 'portal' AND table_name = 'grant_probe'
            AND grantee IN ('it_admin_user','it_logto_user','it_write_user','it_read_user')`,
      );
      const held = (grantee: string) =>
        tableGrants.rows.filter((r: { grantee: string }) => r.grantee === grantee)
          .map((r: { privilege_type: string }) => r.privilege_type).sort();

      assertEquals(held("it_write_user").includes("INSERT"), true);
      assertEquals(held("it_write_user").includes("SELECT"), true);
      assertEquals(held("it_admin_user").includes("INSERT"), true);
      assertEquals(held("it_logto_user").includes("INSERT"), true);
      // The reader gets SELECT only.
      assertEquals(held("it_read_user"), ["SELECT"]);
    } finally {
      await pool.end();
    }
  },
});
