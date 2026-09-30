import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DataSourceCard from './DataSourceCard.vue'
import type { DatasourceCardVM } from '../composables/useDatasourceCatalog'

const vm: DatasourceCardVM = {
  id: 'a',
  name: 'EHR Primary Care Network',
  description: 'desc',
  subjectCount: '1,223,234',
  publishedDate: 'Jun 18, 2026',
  sourceType: 'OMOP',
  version: 'omop5-2',
  isPublic: true,
  access: 'approved',
}

const mountCard = (over: Partial<DatasourceCardVM> = {}) =>
  mount(DataSourceCard, { props: { source: { ...vm, ...over } } })

describe('DataSourceCard', () => {
  it('renders name, footer fields, public chip and access label', () => {
    const w = mountCard()
    expect(w.text()).toContain('EHR Primary Care Network')
    expect(w.text()).toContain('1,223,234')
    expect(w.text()).toContain('omop5-2')
    expect(w.find('[data-testid="ds-public"]').exists()).toBe(true)
    expect(w.get('[data-testid="ds-access"]').text()).toBe('Have access')
  })
  it('hides the public chip for non-public sources', () => {
    expect(mountCard({ isPublic: false }).find('[data-testid="ds-public"]').exists()).toBe(false)
  })
  it('shows Pending access', () => {
    expect(mountCard({ access: 'pending' }).get('[data-testid="ds-access"]').text()).toBe('Pending access')
  })
  it('renders restricted as No access', () => {
    expect(mountCard({ access: 'restricted', isPublic: false }).get('[data-testid="ds-access"]').text()).toBe('No access')
  })
  it('emits select with the id on click', async () => {
    const w = mountCard()
    await w.get('[data-testid="ds-card"]').trigger('click')
    expect(w.emitted('select')?.[0]).toEqual(['a'])
  })
})
