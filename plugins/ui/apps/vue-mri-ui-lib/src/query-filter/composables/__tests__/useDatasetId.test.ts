import { describe, expect, it, vi } from 'vitest'
import { useDatasetId } from '../useDatasetId'

vi.mock('@/composables/usePortalContext', () => ({
  usePortalContext: vi.fn(),
}))

import { usePortalContext } from '@/composables/usePortalContext'

describe('useDatasetId', () => {
  it('returns dataset id from store when available', () => {
    ;(usePortalContext as any).mockReturnValue({ datasetId: 'portal-ds' })
    const store = {
      state: {
        selectedDataset: { id: 'store-ds' },
      },
    }

    const { datasetId, getDatasetId } = useDatasetId(store)

    expect(datasetId.value).toBe('store-ds')
    expect(getDatasetId()).toBe('store-ds')
  })

  it('falls back to portal context dataset id when store id is missing', () => {
    ;(usePortalContext as any).mockReturnValue({ datasetId: 'portal-ds' })
    const store = {
      state: {
        selectedDataset: {},
      },
    }

    const { datasetId } = useDatasetId(store)

    expect(datasetId.value).toBe('portal-ds')
  })

  it('returns null when neither store nor portal context has dataset id', () => {
    ;(usePortalContext as any).mockReturnValue({ datasetId: '' })
    const store = {
      state: {
        selectedDataset: {},
      },
    }

    const { datasetId } = useDatasetId(store)

    expect(datasetId.value).toBeNull()
  })
})
