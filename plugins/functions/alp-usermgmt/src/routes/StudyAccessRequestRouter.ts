import express, { NextFunction, Response } from 'express'
import { Service } from 'typedi'
import { B2cGroupService, StudyAccessRequestService } from '../services'
import { AccessRequestAction, IAppRequest } from '../types'
import { createLogger } from '../Logger'
import { env } from '../env'

@Service()
export class StudyAccessRequestRouter {
  public router = express.Router()
  private readonly logger = createLogger(this.constructor.name)

  constructor(
    private readonly studyAccessRequestService: StudyAccessRequestService,
    private readonly groupService: B2cGroupService
  ) {
    this.registerRoutes()
  }

  private registerRoutes() {
    this.router.get('/list/:studyId', async (req: IAppRequest, res: Response, next: NextFunction) => {
      const { studyId } = req.params || {}
      this.logger.info(`Get access requests of study ${studyId}}`)

      try {
        const accessRequests = await this.studyAccessRequestService.getStudyAccessRequestList({
          study_id: studyId,
          status: null
        })
        return res.status(200).json(accessRequests)
      } catch (err) {
        this.logger.error(`Error when getting access requests of study ${studyId}: ${JSON.stringify(err)}`)
        return next(err)
      }
    })

    this.router.post('/', async (req: IAppRequest, res: Response, next: NextFunction) => {
      const tenantId = env.APP_TENANT_ID
      const { userId, studyId, role } = req.body || {}

      if (!userId) {
        this.logger.warn(`Param 'userId' is required`)
        return res.status(400).send({ message: `Param 'userId' is required` })
      } else if (!studyId) {
        this.logger.warn(`Param 'studyId' is required`)
        return res.status(400).send({ message: `Param 'studyId' is required` })
      } else if (!role) {
        this.logger.warn(`Param 'role' is required`)
        return res.status(400).send({ message: `Param 'role' is required` })
      }

      this.logger.info(`Add access request for user ${userId} to study ${studyId}, role ${role}`)

      const check = await this.groupService.getGroupByStudyRole(studyId, role)
      if (check == null) {
        this.logger.info(`Group ${role} does not exist. Creating role...`)
        await this.groupService.createGroup({ role, tenantId, studyId })
      }

      try {
        const result = await this.studyAccessRequestService.addRequest(userId, studyId, role, req.user)
        res.status(200).json(result)
      } catch (err) {
        this.logger.error(
          `Error while adding access request for user ${userId} to study ${studyId}, role ${role}: ${JSON.stringify(
            err
          )}`
        )
        next(err)
      }
    })

    this.router.get('/me', async (req: IAppRequest, res: Response, next: NextFunction) => {
      this.logger.info('Get my study access requests')
      const userId = req.user.userId

      try {
        const accessRequests = await this.studyAccessRequestService.getStudyAccessRequestList({
          user_id: userId,
          status: null
        })
        return res.status(200).json(accessRequests)
      } catch (err) {
        this.logger.error(`Error when getting study access requests of user ${userId}: ${JSON.stringify(err)}`)
        return next(err)
      }
    })

    this.router.put('/:action', async (req: IAppRequest, res: Response, next: NextFunction) => {
      const { action } = req.params || {}
      const { id, userId, groupId } = req.body || {}

      if (!action) {
        this.logger.warn(`Path param is required`)
        return res.status(400).send({ message: `Param is required` })
      } else if (!['approve', 'reject'].includes(action)) {
        this.logger.warn(`Path param is invalid`)
        return res.status(400).send({ message: `Param is invalid` })
      }

      if (!id) {
        this.logger.warn(`Param 'id' is required`)
        return res.status(400).send({ message: `Param 'id' is required` })
      } else if (!userId) {
        this.logger.warn(`Param 'userId' is required`)
        return res.status(400).send({ message: `Param 'userId' is required` })
      } else if (!groupId) {
        this.logger.warn(`Param 'groupId' is required`)
        return res.status(400).send({ message: `Param 'groupId' is required` })
      }

      this.logger.info(`Handle request ${id} to ${action} user ${userId} access to group ${groupId}`)

      try {
        const result = await this.studyAccessRequestService.handleRequest(
          id,
          userId,
          groupId,
          action as AccessRequestAction,
          req.user
        )
        res.status(200).json(result)
      } catch (err) {
        this.logger.error(
          `Error while handling request ${id} to ${action} user ${userId} access to group ${groupId}: ${JSON.stringify(
            err
          )}`
        )
        next(err)
      }
    })
  }
}
