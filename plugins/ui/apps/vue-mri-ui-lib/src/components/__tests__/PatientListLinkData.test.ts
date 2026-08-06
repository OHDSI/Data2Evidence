import { shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PatientListLinkData from '../PatientListLinkData.vue'

const PATH = 'imageoccurrence.attributes.action'
const meta = (link?: { label: string }) => ({ path: PATH, link })

describe('PatientListLinkData.vue', () => {
  it('renders a new-tab anchor for a valid URL', () => {
    const url = 'https://viewer.local:8042/ohif/viewer?StudyInstanceUIDs=1.2.3'
    const wrapper = shallowMount(PatientListLinkData as any, {
      props: { item: { [PATH]: url }, meta: meta() },
    })
    const anchor = wrapper.find('a')
    expect(anchor.exists()).toBe(true)
    expect(anchor.attributes('href')).toBe(url)
    expect(anchor.attributes('target')).toBe('_blank')
    expect(anchor.attributes('rel')).toBe('noopener noreferrer')
  })

  it('defaults the link label to a generic "Open" when config has none', () => {
    const wrapper = shallowMount(PatientListLinkData as any, {
      props: { item: { [PATH]: 'https://example.com' }, meta: meta() },
    })
    expect(wrapper.find('a').text()).toContain('Open')
  })

  it('uses the config-driven label when present', () => {
    const wrapper = shallowMount(PatientListLinkData as any, {
      props: { item: { [PATH]: 'https://example.com' }, meta: meta({ label: 'Open image' }) },
    })
    expect(wrapper.find('a').text()).toContain('Open image')
  })

  it('renders empty (no anchor) when the value is missing', () => {
    const wrapper = shallowMount(PatientListLinkData as any, { props: { item: {}, meta: meta() } })
    expect(wrapper.find('a').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('renders the raw value as text (no anchor) for a non-URL / unsafe value', () => {
    const wrapper = shallowMount(PatientListLinkData as any, {
      props: { item: { [PATH]: 'javascript:alert(1)' }, meta: meta() },
    })
    expect(wrapper.find('a').exists()).toBe(false)
    expect(wrapper.text()).toContain('javascript:alert(1)')
  })
})
