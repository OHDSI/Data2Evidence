import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { isEmbeddedInAtlas, openConceptInAtlas, resolveConceptId } from '../atlasConceptViewer'

const DATASET_ID = '7dffaaeb-c3cd-434c-bd2c-08cb34267acc'

describe('resolveConceptId', () => {
  it('reads the id from whichever key the tag carries', () => {
    expect(resolveConceptId({ concept_id: 201826 })).toBe(201826)
    expect(resolveConceptId({ id: 201826 })).toBe(201826)
    expect(resolveConceptId({ value: 201826 })).toBe(201826)
    expect(resolveConceptId({ value: '201826' })).toBe(201826)
  })

  it('prefers concept_id when a tag carries several keys', () => {
    expect(resolveConceptId({ concept_id: 201826, id: 1, value: 2 })).toBe(201826)
  })

  it('rejects anything Atlas could not route to', () => {
    // The Atlas route is /concept/:sourceKey/:conceptId(\d+).
    for (const item of [
      null,
      undefined,
      {},
      { value: 'SNOMED:1234' },
      { value: '' },
      { value: 0 },
      { value: -5 },
      { value: 3.5 },
    ]) {
      expect(resolveConceptId(item as any)).toBeNull()
    }
  })
})

describe('openConceptInAtlas', () => {
  let postMessage: ReturnType<typeof vi.fn>

  const embed = () => {
    ;(window as any).__MRI_PORTAL_CONTEXT__ = { datasetId: DATASET_ID }
    Object.defineProperty(window, 'parent', { value: { postMessage }, configurable: true })
  }

  beforeEach(() => {
    postMessage = vi.fn()
  })

  afterEach(() => {
    delete (window as any).__MRI_PORTAL_CONTEXT__
    Object.defineProperty(window, 'parent', { value: window, configurable: true })
  })

  it('posts the concept and the source key to the host', () => {
    embed()
    expect(openConceptInAtlas({ concept_id: 201826 })).toBe(true)
    expect(postMessage).toHaveBeenCalledWith(
      { type: 'pa-open-concept', conceptId: 201826, sourceKey: DATASET_ID },
      window.location.origin
    )
  })

  it('does nothing standalone, so the caller keeps its own behaviour', () => {
    // No __MRI_PORTAL_CONTEXT__ and window.parent === window.
    expect(isEmbeddedInAtlas()).toBe(false)
    expect(openConceptInAtlas({ concept_id: 201826 })).toBe(false)
    expect(postMessage).not.toHaveBeenCalled()
  })

  it('does nothing when the tag has no routable concept id', () => {
    embed()
    expect(openConceptInAtlas({ value: 'SNOMED:1234' })).toBe(false)
    expect(postMessage).not.toHaveBeenCalled()
  })

  it('does nothing when the host delivered no dataset id', () => {
    embed()
    ;(window as any).__MRI_PORTAL_CONTEXT__ = { datasetId: '' }
    expect(openConceptInAtlas({ concept_id: 201826 })).toBe(false)
    expect(postMessage).not.toHaveBeenCalled()
  })
})
