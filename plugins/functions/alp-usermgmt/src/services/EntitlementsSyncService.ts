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

interface PhysioNetProject {
  slug: string
  // other fields ignored
}

interface AccessibleProjectsResponse {
  count: number
  next: string | null
  previous: string | null
  results: PhysioNetProject[]
}

/**
 * Reconcile a user's STUDY_RESEARCHER memberships against PhysioNet's
 * accessible-projects view. Called per request from grant-roles-by-scopes;
 * fail-soft (warn + return null) so a PhysioNet outage doesn't lock users
 * out.
 *
 * Match: dataset.token_dataset_code === project.slug. Operators seed
 * d2e datasets with token_dataset_code = the PhysioNet project slug.
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

    let entitledSlugs: Set<string>
    try {
      entitledSlugs = await this.fetchAccessibleSlugs(physionetToken)
    } catch (err) {
      this.logger.warn(
        `[Entitlements] fetch failed for ${idpUserId}: ${err}; keeping existing roles`,
      )
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
      const isGrant = entitledSlugs.has(dataset.token_dataset_code)
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
   * Page through /api/v1/entitlements/accessible-projects/ until exhausted,
   * collecting result slugs into a Set. AbortController-bounded so a hung
   * PhysioNet doesn't stall the login.
   */
  private async fetchAccessibleSlugs(physionetToken: string): Promise<Set<string>> {
    const baseUrl = env.USERMGMT_ENTITLEMENTS_PHYSIONET_BASE_URL.replace(/\/+$/, '')
    const slugs = new Set<string>()
    let nextUrl: string | null =
      `${baseUrl}/api/v1/entitlements/accessible-projects/?limit=100`
    const timeoutMs = env.USERMGMT_ENTITLEMENTS_TIMEOUT_MS

    while (nextUrl) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      let response: Response
      try {
        response = await fetch(nextUrl, {
          headers: { Authorization: `Bearer ${physionetToken}` },
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timer)
      }
      if (!response.ok) {
        const body = await response.text().then(t => t.slice(0, 200)).catch(() => '')
        throw new Error(`HTTP ${response.status} from PhysioNet: ${body}`)
      }
      const data = (await response.json()) as AccessibleProjectsResponse
      for (const project of data.results || []) {
        if (project.slug) slugs.add(project.slug)
      }
      nextUrl = data.next
    }
    return slugs
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
