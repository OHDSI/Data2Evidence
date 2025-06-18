import { NextFunction, Request, Response } from 'npm:express'
import { CDMSchemaTypes, DbDialect } from './const.ts'
import { PortalAPI }from './api/PortalAPI.ts'
import { AnalyticsSvcAPI } from './api/AnalyticsSvcAPI.ts'
const logger = console

export const generateDatasetSchema = async (req: Request, res: Response, next: NextFunction) => {
  const { tokenStudyCode, dialect, databaseCode, schemaOption, cdmSchemaValue } = req.body

  const token = req.headers.authorization!
  const portalAPI = new PortalAPI(token)
  const analyticsSvcApi = new AnalyticsSvcAPI(token)
  const schemaName = getSchemaCase(cdmSchemaValue, dialect)
  
  //CDM Schema preparation
  logger.info('Option for schema: ' + schemaOption + ' with the value: ' + schemaName)
  if (schemaOption === CDMSchemaTypes.CustomCDM || schemaOption === CDMSchemaTypes.ExistingCDM) {
    const datasets = await portalAPI.getStudiesAsSystemAdmin()

    const schemaExists = await analyticsSvcApi.checkIfSchemaExists(dialect, databaseCode, schemaName)

    const foundDataset = datasets.find(
      dataset => dataset.schemaName === schemaName && dataset.databaseCode === databaseCode
    )

    if (foundDataset) {
      return badRequest(res, 'This schema is already in use')
    } else if (schemaOption === CDMSchemaTypes.CustomCDM && schemaExists) {
      return badRequest(res, 'This schema already exists')
    } else if (schemaOption === CDMSchemaTypes.ExistingCDM && !schemaExists) {
      return badRequest(res, 'This schema does not exist')
    }

    req.body.schemaName = schemaName
  } else if (schemaOption == CDMSchemaTypes.CreateCDM) {
    const formattedTokenDatasetCode = tokenStudyCode.toUpperCase().replace(/_/g, '')
    if (formattedTokenDatasetCode.length > 48)
      return badRequest(res, 'Token study code must not greater than 48 characters')

    const suffix = Math.floor(Date.now() / 1000)
    let newSchemaName = getSchemaCase(`CDM_${formattedTokenDatasetCode}_${suffix}`.replace(/-/g, ''), dialect)
    newSchemaName = newSchemaName.substring(0, 63) // truncate to 63 characters

    req.body.schemaName = newSchemaName
  } else if (schemaOption === CDMSchemaTypes.FHIR) {
    req.body.schemaName = getSchemaCase(cdmSchemaValue, dialect)
  }

  next()
}

function getSchemaCase(schemaName: string, dialect: DbDialect) {
  switch (dialect) {
    case DbDialect.Hana:
      return schemaName.toUpperCase()
    case DbDialect.Postgres:
      return schemaName.toLowerCase()
    default:
      return schemaName
  }
}

function badRequest(res: Response, errorMessage: string) {
  logger.error(errorMessage)
  return res.status(400).send(errorMessage)
}
