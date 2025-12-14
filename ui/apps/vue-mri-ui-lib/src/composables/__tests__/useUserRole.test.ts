import { useUserRole } from '../useUserRole'

// Mock PortalUtils
jest.mock('../../utils/PortalUtils', () => ({
  getPortalAPI: jest.fn(),
}))

import { getPortalAPI } from '../../utils/PortalUtils'
const mockGetPortalAPI = getPortalAPI as jest.MockedFunction<typeof getPortalAPI>

describe('useUserRole', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('canShare', () => {
    it('returns true when adminOnlySharing is disabled', () => {
      mockGetPortalAPI.mockReturnValue({
        getToken: jest.fn(),
        features: [
          { feature: 'adminOnlySharing', isEnabled: false },
          { feature: 'datasetFilter', isEnabled: true },
        ],
        featuresLoading: false,
      })

      const { canShare } = useUserRole()
      expect(canShare.value).toBe(true)
    })

    it('returns false when adminOnlySharing is enabled', () => {
      mockGetPortalAPI.mockReturnValue({
        getToken: jest.fn(),
        features: [
          { feature: 'adminOnlySharing', isEnabled: true },
          { feature: 'datasetFilter', isEnabled: true },
        ],
        featuresLoading: false,
      })

      const { canShare } = useUserRole()
      expect(canShare.value).toBe(false)
    })

    it('returns false when features are loading (prevents flash)', () => {
      mockGetPortalAPI.mockReturnValue({
        getToken: jest.fn(),
        features: [],
        featuresLoading: true,
      })

      const { canShare } = useUserRole()
      expect(canShare.value).toBe(false)
    })

    it('returns false when portalAPI is null', () => {
      mockGetPortalAPI.mockReturnValue(null)

      const { canShare } = useUserRole()
      expect(canShare.value).toBe(false)
    })
  })

  describe('adminOnlySharingEnabled', () => {
    it('returns true when feature is enabled', () => {
      mockGetPortalAPI.mockReturnValue({
        getToken: jest.fn(),
        features: [{ feature: 'adminOnlySharing', isEnabled: true }],
        featuresLoading: false,
      })

      const { adminOnlySharingEnabled } = useUserRole()
      expect(adminOnlySharingEnabled.value).toBe(true)
    })

    it('returns false when feature is disabled', () => {
      mockGetPortalAPI.mockReturnValue({
        getToken: jest.fn(),
        features: [{ feature: 'adminOnlySharing', isEnabled: false }],
        featuresLoading: false,
      })

      const { adminOnlySharingEnabled } = useUserRole()
      expect(adminOnlySharingEnabled.value).toBe(false)
    })

    it('returns false when feature is not in list', () => {
      mockGetPortalAPI.mockReturnValue({
        getToken: jest.fn(),
        features: [{ feature: 'otherFeature', isEnabled: true }],
        featuresLoading: false,
      })

      const { adminOnlySharingEnabled } = useUserRole()
      expect(adminOnlySharingEnabled.value).toBe(false)
    })
  })

  describe('featuresLoading', () => {
    it('returns true when features are loading', () => {
      mockGetPortalAPI.mockReturnValue({
        getToken: jest.fn(),
        features: [],
        featuresLoading: true,
      })

      const { featuresLoading } = useUserRole()
      expect(featuresLoading.value).toBe(true)
    })

    it('returns false when features are loaded', () => {
      mockGetPortalAPI.mockReturnValue({
        getToken: jest.fn(),
        features: [],
        featuresLoading: false,
      })

      const { featuresLoading } = useUserRole()
      expect(featuresLoading.value).toBe(false)
    })

    it('returns true when portalAPI is null (default)', () => {
      mockGetPortalAPI.mockReturnValue(null)

      const { featuresLoading } = useUserRole()
      expect(featuresLoading.value).toBe(true)
    })
  })
})
