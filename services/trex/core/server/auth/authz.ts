import {env, global, authz_publicURLs as publicURLs, logger} from "../env.ts"
import {  HTTPException } from "npm:hono/http-exception";
import { UserMgmtAPI} from "../api/UserMgmtAPI.ts"
import jwt from 'npm:jsonwebtoken'
import { ITokenPayload } from 'npm:passport-azure-ad'
import { Context} from "npm:hono";

const isDev = true;
const PUBLIC_API_PATHS = ['^/system-portal/dataset/public/list(.*)', '^/system-portal/config/public(.*)']


export const ROLES = {
  ALP_USER_ADMIN: 'ALP_USER_ADMIN',
  ALP_SYSTEM_ADMIN: 'ALP_SYSTEM_ADMIN',
  ALP_NIFI_ADMIN: 'ALP_NIFI_ADMIN',
  ALP_DASHBOARD_VIEWER: 'ALP_DASHBOARD_VIEWER',
  TENANT_VIEWER: 'TENANT_VIEWER',
  RESEARCHER: 'RESEARCHER',
  STUDY_RESEARCHER: 'RESEARCHER',
  STUDY_WRITE_DQD_RESEARCHER: 'STUDY_WRITE_DQD_RESEARCHER',
  VALIDATE_TOKEN_ROLE: 'VALIDATE_TOKEN',
  ADMIN_DATA_READER_ROLE: 'ADMIN_DATA_READER',
  BI_DATA_READER_ROLE: 'BI_DATA_READER',
  ALP_ADMIN: 'ALP_ADMIN',
  ALP_OWNER: 'ALP_OWNER'
}

export type IAppTokenPayload = ITokenPayload & {
  given_name: string
  family_name: string
  extension_termsOfUseConsentVersion: string
  email: string
  userMgmtGroups: IUserMgmtGroups
}

interface IUserMgmtGroups {
  groups: string[]
  alp_tenant_id: string[]
  // list of tenantid
  alp_role_tenant_viewer: string[]
  // list of studyid
  alp_role_study_researcher: string[]
  alp_role_system_admin: boolean
}

interface IRoleTypeOf<T> {
  TENANT_VIEWER_ROLE?: T
  STUDY_RESEARCHER_ROLE: T
}

//Roles for tenant users map
type AlpTenantUserRoleMapType = IRoleTypeOf<string[]>

interface IUser {
  userId?: string
  name?: string
  email?: string
  mriRoles: string[]
  mriScopes: string[]
  studyScopes: string[]
  alpRoleMap: AlpTenantUserRoleMapType
  roles?: string[]
  tenantId: string[]
  groups: string[]
  adGroups?: string[]
}


export function isClientCredToken(token: IAppTokenPayload) {
  return token.authType && token.authType === 'azure-ad'
}

const buildADUserFromToken = (token: IAppTokenPayload): IUser => {
  const { tid, sub, roles } = token
  const mriScopes: string[] = []
  mriScopes.push(...roles!)
  const user: IUser = {
    userId: sub,
    tenantId: [tid!],
    mriRoles: [],
    mriScopes,
    studyScopes: mriScopes,
    alpRoleMap: {
      TENANT_VIEWER_ROLE: [],
      STUDY_RESEARCHER_ROLE: []
    },
    roles,
    groups: [],
    adGroups: []
  }

  return user
}


