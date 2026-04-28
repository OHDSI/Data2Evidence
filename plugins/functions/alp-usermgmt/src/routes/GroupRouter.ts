import express, { NextFunction, Response } from 'express'
import { Service } from 'typedi'
import { B2cGroupService } from '../services'
import { IAppRequest } from '../types'
import { camelToSnakeCase } from '../utils'
import { B2cGroupCriteria, B2cGroupCriteriaKeys } from '../repositories'
import { createLogger } from '../Logger'
import { env } from '../env'

@Service()
export class GroupRouter {
  public router = express.Router()
  private readonly logger = createLogger(this.constructor.name)

  constructor(private readonly b2cGroupService: B2cGroupService) {
    this.registerRoutes()
  }

  private registerRoutes() {
    this.router.get('/', async (req: IAppRequest, res: Response, next: NextFunction) => {
      this.logger.info(`Get groups ${JSON.stringify(req.query)}`)

      const criteria: Partial<B2cGroupCriteria> = {}
      Object.keys(req.query || {}).map((k: string) => {
        const field = camelToSnakeCase(k) as keyof B2cGroupCriteria
        if (B2cGroupCriteriaKeys.includes(field)) {
          if (field === 'study_id' || field === 'tenant_id' || field === 'system') {
            criteria[field] = req.query[k] === 'null' ? null : (req.query[k] as string)
          } else {
            criteria[field] = req.query[k] as string
          }
        }
      })

      try {
        const groups = await this.b2cGroupService.getGroups(criteria)
        res.status(200).json(groups)
      } catch (err) {
        this.logger.error(`Error when getting groups: ${JSON.stringify(err)}`)
        next(err)
      }
    })

    this.router.get('/:id', async (req: IAppRequest, res: Response, next: NextFunction) => {
      const { id } = req.params || {}

      if (!id) {
        this.logger.warn(`Param 'id' is required`)
        res.status(400).send(`Param 'id' is required`)
        return
      }

      this.logger.info(`Get group ${id}`)

      try {
        const group = await this.b2cGroupService.getGroup(id)
        res.status(200).json(group)
      } catch (err) {
        this.logger.error(`Error when getting group ${id}: ${JSON.stringify(err)}`)
        next(err)
      }
    })

    this.router.get('/study/:studyId/role/:role', async (req: IAppRequest, res: Response, next: NextFunction) => {
      const { studyId, role } = req.params || {}

      if (!studyId) {
        this.logger.warn(`Param 'studyId' is required`)
        res.status(400).send(`Param 'studyId' is required`)
        return
      }

      if (!role) {
        this.logger.warn(`Param 'role' is required`)
        res.status(400).send(`Param 'role' is required`)
        return
      }

      this.logger.info(`Get group by study ${studyId} and role ${role}`)

      try {
        const group = await this.b2cGroupService.getGroupByStudyRole(studyId, role)
        res.status(200).json(group)
      } catch (err) {
        this.logger.error(`Error when getting group by study ${studyId}: ${JSON.stringify(err)}`)
        next(err)
      }
    })

    this.router.get('/tenant/:tenantId/role/:role', async (req: IAppRequest, res: Response, next: NextFunction) => {
      const { tenantId, role } = req.params || {}

      if (!tenantId) {
        this.logger.warn(`Param 'tenantId' is required`)
        res.status(400).send(`Param 'tenantId' is required`)
        return
      }

      if (!role) {
        this.logger.warn(`Param 'role' is required`)
        res.status(400).send(`Param 'role' is required`)
        return
      }

      this.logger.info(`Get group by tenant ${tenantId} and role ${role}`)

      try {
        const group = await this.b2cGroupService.getGroupByTenantRole(tenantId, role)
        res.status(200).json(group)
      } catch (err) {
        this.logger.error(`Error when getting group by tenant ${tenantId}: ${JSON.stringify(err)}`)
        next(err)
      }
    })

    this.router.post('/', async (req: IAppRequest, res: Response, next: NextFunction) => {
      const { role, studyId } = req.body || {}
      const tenantId = env.APP_TENANT_ID!
      this.logger.info(`Create group ${role} ${tenantId} ${studyId}`)

      try {
        const group = await this.b2cGroupService.createGroup({ role, tenantId, studyId })
        res.status(200).json({ groupId: group.id })
      } catch (err) {
        this.logger.error(`Error when getting group ${role} ${tenantId} ${studyId}: ${JSON.stringify(err)}`)
        next(err)
      }
    })

    this.router.delete('/:id', async (req: IAppRequest, res: Response, next: NextFunction) => {
      const { id } = req.params || {}

      if (!id) {
        this.logger.warn(`Param 'id' is required`)
        res.status(400).send(`Param 'id' is required`)
        return
      }

      this.logger.info(`Delete group ${id}`)

      try {
        await this.b2cGroupService.deleteGroup(id)
        res.status(200).json({ id })
      } catch (err) {
        this.logger.error(`Error when deleting group ${id}: ${JSON.stringify(err)}`)
        next(err)
      }
    })

    this.router.post('/cleanup', async (req: IAppRequest, res: Response, next: NextFunction) => {
      this.logger.info('Clean up groups')

      try {
        await this.b2cGroupService.deleteGroupsForNonExistenceStudies()
        await this.b2cGroupService.deleteGroupsForNonExistenceTenants()
        res.status(200).send()
      } catch (err) {
        this.logger.error(`Error when cleaning up groups: ${JSON.stringify(err)}`)
        next(err)
      }
    })
  }
}
