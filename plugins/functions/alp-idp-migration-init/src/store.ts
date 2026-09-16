import type { Knex } from 'knex'
import type { MigrationStore } from '@alp/idp/migration/run.ts'
import type {
  GroupRow, LogtoUserRow, StepName, StepStatus, SubjectHistoryRow, UsermgmtUserRow
} from '@alp/idp/migration/types.ts'

export class KnexMigrationStore implements MigrationStore {
  constructor(private readonly knex: Knex) {}

  async logtoAvailable(): Promise<boolean> {
    const { rows } = await this.knex.raw(`select to_regclass('logto.users') as t`)
    return rows[0]?.t != null
  }

  async usermgmtUsers(): Promise<UsermgmtUserRow[]> {
    const { rows } = await this.knex.raw(`select id, username, idp_user_id as "idpUserId" from usermgmt."user" order by id`)
    return rows
  }

  async logtoUsers(): Promise<LogtoUserRow[]> {
    // Logto keeps its own console users under tenant 'admin'; only 'default' holds d2e's.
    const { rows } = await this.knex.raw(`
      select id, username, primary_email as "primaryEmail", name, coalesce(is_suspended, false) as "isSuspended"
      from logto.users where tenant_id = 'default' order by id`)
    return rows
  }

  async subjectHistory(): Promise<SubjectHistoryRow[]> {
    const { rows } = await this.knex.raw(`
      select user_id as "userId", old_sub as "oldSub", new_sub as "newSub"
      from usermgmt.idp_subject_history where idp = 'logto' order by created_at`)
    return rows
  }

  async groups(): Promise<GroupRow[]> {
    const hasPortal = (await this.knex.raw(`select to_regclass('portal.dataset') as t`)).rows[0]?.t != null
    const { rows } = await this.knex.raw(`
      select ug.user_id as "userId", bg.role as role, bg.study_id as "studyId",
             ${hasPortal ? 'd.token_dataset_code' : 'null'} as "tokenDatasetCode",
             ${hasPortal ? 'd.type' : 'null'} as "datasetType"
      from usermgmt.user_group ug
      join usermgmt.b2c_group bg on bg.id = ug.b2c_group_id
      ${hasPortal ? 'left join portal.dataset d on d.id = bg.study_id' : ''}
      where bg.role is not null
      order by ug.user_id, bg.role`)
    return rows
  }

  async rekey(usermgmtId: string, oldSub: string | null, newSub: string): Promise<void> {
    await this.knex.transaction(async trx => {
      const { rowCount } = await trx.raw(
        `update usermgmt."user" set idp_user_id = ? where id = ? and idp_user_id is distinct from ?`,
        [newSub, usermgmtId, newSub]
      )
      if (rowCount > 0) {
        await trx.raw(
          `insert into usermgmt.idp_subject_history (user_id, old_sub, new_sub, idp) values (?, ?, ?, 'logto')`,
          [usermgmtId, oldSub, newSub]
        )
      }
    })
  }

  async recordStep(step: StepName, status: StepStatus, counts: Record<string, number>, detail: unknown): Promise<void> {
    await this.knex.raw(
      `insert into usermgmt.idp_migration (step, status, counts, detail, updated_at)
       values (?, ?, ?::jsonb, ?::jsonb, now())
       on conflict (step) do update set status = excluded.status, counts = excluded.counts,
         detail = excluded.detail, updated_at = now()`,
      [step, status, JSON.stringify(counts), JSON.stringify(detail ?? {})]
    )
  }
}