const buildUserFromToken = (token: IAppTokenPayload, ROLE_SCOPES: any): IUser => {
  const { client_id, grant_type, name, sub, email, userMgmtGroups, groups: adGroups } = token

  if (typeof userMgmtGroups.alp_tenant_id === 'undefined' || userMgmtGroups.alp_tenant_id.length === 0) {
    logger.error(`SECURITY INCIDENT: User does not belong to a tenant ${JSON.stringify(token)}`)
    //throw new Error('User does not belong to a tenant')
  }
  const roles: string[] = []

  if (grant_type === 'client_credentials' || sub === client_id) {
    roles.push(sub)
  } else {
    if (userMgmtGroups.alp_role_user_admin === true) {
      roles.push(ROLES.ALP_USER_ADMIN)
    }
    if (userMgmtGroups.alp_role_system_admin === true) {
      roles.push(ROLES.ALP_SYSTEM_ADMIN)
    }
    if (userMgmtGroups.alp_role_nifi_admin === true) {
      roles.push(ROLES.ALP_NIFI_ADMIN)
    }
    if (userMgmtGroups.alp_role_dashboard_viewer === true) {
      roles.push(ROLES.ALP_DASHBOARD_VIEWER)
    }
    if (userMgmtGroups.alp_role_tenant_viewer?.length > 0) {
      roles.push(ROLES.TENANT_VIEWER)
    }
    if (userMgmtGroups.alp_role_study_write_dqd_researcher?.length > 0) {
      roles.push(ROLES.STUDY_WRITE_DQD_RESEARCHER)
    }
    if (userMgmtGroups.alp_role_study_researcher?.length > 0) {
      //roles.push(ROLES.RESEARCHER)
      for (const datasetId of userMgmtGroups.alp_role_study_researcher) {
        //if (url.includes(datasetId) || url.includes('/system-portal/notebook') || url.includes('/terminology')) {
        //  break
        //}
      }
    }
  }
  const mriRoles: string[] = Array.from(roles);
  /*mriScopes = (typeof groups === 'string' ? [] : groups).reduce((accumulator, group) => {
    if (MRI_ROLE_ASSIGNMENTS[group]) {
      mriRoles.push(group)
      accumulator = accumulator.concat(MRI_ROLE_ASSIGNMENTS[group])
    }

    return accumulator
  }, mriScopes)*/
  const roleScopesMap: Map<string, string[]> = new Map(Object.entries(ROLE_SCOPES))
  const userScopes: string[] = []
  const studyScopes: string[] = []
  roles.forEach(ctxRole => {
    const roleScopes = roleScopesMap.get(ctxRole)
    if (roleScopes) {
      userScopes.push(...roleScopes)
    }
  })

  if (userMgmtGroups.alp_role_study_researcher?.length > 0) {
    const roleScopes = roleScopesMap.get(ROLES.STUDY_RESEARCHER)
    if (roleScopes) {
      studyScopes.push(...roleScopes)
    }
  }
  const mriScopes: string[] = Array.from(new Set(userScopes));


  const user: IUser = {
    userId: sub,
    name,
    email,
    tenantId: userMgmtGroups.alp_tenant_id,
    mriRoles,
    mriScopes,
    studyScopes,
    alpRoleMap: {
      STUDY_RESEARCHER_ROLE: userMgmtGroups.alp_role_study_researcher
    },
    roles,
    groups: typeof userMgmtGroups.groups === 'string' ? [userMgmtGroups.groups] : userMgmtGroups.groups,
    adGroups: typeof adGroups === 'string' ? [adGroups] : adGroups
  }

  return user
}


export class MriUser {
  private b2cUser: IUser
  private adUser: IUser
  private isAlice = false
  private isClientCredReqUser = false

  constructor(private token: IAppTokenPayload | string, ROLE_SCOPES: any, private userLang: string = 'en') {
    if (typeof token === 'string') {
      this.isAlice = true
      return
    }
    if (isClientCredToken(token)) {
      this.isClientCredReqUser = true
      this.adUser = buildADUserFromToken(token)
      return
    }

    const { sub, userMgmtGroups } = token

    if (!sub) {
      throw new Error('token has no sub')
    } else if (!userMgmtGroups) {
      throw new Error('token has no userMgmtGroups')
    }

    this.b2cUser = buildUserFromToken(token, ROLE_SCOPES)

    this.userLang = userLang.split('-')[0]
  }

  get b2cUserObject(): IUser {
    if (!this.b2cUser) {
      throw new Error('User is not configured')
    }
    return this.b2cUser
  }

  get adUserObject(): IUser {
    if (!this.adUser) {
      throw new Error('User is not configured')
    }
    return this.adUser
  }

  get isClientCredUser(): boolean {
    if (this.isClientCredReqUser) {
      return true
    }
    return false
  }
}


