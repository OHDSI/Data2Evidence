import { Container, Service } from 'typedi'
import jwt from 'jsonwebtoken'
import { createLogger } from '../Logger'
import { env } from '../env'
import { CONTAINER_KEY, ROLES } from '../const'
import { B2cGroupService } from './B2cGroupService'
import { UserGroupService } from './UserGroupService'

interface Dataset {
  id: string
  token_dataset_code: string | null
}

interface DatasetMapping {
  slug: string
  version: string
}

/**
 * Reconcile a user's STUDY_RESEARCHER memberships against PhysioNet's
 * dataset-access endpoint.  Called per request from grant-roles-by-scopes;
 * fail-soft (warn + return null) so a PhysioNet outage doesn't lock users
 * out.
 *
 * The env var USERMGMT__ENTITLEMENTS_DATASET_MAPPING holds a JSON object
 * mapping D2E token_dataset_code to PhysioNet slug/version, e.g.:
 *   {"mimic-iv": "mimiciv/2.2", "eicu": "eicu-crd/2.0"}
 */
@Service()
export class EntitlementsSyncService {
  private readonly logger = createLogger(this.constructor.name)

  constructor(
    private readonly groupService: B2cGroupService,
    private readonly userGroupService: UserGroupService,
  ) {}

  async sync(
    userId: string,
    idpUserId: string,
    jwtClaims: jwt.JwtPayload,
  ): Promise<{ granted: string[]; revoked: string[] } | null> {
    if (!env.USERMGMT_ENTITLEMENTS_SYNC_ENABLED) {
      return null
    }
    if (!env.USERMGMT_ENTITLEMENTS_PHYSIONET_BASE_URL) {
      return null
    }
    const claims = jwtClaims as Record<string, unknown>
    let physionetToken = claims[env.USERMGMT_ENTITLEMENTS_TOKEN_CLAIM] as string | undefined
    if (!physionetToken) {
      const refreshToken = claims[env.USERMGMT_ENTITLEMENTS_REFRESH_TOKEN_CLAIM] as string | undefined
      if (refreshToken) {
        physionetToken = await this.exchangeRefreshToken(refreshToken).catch(err => {
          this.logger.warn(`[Entitlements] refresh-token exchange failed for ${idpUserId}: ${err}`)
          return undefined
        })
      }
    }
    if (!physionetToken) {
      // user wasn't federated via PhysioNet, or we have neither a usable access
      // token nor a redeemable refresh token; nothing to do
      this.logger.info(`[Entitlements] no PhysioNet token for ${idpUserId}; skipping`)
      return null
    }
    this.logger.info(`[Entitlements] syncing STUDY_RESEARCHER groups for ${idpUserId} via PhysioNet`)

    const tenantId = env.USERMGMT_AUTO_PROVISION_DEFAULT_TENANT_ID
    if (!tenantId) {
      this.logger.warn(
        `[Entitlements] no default tenant configured; cannot sync STUDY_RESEARCHER groups for ${idpUserId}`,
      )
      return null
    }

    const mapping = await this.parseDatasetMapping()
    this.logger.debug(`[Entitlements] dataset mapping: ${JSON.stringify(mapping)}`)
    if (Object.keys(mapping).length === 0) {
      this.logger.warn(`[Entitlements] USERMGMT__ENTITLEMENTS_DATASET_MAPPING is empty; nothing to sync`)
      return null
    }

    const datasets = await this.loadDatasets()
    this.logger.debug(`[Entitlements] loaded ${datasets.length} datasets from portal.dataset`)
    if (datasets.length === 0) {
      return { granted: [], revoked: [] }
    }

    const granted: string[] = []
    const revoked: string[] = []
    let anyResearcher = false

    for (const dataset of datasets) {
      this.logger.debug(`[Entitlements] checking dataset ${dataset.token_dataset_code}`)
      if (!dataset.token_dataset_code) continue
      const mapped = mapping[dataset.token_dataset_code]
      if (!mapped) continue

      let isGrant = false
      try {
        isGrant = await this.checkDatasetAccess(physionetToken, mapped.slug, mapped.version)
      } catch (err) {
        this.logger.warn(
          `[Entitlements] check failed for ${dataset.token_dataset_code} (${mapped.slug}/${mapped.version}): ${err}; skipping`,
        )
        continue
      }

      const group = await this.ensureResearcherGroup(dataset.id, tenantId)
      if (!group?.id) continue
      if (isGrant) {
        anyResearcher = true
        await this.tolerantRegister(userId, group.id)
        granted.push(dataset.token_dataset_code)
      } else {
        const existing = await this.userGroupService.getUserGroup(userId, group.id)
        if (existing?.id) {
          await this.userGroupService.withdrawUserFromGroup(userId, group.id)
          revoked.push(dataset.token_dataset_code)
        }
      }
    }

    // Mirror the existing Azure auto-grant pattern: any researcher implies
    // TENANT_VIEWER on the configured tenant.
    if (anyResearcher) {
      const viewerGroup = await this.groupService.getGroupByTenantRole(
        tenantId,
        ROLES.TENANT_VIEWER,
      )
      if (viewerGroup?.id) {
        await this.tolerantRegister(userId, viewerGroup.id)
      }
    }

    this.logger.info(
      `[Entitlements] user=${idpUserId} granted=${granted.length} revoked=${revoked.length} from connector=physionet`,
    )
    return { granted, revoked }
  }

