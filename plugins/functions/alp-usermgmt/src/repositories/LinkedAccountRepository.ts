import type { Knex } from '../types'
import { Inject,Service } from 'typedi'
import { LinkedAccount } from '../entities'
import { Repository } from './Repository'
import { CONTAINER_KEY } from '../const'

export interface LinkedAccountCriteria {
  id: string | string[]
  user_id: string | string[]
  provider: string | string[]
}

export interface LinkedAccountField {
  id: string
  user_id: string
  provider: string
  provider_subject: string
  provider_username: string | null
  access_token_enc: Buffer
  refresh_token_enc: Buffer | null
  access_token_expires: Date | null
  scopes: string | null
  last_synced_at: Date | null
  last_sync_error: string | null
}

@Service()
export class LinkedAccountRepository extends Repository<LinkedAccount, LinkedAccountCriteria> {
  constructor(@Inject(CONTAINER_KEY.DB_CONNECTION) public readonly db: any) {
    super(db)
  }

  reducer(row: any): LinkedAccount {
    return {
      id: row.id,
      userId: row.user_id,
      provider: row.provider,
      providerSubject: row.provider_subject,
      providerUsername: row.provider_username,
      accessTokenEnc: row.access_token_enc,
      refreshTokenEnc: row.refresh_token_enc,
      accessTokenExpires: row.access_token_expires,
      scopes: row.scopes,
      linkedAt: row.linked_at,
      updatedAt: row.updated_at,
      lastSyncedAt: row.last_synced_at,
      lastSyncError: row.last_sync_error,
    }
  }

  async findByUserAndProvider(userId: string, provider: string, trx?: Knex): Promise<LinkedAccount | null> {
    const row = await (trx || this.db)(this.tableName)
      .where({ user_id: userId, provider })
      .first()
    return row ? this.reducer(row) : null
  }

  async upsert(field: Partial<LinkedAccountField>, trx?: Knex): Promise<LinkedAccount> {
    const [row] = await (trx || this.db)(this.tableName)
      .insert(field)
      .onConflict(['user_id', 'provider'])
      .merge()
      .returning('*')
    return this.reducer(row)
  }

  async updateSyncStatus(id: string, lastSyncedAt: Date | null, lastSyncError: string | null, trx?: Knex): Promise<void> {
    await (trx || this.db)(this.tableName)
      .where({ id })
      .update({ last_synced_at: lastSyncedAt, last_sync_error: lastSyncError, updated_at: new Date() })
  }

  async deleteById(id: string, trx?: Knex): Promise<void> {
    await (trx || this.db)(this.tableName).where({ id }).del()
  }
}
