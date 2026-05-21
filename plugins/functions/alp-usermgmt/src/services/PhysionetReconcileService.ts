import { Service } from 'typedi'
import { LinkedAccountService } from './LinkedAccountService'
import { LinkedAccountRepository } from '../repositories/LinkedAccountRepository'
import { UserGroupService } from './UserGroupService'
import { PhysionetDatasetQuery } from './PhysionetDatasetQuery'
import { PhysionetAPI } from '../api/PhysionetAPI'

const PROVENANCE = 'physionet_sync'

@Service()
export class PhysionetReconcileService {
  private readonly inFlight = new Map<string, Promise<void>>()

  constructor(
    private readonly linkedSvc: LinkedAccountService,
    private readonly linkedRepo: LinkedAccountRepository,
    private readonly groupSvc: UserGroupService,
    private readonly datasetQuery: PhysionetDatasetQuery,
    private readonly api: PhysionetAPI,
  ) {}

  reconcile(userId: string): Promise<void> {
    const existing = this.inFlight.get(userId)
    if (existing) return existing
    const promise = this.doReconcile(userId).finally(() => {
      this.inFlight.delete(userId)
    })
    this.inFlight.set(userId, promise)
    return promise
  }

  private async doReconcile(userId: string): Promise<void> {
    const link = await this.linkedRepo.findByUserAndProvider(userId, 'physionet')
    if (!link) return

    let accessToken: string | null
    try {
      accessToken = await this.linkedSvc.getDecryptedAccessToken(userId, 'physionet')
    } catch (e) {
      // Transient upstream/refresh failure: keep grants intact, surface in sync status.
      await this.linkedRepo.updateSyncStatus(link.id, null, `token refresh failed: ${(e as Error).message}`)
      return
    }
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
        await this.groupSvc.withdrawUserFromGroupByProvenance(userId, d.studyGroupId, PROVENANCE)
      }
    }

    await this.linkedRepo.updateSyncStatus(
      link.id,
      new Date(),
      upstreamErrors ? `${upstreamErrors} datasets failed` : null,
    )
  }

}
