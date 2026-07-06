import { describe, expect, it } from 'vitest'
import {
  resolvePortalContextProps,
  resolveStandaloneAppCustomProps,
} from '../portalContextBootstrap'

describe('portalContextBootstrap', () => {
  it('uses index.html fallback defaults when bootstrap and env are empty', () => {
    const context = resolvePortalContextProps(new URLSearchParams(''), {}, {})

    expect(context.username).toBe('admin')
    expect(context.datasetId).toBe('')
    expect(context.releaseId).toBe('')
    expect(context.locale).toBe('en')
    expect(context.qeSvcUrl).toBe('https://localhost:8081')
    expect(context.REACT_APP_USE_PUBLIC_WEBAPI_PROXY).toBe('true')
    expect(context.REACT_APP_PUBLIC_WEBAPI_DATASOURCE).toBe('SYNPUF1K')
  })

  it('prefers bootstrap values over fallback defaults', () => {
    const context = resolvePortalContextProps(
      new URLSearchParams(''),
      {},
      {
        username: 'khairul',
        datasetId: 'dataset-from-bootstrap',
        releaseId: 'release-from-bootstrap',
        locale: 'ms',
        qeSvcUrl: 'https://qe.internal',
      }
    )

    expect(context.username).toBe('khairul')
    expect(context.datasetId).toBe('dataset-from-bootstrap')
    expect(context.releaseId).toBe('release-from-bootstrap')
    expect(context.locale).toBe('ms')
    expect(context.qeSvcUrl).toBe('https://qe.internal')
  })

  it('prefers query params for dataset and release over bootstrap values', () => {
    const context = resolvePortalContextProps(
      new URLSearchParams('datasetId=dataset-from-query&releaseId=release-from-query'),
      {},
      {
        datasetId: 'dataset-from-bootstrap',
        releaseId: 'release-from-bootstrap',
      }
    )

    expect(context.datasetId).toBe('dataset-from-query')
    expect(context.releaseId).toBe('release-from-query')
  })

  it('uses same bootstrap source for standalone child app props', async () => {
    const props = resolveStandaloneAppCustomProps(
      new URLSearchParams(''),
      {},
      {
        username: 'portal-user',
        datasetId: 'dataset-bootstrap',
        locale: 'fr',
      }
    )

    expect(props.username).toBe('portal-user')
    expect(props.datasetId).toBe('dataset-bootstrap')
    expect(props.locale).toBe('fr')
    expect(await props.getToken()).toBe('')
  })
})
