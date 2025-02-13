import { Request, Response, NextFunction } from 'express'
import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'
import { decode, JwtPayload } from 'jsonwebtoken'
import { DbCredentialUpdateDto, DbDto, DbUpdateDto } from '../../db/dto/db.dto'
import { createLogger } from '../../logger'
import { env } from '../../env'
import { SERVICE_SCOPES } from '../const'

const logger = createLogger('route-check')
const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'

export const isValidClientCredentialFlow = (req: Request, res: Response, next: NextFunction) => {
  const { authorization } = req.headers
  const token = decode(authorization.replace(/bearer /i, '')) as JwtPayload
  const { grant_type: grantType, client_id: clientId } = token
  const validClientCredentialsIds = env.VALID_CLIENT_CREDENTIAL_IDS.split(',')
  if (grantType === 'client_credentials' && validClientCredentialsIds.includes(clientId)) {
    return next()
  }
  logger.error(`Error while validating client credential flow: grantType ${grantType}, clientId ${clientId}}`)
  res.sendStatus(403)
}

export const checkDbId = (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params || {}
  if (!id) {
    return res.status(400).send(`Param is required`)
  } else if (!id.match(UUID)) {
    return res.status(400).send(`Param is invalid`)
  }
  next()
}

export const checkServiceScope = (req: Request, res: Response, next: NextFunction) => {
  const { serviceScope } = req.query || {}
  if (!serviceScope) {
    return res.status(400).send(`Query param is required`)
  } else if (typeof serviceScope !== 'string' || !SERVICE_SCOPES.includes(serviceScope)) {
    return res.status(400).send(`Query param is invalid`)
  }
  next()
}

export const validateDbDto = async (req: Request, res: Response, next: NextFunction) => {
  const dbDto = getDtoType(req)
  const errors = await validate(dbDto, {
    skipMissingProperties: false,
    forbidNonWhitelisted: true,
    whitelist: true
  })
  if (errors.length > 0) {
    const errorMsgs = errors.reduce((acc: string[], err) => {
      const { constraints, children } = err
      if (constraints) {
        acc = acc.concat(Object.values(constraints))
      } else if (children) {
        children
          .flatMap(c => c.children)
          .filter(c => c !== undefined)
          .map(c => c.constraints)
          .filter(c => c !== undefined)
          .forEach(c => acc.concat(Object.values(c)))

        children
          .map(c => c.constraints)
          .filter(c => c !== undefined)
          .forEach(c => acc.concat(Object.values(c)))
      }
      return acc
    }, [])
    logger.error(`Error while validating DB command request: ${JSON.stringify(errorMsgs)}`)
    return res.status(400).send({ message: errorMsgs })
  }
  next()
}

function getDtoType(req: Request) {
  const isCreation = req.method === 'POST'

  if (isCreation) {
    return plainToInstance(DbDto, req.body)
  } else if (req.url === '/credential') {
    return plainToInstance(DbCredentialUpdateDto, req.body)
  }
  return plainToInstance(DbUpdateDto, req.body)
}
