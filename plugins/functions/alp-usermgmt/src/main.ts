import './loadDotEnv'
import 'reflect-metadata'
import express, { Request, Response, NextFunction, Application } from 'express'
import compression from 'compression'
import { Container } from 'typedi'
import Routes from './routes'
import { db } from './db/knex'
import { healthCheckMiddleware } from './HealthCheckMiddleware'
import { createLoggingMiddleware, createLogger } from './Logger'
import { env, assertPhysionetEnv } from './env'
import { addUserObjToReq } from './middlewares/add-user-object-to-req'
import { CONTAINER_KEY } from './const'
import { setupGlobalErrorHandling } from './error-handler'
import { PhysionetAPI } from './api/PhysionetAPI'

const PATH = env.USER_MGMT_PATH
const PORT = env.USER_MGMT_PORT
const logger = createLogger()

export class Server {
  private app: Application

  constructor() {
    this.app = express()

    this.registerContainerInstances()
    this.registerMiddlewares()
    this.registerRoutes()
    setupGlobalErrorHandling(this.app, logger)
  }

  private registerContainerInstances() {
    Container.set({ id: 'DB_CONNECTION', factory: () => db })

    if (env.PHYSIONET_LINKING_ENABLED) {
      assertPhysionetEnv()
      Container.set('LINKED_ACCOUNT_CONFIG', {
        encryptionKey: env.LINKED_ACCOUNT_ENC_KEY,
        stateTtlSeconds: 600,
        refreshSkewSeconds: 60,
      })
      Container.set(PhysionetAPI, new PhysionetAPI({
        baseUrl: env.PHYSIONET_OAUTH_BASE_URL,
        clientId: env.PHYSIONET_OAUTH_CLIENT_ID,
        clientSecret: env.PHYSIONET_OAUTH_CLIENT_SECRET,
        redirectUri: env.PHYSIONET_OAUTH_REDIRECT_URI,
        scopes: env.PHYSIONET_OAUTH_SCOPES,
      }))
    } else {
      // Provide harmless stubs so the DI graph compiles even with the flag off
      Container.set('LINKED_ACCOUNT_CONFIG', { encryptionKey: '', stateTtlSeconds: 600, refreshSkewSeconds: 60 })
      Container.set(PhysionetAPI, new PhysionetAPI({ baseUrl: '', clientId: '', clientSecret: '', redirectUri: '', scopes: '' }))
    }
  }

  private registerRequestInstance(req: Request, res: Response, next: NextFunction) {
    Container.set(CONTAINER_KEY.AUTHORIZATION_HEADER, req.headers['authorization'])
    next()
  }

  private registerMiddlewares() {
    this.app.use('/check-liveness', healthCheckMiddleware)

    this.app.use(compression())
    this.app.use(express.json())
    this.app.use(express.urlencoded({ extended: true }))
    this.app.use(createLoggingMiddleware)
    this.app.use('/check-readiness', healthCheckMiddleware)
    this.app.use(this.registerRequestInstance)
    this.app.use(addUserObjToReq)
  }

  private registerRoutes() {
    const routes = Container.get(Routes)
    this.app.use(`${PATH}api`, routes.router)
  }

  public start() {
    this.app.listen(PORT, () => {
      logger.info(`ALP User Management started successfully. Server listening on port ${PORT}`)
    })
  }
}