  /**
   * token_dataset_codes governed by PhysioNet entitlements sync.
   * grant-roles-by-scopes must skip these: the token's scopes don't reflect
   * PhysioNet access, so its researcher sync would revoke what this service just
   * granted. Empty when sync is disabled, leaving all datasets on token scopes.
   */
  async getManagedDatasetCodes(): Promise<Set<string>> {
    if (!env.USERMGMT_ENTITLEMENTS_SYNC_ENABLED) return new Set()
    const mapping = await this.parseDatasetMapping()
    return new Set(Object.keys(mapping))
  }

  private async parseDatasetMapping(): Promise<Record<string, DatasetMapping>> {
    const db: any = Container.get(CONTAINER_KEY.DB_CONNECTION)
    try {
      const result = await db.raw(
        `SELECT token_dataset_code, physionet_slug, physionet_version FROM portal.dataset WHERE physionet_slug IS NOT NULL AND physionet_slug != ''`,
      )
      const rows: Array<{ token_dataset_code: string; physionet_slug: string; physionet_version: string }> = result?.rows || []
      const mapping: Record<string, DatasetMapping> = {}
      for (const row of rows) {
        if (row.token_dataset_code) {
          mapping[row.token_dataset_code] = { slug: row.physionet_slug, version: row.physionet_version }
        }
      }
      if (Object.keys(mapping).length > 0) return mapping
    } catch {
      // columns don't exist yet, fall through to env var
    }

    // Fallback to env var
    const raw = env.USERMGMT_ENTITLEMENTS_DATASET_MAPPING
    if (!raw) return {}
    try {
      const parsed = JSON.parse(raw) as Record<string, string>
      const result: Record<string, DatasetMapping> = {}
      for (const [tokenCode, slugVersion] of Object.entries(parsed)) {
        const sep = slugVersion.lastIndexOf('/')
        if (sep === -1) continue
        result[tokenCode] = {
          slug: slugVersion.substring(0, sep),
          version: slugVersion.substring(sep + 1),
        }
      }
      return result
    } catch (err: any) {
      this.logger.error(`[Entitlements] error parsing dataset mapping: ${err}`)
      return {}
    }
  }

