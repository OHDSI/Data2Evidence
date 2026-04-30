import { vi, Mock } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDeepLink } from '../useDeepLink'
import CohortUrlCodec from '../../utils/CohortUrlCodec'
import { useNotificationStore } from '../../stores/notifications'

// Mock dependencies
vi.mock('../../utils/CohortUrlCodec')
vi.mock('@/store', () => ({
  default: {
    getters: {
      getText: (key: string) => key,
    },
  },
}))

// Mock store
const mockDispatch = vi.fn()

describe('useDeepLink', () => {
  let originalLocation: Location

  beforeEach(() => {
    setActivePinia(createPinia())

    // Save original location
    originalLocation = window.location

    // Clear mocks
    vi.clearAllMocks()
    mockDispatch.mockResolvedValue(undefined)
  })

  afterEach(() => {
    // Restore original location
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    })
  })

  const mockLocation = (search: string) => {
    const origin = originalLocation.origin || 'http://localhost:3000'
    const pathname = originalLocation.pathname || '/'
    const url = new URL(`${origin}${pathname}${search}`)
    const locationMock = Object.create(originalLocation) as Location

    Object.defineProperties(locationMock, {
      href: { value: url.href, configurable: true },
      origin: { value: url.origin, configurable: true },
      pathname: { value: url.pathname, configurable: true },
      search: { value: url.search, configurable: true },
    })

    Object.defineProperty(window, 'location', {
      value: locationMock,
      configurable: true,
      writable: true,
    })
  }

  it('should load cohort definition when linkType=cohort-definition and query present', async () => {
    // Mock URL
    mockLocation('?linkType=cohort-definition&query=testQuery123')

    // Mock successful decompression
    const mockBookmark = {
      filter: { some: 'filter' },
      axisSelection: [],
      chartType: 'stacked',
    }
    ;(CohortUrlCodec.safeDecompress as Mock).mockReturnValue({
      success: true,
      data: mockBookmark,
    })

    // Create composable
    const { processDeepLink } = useDeepLink(mockDispatch)

    // Process deep link
    await processDeepLink()

    // Verify decompression was called
    expect(CohortUrlCodec.safeDecompress).toHaveBeenCalledWith('testQuery123')

    // Verify loadBookmarkDataToState was dispatched
    expect(mockDispatch).toHaveBeenCalledWith('loadBookmarkDataToState', {
      bookmark: mockBookmark,
      chartType: 'stacked',
    })

    const notificationStore = useNotificationStore()
    expect(notificationStore.alert.show).toBe(true)
    expect(notificationStore.alert.message).toBe('Cohort definition loaded successfully from shared link.')
    expect(notificationStore.alert.messageType).toBe('success')
    expect(notificationStore.alert.title).toBe('Success')
    expect(mockDispatch).not.toHaveBeenCalledWith('setAlertMessage', expect.anything())
  })

  it('should do nothing when no query param present', async () => {
    mockLocation('?linkType=cohort-definition')

    const { processDeepLink } = useDeepLink(mockDispatch)
    await processDeepLink()

    expect(CohortUrlCodec.safeDecompress).not.toHaveBeenCalled()
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('should do nothing when linkType is not cohort-definition', async () => {
    mockLocation('?linkType=other&query=testQuery123')

    const { processDeepLink } = useDeepLink(mockDispatch)
    await processDeepLink()

    expect(CohortUrlCodec.safeDecompress).not.toHaveBeenCalled()
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('should show alert when decompression fails', async () => {
    mockLocation('?linkType=cohort-definition&query=invalidQuery')

    // Mock failed decompression
    ;(CohortUrlCodec.safeDecompress as Mock).mockReturnValue({
      success: false,
      error: 'Invalid base64url encoding',
    })

    const { processDeepLink } = useDeepLink(mockDispatch)
    await processDeepLink()

    const notificationStore = useNotificationStore()

    expect(notificationStore.alert.message).toBe('Failed to load cohort definition: Invalid base64url encoding')
    expect(notificationStore.alert.messageType).toBe('error')
    expect(notificationStore.alert.title).toBe('MRI_PA_NOTIFICATION_ERROR')
    expect(notificationStore.alert.show).toBe(true)
    expect(mockDispatch).not.toHaveBeenCalledWith('setAlertMessage', expect.anything())

    // Verify loadBookmarkDataToState was NOT dispatched
    expect(mockDispatch).not.toHaveBeenCalledWith('loadBookmarkDataToState', expect.anything())
  })

  it('should show alert when bookmark has no filter property', async () => {
    mockLocation('?linkType=cohort-definition&query=testQuery123')

    // Mock decompression with invalid structure (no filter)
    const mockBookmark = {
      cohortDefinition: { cards: [] }, // Wrong format - API request format instead of bookmark
    }
    ;(CohortUrlCodec.safeDecompress as Mock).mockReturnValue({
      success: true,
      data: mockBookmark,
    })

    const { processDeepLink } = useDeepLink(mockDispatch)
    await processDeepLink()

    const notificationStore = useNotificationStore()

    expect(notificationStore.alert.message).toBe(
      'Failed to load cohort definition: Invalid format. Expected bookmark format with "filter" property.'
    )
    expect(notificationStore.alert.messageType).toBe('error')
    expect(notificationStore.alert.title).toBe('MRI_PA_NOTIFICATION_ERROR')
    expect(notificationStore.alert.show).toBe(true)
    expect(mockDispatch).not.toHaveBeenCalledWith('setAlertMessage', expect.anything())

    // Verify loadBookmarkDataToState was NOT dispatched
    expect(mockDispatch).not.toHaveBeenCalledWith('loadBookmarkDataToState', expect.anything())
  })

  it('should not re-process deep link on subsequent calls', async () => {
    mockLocation('?linkType=cohort-definition&query=testQuery123')

    // Mock successful decompression
    const mockBookmark = {
      filter: { some: 'filter' },
      axisSelection: [],
    }
    ;(CohortUrlCodec.safeDecompress as Mock).mockReturnValue({
      success: true,
      data: mockBookmark,
    })

    const { processDeepLink } = useDeepLink(mockDispatch)

    // First call should process
    await processDeepLink()
    expect(CohortUrlCodec.safeDecompress).toHaveBeenCalledTimes(1)

    // Second call should not process
    await processDeepLink()
    expect(CohortUrlCodec.safeDecompress).toHaveBeenCalledTimes(1)

    // Third call should not process
    await processDeepLink()
    expect(CohortUrlCodec.safeDecompress).toHaveBeenCalledTimes(1)
  })

  it('should handle URL-encoded query parameter', async () => {
    // Simulate URL-encoded query parameter
    mockLocation('?linkType=cohort-definition&query=test%2BQuery%2F123%3D')

    const mockBookmark = {
      filter: { some: 'filter' },
      axisSelection: [],
    }
    ;(CohortUrlCodec.safeDecompress as Mock).mockReturnValue({
      success: true,
      data: mockBookmark,
    })

    const { processDeepLink } = useDeepLink(mockDispatch)
    await processDeepLink()

    // URLSearchParams should automatically decode the parameter
    expect(CohortUrlCodec.safeDecompress).toHaveBeenCalledWith('test+Query/123=')
  })

  it('should handle empty query parameter', async () => {
    mockLocation('?linkType=cohort-definition&query=')

    const { processDeepLink } = useDeepLink(mockDispatch)
    await processDeepLink()

    expect(CohortUrlCodec.safeDecompress).not.toHaveBeenCalled()
    expect(mockDispatch).not.toHaveBeenCalled()
  })
})
