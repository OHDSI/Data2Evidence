//import type { Knex } from '../types'
import { Inject, Service } from 'typedi'
import { B2cGroup } from '../entities'
import { Repository } from './Repository'

export interface B2cGroupCriteria {
  id: string | string[]
  role: string
  tenant_id: string | null
  study_id: string | null
  system: string | null
}

export const B2cGroupCriteriaKeys: (keyof B2cGroupCriteria)[] = ['id', 'role', 'tenant_id', 'study_id', 'system']

export interface B2cGroupField {
  id: string
  tenant_id: string | null
  study_id: string | null
  system: string | null
  role: string
}

@Service()
export class B2cGroupRepository extends Repository<B2cGroup, B2cGroupCriteria> {
  constructor(@Inject('DB_CONNECTION') public readonly db: any) {
    super(db)
  }

  reducer({ id, role, tenant_id, study_id, system }: B2cGroupField) {
    return new B2cGroup({
      id,
      role,
      tenantId: tenant_id,
      studyId: study_id,
      system
    })
  }
}
