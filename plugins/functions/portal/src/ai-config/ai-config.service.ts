import { Inject, Injectable, SCOPE } from "@danet/core";
import { Buffer } from "node:buffer";
import { DataSource, EntityManager } from "npm:typeorm";
import { REDACTED_TEXT } from "../common/const.ts";
import { RequestContextService } from "../common/request-context.service.ts";
import { DATABASE } from "../database/module.ts";
import { PostgresService } from "../database/postgres.service.ts";
import {
  decryptApiKey,
  encryptApiKey,
  getEncryptionKeyFromEnv,
} from "./crypto.ts";
import {
  AI_CONFIG_PROVIDERS,
  AiConfigProvider,
  AiConfigResponse,
  NormalisedAiConfig,
} from "./dto/ai-config.dto.ts";
import { AiConfig } from "./entity/ai-config.entity.ts";
import {
  AI_CONFIG_ACTIVE_DELETE,
  AI_CONFIG_DUPLICATE,
  AI_CONFIG_ENCRYPTION_KEY_NOT_CONFIGURED,
  AI_CONFIG_INVALID,
  AI_CONFIG_KEY_REQUIRED,
  AI_CONFIG_NOT_FOUND,
  AiConfigError,
} from "./errors.ts";
import { AiConfigRepository } from "./repository/ai-config.repository.ts";

/**
 * Key of the transaction-level advisory lock taken first by every write. The value is
 * arbitrary (from issue 3561) and uses the one-argument bigint pg_advisory_xact_lock form.
 * It is kept above int4 max so it cannot collide with hashtext()-based advisory keys, which
 * Trex's auth code takes in the same database.
 */
export const AI_CONFIG_LOCK_KEY = 3561003561n;
export const AI_CONFIG_NAME_INDEX = "ai_config_name_idx";

const MAX_INT4 = 2147483647;

@Injectable({ scope: SCOPE.REQUEST })
export class AiConfigService {
  // Audit subject only (created_by / modified_by). Never used for authorisation.
  private readonly userId: string;

  constructor(
    private readonly repo: AiConfigRepository,
    @Inject(DATABASE) private readonly postgresService: PostgresService,
    private readonly requestContextService: RequestContextService,
  ) {
    this.userId = this.requestContextService.getAuthToken()?.sub as string;
  }

  /**
   * The encryption key from the env snapshot, or null when missing or invalid.
   * Overridable so tests can simulate an unset, invalid or valid key (env.ts reads
   * the variable once at module load).
   */
  protected getKey(): Buffer | null {
    return getEncryptionKeyFromEnv();
  }

  // ---------------------------------------------------------------- reads (pool)

  async list(): Promise<AiConfigResponse[]> {
    await this.initDataSource();
    const key = this.getKey();
    const rows = await this.repo.findAll();
    return rows.map((row) => this.toResponse(row, key));
  }

  async get(rawId: string): Promise<AiConfigResponse> {
    const id = this.parseId(rawId);
    await this.initDataSource();
    const row = await this.repo.findById(id);
    if (!row) throw this.notFound();
    return this.toResponse(row, this.getKey());
  }

  // --------------------------------------------------------------- writes (lock)

  async create(body: unknown): Promise<AiConfigResponse> {
    const key = this.requireKey(); // first, so a missing key fails before any input handling
    const input = this.validate(body);
    if (input.apiKey === REDACTED_TEXT) {
      throw this.invalid("apiKey", "The API key placeholder is not valid here");
    }
    return await this.withLock(async (manager) => {
      const rows = await this.repo.listTx(manager);
      if (rows.some((row) => row.name === input.name)) {
        throw this.duplicate();
      }
      const id = await this.repo.insertTx(manager, {
        name: input.name,
        provider: input.provider,
        model: input.model,
        baseUrl: input.baseUrl,
        region: input.region,
        workspaceId: input.workspaceId,
        apiKeyEncrypted: encryptApiKey(input.apiKey, key),
        isActive: !rows.some((row) => row.isActive),
        createdBy: this.userId,
        modifiedBy: this.userId,
      });
      return this.toResponse(await this.reload(manager, id), key);
    });
  }

