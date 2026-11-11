// Test helpers for the AI config module (not a test file itself).
//
// Running these tests needs PG__SSL set (CI sets PG__SSL=false) because the service
// imports PostgresService, which reads it at load. SERVICE_ROUTES must be unset or valid
// JSON, because crypto.ts -> env.ts parses it at load. env.ts snapshots the encryption
// key at load, so tests cannot simulate "key unset" through the environment: they
// override `getKey()` through TestService instead.
import { Buffer } from "node:buffer";
import { Feature } from "../feature/entity/feature.entity.ts";
import { AiConfigService } from "./ai-config.service.ts";
import { parseEncryptionKey } from "./crypto.ts";
import { AiConfigRepository } from "./repository/ai-config.repository.ts";

export const KEY_A = Buffer.alloc(32, 7).toString("base64");
export const KEY_B = Buffer.alloc(32, 9).toString("base64");

// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

function pgError(constraint: string) {
  const e = new Error(
    `duplicate key value violates unique constraint "${constraint}"`,
  ) as Error & { code: string; constraint: string };
  e.code = "23505";
  e.constraint = constraint;
  return e;
}

/**
 * In-memory stand-in for the table with the semantics the service relies on: both
 * unique indexes (name, case-sensitive; at most one active row), SERIAL ids, and a
 * transaction that is rolled back by restoring a snapshot.
 */
export class FakeDb {
  rows: Row[] = [];
  /** `portal.feature` rows; manager calls with the Feature entity act on these. */
  features: Row[] = [];
  nextId = 1;
  /** Everything the runner/manager was asked to do, in order. */
  queries: string[] = [];
  runnersCreated = 0;
  commits = 0;
  rollbacks = 0;
  releases = 0;
  poolCalls: string[] = [];
  /** Throw this from the next manager.insert (to simulate a Postgres error). */
  failNextInsertWith: Error | null = null;
  /** Throw this from the next manager.update on the Feature entity. */
  failNextFeatureUpdateWith: Error | null = null;

  private snapshot: { rows: Row[]; features: Row[]; nextId: number } | null = null;

  private checkIndexes(rows: Row[]) {
    const seen = new Set<string>();
    for (const r of rows) {
      if (seen.has(r.name)) throw pgError("ai_config_name_idx");
      seen.add(r.name);
    }
    if (rows.filter((r) => r.isActive).length > 1) {
      throw pgError("ai_config_active_idx");
    }
  }

  private match(r: Row, criteria: Row) {
    return Object.entries(criteria).every(([k, v]) => r[k] === v);
  }

  manager = {
    find: (_e: unknown, opts?: { order?: { id?: string } }) => {
      this.queries.push("manager.find");
      const out = this.rows.map((r) => ({ ...r }));
      if (opts?.order?.id === "ASC") out.sort((a, b) => a.id - b.id);
      return Promise.resolve(out);
    },
    findOneBy: (e: unknown, criteria: Row) => {
      this.queries.push("manager.findOneBy");
      if (e === Feature) {
        this.queries.push("feature.findOneBy");
        const f = this.features.find((x) => this.match(x, criteria));
        return Promise.resolve(f ? { ...f } : null);
      }
      const r = this.rows.find((x) => this.match(x, criteria));
      return Promise.resolve(r ? { ...r } : null);
    },
    insert: (_e: unknown, values: Row) => {
      this.queries.push("manager.insert");
      if (this.failNextInsertWith) {
        const err = this.failNextInsertWith;
        this.failNextInsertWith = null;
        return Promise.reject(err);
      }
      const row = { ...values, id: this.nextId };
      for (const f of ["baseUrl", "region", "workspaceId"]) {
        if (row[f] === undefined) row[f] = null;
      }
      const next = [...this.rows, row];
      try {
        this.checkIndexes(next);
      } catch (e) {
        return Promise.reject(e);
      }
      this.nextId++;
      this.rows = next;
      return Promise.resolve({ identifiers: [{ id: row.id }] });
    },
    update: (e: unknown, criteria: Row, partial: Row) => {
      this.queries.push("manager.update");
      if (e === Feature) {
        this.queries.push("feature.update");
        if (this.failNextFeatureUpdateWith) {
          const err = this.failNextFeatureUpdateWith;
          this.failNextFeatureUpdateWith = null;
          return Promise.reject(err);
        }
        this.features = this.features.map((f) =>
          this.match(f, criteria) ? { ...f, ...partial } : f
        );
        return Promise.resolve({});
      }
      const next = this.rows.map((r) =>
        this.match(r, criteria) ? { ...r, ...partial } : r
      );
      try {
        this.checkIndexes(next);
      } catch (e) {
        return Promise.reject(e);
      }
      this.rows = next;
      return Promise.resolve({});
    },
    delete: (_e: unknown, criteria: Row) => {
      this.queries.push("manager.delete");
      this.rows = this.rows.filter((r) => !this.match(r, criteria));
      return Promise.resolve({});
    },
  };

