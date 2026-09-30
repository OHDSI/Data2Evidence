import { describe, it, expect, vi } from 'vitest'
import { base64ToBlob, saveBlobAs } from './downloadResource'

// jsdom's Blob doesn't implement text()/arrayBuffer() — FileReader does work.
function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsText(blob)
  })
}

describe('base64ToBlob', () => {
  it('decodes base64 into a Blob with the given content type', async () => {
    const blob = base64ToBlob(btoa('hello'), 'text/plain')
    expect(blob.type).toBe('text/plain')
    expect(await readBlobAsText(blob)).toBe('hello')
  })

  it('defaults to application/octet-stream when no content type is given', () => {
    const blob = base64ToBlob(btoa('x'))
    expect(blob.type).toBe('application/octet-stream')
  })
})

describe('saveBlobAs', () => {
  it('creates an <a download> link, clicks it, and cleans it up', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
    vi.stubGlobal('URL', { ...URL, createObjectURL })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    saveBlobAs(new Blob(['x']), 'report.csv')

    expect(createObjectURL).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    expect(document.querySelector('a[download="report.csv"]')).toBeNull()

    clickSpy.mockRestore()
    vi.unstubAllGlobals()
  })
})
