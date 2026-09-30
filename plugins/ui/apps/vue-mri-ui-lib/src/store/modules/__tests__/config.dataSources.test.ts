import { vi, describe, expect, it } from 'vitest'

vi.mock('axios')
vi.mock('@/stores/notifications', () => ({
  useNotificationStore: () => ({ setToastMessage: vi.fn(), setAlertMessage: vi.fn() }),
}))
vi.mock('@/composables/usePortalContext', () => ({
  usePortalContext: () => ({ datasetId: '', releaseId: '' }),
}))

import configModule from '../config'
import * as types from '../../mutation-types'

/**
 * The data-source list exists only to turn the active dataset id into a name
 * for display. `setDataset` commits `{ id }` and nothing else, so without this
 * the header shows a UUID.
 */
describe('store - config: data sources', () => {
  const sources = [
    { sourceKey: 'aaa-111', sourceName: 'Demo dataset' },
    { sourceKey: 'bbb-222', sourceName: 'test dataset 2' },
  ]

  describe('getSelectedDatasetName', () => {
    const name = (selectedDataset: unknown, dataSources: unknown[]) =>
      configModule.getters.getSelectedDatasetName({ selectedDataset, dataSources } as never)

    it('resolves the id to its source name', () => {
      expect(name({ id: 'bbb-222' }, sources)).toBe('test dataset 2')
    })

    it('falls back to the id while the list has not arrived', () => {
      // The fetch is not awaited, so this is the normal first render, not an
      // edge case. Showing a UUID beats showing nothing.
      expect(name({ id: 'bbb-222' }, [])).toBe('bbb-222')
    })

    it('falls back to the id when the id is not in the list', () => {
      expect(name({ id: 'unknown-999' }, sources)).toBe('unknown-999')
    })

    it('is empty when no dataset is selected', () => {
      expect(name(undefined, sources)).toBe('')
      expect(name({}, sources)).toBe('')
    })

    it('prefers the name even when a source carries an empty name', () => {
      // An empty sourceName must not render as a blank header.
      expect(name({ id: 'ccc-333' }, [{ sourceKey: 'ccc-333', sourceName: '' }])).toBe('ccc-333')
    })
  })

  describe('fireGetDataSources', () => {
    const researcher = (datasetId: string) => ({ datasetId, role: 'STUDY_RESEARCHER' })

    const dispatchWith = (sourcesData: unknown, rolesData: unknown) =>
      vi.fn().mockImplementation(async (_action: string, { url }: { url: string }) => {
        if (url === '/d2e-webapi/source/sources') return { data: sourcesData }
        if (url === '/usermgmt/api/me/roles') return { data: rolesData }
        throw new Error(`Unexpected URL ${url}`)
      })

    it('commits the fetched list', async () => {
      const commit = vi.fn()
      const dispatch = dispatchWith(sources, { datasetRoles: [researcher('aaa-111'), researcher('bbb-222')] })

      await configModule.actions.fireGetDataSources({ commit, dispatch } as never)

      expect(dispatch).toHaveBeenCalledWith('ajaxAuth', {
        method: 'get',
        url: '/d2e-webapi/source/sources',
      })
      expect(dispatch).toHaveBeenCalledWith('ajaxAuth', {
        method: 'get',
        url: '/usermgmt/api/me/roles',
      })
      expect(commit).toHaveBeenCalledWith(types.SET_DATA_SOURCES, sources)
    })

    it('keeps only the sources the user has researcher access to', async () => {
      const commit = vi.fn()
      const dispatch = dispatchWith(sources, {
        datasetRoles: [researcher('bbb-222'), { datasetId: 'aaa-111', role: 'SOMETHING_ELSE' }],
      })

      await configModule.actions.fireGetDataSources({ commit, dispatch } as never)

      expect(commit).toHaveBeenCalledWith(types.SET_DATA_SOURCES, [sources[1]])
    })

    it('commits an empty list when the user has no dataset roles', async () => {
      const commit = vi.fn()
      const dispatch = dispatchWith(sources, { datasetRoles: [] })

      await configModule.actions.fireGetDataSources({ commit, dispatch } as never)

      expect(commit).toHaveBeenCalledWith(types.SET_DATA_SOURCES, [])
    })

    it('commits an empty list when the roles response is malformed', async () => {
      const commit = vi.fn()
      const dispatch = dispatchWith(sources, { roles: [] })

      await configModule.actions.fireGetDataSources({ commit, dispatch } as never)

      expect(commit).toHaveBeenCalledWith(types.SET_DATA_SOURCES, [])
    })

    it('commits an empty list when the response is not an array', async () => {
      const commit = vi.fn()
      const dispatch = dispatchWith({ error: 'nope' }, { datasetRoles: [researcher('aaa-111')] })

      await configModule.actions.fireGetDataSources({ commit, dispatch } as never)

      expect(commit).toHaveBeenCalledWith(types.SET_DATA_SOURCES, [])
    })

    it('swallows a failure and commits nothing', async () => {
      // The name is decoration and the getter falls back to the id, so a
      // failure here must not reach the user or break the page.
      const commit = vi.fn()
      const dispatch = vi.fn().mockRejectedValue(new Error('401'))

      await expect(configModule.actions.fireGetDataSources({ commit, dispatch } as never)).resolves.toBeUndefined()

      expect(commit).not.toHaveBeenCalled()
    })

    it('commits nothing when only the roles request fails', async () => {
      const commit = vi.fn()
      const dispatch = vi.fn().mockImplementation(async (_action: string, { url }: { url: string }) => {
        if (url === '/d2e-webapi/source/sources') return { data: sources }
        throw new Error('403')
      })

      await expect(configModule.actions.fireGetDataSources({ commit, dispatch } as never)).resolves.toBeUndefined()

      expect(commit).not.toHaveBeenCalled()
    })
  })
})
