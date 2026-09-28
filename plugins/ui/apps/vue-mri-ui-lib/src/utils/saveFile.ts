import { saveAs } from 'file-saver'
import streamSaver from 'streamsaver'

/**
 * Where an export gets written.
 * - `picker`: a file the user chose through the File System Access API (Chromium). Writing to it
 *   resolves only once the bytes are on disk, so callers can report success truthfully.
 * - `fallback`: other browsers. The file is handed to the browser's download manager and we cannot
 *   observe when (or whether) it lands on disk.
 */
export type SaveTarget =
  | { kind: 'picker'; fileName: string; handle: FileSystemFileHandle }
  | { kind: 'fallback'; fileName: string }

export type SaveFileType = 'csv' | 'png' | 'zip'

const ACCEPT: Record<SaveFileType, { description: string; accept: Record<string, string[]> }> = {
  csv: { description: 'CSV file', accept: { 'text/csv': ['.csv'] } },
  png: { description: 'PNG image', accept: { 'image/png': ['.png'] } },
  zip: { description: 'ZIP archive', accept: { 'application/zip': ['.zip'] } },
}

export const isSavePickerSupported = (): boolean =>
  typeof window !== 'undefined' && typeof (window as any).showSaveFilePicker === 'function'

export const isAbortError = (err: unknown): boolean => (err as any)?.name === 'AbortError'

/**
 * Asks the user where to save the file. Must be called while the click that started the export is
 * still a transient user activation, i.e. before any network request is awaited.
 * @returns the target to write to, or `null` when the user dismissed the picker
 */
export async function pickSaveTarget(fileName: string, type: SaveFileType): Promise<SaveTarget | null> {
  if (!isSavePickerSupported()) {
    return { kind: 'fallback', fileName }
  }
  try {
    const handle: FileSystemFileHandle = await (window as any).showSaveFilePicker({
      suggestedName: fileName,
      types: [ACCEPT[type]],
    })
    return { kind: 'picker', fileName: handle.name, handle }
  } catch (err) {
    if (isAbortError(err)) {
      return null
    }
    // e.g. SecurityError when the user activation expired or we are in a cross-origin iframe
    console.warn('Save file picker unavailable, falling back to browser download:', err)
    return { kind: 'fallback', fileName }
  }
}

/** Writes a complete blob to the target. For a picker target this resolves once the file is saved. */
export async function writeBlobToSaveTarget(target: SaveTarget, blob: Blob): Promise<void> {
  if (target.kind === 'fallback') {
    saveAs(blob, target.fileName)
    return
  }
  const writable = await (target.handle as any).createWritable()
  try {
    await writable.write(blob)
    await writable.close()
  } catch (err) {
    await writable.abort?.().catch(() => undefined)
    throw err
  }
}

/** Opens a stream to the target, for exports too large to hold in memory (ZIP). */
export async function openSaveTargetStream(target: SaveTarget): Promise<WritableStream<Uint8Array>> {
  if (target.kind === 'fallback') {
    return streamSaver.createWriteStream(target.fileName)
  }
  return (target.handle as any).createWritable()
}

/*
 * CSV and ZIP exports are picked in the menu/dialog (where the click happens) but written by the
 * chart / patient-list component once the backend responds, so the chosen target is parked here.
 */
const pendingTargets = new Map<'csv' | 'zip', SaveTarget>()

export const setPendingSaveTarget = (key: 'csv' | 'zip', target: SaveTarget) => pendingTargets.set(key, target)

export const clearPendingSaveTarget = (key: 'csv' | 'zip') => pendingTargets.delete(key)

/** Returns and clears the parked target, or a fallback target for `fileName` when none was parked. */
export function takePendingSaveTarget(key: 'csv' | 'zip', fileName: string): SaveTarget {
  const target = pendingTargets.get(key)
  pendingTargets.delete(key)
  return target ?? { kind: 'fallback', fileName }
}
