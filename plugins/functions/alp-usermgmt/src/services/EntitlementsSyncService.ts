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
    const tokenClaim = env.USERMGMT_ENTITLEMENTS_TOKEN_CLAIM
    const physionetToken = (jwtClaims as Record<string, unknown>)[tokenClaim] as string | undefined
    if (!physionetToken) {
      // user wasn't federated via PhysioNet (or the connector didn't expose
      // the upstream token); nothing to do
      return null
    }

    const tenantId = env.USERMGMT_AUTO_PROVISION_DEFAULT_TENANT_ID
    if (!tenantId) {
      this.logger.warn(
        `[Entitlements] no default tenant configured; cannot sync STUDY_RESEARCHER groups for ${idpUserId}`,
      )
      return null
    }

    const mapping = await this.parseDatasetMapping()
    if (Object.keys(mapping).length === 0) {
      this.logger.warn(`[Entitlements] USERMGMT__ENTITLEMENTS_DATASET_MAPPING is empty; nothing to sync`)
      return null
    }

    const datasets = await this.loadDatasets()
    if (datasets.length === 0) {
      return { granted: [], revoked: [] }
    }

    const granted: string[] = []
    const revoked: string[] = []
    let anyResearcher = false

    for (const dataset of datasets) {
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
    } catch {
      return {}
    }
  }

  private async checkDatasetAccess(
    physionetToken: string,
    slug: string,
    version: string,
  ): Promise<boolean> {
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
