import express, { NextFunction, Response } from 'express'
import { Service } from 'typedi'
import { LinkedAccountService } from '../services/LinkedAccountService'
import { PhysionetReconcileService } from '../services/PhysionetReconcileService'
import { UserGroupService } from '../services/UserGroupService'
import { UserService } from '../services/UserService'
import { IAppRequest } from '../types'
import { createLogger } from '../Logger'
import { env } from '../env'

const PROVENANCE = 'physionet_sync'

@Service()
export class LinkedAccountRouter {
  public router = express.Router()
  private readonly logger = createLogger(this.constructor.name)

  constructor(
    private readonly linkedSvc: LinkedAccountService,
    private readonly reconcileSvc: PhysionetReconcileService,
    private readonly groupSvc: UserGroupService,
    private readonly userSvc: UserService,
  ) {
    this.registerRoutes()
  }

  private requireEnabled = (_req: any, res: Response, next: NextFunction) => {
    if (!env.PHYSIONET_LINKING_ENABLED) return res.status(404).send({ message: 'not enabled' })
    next()
  }

  private resolveUserId = async (req: IAppRequest): Promise<string | null> => {
    const idpUserId = req.user?.idpUserId
    if (!idpUserId) return null
    const u = await this.userSvc.getUserByIdpUserId(idpUserId)
    return u?.id ?? null
  }

  private registerRoutes() {
    this.router.use(this.requireEnabled)

    this.router.get('/', async (req: IAppRequest, res, next) => {
      try {
        const userId = await this.resolveUserId(req)
        if (!userId) return res.status(400).send({ message: 'user not found' })
        res.json(await this.linkedSvc.list(userId))
      } catch (e) { next(e) }
    })

    this.router.post('/physionet/start', async (req: IAppRequest, res, next) => {
      try {
        const userId = await this.resolveUserId(req)
        if (!userId) return res.status(400).send({ message: 'user not found' })
        res.json(await this.linkedSvc.startLink(userId, 'physionet'))
      } catch (e) { next(e) }
    })

    this.router.get('/physionet/callback', async (req, res, _next) => {
      const state = String(req.query.state ?? '')
      const code = String(req.query.code ?? '')
      if (!state || !code) return res.status(400).send({ message: 'missing state or code' })
      try {
        const linked = await this.linkedSvc.handleCallback({ state, code })
        await this.reconcileSvc.reconcile(linked.userId)
        res.redirect('/portal/researcher/account?linked=physionet')
      } catch (e) {
        this.logger.error(`linked-account callback failed: ${(e as Error).message}`)
        res.redirect('/portal/researcher/account?linked=physionet&error=1')
      }
    })

    this.router.post('/physionet/refresh', async (req: IAppRequest, res, next) => {
      try {
        const userId = await this.resolveUserId(req)
        if (!userId) return res.status(400).send({ message: 'user not found' })
        await this.reconcileSvc.reconcile(userId)
        res.json(await this.linkedSvc.list(userId))
      } catch (e) { next(e) }
    })

    this.router.delete('/physionet', async (req: IAppRequest, res, next) => {
      try {
        const userId = await this.resolveUserId(req)
        if (!userId) return res.status(400).send({ message: 'user not found' })
        await this.groupSvc.withdrawAllByProvenance(userId, PROVENANCE)
        await this.linkedSvc.unlink(userId, 'physionet')
        res.json({ ok: true })
      } catch (e) { next(e) }
    })
  }
}
