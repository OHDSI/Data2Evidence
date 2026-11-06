import { Inject, Injectable } from "@danet/core";
import { EntityManager } from "npm:typeorm";
import { DATABASE } from "../../database/module.ts";
import { PostgresService } from "../../database/postgres.service.ts";
import { AiProviderConfig } from "../entity/ai-provider-config.entity.ts";

/**
 * Two groups of methods, deliberately kept apart:
 * - pool-bound methods, used ONLY by the two GET routes;
 * - `*Tx` methods, which take the EntityManager of the surrounding transaction and
 *   are the only ones the service may call from inside `withLock`. A pool-bound call
 *   takes its own connection and autocommits, which would break the transaction's
 *   atomicity and could exhaust the pool while the lock holder waits for a second
 *   connection.
 */
@Injectable()
export class AiProviderConfigRepository {
  constructor(@Inject(DATABASE) private readonly postgresService: PostgresService) {}

  // ---- pool-bound (GET routes only) ----

  findAll(): Promise<AiProviderConfig[]> {
    return this.postgresService
      .getDataSource()
      .getRepository(AiProviderConfig)
      .find({ order: { id: "ASC" } });
  }

  findById(id: number): Promise<AiProviderConfig | null> {
    return this.postgresService
      .getDataSource()
      .getRepository(AiProviderConfig)
      .findOneBy({ id });
  }

  // ---- transaction-bound ----

  listTx(manager: EntityManager): Promise<AiProviderConfig[]> {
    return manager.find(AiProviderConfig, { order: { id: "ASC" } });
  }

  findByIdTx(
    manager: EntityManager,
    id: number,
  ): Promise<AiProviderConfig | null> {
    return manager.findOneBy(AiProviderConfig, { id });
  }

  async insertTx(
    manager: EntityManager,
    entity: Partial<AiProviderConfig>,
  ): Promise<number> {
    const result = await manager.insert(AiProviderConfig, entity);
    return result.identifiers[0].id as number;
  }

  async updateTx(
    manager: EntityManager,
    id: number,
    entity: Partial<AiProviderConfig>,
  ): Promise<void> {
    await manager.update(AiProviderConfig, { id }, entity);
  }

  // Both bump modified_date (@UpdateDateColumn), so they set modified_by too.
  async clearSelectedTx(
    manager: EntityManager,
    modifiedBy: string,
  ): Promise<void> {
    await manager.update(AiProviderConfig, { isSelected: true }, {
      isSelected: false,
      modifiedBy,
    });
  }

  async setSelectedTx(
    manager: EntityManager,
    id: number,
    modifiedBy: string,
  ): Promise<void> {
    await manager.update(AiProviderConfig, { id }, {
      isSelected: true,
      modifiedBy,
    });
  }

  async deleteTx(manager: EntityManager, id: number): Promise<void> {
    await manager.delete(AiProviderConfig, { id });
  }
}
