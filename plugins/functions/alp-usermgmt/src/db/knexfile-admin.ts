import '../loadDotEnv'
import config from './knexfile'
import { env } from '../env'
import { createLogger } from '../Logger'

const logger = createLogger('KnexConfig')

const sleep = (time: number) => {
  setTimeout(() => time, time)
}

config.connection = async () => {
  if (env.NODE_ENV === 'development') {
    await sleep(30000)
  }

  let ssl: any = JSON.parse(env.PG_SSL.toLowerCase())
  if (env.PG_CA_ROOT_CERT) {
    ssl = {
      rejectUnauthorized: true,
      ca: env.PG_CA_ROOT_CERT
    }
  }

  if (!env.PG_CA_ROOT_CERT && env.NODE_ENV === 'production') {
    logger.warn('PG_CA_ROOT_CERT is undefined')
  }

  return {
    host: env.PG_HOST,
    port: env.PG_PORT,
    database: env.PG_DB_NAME,
    user: env.PG_ADMIN_USER!,
    password: env.PG_ADMIN_PASSWORD!,
    ssl
  }
}

export default config