  async update(rawId: string, body: unknown): Promise<AiConfigResponse> {
    const key = this.requireKey(); // first, so a missing key fails before :id parsing and validation
    const id = this.parseId(rawId);
    if (
      body !== null && typeof body === "object" &&
      Object.prototype.hasOwnProperty.call(body, "isActive")
    ) {
      throw this.invalid(
        "isActive",
        "Field `isActive` cannot be set here; use the activate endpoint",
      );
    }
    const input = this.validate(body);
    return await this.withLock(async (manager) => {
      const rows = await this.repo.listTx(manager);
      const existing = rows.find((row) => row.id === id);
      if (!existing) throw this.notFound();

      let apiKeyEncrypted: string;
      if (input.apiKey === REDACTED_TEXT) {
        const keepable = existing.provider === input.provider &&
          existing.baseUrl === input.baseUrl &&
          decryptApiKey(existing.apiKeyEncrypted, key) !== null;
        if (!keepable) {
          throw new AiConfigError(
            400,
            AI_CONFIG_KEY_REQUIRED,
            "A new API key is required",
          );
        }
        apiKeyEncrypted = existing.apiKeyEncrypted;
      } else {
        apiKeyEncrypted = encryptApiKey(input.apiKey, key);
      }

      if (rows.some((row) => row.id !== id && row.name === input.name)) {
        throw this.duplicate();
      }
      await this.repo.updateTx(manager, id, {
        name: input.name,
        provider: input.provider,
        model: input.model,
        baseUrl: input.baseUrl,
        region: input.region,
        workspaceId: input.workspaceId,
        apiKeyEncrypted,
        modifiedBy: this.userId,
      });
      return this.toResponse(await this.reload(manager, id), key);
    });
  }

  async activate(rawId: string): Promise<AiConfigResponse> {
    const id = this.parseId(rawId);
    return await this.withLock(async (manager) => {
      const row = await this.repo.findByIdTx(manager, id);
      if (!row) throw this.notFound(); // before any change
      if (!row.isActive) {
        // Two statements: a single UPDATE ... SET is_active = (id = :id) trips the
        // unique partial index mid-statement.
        await this.repo.clearActiveTx(manager, this.userId);
        await this.repo.setActiveTx(manager, id, this.userId);
      }
      return this.toResponse(await this.reload(manager, id), this.getKey());
    });
  }

  async delete(rawId: string): Promise<{ id: number }> {
    const id = this.parseId(rawId);
    return await this.withLock(async (manager) => {
      const rows = await this.repo.listTx(manager);
      const row = rows.find((r) => r.id === id);
      if (!row) throw this.notFound();
      if (row.isActive && rows.length > 1) {
        throw new AiConfigError(
          400,
          AI_CONFIG_ACTIVE_DELETE,
          "The active configuration cannot be deleted while others exist",
        );
      }
      await this.repo.deleteTx(manager, id);
      return { id };
    });
  }

