import { describe, it, expect, vi } from 'vitest'
import { createZip } from '../createZip'
import { openSaveTargetStream } from '../../../utils/saveFile'

vi.mock('../../../utils/saveFile', () => ({
  openSaveTargetStream: vi.fn(),
  takePendingSaveTarget: vi.fn((_key: string, fileName: string) => ({ kind: 'fallback', fileName })),
}))

describe('createZip', () => {
  it('rejects instead of hanging when there are no entity responses', async () => {
    const writer = { abort: vi.fn().mockResolvedValue(undefined), write: vi.fn(), close: vi.fn() }
    vi.mocked(openSaveTargetStream).mockResolvedValue({ getWriter: () => writer } as any)

    await expect(createZip({ responses: [], cohortName: 'cohort' })).rejects.toThrow('No patient list data to export')
    // The opened target is abandoned rather than left as an unfinished archive
    expect(writer.abort).toHaveBeenCalled()
    expect(writer.close).not.toHaveBeenCalled()
  })
})
