import type { Knex } from '../types'
import { v4 as uuidv4 } from 'uuid'
import { env} from "../../env.ts"

const TABLE_NAME = 'user_group'

export const seed = async (knex: Knex): Promise<void> => {
  const data = getSeeds()
  if (data.length === 0) {
    return
  }

  const trx = await knex.transactionProvider()()
  try {
    for (const row of data) {
      const insert = knex(TABLE_NAME).insert(row)
      const update = knex.queryBuilder().update(row)
      await trx.raw(`? ON CONFLICT (user_id, b2c_group_id) DO ? RETURNING *`, [insert, update])
    }
    trx.commit()
  } catch (err) {
    trx.rollback()
  }
}

const getSeeds = (): { [key: string]: any }[] => {
  const localUserIds: string[] = []

  if (env.IDP__INITIAL_USER__UUID && env.IDP__INITIAL_USER__NAME) {
    localUserIds.push(env.IDP__INITIAL_USER__UUID)
  }

  let seeds: any[] = []
  for (const userId of localUserIds) {
    seeds = seeds.concat([
      {
        id: uuidv4(),
        user_id: userId,
        b2c_group_id: 'b68f53f7-b6d5-452a-b717-809726eba5a8'
      },
      {
        id: uuidv4(),
        user_id: userId,
        b2c_group_id: '94cee905-ad0a-44e6-8a3d-43fe3283a5e3'
      }
    ])

    if (env.NODE_ENV === 'development') {
      // LOCALDEV
      seeds = seeds.concat([
        {
          id: uuidv4(),
          user_id: userId,
          b2c_group_id: 'f761a24e-7609-4d28-a787-6b0a9135d824'
        },
        {
          id: uuidv4(),
          user_id: userId,
          b2c_group_id: 'a6478dac-78cd-4238-8360-85b3dcd93283'
        },
        {
          id: uuidv4(),
          user_id: userId,
          b2c_group_id: '5e07ea6e-becc-40ba-8f39-1bfe74d3c9d9'
        }
      ])
    }
  }

  return seeds
}