  /**
   * Mint a fresh PhysioNet access token from the refresh token claim. Used when
   * physionet_access_token is absent: the connector only runs on an interactive
   * login, so refresh grants and silent SSO re-logins carry no access token.
   * Needs the PhysioNet client id (and secret, for a confidential app).
   */
  private async exchangeRefreshToken(refreshToken: string): Promise<string | undefined> {
    const clientId = env.USERMGMT_ENTITLEMENTS_PHYSIONET_CLIENT_ID
    if (!clientId) {
      this.logger.warn(
        `[Entitlements] physionet_access_token absent and USERMGMT__ENTITLEMENTS_PHYSIONET_CLIENT_ID unset; cannot redeem refresh token`,
      )
      return undefined
    }
    const baseUrl = env.USERMGMT_ENTITLEMENTS_PHYSIONET_BASE_URL.replace(/\/+$/, '')
    const path = env.USERMGMT_ENTITLEMENTS_PHYSIONET_TOKEN_PATH.startsWith('/')
      ? env.USERMGMT_ENTITLEMENTS_PHYSIONET_TOKEN_PATH
      : `/${env.USERMGMT_ENTITLEMENTS_PHYSIONET_TOKEN_PATH}`
    const url = `${baseUrl}${path}`

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
    })
    if (env.USERMGMT_ENTITLEMENTS_PHYSIONET_CLIENT_SECRET) {
      params.set('client_secret', env.USERMGMT_ENTITLEMENTS_PHYSIONET_CLIENT_SECRET)
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), env.USERMGMT_ENTITLEMENTS_TIMEOUT_MS)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
        signal: controller.signal,
      })
      if (!response.ok) {
        const body = await response.text().then(t => t.slice(0, 200)).catch(() => '')
        throw new Error(`HTTP ${response.status}: ${body}`)
      }
      const data = await response.json() as { access_token?: string }
      if (!data.access_token) {
        this.logger.warn(`[Entitlements] refresh-token exchange returned no access_token`)
        return undefined
      }
      this.logger.info(`[Entitlements] minted PhysioNet access token via refresh grant`)
      return data.access_token
    } finally {
      clearTimeout(timer)
    }
  }

  private async checkDatasetAccess(
    physionetToken: string,
    slug: string,
    version: string,
  ): Promise<boolean> {
    this.logger.debug(`[Entitlements] checking PhysioNet access for ${slug}/${version}`)
    const baseUrl = env.USERMGMT_ENTITLEMENTS_PHYSIONET_BASE_URL.replace(/\/+$/, '')
    const url = `${baseUrl}/oauth/dataset-access/?slug=${encodeURIComponent(slug)}&version=${encodeURIComponent(version)}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), env.USERMGMT_ENTITLEMENTS_TIMEOUT_MS)
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${physionetToken}` },
        signal: controller.signal,
      })
      if (!response.ok) {
        // 404 = PhysioNet has no access record for this user/dataset (or the
        // slug/version is unknown). Treat as "no access" so the researcher role
        // is withheld/revoked rather than erroring; any other non-OK status is
        // a transient/server failure and throws so the caller keeps existing roles.
        if (response.status === 404) return false
        const body = await response.text().then(t => t.slice(0, 200)).catch(() => '')
        throw new Error(`HTTP ${response.status}: ${body}`)
      }
      const data = await response.json() as { has_access: boolean }
      this.logger.debug(`[Entitlements] PhysioNet access check for ${slug}/${version} returned: ${JSON.stringify(data)}`)
      return data.has_access === true
    } finally {
      clearTimeout(timer)
    }
  }

  private async loadDatasets(): Promise<Dataset[]> {
    const db: any = Container.get(CONTAINER_KEY.DB_CONNECTION)
    try {
      const result: { rows: Dataset[] } = await db.raw(
        'SELECT id, token_dataset_code FROM portal.dataset',
      )
      return result?.rows || []
    } catch (err) {
      this.logger.error(`[Entitlements] error loading datasets: ${err}`)
      return []
    }
  }

  /**
   * registerUserToGroup is check-then-insert and races under concurrent
   * Portal calls. Swallow the resulting unique-constraint error since the
   * outcome (user is in the group) is the same.
   */
  private async tolerantRegister(userId: string, groupId: string): Promise<void> {
    try {
      await this.userGroupService.registerUserToGroup(
        userId,
        groupId,
        undefined,
        { skipUserValidation: true },
      )
    } catch (err: any) {
      const msg = String(err?.message || err)
      if (msg.includes('user_group_user_id_b2c_group_id_unique') || msg.includes('duplicate key')) {
        return
      }
      throw err
    }
  }

  private async ensureResearcherGroup(datasetId: string, tenantId: string) {
    let group = await this.groupService.getGroupByStudyRole(
      datasetId,
      ROLES.STUDY_RESEARCHER,
    )
    if (!group?.id) {
      await this.groupService.createGroup({
        role: ROLES.STUDY_RESEARCHER,
        tenantId,
        studyId: datasetId,
      } as any)
      group = await this.groupService.getGroupByStudyRole(
        datasetId,
        ROLES.STUDY_RESEARCHER,
      )
    }
    return group
  }
}
