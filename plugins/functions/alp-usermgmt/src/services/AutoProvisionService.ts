import { v4 as uuidv4 } from 'uuid'
import jwt from 'jsonwebtoken'
import { Container, Service } from 'typedi'
import { createLogger } from '../Logger'
import { LogtoAPI } from '../api'
import { env, getAutoProvisionConnectors } from '../env'
import { CONTAINER_KEY, ROLES } from '../const'
import { ITokenUser } from '../types'
import { UserField } from '../repositories'
import { B2cGroupService } from './B2cGroupService'
import { EntitlementsSyncService } from './EntitlementsSyncService'
import { UserGroupService } from './UserGroupService'
import { UserService } from './UserService'

interface RoleHookPayload {
  idpUserId: string
  email?: string
  connectorId: string
  accessToken: string
}

interface RoleHookResponse {
  roles?: string[]
}

/**
 * Auto-provision a usermgmt.user row + default group on first login for
 * users who came in through a configured Logto social connector.
 *
 * Gate stack:
 *   1. USERMGMT__AUTO_PROVISION_ENABLED master switch
 *   2. user has at least one social identity in Logto
 *   3. that connector target is in USERMGMT__AUTO_PROVISION_CONNECTORS
 *
 * Caller (grant-roles-by-scopes middleware) treats null as "fall through"
 * and re-emits the existing 500 so behavior is unchanged for non-eligible
 * users.
 *
 * A configurable HTTP role hook is invoked after the default-role assignment
 * to upgrade roles from an external authority (e.g. a future PhysioNet
 * /oauth/roles endpoint). Hook failure is non-fatal — the user is still
 * provisioned with the default role.
 */
@Service()
export class AutoProvisionService {
  private readonly logger = createLogger(this.constructor.name)

  constructor(
    private readonly userService: UserService,
    private readonly groupService: B2cGroupService,
    private readonly userGroupService: UserGroupService,
    private readonly logtoApi: LogtoAPI,
  ) {}

  /**
   * Provision the user if eligible; return the created user (or the existing
   * one if a race created it first), or null when ineligible.
   */
  async provision(
    idpUserId: string,
    claims: { email?: string; username?: string },
    bearerToken: string,
  ): Promise<{ id: string; username: string } | null> {
    if (!env.USERMGMT_AUTO_PROVISION_ENABLED) {
      return null
    }

    // Callers pass the raw Authorization header ("Bearer <jwt>"); strip the
    // scheme so jwt.decode (entitlements sync) and the role-hook payload
    // receive the bare token rather than null / a "Bearer "-prefixed string.
    bearerToken = bearerToken?.replace(/bearer /i, '')

    const allowlist = getAutoProvisionConnectors()
    if (allowlist.length === 0) {
      this.logger.warn(
        `[AutoProvision] enabled but USERMGMT__AUTO_PROVISION_CONNECTORS is empty for idp user "${idpUserId}"`,
      )
      return null
    }

    // Connector resolution via Logto Management API. We look at social
    // identities (the standard OIDC / OAuth connectors), then fall back to
    // SSO identities (Enterprise SSO) for completeness. Username/password
    // sign-up has no identities and is filtered out here.
    let identities: Record<string, unknown>
    try {
      identities = await this.logtoApi.getUserSocialIdentities(idpUserId)
      if (Object.keys(identities).length === 0) {
        const sso = await this.logtoApi.getUserSsoIdentities(idpUserId)
        identities = sso
      }
    } catch (err) {
      this.logger.error(
        `[AutoProvision] failed to fetch identities for idp user "${idpUserId}": ${err}`,
      )
      return null
    }

    const connectorIds = Object.keys(identities)
    const matched = connectorIds.find(id => allowlist.includes(id))
    if (!matched) {
      this.logger.info(
        `[AutoProvision] idp user "${idpUserId}" has connectors [${connectorIds.join(', ')}]; ` +
        `none in allowlist [${allowlist.join(', ')}], skipping`,
      )
      return null
    }

    // Race guard: another concurrent request may have just created the user.
    // Still run entitlements sync — the first request might not have finished
    // it yet, and the sync is idempotent.
    const existing = await this.userService.getUserByIdpUserId(idpUserId)
    if (existing) {
      this.logger.info(`[AutoProvision] idp user "${idpUserId}" already provisioned, reusing`)
      await this.runEntitlementsSync(existing.id!, idpUserId, bearerToken)
      return { id: existing.id!, username: existing.username! }
    }

    const username = claims.username || claims.email
    if (!username) {
      this.logger.error(
        `[AutoProvision] cannot provision idp user "${idpUserId}" — no email or username in token`,
      )
      return null
    }

    const newUser: Partial<UserField> = {
      id: uuidv4(),
      username,
      idp_user_id: idpUserId,
      active: true,
    }

    // UserService.createUser pulls audit fields from Container[CURRENT_USER],
    // which add-user-object-to-req has already set to { userId: '', idpUserId }.
    // For self-provision we override CURRENT_USER to the new user's own id so
    // created_by reflects the actual creator rather than an empty string.
    const previousCurrent = Container.has(CONTAINER_KEY.CURRENT_USER)
      ? Container.get<ITokenUser>(CONTAINER_KEY.CURRENT_USER)
      : undefined
    Container.set(CONTAINER_KEY.CURRENT_USER, { userId: newUser.id!, idpUserId } as ITokenUser)
    try {
      await this.userService.createUser(newUser)
    } catch (err: any) {
      const msg = String(err?.message || err)
      if (msg.includes('duplicate key') || msg.includes('unique constraint') || msg.includes('already exists')) {
        this.logger.info(`[AutoProvision] race: user "${idpUserId}" was created by concurrent request`)
        if (previousCurrent) Container.set(CONTAINER_KEY.CURRENT_USER, previousCurrent)
        const raceWinner = await this.userService.getUserByIdpUserId(idpUserId)
        if (raceWinner) {
          await this.runEntitlementsSync(raceWinner.id!, idpUserId, bearerToken)
          return { id: raceWinner.id!, username: raceWinner.username! }
        }
        return null
      }
      throw err
    } finally {
      if (previousCurrent) {
        Container.set(CONTAINER_KEY.CURRENT_USER, previousCurrent)
      }
    }

    this.logger.info(
      `[AutoProvision] created user ${newUser.id} (username="${username}", idp_user_id="${idpUserId}") ` +
      `from connector "${matched}"`,
    )

    await this.assignDefaultGroup(newUser.id!)

    await this.runEntitlementsSync(newUser.id!, idpUserId, bearerToken)

    await this.callRoleHook(newUser.id!, idpUserId, matched, claims.email, bearerToken)

    return { id: newUser.id!, username }
  }

