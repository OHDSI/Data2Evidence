import type { RequestHandler } from 'express'
import { UserMgmtAPI } from '@alp/alp-base-utils'
import { env } from '../env'
/**
 * express middleware to extract userId from jwt
 */

interface userMe {
  id: string
  username: string
}

const extractUserNameFromJwt: RequestHandler = async (req, res, next) => {
  req.userName = await getUserName(req.headers['authorization'])
  next()
}

const getUserName = async (token: string): Promise<string> => {
  const userMgmtAPI = new UserMgmtAPI(env.SERVICE_ROUTES.usermgmt)
  const user: userMe = await userMgmtAPI.getMe(token)

  if (!user) {
    throw `No corresponding user found with token!`
  }

  return user.username
}

export default extractUserNameFromJwt
