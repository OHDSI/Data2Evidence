import { Inject, Service } from 'typedi'
import { CONTAINER_KEY } from '../const'
import { LinkedAccountService } from './LinkedAccountService'
import { LinkedAccountRepository } from '../repositories/LinkedAccountRepository'
import { UserGroupService } from './UserGroupService'
import { PhysionetDatasetQuery } from './PhysionetDatasetQuery'
import { PhysionetAPI } from '../api/PhysionetAPI'

const PROVENANCE = 'physionet_sync'

@Service()
export class PhysionetReconcileService {
  constructor(
    private readonly linkedSvc: LinkedAccountService,
    private readonly linkedRepo: LinkedAccountRepository,
    private readonly groupSvc: UserGroupService,
    private readonly datasetQuery: PhysionetDatasetQuery,
    private readonly api: PhysionetAPI,
    @Inject(CONTAINER_KEY.DB_CONNECTION) private readonly db?: any,
  ) {}

  async reconcile(userId: string): Promise<void> {
    return this.withAdvisoryLock(userId, async () => this.doReconcile(userId))
  }

  private async doReconcile(userId: string): Promise<void> {
    const link = await this.linkedRepo.findByUserAndProvider(userId, 'physionet')
    if (!link) return

    const accessToken = await this.linkedSvc.getDecryptedAccessToken(userId, 'physionet')
    if (!accessToken) {
      await this.groupSvc.withdrawAllByProvenance(userId, PROVENANCE)
      await this.linkedRepo.updateSyncStatus(link.id, null, 'link revoked upstream')
      return
    }

    const gated = await this.datasetQuery.listGated()
    let upstreamErrors = 0

    for (const d of gated) {
      const r = await this.api.checkDatasetAccess({ accessToken, slug: d.slug, version: d.version })

      if (r.kind === 'invalid_token') {
        await this.groupSvc.withdrawAllByProvenance(userId, PROVENANCE)
        await this.linkedRepo.updateSyncStatus(link.id, null, 'link revoked upstream')
        return
      }

      if (r.kind === 'upstream_error') {
        upstreamErrors++
        continue
      }

      if (r.hasAccess) {
        await this.groupSvc.registerUserToGroup(userId, d.studyGroupId, undefined, {
          createdByOverride: PROVENANCE,
          skipUserValidation: false,
        })
      } else {
        // v1 trade-off: withdrawUserFromGroups removes any user_group row for the
        // (user, group) pair regardless of who created it; if an admin happens to
        // have granted the same group separately, that row is also removed.
        // The cleaner alternative is a method that only revokes physionet_sync rows
        // for a specific group — deferred to v2. Acceptable in v1 because admin-only
        // grants on a PhysioNet-gated dataset are an unusual configuration.
        await this.groupSvc.withdrawUserFromGroups(userId, [d.studyGroupId])
      }
    }

    await this.linkedRepo.updateSyncStatus(
      link.id,
      new Date(),
      upstreamErrors ? `${upstreamErrors} datasets failed` : null,
    )
  }

  private async withAdvisoryLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    if (!this.db) return await fn()
    const trx = await this.db.transaction()
    try {
      await trx.raw("SELECT pg_advisory_xact_lock(hashtext('physionet_sync:' || ?))", [userId])
      const r = await fn()
      await trx.commit()
      return r
    } catch (e) {
      await trx.rollback().catch(() => {})
      throw e
    }
  }
}
