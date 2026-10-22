import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useExplorationsStore } from '../explorations'
import { emptyFilters } from '../../components/helpers/explorationFilters'
import { PAGE_SIZES } from '../../components/helpers/explorationPaging'

describe('stores/explorations', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('toggle adds and removes a single id, building a new array', () => {
    const store = useExplorationsStore()

    store.toggle('bookmark:1', true)
    expect(store.selectedBookmarkIds).toEqual(['bookmark:1'])

    store.toggle('bookmark:1', false)
    expect(store.selectedBookmarkIds).toEqual([])
  })

  it('clear empties the selection', () => {
    const store = useExplorationsStore()
    store.toggle('bookmark:1', true)

    store.clear()

    expect(store.selectedBookmarkIds).toEqual([])
  })

  it('setPageSelection adds every page id', () => {
    const store = useExplorationsStore()

    store.setPageSelection(['a', 'b'], true)

    expect(store.selectedBookmarkIds).toEqual(expect.arrayContaining(['a', 'b']))
    expect(store.selectedBookmarkIds).toHaveLength(2)
  })

  it('setPageSelection clears only the page ids, keeping a selection from another page', () => {
    const store = useExplorationsStore()
    store.toggle('x', true)
    store.setPageSelection(['a', 'b'], true)

    store.setPageSelection(['a', 'b'], false)

    expect(store.selectedBookmarkIds).toEqual(['x'])
  })

  it('retain drops ids outside the matched set', () => {
    const store = useExplorationsStore()
    store.setPageSelection(['a', 'b', 'c'], true)

    store.retain(['a', 'c'])

    expect(store.selectedBookmarkIds).toEqual(expect.arrayContaining(['a', 'c']))
    expect(store.selectedBookmarkIds).toHaveLength(2)
  })

  it('selectedCount follows the array length', () => {
    const store = useExplorationsStore()
    expect(store.selectedCount).toBe(0)

    store.setPageSelection(['a', 'b'], true)

    expect(store.selectedCount).toBe(2)
  })

  it('hasSelection follows the array', () => {
    const store = useExplorationsStore()
    expect(store.hasSelection).toBe(false)

    store.toggle('a', true)

    expect(store.hasSelection).toBe(true)
  })

  it('starts the list view at its defaults', () => {
    const store = useExplorationsStore()

    expect(store.listView).toEqual({
      searchQuery: '',
      sortKey: 'lastUpdated',
      filters: emptyFilters(),
      page: 1,
      pageSize: PAGE_SIZES[0],
    })
  })

  it('saveListView keeps a copy that later edits do not change', () => {
    const store = useExplorationsStore()
    const filters = emptyFilters()
    filters.authors = ['admin']

    store.saveListView({ searchQuery: 'snri', sortKey: 'nameAsc', filters, page: 2, pageSize: 24 })
    filters.authors.push('other')

    expect(store.listView.searchQuery).toBe('snri')
    expect(store.listView.sortKey).toBe('nameAsc')
    expect(store.listView.filters.authors).toEqual(['admin'])
    expect(store.listView.page).toBe(2)
    expect(store.listView.pageSize).toBe(24)
  })
})
