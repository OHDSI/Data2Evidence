import { saveAs } from 'file-saver'
import {
  pickSaveTarget,
  writeBlobToSaveTarget,
  setPendingSaveTarget,
  takePendingSaveTarget,
  clearPendingSaveTarget,
  getPendingSaveSignal,
} from '../saveFile'

vi.mock('file-saver', () => ({ saveAs: vi.fn() }))
vi.mock('streamsaver', () => ({ default: { createWriteStream: vi.fn() } }))

const makeHandle = (name = 'picked.csv') => {
  const writable = {
    write: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    abort: vi.fn().mockResolvedValue(undefined),
  }
  return { handle: { name, createWritable: vi.fn().mockResolvedValue(writable) } as any, writable }
}

describe('saveFile', () => {
  afterEach(() => {
    delete (window as any).showSaveFilePicker
    clearPendingSaveTarget('csv')
    vi.clearAllMocks()
  })

  describe('pickSaveTarget', () => {
    it('falls back to a browser download when the picker is unsupported', async () => {
      expect(await pickSaveTarget('a.csv', 'csv')).toEqual({ kind: 'fallback', fileName: 'a.csv' })
    })

    it('returns the chosen file when the picker is supported', async () => {
      const { handle } = makeHandle('chosen.csv')
      ;(window as any).showSaveFilePicker = vi.fn().mockResolvedValue(handle)

      const target = await pickSaveTarget('a.csv', 'csv')

      expect(target).toEqual({ kind: 'picker', fileName: 'chosen.csv', handle })
      expect((window as any).showSaveFilePicker).toHaveBeenCalledWith(
        expect.objectContaining({ suggestedName: 'a.csv' })
      )
    })

    it('returns null when the user dismisses the picker', async () => {
      ;(window as any).showSaveFilePicker = vi.fn().mockRejectedValue(new DOMException('dismissed', 'AbortError'))
      expect(await pickSaveTarget('a.csv', 'csv')).toBeNull()
    })

    it('falls back when the picker is refused for another reason', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      ;(window as any).showSaveFilePicker = vi.fn().mockRejectedValue(new DOMException('no gesture', 'SecurityError'))
      expect(await pickSaveTarget('a.csv', 'csv')).toEqual({ kind: 'fallback', fileName: 'a.csv' })
    })
  })

  describe('writeBlobToSaveTarget', () => {
    it('writes and closes the picked file', async () => {
      const { handle, writable } = makeHandle()
      const blob = new Blob(['x'])

      await writeBlobToSaveTarget({ kind: 'picker', fileName: 'picked.csv', handle }, blob)

      expect(writable.write).toHaveBeenCalledWith(blob)
      expect(writable.close).toHaveBeenCalled()
      expect(saveAs).not.toHaveBeenCalled()
    })

    it('uses file-saver for a fallback target', async () => {
      const blob = new Blob(['x'])
      await writeBlobToSaveTarget({ kind: 'fallback', fileName: 'a.csv' }, blob)
      expect(saveAs).toHaveBeenCalledWith(blob, 'a.csv')
    })

    it('discards the picked file when aborted mid-write', async () => {
      const { handle, writable } = makeHandle()
      const controller = new AbortController()
      let finishWrite: () => void = () => undefined
      writable.write.mockReturnValue(new Promise<void>(resolve => (finishWrite = resolve)))

      const saving = writeBlobToSaveTarget({ kind: 'picker', fileName: 'picked.csv', handle }, new Blob(['x']), controller.signal)
      await vi.waitFor(() => expect(writable.write).toHaveBeenCalled())
      controller.abort()
      finishWrite()

      await expect(saving).rejects.toMatchObject({ name: 'AbortError' })
      expect(writable.abort).toHaveBeenCalled()
      expect(writable.close).not.toHaveBeenCalled()
    })

    it('does not start writing when already aborted', async () => {
      const { handle } = makeHandle()
      const controller = new AbortController()
      controller.abort()

      await expect(
        writeBlobToSaveTarget({ kind: 'picker', fileName: 'picked.csv', handle }, new Blob(['x']), controller.signal)
      ).rejects.toMatchObject({ name: 'AbortError' })
      await expect(
        writeBlobToSaveTarget({ kind: 'fallback', fileName: 'a.csv' }, new Blob(['x']), controller.signal)
      ).rejects.toMatchObject({ name: 'AbortError' })
      expect(handle.createWritable).not.toHaveBeenCalled()
      expect(saveAs).not.toHaveBeenCalled()
    })
  })

  describe('pending targets', () => {
    it('hands the parked target over once', () => {
      const { handle } = makeHandle()
      const target = { kind: 'picker' as const, fileName: 'picked.csv', handle }
      setPendingSaveTarget('csv', target)

      expect(takePendingSaveTarget('csv', 'a.csv')).toBe(target)
      expect(takePendingSaveTarget('csv', 'a.csv')).toEqual({ kind: 'fallback', fileName: 'a.csv' })
    })

    it('aborts the export once cleared, even after its target was taken', () => {
      const { handle } = makeHandle()
      setPendingSaveTarget('csv', { kind: 'picker', fileName: 'picked.csv', handle })
      const signal = getPendingSaveSignal('csv')
      takePendingSaveTarget('csv', 'a.csv')

      expect(signal?.aborted).toBe(false)
      clearPendingSaveTarget('csv')
      expect(signal?.aborted).toBe(true)
      expect(getPendingSaveSignal('csv')).toBeUndefined()
    })

    it('gives each export its own signal', () => {
      const { handle } = makeHandle()
      setPendingSaveTarget('csv', { kind: 'picker', fileName: 'picked.csv', handle })
      const first = getPendingSaveSignal('csv')
      setPendingSaveTarget('csv', { kind: 'picker', fileName: 'picked.csv', handle })

      expect(getPendingSaveSignal('csv')).not.toBe(first)
    })
  })
})
