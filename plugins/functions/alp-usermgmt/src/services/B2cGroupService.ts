import type { Knex } from '../types'
import { createLogger } from '../Logger'
import { Container ,  Service } from 'typedi'
import { v4 as uuidv4 } from 'uuid'
import { PortalAPI } from '../api'
import { CONTAINER_KEY, GROUP_NAME_PARTS } from '../const'
import { B2cGroup } from '../entities/B2cGroup'
import { B2cGroupCriteria, B2cGroupField, B2cGroupRepository } from '../repositories'
import { ITokenUser } from '../types'

interface IStudyDistinct {
  study_id: string
}

@Service()
export class B2cGroupService {
  private readonly logger = createLogger(this.constructor.name)

  constructor(private readonly b2cGroupRepo: B2cGroupRepository, private readonly portalAPI: PortalAPI) {}

  async getGroup(id: string): Promise<B2cGroup | undefined> {
    return await this.b2cGroupRepo.getOne({ id })
  }

  async getGroupByStudyRole(studyId: string, role: string): Promise<B2cGroup | undefined> {
    return await this.b2cGroupRepo.getOne({ study_id: studyId, role })
  }

  async getGroupByTenantRole(tenantId: string, role: string): Promise<B2cGroup | undefined> {
    return await this.b2cGroupRepo.getOne({ tenant_id: tenantId, role, study_id: null })
  }

  async getGroupBySystemRole(system: string, role: string): Promise<B2cGroup | undefined> {
    return await this.b2cGroupRepo.getOne({ system, role, tenant_id: null, study_id: null })
  }

  async getGroups(criteria: { [key in keyof B2cGroupCriteria]?: B2cGroupCriteria[key] } = {}): Promise<B2cGroup[]> {
    return await this.b2cGroupRepo.getList(criteria)
  }

  async getGroupsByIds(ids: string[]): Promise<B2cGroup[]> {
    return await this.b2cGroupRepo.getList({ id: ids })
  }

  async getGroupsByTenantRole(role: string): Promise<B2cGroup[]> {
    return await this.b2cGroupRepo.getList({ role, study_id: null })
  }

  async getGroupsByStudyRole(role: string): Promise<B2cGroup[]> {
    return await this.b2cGroupRepo.getList({ role })
  }

  async getGroupByRole(role: string, tenantId?: string | null, studyId?: string | null): Promise<B2cGroup | undefined> {
    const criteria: Partial<B2cGroupCriteria> = {
      role,
      tenant_id: tenantId || null,
      study_id: studyId || null
    }
    return await this.b2cGroupRepo.getOne(criteria)
  }

  async createGroup(
    data: {
      id?: string | null
      role: string
      tenantId?: string | null
      studyId?: string | null
    },
    trx?: Knex
  ) {
    const tokenUser = Container.get<ITokenUser>(CONTAINER_KEY.CURRENT_USER)

    const { id, role, tenantId, studyId } = data
    const newGroup: Partial<B2cGroupField> = {
      id: id || uuidv4(),
      role,
      tenant_id: tenantId,
      study_id: studyId
    }
    this.logger.debug(`Create group ${JSON.stringify(newGroup)}`)
    return await this.b2cGroupRepo.create(newGroup, tokenUser, trx)
  }

  async deleteGroup(id: string, trx?: Knex) {
    this.logger.info(`Delete group ${id}`)
    return await this.b2cGroupRepo.delete({ id }, trx)
  }

  async deleteGroupsForNonExistenceStudies() {
    this.logger.info(`Delete groups for non-existence studies`)

    const portalStudies = await this.portalAPI.getDatasets()
    if (!portalStudies || portalStudies.length == 0) return

    const studies = await this.b2cGroupRepo.getDistinctList<B2cGroupField, IStudyDistinct>(['study_id'])
    const nonExistence = studies.filter(s => !!s.study_id).filter(s => !portalStudies.some(ps => ps.id === s.study_id))
    if (!nonExistence || nonExistence.length === 0) return

    const trx = await this.b2cGroupRepo.getTransaction()
    try {
      for (const s of nonExistence) {
        this.logger.info(`Cleaning up non existence study ${s.study_id}`)
        await this.b2cGroupRepo.delete({ study_id: s.study_id })
      }
      await trx.commit()
    } catch (err) {
      await trx.rollback()
      this.logger.error(`Error when deleting groups for non-existence study: ${JSON.stringify(err)}`)
      throw new Error(`Error when deleting groups for non-existence study`)
    }
  }

  async deleteGroupsForNonExistenceTenants() {
    this.logger.info(`Delete groups for non-existence tenants`)

    const portalTenants = await this.portalAPI.getTenants()
    if (!portalTenants || portalTenants.length == 0) return

    const tenants = await this.b2cGroupRepo.getDistinctList<B2cGroupField, { tenant_id: string }>(['tenant_id'])
    const nonExistence = tenants
      .filter(s => !!s.tenant_id)
      .filter(s => !portalTenants.some(ps => ps.id === s.tenant_id))
    if (!nonExistence || nonExistence.length === 0) return

    const trx = await this.b2cGroupRepo.getTransaction()
    try {
      for (const s of nonExistence) {
        this.logger.info(`Deleting groups for non-existence tenant ${s.tenant_id}`)
        await this.b2cGroupRepo.delete({ tenant_id: s.tenant_id })
      }
      await trx.commit()
    } catch (err) {
      await trx.rollback()
      this.logger.error(`Error when deleting groups for non-existence tenant: ${JSON.stringify(err)}`)
      throw new Error(`Error when deleting groups for non-existence tenant`)
    }
  }

  static getDisplayName(role: string, tenantId: string | null, studyId: string | null) {
    let displayName = role
    if (tenantId) {
      displayName = `${GROUP_NAME_PARTS.TID}=${tenantId}`
    }
    if (studyId) {
      displayName += `;${GROUP_NAME_PARTS.STUDYID}=${studyId}`
    }
    if (tenantId) {
      displayName += `;${GROUP_NAME_PARTS.ROLE}=${role}`
    }
    return displayName
  }
}
