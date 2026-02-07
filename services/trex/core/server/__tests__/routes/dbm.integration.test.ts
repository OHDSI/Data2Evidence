/**
 * Integration tests for DBM routes (requires PostgreSQL):
 *   POST /trex/db/     (create credentials)
 *   POST /trex/db/     (invalid code → 400)
 *   DELETE /trex/db/:name
 *   PUT /trex/db/      (update credentials)
 *   GET /trex/db/publications/
 *
 * These tests use a real PostgreSQL instance and mock the DatabaseManager
 * singleton to avoid Trex native bindings and PrefectAPI calls.
 */

// 1. Mock Trex global
import "../helpers/mock-trex-global.ts";

// 2. Setup env + axios mocks
import { createTestApp, mockAxios, restoreAxios } from "../helpers/setup.ts";

// 3. Setup JWT infrastructure
import { setupTestJwt } from "../helpers/test-jwt.ts";

// 4. Database setup
import { setupDatabase, teardownDatabase } from "../helpers/db-setup.ts";

// 5. Mock DatabaseManager before importing routes
import { DatabaseManager } from "../../lib/dbm.ts";
import pg from "npm:pg";
import { env } from "../../env.ts";

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.208.0/assert/mod.ts";

let app: any;
let createTestToken: (claims?: Record<string, any>) => Promise<string>;
let cleanupJwksMock: () => void;
let dbClient: any;

// We need to override the DatabaseManager singleton to use our test PG client
// and skip PrefectAPI / Trex.DatabaseManager calls
function createMockDatabaseManager(client: any) {
  const trexdbm = {
    setCredentials: () => {},
    getPublications: () => [{ name: "pub1", tables: ["t1"] }],
  };

  const insert_query = `INSERT INTO trex.db \
    (id, host, port, "name", dialect, credentials, vocab_schemas, publications, db_extra, authentication_mode) \
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) \
    DO UPDATE SET host = EXCLUDED.host, \
    port = EXCLUDED.port, \
    "name" = EXCLUDED."name", \
    dialect = EXCLUDED.dialect, \
    credentials = EXCLUDED.credentials, \
    vocab_schemas = EXCLUDED.vocab_schemas, \
    publications = EXCLUDED.publications, \
    db_extra = EXCLUDED.db_extra, \
    authentication_mode = EXCLUDED.authentication_mode`;

  return {
    deleteCredentials: async (id: string) => {
      const r = await client.query("DELETE FROM trex.db WHERE id = $1", [id]);
      return r;
    },
    setCredentials: async (c: any) => {
      const params = [
        c.code || c.id,
        c.host,
        c.port,
        c.name,
        c.dialect,
        JSON.stringify(c.credentials),
        JSON.stringify(c.vocabSchemas) || null,
        JSON.stringify(c.publications) || null,
        JSON.stringify(c.extra?.Internal) || null,
        c.authenticationMode || null,
      ];
      await client.query(insert_query, params);
      trexdbm.setCredentials();
      return c.code || c.id;
    },
    getPublications: () => trexdbm.getPublications(),
    getCredentials: async () => {
      const r = await client.query("SELECT id as code, * FROM trex.db");
      return r.rows.map((x: any) => ({
        ...x,
        credentials: (x.credentials || []).map((y: any) => ({
          username: y.username,
          userScope: y.userScope || y.user_scope,
          serviceScope: y.serviceScope || y.service_scope,
        })),
      }));
    },
    getCredentialsEncrypted: async () => {
      const r = await client.query("SELECT id, host, port, name, dialect, credentials, vocab_schemas, publications, db_extra, authentication_mode FROM trex.db");
      return r.rows;
    },
  };
}

Deno.test({
  name: "dbm: setup",
  fn: async () => {
    // Setup JWT
    const jwt = await setupTestJwt();
    createTestToken = jwt.createTestToken;
    cleanupJwksMock = jwt.cleanupJwksMock;
    jwt.installJwksMock();

    // Setup axios mock for UserMgmtAPI
    mockAxios();

    // Setup database
    dbClient = await setupDatabase();

    // Override DatabaseManager.get() to return our mock
    const mockDbm = createMockDatabaseManager(dbClient);
    const originalGet = DatabaseManager.get;
    Object.defineProperty(DatabaseManager, "get", {
      value: async () => mockDbm,
      writable: true,
      configurable: true,
    });

    // Create the app with dbm routes
    app = await createTestApp({ routes: ["dbm"] });
    assertExists(app);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "POST /trex/db/ with valid payload returns 200 with id",
  fn: async () => {
    const token = await createTestToken({ sub: "admin-user" });
    const res = await app.request("/trex/db/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        code: "test_db_1",
        host: "db.example.com",
        port: 5432,
        name: "testdb",
        dialect: "postgresql",
        credentials: [
          {
            username: "user1",
            password: "enc_pass",
            salt: "s",
            userScope: "scope1",
            serviceScope: "scope2",
          },
        ],
      }),
    });
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.id, "test_db_1");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "POST /trex/db/ with invalid code (special chars) returns 400",
  fn: async () => {
    const token = await createTestToken({ sub: "admin-user" });
    const res = await app.request("/trex/db/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        code: "invalid-db!@#",
        host: "db.example.com",
        port: 5432,
        name: "testdb",
        dialect: "postgresql",
        credentials: [],
      }),
    });
    assertEquals(res.status, 400);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "DELETE /trex/db/:name returns 200",
  fn: async () => {
    const token = await createTestToken({ sub: "admin-user" });
    const res = await app.request("/trex/db/test_db_1", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.id, "test_db_1");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "PUT /trex/db/ updates existing credentials and returns 200",
  fn: async () => {
    // First insert a record to update
    const token = await createTestToken({ sub: "admin-user" });
    await app.request("/trex/db/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        code: "update_db",
        host: "db.example.com",
        port: 5432,
        name: "testdb",
        dialect: "postgresql",
        credentials: [
          {
            username: "user1",
            password: "enc_pass",
            salt: "s",
            userScope: "scope1",
            serviceScope: "scope2",
          },
        ],
      }),
    });

    // Now update it
    const res = await app.request("/trex/db/", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: "update_db",
        host: "db-updated.example.com",
        port: 5433,
        name: "testdb_updated",
        dialect: "postgresql",
      }),
    });
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.id, "update_db");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "GET /trex/db/publications/ returns 200",
  fn: async () => {
    const token = await createTestToken({ sub: "admin-user" });
    const res = await app.request("/trex/db/publications/", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    assertEquals(res.status, 200);
    const body = await res.json();
    assertExists(body);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "dbm: cleanup",
  fn: async () => {
    cleanupJwksMock();
    restoreAxios();
    await teardownDatabase();
  },
  sanitizeOps: false,
  sanitizeResources: false,
});