export async function authz(c: Context, next: any) {
  if(publicURLs.some((url) => new RegExp(url).test(c.req.path))){
    logger.log(`PUBLIC URL ${c.req.path} ${publicURLs.indexOf(c.req.path)} NO AUTHZ CHECK`);
    await next()
  } else {

    const userMgmtApi = new UserMgmtAPI()
    const { method } = c.req.raw
    const originalUrl = c.req.path

    const bearerToken = c.req.raw.headers.get('authorization')
    if (PUBLIC_API_PATHS.some(path => new RegExp(path).test(originalUrl))) {
      return next()
    } else if (!bearerToken) {
      logger.error(`No bearer token is found for url: ${originalUrl}`)
      throw new HTTPException(401, { res: new Response('Unauthorized', {status: 401 })})
    }

    const token = jwt.decode(bearerToken.replace(/bearer /i, '')) //as IToken
    //const { client_id, grant_type } = token
    const sub = token[env.GATEWAY_IDP_SUBJECT_PROP]
    const idpUserId = token["oid"] || sub
    let mriUserObj: any

    const match = global.REQUIRED_URL_SCOPES.find(
      ({ path, httpMethods }) =>
        new RegExp(path).test(originalUrl) && (typeof httpMethods == 'undefined' || httpMethods.indexOf(method) > -1)
    )

    if(!match) {
      // return response 404 (resource not found)
      throw new HTTPException(404, { res: new Response('Not found', {status: 404 })})  
    }

    if (isClientCredToken(token)) {
      mriUserObj = new MriUser(token, global.ROLE_SCOPES).adUserObject
    } else {
      try {
        const userGroups = await userMgmtApi.getUserGroups(c.req.raw.headers.get('authorization'), idpUserId)
        token["userMgmtGroups"] = userGroups
        mriUserObj = new MriUser(token, global.ROLE_SCOPES).b2cUserObject
      } catch (error) {
        logger.error(error)
        throw new HTTPException(500, { res: new Response('Error', {status: 500 })})
      }
    }


    /*const userScopes = await getUserScopes(bearerToken, originalUrl)
    if (scopes.some(i => userScopes.includes(i))) {
      logger.debug(`User scopes allowed for url ${originalUrl}`)
      return next()
    }*/

    const { scopes } = match
    // the allowed scopes for a url should be found in the user's assigned scopes
    const assignedScopes = mriUserObj.mriScopes.concat(mriUserObj.studyScopes)

    if(!hasRequiredScopes(scopes, assignedScopes)) {
      logger.info(`inside authz: Forbidden, token does not have required scope`)
      logger.debug(`inside authz: Forbidden url: ${originalUrl} scope: ${JSON.stringify(match)} user: ${JSON.stringify(mriUserObj)}`)
      throw new HTTPException(401, { res: new Response('Forbidden', {status: 401 })})  
    }

    logger.info(`AUTHORIZED ACCESS: user ${mriUserObj.userId}, url ${originalUrl}`)
    if (isDev) {
      //logger.info(`🚀 inside au, req.headers: ${JSON.stringify(c.req.headers)}`)
    }

    // check endpoint scopes
    // if Researcher scopes exist, datasetId is required
    if(!requireDatasetId(scopes)) {
      return next();
    }

    // when the endpoint is deemed for both Admin and Researcher and the user is Admin
    // datasetId is not mandatory
    if(scopes.some(i => mriUserObj.mriScopes.includes(i))) {
      return next()
    }
    
    const datasetIdKey = match["datasetId"] ?? "datasetId"
    // Look for datasetId in query param
    const datasetId = await extractDatasetIdFromRequestContext(c, datasetIdKey);
    if(!datasetId) {
      logger.error(`\x1b[0m\x1b[41m>>> NO datasetId defined in scope @ ${c.req.method} ${c.req.path}<<<\x1b[0m`)
      throw new HTTPException(403, { res: new Response('Dataset id is missing in the request', {status: 403 })})
    }

    if(mriUserObj.alpRoleMap.STUDY_RESEARCHER_ROLE.indexOf(datasetId) > -1) {
      logger.info(`AUTHORIZED STUDY ACCESS: user ${mriUserObj.userId}, url ${originalUrl}`)
      return next()
    } else {
      logger.error(`datasetId check: No Access to datasetId ${datasetId}`)
      throw new HTTPException(403, { res: new Response('Unauthorized access to dataset', {status: 403 })})
    }
  }
}

/*
Look for datasetId in the following order
  1. Request query parameter
  2. Request body
  3. Request header
If datasetId is not found, return null
*/
const extractDatasetIdFromRequestContext = async (
  c,
  datasetIdKey: string
): Promise<string | null> => {
  let datasetId: string | null = null;

  // Look for datasetId in query param
  datasetId = c.req.query(datasetIdKey);

  // Look for datasetId in body if not found in query parameter
  if (!datasetId) {
    datasetId = await _lookForDatasetIdInBody(c, datasetIdKey)
  }

  // Look for datasetId in header if not found in query parameter or body
  if (!datasetId) {
    datasetId = c.req.header(datasetIdKey)
  }

  return datasetId;
}

const _lookForDatasetIdInBody = async (
  c,
  datasetIdKey: string
): Promise<string | null> => {
  let datasetId = null;

  // Return null if body is empty
  if (!c.req.raw.body) {
    return null;
  }

  const contentType = c.req.header('Content-Type')
  if (contentType === 'application/json') {
    // Clone req is required to not affect request body for downstream services 
    const body = await c.req.raw.clone().json();
    if (body) {
      datasetId = body[datasetIdKey];
    }
  }
  return datasetId;
};

function hasRequiredScopes(reqScopes: string[], userScopes: string[]) {
  return reqScopes.every(scope => userScopes.includes(scope))
}

function requireDatasetId(scopes: string[]): boolean {
  const roleScopesMap: Map<string, string[]> = new Map(Object.entries(global.ROLE_SCOPES))
  const researcherScopes = roleScopesMap.get(ROLES.STUDY_RESEARCHER)
  return scopes.some(s => researcherScopes?.includes(s))
}