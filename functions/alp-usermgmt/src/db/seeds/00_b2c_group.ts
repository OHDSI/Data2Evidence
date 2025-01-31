import { env } from '../../env'
import type { Knex } from '../types'
import { ROLES } from '../../const'

const TABLE_NAME = 'b2c_group'
const ALP_SYSTEM = env.ALP_SYSTEM_NAME

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
      await trx.raw(`? ON CONFLICT (id) DO ? RETURNING *`, [insert, update])
    }
    trx.commit()
  } catch (err) {
    trx.rollback()
  }
}

const getSeeds = (): { [key: string]: any }[] => {
  const systemRoles = [
    {
      id: 'b68f53f7-b6d5-452a-b717-809726eba5a8',
      role: ROLES.ALP_SYSTEM_ADMIN,
      system: ALP_SYSTEM
    },
    {
      id: '94cee905-ad0a-44e6-8a3d-43fe3283a5e3',
      role: ROLES.ALP_USER_ADMIN,
      system: ALP_SYSTEM
    },
    {
      id: '96f8745c-234f-4dab-a3df-a35a91ae3991',
      role: ROLES.ALP_NIFI_ADMIN,
      system: ALP_SYSTEM
    },
    {
      id: '1792e31c-5dda-467a-9625-31f97cdfb4ec',
      role: ROLES.ALP_DASHBOARD_VIEWER,
      system: ALP_SYSTEM
    }
  ]

  if (env.NODE_ENV === 'development') {
    // LOCALDEV
    const TENANT_ID = env.APP__TENANT_ID
    const STUDY_ID = '703c5d8a-a1d9-4d42-a314-5b9aad513390'

    return [
      ...systemRoles,
      {
        id: 'f761a24e-7609-4d28-a787-6b0a9135d824',
        role: ROLES.TENANT_VIEWER,
        tenant_id: TENANT_ID
      },
      {
        id: 'a6478dac-78cd-4238-8360-85b3dcd93283',
        role: ROLES.STUDY_RESEARCHER,
        study_id: STUDY_ID,
        tenant_id: TENANT_ID
      },
      {
        id: '5e07ea6e-becc-40ba-8f39-1bfe74d3c9d9',
        role: ROLES.STUDY_WRITE_DQD_RESEARCHER,
        study_id: STUDY_ID,
        tenant_id: TENANT_ID
      },
      {
        id: '6c783453-2195-473d-9088-4322e88f65b8',
        role: ROLES.STUDY_MANAGER,
        study_id: STUDY_ID,
        tenant_id: TENANT_ID
      }
    ]
  }

  return systemRoles
}