  /** Only createQueryRunner is allowed; the rest throw, so any pool access inside a transaction fails the test. */
  dataSource = {
    isInitialized: true,
    initialize: () => Promise.resolve(),
    createQueryRunner: () => {
      this.runnersCreated++;
      return {
        manager: this.manager,
        connect: () => Promise.resolve(),
        startTransaction: () => {
          this.snapshot = {
            rows: this.rows.map((r) => ({ ...r })),
            features: this.features.map((r) => ({ ...r })),
            nextId: this.nextId,
          };
          return Promise.resolve();
        },
        query: (sql: string) => {
          this.queries.push(sql);
          return Promise.resolve([]);
        },
        commitTransaction: () => {
          this.commits++;
          this.snapshot = null;
          return Promise.resolve();
        },
        rollbackTransaction: () => {
          this.rollbacks++;
          if (this.snapshot) {
            this.rows = this.snapshot.rows;
            this.features = this.snapshot.features;
            this.nextId = this.snapshot.nextId;
          }
          this.snapshot = null;
          return Promise.resolve();
        },
        release: () => {
          this.releases++;
          return Promise.resolve();
        },
      };
    },
    getRepository: () => {
      this.poolCalls.push("getRepository");
      if (!this.allowPool) throw new Error("pool access: getRepository");
      return {
        find: () => Promise.resolve(this.rows.map((r) => ({ ...r })).sort((a, b) => a.id - b.id)),
        findOneBy: (c: Row) => {
          const r = this.rows.find((x) => this.match(x, c));
          return Promise.resolve(r ? { ...r } : null);
        },
      };
    },
    get manager() {
      throw new Error("pool access: dataSource.manager");
    },
    query: () => {
      throw new Error("pool access: dataSource.query");
    },
    createQueryBuilder: () => {
      throw new Error("pool access: dataSource.createQueryBuilder");
    },
  };

  /** Pool-bound reads are only legal for the two GET routes. */
  allowPool = false;

  /** Calls to PostgresService.getDataSourceAsync (the idempotent init path). */
  asyncDataSourceCalls = 0;

  /** Stand-in for PostgresService (the DATABASE token). */
  postgresService = {
    getDataSource: () => this.dataSource,
    getDataSourceAsync: () => {
      this.asyncDataSourceCalls++;
      return Promise.resolve(this.dataSource);
    },
  };

  reset() {
    this.queries = [];
    this.runnersCreated = 0;
    this.commits = this.rollbacks = this.releases = 0;
    this.poolCalls = [];
  }
}

export class TestService extends AiConfigService {
  constructor(
    public db: FakeDb,
    public rawKey: string | undefined | null,
    userId = "tester",
  ) {
    super(
      // deno-lint-ignore no-explicit-any
      new AiConfigRepository(db.postgresService as any),
      // deno-lint-ignore no-explicit-any
      db.postgresService as any,
      // deno-lint-ignore no-explicit-any
      { getAuthToken: () => ({ sub: userId }) } as any,
    );
  }

  protected override getKey() {
    return parseEncryptionKey(this.rawKey);
  }
}

export function setup(rawKey: string | undefined | null = KEY_A) {
  const db = new FakeDb();
  const svc = new TestService(db, rawKey);
  return { db, svc };
}

// Every body gets a fresh name unless the test passes one, so two rows only clash
// by name when a test asks for it. Passing an update body without `name` renames
// the row, which is allowed.
let nameSeq = 0;
const named = (body: Row) => ({ name: `Config ${++nameSeq}`, ...body });

export const bedrock = (over: Row = {}) =>
  named({
    provider: "bedrock",
    region: "us-east-1",
    model: "m1",
    apiKey: "sk-secret-1",
    ...over,
  });
export const anthropic = (over: Row = {}) =>
  named({
    provider: "anthropic",
    model: "claude",
    apiKey: "sk-secret-2",
    ...over,
  });
export const openai = (over: Row = {}) =>
  named({
    provider: "openai-compatible",
    baseUrl: "https://x/v1",
    model: "gpt",
    apiKey: "sk-secret-3",
    ...over,
  });
