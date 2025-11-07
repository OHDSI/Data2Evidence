import express, { NextFunction, Response } from 'express'
import { Service } from 'typedi'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { MemberService, UserGroupService, UserService } from '../services'
import { IAppRequest, UserDeleteRequest } from '../types'
import { createLogger } from '../Logger'
import { LogtoAPI } from '../api'

@Service()
export class MeRouter {
  public router = express.Router()
  private readonly logger = createLogger(this.constructor.name)

  constructor(
    private readonly userService: UserService,
    private readonly userGroupService: UserGroupService,
    private readonly memberService: MemberService,
    private readonly logtoApi: LogtoAPI
  ) {
    this.registerRoutes()
  }

  private registerRoutes() {
    this.router.get('/', async (req: IAppRequest, res: Response, next: NextFunction) => {
      const { idpUserId } = req.user

      if (!idpUserId) {
        this.logger.warn(`'idpUserId' is required`)
        return res.status(400).send({ message: `'idpUserId' is required` })
      }

      this.logger.info(`Get IDP user ${idpUserId}`)

      try {
        const user = await this.userService.getUserByIdpUserId(idpUserId)
        if (!user) {
          this.logger.error(`IDP user ID ${idpUserId} not found`)
          return res.status(400).send({ message: `IDP user ID ${idpUserId} not found` })
        }

        return res.status(200).send({ id: user.id, username: user.username })
      } catch (err) {
        this.logger.error(`Error when updating user ${idpUserId}: ${JSON.stringify(err)}`)
        next(err)
      }
    })

    this.router.delete('/', async (req: IAppRequest, res: Response, next: NextFunction) => {
      const { userId } = req.user

      this.logger.info(`Delete user ${userId}`)

      try {
        const request: UserDeleteRequest = { userId }
        await this.memberService.deleteUser(request)
        res.status(200).json({ userId })
      } catch (err) {
        this.logger.error(`Error when deleting user ${userId}: ${JSON.stringify(err)}`)
        next(err)
      }
    })

    this.router.get('/roles', async (req: IAppRequest, res: Response, next: NextFunction) => {
      const { idpUserId } = req.user
      if (!idpUserId) {
        this.logger.warn(`User does not contain 'idpUserId'`)
        return res.status(403).send({ message: `User does not contain 'idpUserId'` })
      }

      this.logger.info(`Get user roles ${idpUserId}`)

      const user = await this.userService.getUserByIdpUserId(idpUserId)
      if (!user) {
        this.logger.error(`IDP user ID ${idpUserId} not found`)
        return res.status(400).send({ message: `IDP user ID ${idpUserId} not found` })
      }

      try {
        const groups = await this.userGroupService.getUserGroups(user?.id)

        const roles = {
          systemRoles: groups.filter(g => g.tenantId == null).map(g => g.role),
          tenantRoles: groups
            .filter(g => g.tenantId != null && g.studyId == null)
            .map(({ tenantId, role }) => ({ tenantId, role })),
          datasetRoles: groups
            .filter(g => g.tenantId != null && g.studyId != null)
            .map(({ tenantId, studyId, role }) => ({ tenantId, datasetId: studyId, role }))
        }

        return res.status(200).json(roles)
      } catch (err) {
        this.logger.error(`Error when getting user roles ${idpUserId}`)
        return next(err)
      }
    })

    this.router.put('/password', async (req: IAppRequest, res: Response, next: NextFunction) => {
      const { idpUserId } = req.user
      const { oldPassword, password } = req.body

      if (!idpUserId) {
        this.logger.warn(`User does not contain 'idpUserId'`)
        return res.status(403).send({ message: `User does not contain 'idpUserId'` })
      }

      if (!oldPassword) {
        this.logger.warn(`Param 'oldPassword' is required`)
        return res.status(400).send({ message: `Param 'oldPassword' is required` })
      }

      if (!password) {
        this.logger.warn(`Param 'password' is required`)
        return res.status(400).send({ message: `Param 'password' is required` })
      }

      this.logger.info(`Update user password ${idpUserId}`)

      const user = await this.userService.getUserByIdpUserId(idpUserId)
      if (!user) {
        this.logger.error(`IDP user ID ${idpUserId} not found`)
        return res.status(400).send({ message: `IDP user ID ${idpUserId} not found` })
      }

      try {
        await this.logtoApi.updatePassword(idpUserId, password, oldPassword)
        res.sendStatus(204)
      } catch (err) {
        if (err?.response?.status >= 400 && err?.response?.status < 500) {
          this.logger.warn(`Error when updating user password ${idpUserId}: ${JSON.stringify(err.response.data)}`)
          return res.status(err.response.status).send(err.response.data)
        }

        this.logger.error(`Error when updating user password ${idpUserId}`)
        return next(err)
      }
    })

    this.router.get('/is_token_valid_internal', async (req: IAppRequest, res: Response, next: NextFunction) => {
      let token: string | undefined

      if ('authorization' in req.headers) {
        token = req.headers['authorization']!.replace(/bearer /i, '')
      }

      if (!token) {
        this.logger.error('A valid token is missing')
        return res.status(401).send({ message: 'A valid token is missing' })
      }

      const payload = jwt.decode(token) as JwtPayload
      if (!payload.sub) {
        this.logger.error(`A 'sub' claim is missing`)
        return res.status(401).send({ message: `A 'sub' claim is missing` })
      }

      const user = await this.userService.getUserByIdpUserId(payload.sub)
      if (!user) {
        this.logger.error(`User '${payload.sub}' is missing`)
        return res.status(401).send({ message: `User '${payload.sub}' is missing` })
      }

      if (!user.active) {
        this.logger.error(`User '${payload.sub}' is inactive`)
        return res.status(401).send({ message: `User '${payload.sub}' is inactive` })
      }

      res.setHeader('Username', user.username)
      return res.status(200).send()
    })
  }
}
