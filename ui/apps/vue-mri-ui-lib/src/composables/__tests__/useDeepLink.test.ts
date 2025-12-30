import { useDeepLink } from '../useDeepLink'
import CohortUrlCodec from '../../utils/CohortUrlCodec'

// Mock dependencies
jest.mock('../../utils/CohortUrlCodec')

// Mock store
const mockDispatch = jest.fn()

describe('useDeepLink', () => {
  let originalLocation: Location

  beforeEach(() => {
    // Save original location
    originalLocation = window.location

    // Clear mocks
    jest.clearAllMocks()
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
    delete (window as any).location
    window.location = {
      ...originalLocation,
      search,
    } as Location
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
    ;(CohortUrlCodec.safeDecompress as jest.Mock).mockReturnValue({
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
    ;(CohortUrlCodec.safeDecompress as jest.Mock).mockReturnValue({
      success: false,
      error: 'Invalid base64url encoding',
    })

    const { processDeepLink } = useDeepLink(mockDispatch)
    await processDeepLink()

    // Verify alert was dispatched
    expect(mockDispatch).toHaveBeenCalledWith('setAlertMessage', {
      message: 'Failed to load cohort definition: Invalid base64url encoding',
    })

    // Verify loadBookmarkDataToState was NOT dispatched
    expect(mockDispatch).not.toHaveBeenCalledWith('loadBookmarkDataToState', expect.anything())
  })

  it('should show alert when bookmark has no filter property', async () => {
    mockLocation('?linkType=cohort-definition&query=testQuery123')

    // Mock decompression with invalid structure (no filter)
    const mockBookmark = {
      cohortDefinition: { cards: [] }, // Wrong format - API request format instead of bookmark
    }
    ;(CohortUrlCodec.safeDecompress as jest.Mock).mockReturnValue({
      success: true,
      data: mockBookmark,
    })

    const { processDeepLink } = useDeepLink(mockDispatch)
    await processDeepLink()

    // Verify alert was dispatched
    expect(mockDispatch).toHaveBeenCalledWith('setAlertMessage', {
      message: 'Failed to load cohort definition: Invalid format. Expected bookmark format with "filter" property.',
    })

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
    ;(CohortUrlCodec.safeDecompress as jest.Mock).mockReturnValue({
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
    ;(CohortUrlCodec.safeDecompress as jest.Mock).mockReturnValue({
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
