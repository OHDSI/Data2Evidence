import config from './knexfile.ts'
import { env } from '../env.ts'

config.connection = async () => {
  let ssl: any = JSON.parse(env.PG_SSL.toLowerCase())
  if (env.PG_CA_ROOT_CERT) {
    ssl = {
      rejectUnauthorized: true,
      ca: env.PG_CA_ROOT_CERT
    }
  }

  if (!env.PG_CA_ROOT_CERT && env.NODE_ENV === 'production') {
    console.warn('PG_CA_ROOT_CERT is undefined')
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
