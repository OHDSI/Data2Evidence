import { NextFunction, Response } from 'express'
import { createLogger } from '../Logger'
import { IAppRequest, ITokenUser } from '../types'
import jwt from 'jsonwebtoken'
import { CONTAINER_KEY } from '../const'
import { env } from '../env'
import { Container } from 'typedi'
import { UserService } from '../services'

const subProp = env.USER_MGMT_IDP_SUBJECT_PROP
const logger = createLogger('AddUserObjToReq')

export const addUserObjToReq = async (req: IAppRequest, res: Response, next: NextFunction) => {
  logger.debug('Add user obj to req')

  try {
    const bearerToken = req.headers.authorization as string
    if (!bearerToken) {
      return next()
    }

    const token = jwt.decode(bearerToken.replace(/bearer /i, '')) as jwt.JwtPayload
    if (!(subProp in token)) {
      logger.error(`"${subProp}" is not found in token`)
      return res.status(400).send()
    }

    const { oid } = token
    const sub = token[subProp]
    const idpUserId = oid! || sub!

    const userService = Container.get(UserService)
    const dbUser = await userService.getUserByIdpUserId(idpUserId)

    const user: ITokenUser = {
      userId: dbUser?.id || '',
      idpUserId
    }

    req.user = user
    Container.set(CONTAINER_KEY.CURRENT_USER, req.user)

    return next()
  } catch (err) {
    logger.error(`Error when adding user obj to req: ${err}`)
    return res.status(500).send()
  }
}
