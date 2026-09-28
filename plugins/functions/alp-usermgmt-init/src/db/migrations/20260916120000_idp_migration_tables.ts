import type { Knex } from '../types'

/**
 * Bookkeeping for the IdP migration (alp-idp-migration-init).
 *
 * idp_migration holds one row per step with its latest outcome, which is what
 * `d2e migrate-idp-roles --report` prints. idp_subject_history records every
 * re-key of usermgmt."user".idp_user_id, so a re-key can be traced and undone,
 * and so a row already moved to its trex subject can still be matched back to
 * the Logto identity it came from.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    create table if not exists usermgmt.idp_migration (
      step text primary key,
      status text not null,
      counts jsonb not null default '{}'::jsonb,
      detail jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now()
    )
  `)
  await knex.raw(`
    create table if not exists usermgmt.idp_subject_history (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null,
      old_sub text,
      new_sub text not null,
      idp text not null,
      created_at timestamptz not null default now()
    )
  `)
  await knex.raw(`create index if not exists idp_subject_history_user_id on usermgmt.idp_subject_history (user_id)`)
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`drop table if exists usermgmt.idp_subject_history`)
  await knex.raw(`drop table if exists usermgmt.idp_migration`)
}