  /**
   * The service's own transaction. Deliberately not TransactionRunner, which turns
   * every error but two into a 500 (so a 404 or 409 would come out as 500). An
   * advisory lock is taken first, so concurrent writes are serialised even on an
   * empty table, where row locks would lock nothing. Errors from `fn` are rethrown
   * unchanged, except a 23505 on the name index, which becomes 409 `_DUPLICATE`.
   */
  async withLock<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    const dataSource = await this.initDataSource();
    const queryRunner = dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        // Must stay the first statement of the transaction.
        await queryRunner.query(
          `SELECT pg_advisory_xact_lock(${AI_CONFIG_LOCK_KEY})`,
        );
        const result = await fn(queryRunner.manager);
        await queryRunner.commitTransaction();
        return result;
      } catch (error) {
        try {
          await queryRunner.rollbackTransaction();
        } catch {
          // keep the original error
        }
        if (this.isNameIndexViolation(error)) throw this.duplicate();
        throw error;
      }
    } finally {
      await queryRunner.release();
    }
  }

  // --------------------------------------------------------------------- helpers

  // The shared, idempotent init path (one initialize() promise for all callers).
  private initDataSource(): Promise<DataSource> {
    return this.postgresService.getDataSourceAsync();
  }

  private requireKey(): Buffer {
    const key = this.getKey();
    if (!key) {
      throw new AiConfigError(
        500,
        AI_CONFIG_ENCRYPTION_KEY_NOT_CONFIGURED,
        "The AI configuration encryption key is not configured",
      );
    }
    return key;
  }

  private isNameIndexViolation(error: unknown): boolean {
    // deno-lint-ignore no-explicit-any
    const e = error as any;
    const code = e?.code ?? e?.driverError?.code;
    const constraint = e?.constraint ?? e?.driverError?.constraint;
    return code === "23505" && constraint === AI_CONFIG_NAME_INDEX;
  }

  private async reload(
    manager: EntityManager,
    id: number,
  ): Promise<AiConfig> {
    const row = await this.repo.findByIdTx(manager, id);
    if (!row) throw this.notFound();
    return row;
  }

  /** Positive integer in int4 range, else 404 without touching Postgres. */
  private parseId(raw: string): number {
    if (typeof raw !== "string" || !/^[1-9]\d{0,9}$/.test(raw)) {
      throw this.notFound();
    }
    const id = Number(raw);
    if (id > MAX_INT4) throw this.notFound();
    return id;
  }

  private toResponse(
    row: AiConfig,
    key: Buffer | null,
  ): AiConfigResponse {
    const readable = key !== null &&
      decryptApiKey(row.apiKeyEncrypted, key) !== null;
    return {
      id: row.id,
      name: row.name,
      provider: row.provider,
      model: row.model,
      baseUrl: row.baseUrl ?? null,
      region: row.region ?? null,
      workspaceId: row.workspaceId ?? null,
      apiKey: REDACTED_TEXT,
      ...(readable ? {} : { keyReadable: false as const }),
      isActive: row.isActive,
    };
  }

  private notFound(): AiConfigError {
    return new AiConfigError(
      404,
      AI_CONFIG_NOT_FOUND,
      "AI configuration not found",
    );
  }

  private duplicate(): AiConfigError {
    return new AiConfigError(
      409,
      AI_CONFIG_DUPLICATE,
      "An AI configuration with this name already exists",
      "name",
    );
  }

  private invalid(field: string, description: string): AiConfigError {
    return new AiConfigError(
      400,
      AI_CONFIG_INVALID,
      description,
      field,
    );
  }

  /** Optional field: absent, null or blank -> null; otherwise trimmed. */
  private optional(
    body: Record<string, unknown>,
    field: string,
  ): string | null {
    const value = body[field];
    if (value === undefined || value === null) return null;
    if (typeof value !== "string") {
      throw this.invalid(field, `Field \`${field}\` must be a string`);
    }
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }

  private validate(rawBody: unknown): NormalisedAiConfig {
    const body = (rawBody !== null && typeof rawBody === "object"
      ? rawBody
      : {}) as Record<string, unknown>;

    const name = this.optional(body, "name");
    if (name === null) {
      throw this.invalid("name", "Field `name` is required");
    }

    const provider = typeof body.provider === "string" ? body.provider.trim() : "";
    if (!(AI_CONFIG_PROVIDERS as readonly string[]).includes(provider)) {
      throw this.invalid("provider", "Unknown provider");
    }

    const model = this.optional(body, "model");
    if (model === null) {
      throw this.invalid("model", "Field `model` is required");
    }

    const baseUrl = this.optional(body, "baseUrl");
    const region = this.optional(body, "region");
    const workspaceId = this.optional(body, "workspaceId");

    const applies: Record<AiConfigProvider, string[]> = {
      bedrock: ["region"],
      anthropic: ["workspaceId"],
      "openai-compatible": ["baseUrl"],
    };
    const required: Record<AiConfigProvider, string | null> = {
      bedrock: "region",
      anthropic: null,
      "openai-compatible": "baseUrl",
    };
    const values: Record<string, string | null> = {
      baseUrl,
      region,
      workspaceId,
    };
    for (const field of ["baseUrl", "region", "workspaceId"]) {
      if (applies[provider as AiConfigProvider].includes(field)) {
        if (required[provider as AiConfigProvider] === field && values[field] === null) {
          throw this.invalid(field, `Field \`${field}\` is required`);
        }
      } else if (values[field] !== null) {
        throw this.invalid(
          field,
          `Field \`${field}\` does not apply to provider \`${provider}\``,
        );
      }
    }

    if (baseUrl !== null) {
      let protocol: string;
      try {
        protocol = new URL(baseUrl).protocol;
      } catch {
        throw this.invalid("baseUrl", "Field `baseUrl` is not a valid URL");
      }
      if (protocol !== "http:" && protocol !== "https:") {
        throw this.invalid("baseUrl", "Field `baseUrl` must be an http(s) URL");
      }
    }

    // Trimmed before the blank check, the placeholder comparisons and storage,
    // so a padded " ***REDACTED*** " still counts as the placeholder.
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    if (apiKey === "") {
      throw this.invalid("apiKey", "Field `apiKey` is required");
    }

    return {
      name,
      provider: provider as AiConfigProvider,
      model,
      baseUrl,
      region,
      workspaceId,
      apiKey,
    };
  }
}
