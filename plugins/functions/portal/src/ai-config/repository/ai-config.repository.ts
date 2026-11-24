import { Inject, Injectable } from "@danet/core";
import { EntityManager } from "npm:typeorm";
import { DATABASE } from "../../database/module.ts";
import { PostgresService } from "../../database/postgres.service.ts";
import { AiConfig } from "../entity/ai-config.entity.ts";

/**
 * Two groups of methods, deliberately kept apart:
 * - pool-bound methods, used ONLY by the GET list route;
 * - `*Tx` methods, which take the EntityManager of the surrounding transaction and
 *   are the only ones the service may call from inside `withLock`. A pool-bound call
 *   takes its own connection and autocommits, which would break the transaction's
 *   atomicity and could exhaust the pool while the lock holder waits for a second
 *   connection.
 */
@Injectable()
export class AiConfigRepository {
  constructor(@Inject(DATABASE) private readonly postgresService: PostgresService) {}

  // ---- pool-bound (GET list only) ----

  findAll(): Promise<AiConfig[]> {
    return this.postgresService
      .getDataSource()
      .getRepository(AiConfig)
      .find({ order: { id: "ASC" } });
  }

  // ---- transaction-bound ----

  listTx(manager: EntityManager): Promise<AiConfig[]> {
    return manager.find(AiConfig, { order: { id: "ASC" } });
  }

  findByIdTx(
    manager: EntityManager,
    id: number,
  ): Promise<AiConfig | null> {
    return manager.findOneBy(AiConfig, { id });
  }

  async insertTx(
    manager: EntityManager,
    entity: Partial<AiConfig>,
  ): Promise<number> {
    const result = await manager.insert(AiConfig, entity);
    return result.identifiers[0].id as number;
  }

  async updateTx(
    manager: EntityManager,
    id: number,
    entity: Partial<AiConfig>,
  ): Promise<void> {
    await manager.update(AiConfig, { id }, entity);
  }

  // Both bump modified_date (@UpdateDateColumn), so they set modified_by too.
  async clearActiveTx(
    manager: EntityManager,
    modifiedBy: string,
  ): Promise<void> {
    await manager.update(AiConfig, { isActive: true }, {
      isActive: false,
      modifiedBy,
    });
  }

  async setActiveTx(
    manager: EntityManager,
    id: number,
    modifiedBy: string,
  ): Promise<void> {
    await manager.update(AiConfig, { id }, {
      isActive: true,
      modifiedBy,
    });
  }

  async deleteTx(manager: EntityManager, id: number): Promise<void> {
    await manager.delete(AiConfig, { id });
  }
}
