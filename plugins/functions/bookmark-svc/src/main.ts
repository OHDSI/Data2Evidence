// tslint:disable:no-console
import * as dotenv from 'dotenv'
import 'reflect-metadata'
import {
  DBConnectionUtil as dbConnectionUtil,
  getUser,
  Logger,
  EnvVarUtils,
  healthCheckMiddleware,
  Constants,
  User,
  utils,
} from '@alp/alp-base-utils'
import express from 'express'
import https from 'https'
import helmet from 'helmet'
import noCacheMiddleware from './middleware/NoCache'
import timerMiddleware from './middleware/Timer'
import extractUserNameFromJwt from './middleware/extractUserNameFromJwt'
import { Container } from 'typedi'
import Routes from './routes'
import { IMRIRequest, IDBCredentialsType } from './types'
import { env } from './env'
import { BookmarkRouter } from './bookmark/bookmark.router.ts'

dotenv.config()
const log = Logger.CreateLogger('bookmark-log')
const envVarUtils = new EnvVarUtils(Deno.env.toObject())

const initRoutes = async (app: express.Application) => {
  app.use(helmet())
  app.use(express.json({ strict: false, limit: '50mb' }))
  app.use(express.urlencoded({ extended: true, limit: '50mb' }))
  app.use(noCacheMiddleware)
  app.use(extractUserNameFromJwt)

  let configCredentials: IDBCredentialsType

  if (envVarUtils.isStageLocalDev()) {
    app.use(timerMiddleware())
  }

  configCredentials = {
    database: env.PG__DB_NAME,
    schema: env.PG_SCHEMA,
    dialect: env.PG__DIALECT,
    host: env.PG__HOST,
    port: env.PG__PORT,
    user: env.PG_USER,
    password: env.PG_PASSWORD,
    max: env.PG__MAX_POOL,
    min: env.PG__MIN_POOL,
    idleTimeoutMillis: env.PG__IDLE_TIMEOUT_IN_MS,
  }
  app.use(async (req: IMRIRequest, res, next) => {
    if (!utils.isHealthProbesReq(req)) {
      // log.debug(`🚀 ~ file: main.ts ~ line 141 ~ app.use ~ req.headers: ${JSON.stringify(req.headers, null, 2)}`)
      let userObj: User
      try {
        userObj = getUser(req)
        // log.debug(`🚀 ~ file: main.ts ~ line 146 ~ app.use ~ req.headers: ${JSON.stringify(req.headers, null, 2)}`)
        // log.debug(`🚀 ~ file: main.ts ~ line 146 ~ app.use ~ currentUser: ${JSON.stringify(userObj, null, 2)}`)
      } catch (err) {
        log.debug(`No user found in request:${err.stack}`)
      }

      try {
        let credentials = null

        const configConnection = await dbConnectionUtil.DBConnectionUtil.getDBConnection({
          credentials: configCredentials,
          schemaName: configCredentials.schema,
          userObj,
        })

        req.dbConnections = {
          analyticsConnection: null,
          configConnection,
        }
      } catch (err) {
        next(err)
      }
    }
    next()
  })

  app.use((req, res, next) => {
    if (!utils.isHealthProbesReq(req)) {
      dbConnectionUtil.DBConnectionUtil.cleanupMiddleware()(req as any, res, next)
    } else {
      next()
    }
  })

  app.use('/check-readiness', healthCheckMiddleware)

  log.info('Initialized express routes..')
  Promise.resolve()
}

const registerRoutes = async (app: express.Application) => {
  //const routes = Container.get(Routes)

  app.use('/analytics-svc/api/services/bookmark', new BookmarkRouter().getRouter())
}

export const main = async () => {
  /**
   * Handle Environment Variables
   */
  Constants.getInstance().setEnvVar('bookmarks_table', 'bookmark')

  const port = Deno.env.get('PORT') || 3005

  //initialize Express
  const app = express()

  app.use('/check-liveness', healthCheckMiddleware)

  //Since browser triggers this request automatically, handling this else a JWT not found error would be returned.
  app.get('/favicon.ico', (req, res) => {
    res.sendStatus(204) //HTTP status no content
  })

  /**
   * Call Startup Functions
   */

  await initRoutes(app)
  await registerRoutes(app)
  utils.setupGlobalErrorHandling(app, log)

  const server = https.createServer(
    {
      key: env.TLS__INTERNAL__KEY,
      cert: env.TLS__INTERNAL__CRT,
      maxHeaderSize: 8192 * 10,
    },
    app
  )

  server.listen(port)
  log.info(`🚀 Bookmark svc started successfully!. Server listening on port ${port}`)
}

try {
  main()
} catch (err) {
  log.error(`
        Bookmark svc failed to start! Kindly fix the error and restart the application. ${err.message}
        ${err.stack}`)
  process.exit(1)
}