  /**
   * Assign the configured TENANT_VIEWER group on the default tenant. The
   * group must already exist (seeded by alp-usermgmt-init). If it doesn't,
   * log and continue — the user record is still useful even without a role.
   */
  private async runEntitlementsSync(userId: string, idpUserId: string, bearerToken: string): Promise<void> {
    try {
      const entitlementsSync = Container.get(EntitlementsSyncService)
      const token = jwt.decode(bearerToken) as jwt.JwtPayload
      if (token) {
        await entitlementsSync.sync(userId, idpUserId, token)
      }
    } catch (err) {
      this.logger.warn(`[AutoProvision] entitlements sync failed for ${idpUserId}: ${err}; continuing`)
    }
  }

  private async assignDefaultGroup(userId: string): Promise<void> {
    const tenantId = env.USERMGMT_AUTO_PROVISION_DEFAULT_TENANT_ID
    if (!tenantId) {
      this.logger.warn(
        `[AutoProvision] no default tenant configured (USERMGMT__AUTO_PROVISION_DEFAULT_TENANT_ID / APP__TENANT_ID), ` +
        `skipping default group assignment for user ${userId}`,
      )
      return
    }

    const group = await this.groupService.getGroupByTenantRole(tenantId, ROLES.TENANT_VIEWER)
    if (!group?.id) {
      this.logger.error(
        `[AutoProvision] TENANT_VIEWER group not found for tenant ${tenantId}; ` +
        `user ${userId} provisioned without default role`,
      )
      return
    }

    await this.userGroupService.registerUserToGroup(userId, group.id, undefined, { skipUserValidation: true })
    this.logger.info(`[AutoProvision] assigned ${ROLES.TENANT_VIEWER} (group ${group.id}) to user ${userId}`)
  }

  /**
   * POST to an external role authority (e.g. PhysioNet) and merge the
   * returned role names into the user's groups. Skipped if URL unset. All
   * failures are logged and swallowed — the default-group assignment above
   * is the source of truth for "user can log in"; the hook only enriches.
   */
  private async callRoleHook(
    userId: string,
    idpUserId: string,
    connectorId: string,
    email: string | undefined,
    accessToken: string,
  ): Promise<void> {
    const url = env.USERMGMT_AUTO_PROVISION_ROLE_HOOK_URL
    if (!url) return

    const payload: RoleHookPayload = { idpUserId, email, connectorId, accessToken }
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (env.USERMGMT_AUTO_PROVISION_ROLE_HOOK_SECRET) {
      headers['authorization'] = `Bearer ${env.USERMGMT_AUTO_PROVISION_ROLE_HOOK_SECRET}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), env.USERMGMT_AUTO_PROVISION_ROLE_HOOK_TIMEOUT_MS)
    let body: RoleHookResponse
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      if (!response.ok) {
        this.logger.warn(
          `[AutoProvision] role hook ${url} returned ${response.status}; user ${userId} keeps default role only`,
        )
        return
      }
      body = await response.json() as RoleHookResponse
    } catch (err) {
      this.logger.warn(
        `[AutoProvision] role hook ${url} failed for user ${userId}: ${err}; keeping default role only`,
      )
      return
    } finally {
      clearTimeout(timeoutId)
    }

    const roleNames = body?.roles || []
    if (!Array.isArray(roleNames) || roleNames.length === 0) {
      this.logger.info(`[AutoProvision] role hook returned no extra roles for user ${userId}`)
      return
    }

    const tenantId = env.USERMGMT_AUTO_PROVISION_DEFAULT_TENANT_ID
    for (const roleName of roleNames) {
      const group =
        (tenantId ? await this.groupService.getGroupByTenantRole(tenantId, roleName) : undefined) ||
        (env.ALP_SYSTEM_NAME ? await this.groupService.getGroupBySystemRole(env.ALP_SYSTEM_NAME, roleName) : undefined)
      if (!group?.id) {
        this.logger.warn(`[AutoProvision] role hook returned unknown role "${roleName}" for user ${userId}`)
        continue
      }
      await this.userGroupService.registerUserToGroup(userId, group.id, undefined, { skipUserValidation: true })
      this.logger.info(`[AutoProvision] role-hook granted "${roleName}" (group ${group.id}) to user ${userId}`)
    }
  }
}
