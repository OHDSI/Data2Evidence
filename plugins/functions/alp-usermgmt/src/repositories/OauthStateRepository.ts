import { Inject,Service } from 'typedi'
import { OauthState } from '../entities'
import { CONTAINER_KEY } from '../const'

@Service()
export class OauthStateRepository {
  private readonly tableName = 'oauth_state'
  constructor(@Inject(CONTAINER_KEY.DB_CONNECTION) public readonly db: any) {}

  async create(row: {
    id: string
    userId: string
    provider: string
    state: string
    codeVerifier: string
    expiresAt: Date
  }): Promise<void> {
    await this.db(this.tableName).insert({
      id: row.id,
      user_id: row.userId,
      provider: row.provider,
      state: row.state,
      code_verifier: row.codeVerifier,
      expires_at: row.expiresAt,
    })
  }

  // Atomic: select-and-delete in a single transaction. Returns null if not found.
  async consume(state: string): Promise<OauthState | null> {
    const trx = await this.db.transaction()
    try {
      const row = await trx(this.tableName).where({ state }).first()
      if (!row) {
        await trx.commit()
        return null
      }
      await trx(this.tableName).where({ id: row.id }).del()
      await trx.commit()
      return {
        id: row.id,
        userId: row.user_id,
        provider: row.provider,
        state: row.state,
        codeVerifier: row.code_verifier,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
      }
    } catch (e) {
      await trx.rollback()
      throw e
    }
  }

  async deleteExpired(now: Date = new Date()): Promise<number> {
    return await this.db(this.tableName).where('expires_at', '<', now).del()
  }
}
