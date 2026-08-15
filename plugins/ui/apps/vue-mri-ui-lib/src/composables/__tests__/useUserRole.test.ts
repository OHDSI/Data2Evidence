import { vi, MockedFunction } from 'vitest'
import { useUserRole } from '../useUserRole'
import type { PortalContextState } from '@/types/portal-props'

vi.mock('../usePortalContext', () => ({
  usePortalContext: vi.fn(),
}))

import { usePortalContext } from '../usePortalContext'
const mockUsePortalContext = usePortalContext as unknown as MockedFunction<() => any>

const makePortalContext = (overrides: Partial<PortalContextState> = {}): any => ({
  getToken: vi.fn(async () => 'token'),
  datasetId: 'dataset-a',
  releaseId: 'release-a',
  tenantId: 'tenant-a',
  username: 'user-a',
  idpUserId: 'idp-a',
  locale: 'en',
  features: [],
  featuresLoading: false,
  ...overrides,
})

describe('useUserRole', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('canShare', () => {
    it('returns true when adminOnlySharing is disabled', () => {
      mockUsePortalContext.mockReturnValue(
        makePortalContext({
        features: [
          { feature: 'adminOnlySharing', isEnabled: false },
          { feature: 'datasetFilter', isEnabled: true },
        ],
        featuresLoading: false,
        })
      )

      const { canShare } = useUserRole()
      expect(canShare.value).toBe(true)
    })

    it('returns false when adminOnlySharing is enabled', () => {
      mockUsePortalContext.mockReturnValue(
        makePortalContext({
        features: [
          { feature: 'adminOnlySharing', isEnabled: true },
          { feature: 'datasetFilter', isEnabled: true },
        ],
        featuresLoading: false,
        })
      )

      const { canShare } = useUserRole()
      expect(canShare.value).toBe(false)
    })

    it('returns false when features are loading (prevents flash)', () => {
      mockUsePortalContext.mockReturnValue(
        makePortalContext({
        features: [],
        featuresLoading: true,
        })
      )

      const { canShare } = useUserRole()
      expect(canShare.value).toBe(false)
    })

    it('returns false when context has loading defaults', () => {
      mockUsePortalContext.mockReturnValue(makePortalContext({ featuresLoading: true }))
      const { canShare } = useUserRole()
      expect(canShare.value).toBe(false)
    })
  })

  describe('adminOnlySharingEnabled', () => {
    it('returns true when feature is enabled', () => {
      mockUsePortalContext.mockReturnValue(
        makePortalContext({
        features: [{ feature: 'adminOnlySharing', isEnabled: true }],
        featuresLoading: false,
        })
      )

      const { adminOnlySharingEnabled } = useUserRole()
      expect(adminOnlySharingEnabled.value).toBe(true)
    })

    it('returns false when feature is disabled', () => {
      mockUsePortalContext.mockReturnValue(
        makePortalContext({
        features: [{ feature: 'adminOnlySharing', isEnabled: false }],
        featuresLoading: false,
        })
      )

      const { adminOnlySharingEnabled } = useUserRole()
      expect(adminOnlySharingEnabled.value).toBe(false)
    })

    it('returns false when feature is not in list', () => {
      mockUsePortalContext.mockReturnValue(
        makePortalContext({
        features: [{ feature: 'otherFeature', isEnabled: true }],
        featuresLoading: false,
        })
      )

      const { adminOnlySharingEnabled } = useUserRole()
      expect(adminOnlySharingEnabled.value).toBe(false)
    })
  })

  describe('featuresLoading', () => {
    it('returns true when features are loading', () => {
      mockUsePortalContext.mockReturnValue(
        makePortalContext({
        features: [],
        featuresLoading: true,
        })
      )

      const { featuresLoading } = useUserRole()
      expect(featuresLoading.value).toBe(true)
    })

    it('returns false when features are loaded', () => {
      mockUsePortalContext.mockReturnValue(
        makePortalContext({
        features: [],
        featuresLoading: false,
        })
      )

      const { featuresLoading } = useUserRole()
      expect(featuresLoading.value).toBe(false)
    })

    it('returns true when context loading flag is true', () => {
      mockUsePortalContext.mockReturnValue(makePortalContext({ featuresLoading: true }))

      const { featuresLoading } = useUserRole()
      expect(featuresLoading.value).toBe(true)
    })
  })
})
