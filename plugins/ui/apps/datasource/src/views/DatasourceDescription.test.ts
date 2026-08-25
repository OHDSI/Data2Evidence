import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { buildVuetifyOptions } from '@ohdsi/atlas-ui'
import DatasourceDescription from './DatasourceDescription.vue'
import * as systemPortal from '../api/systemPortal'
import * as userMgmt from '../api/userMgmt'
import * as jwt from '../utils/jwt'

const vuetify = createVuetify(buildVuetifyOptions())

// jsdom (like real browsers) re-serializes inline hex colors as rgb() when
// read back via getAttribute('style'), so assertions compare against this
// instead of the literal hex string.
function hexToRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

function mountWith(overrides: { showRequestAccess?: boolean } = {}) {
  vi.spyOn(jwt, 'getIdpUserId').mockReturnValue('idp-1')
  vi.spyOn(systemPortal, 'getDataset').mockResolvedValue({
    id: 'ds-1',
    studyDetail: {
      name: 'Demo Dataset',
      description: 'This dataset contains **synthetic** data.',
      showRequestAccess: overrides.showRequestAccess ?? true,
    },
  })
  return mount(DatasourceDescription, {
    props: { sourceKey: 'ds-1', token: 'tok' },
    global: { plugins: [vuetify] },
  })
}

describe('DatasourceDescription', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('shows no access badge and no Request Access button when approved (matches Figma: With access has no chip)', async () => {
    vi.spyOn(userMgmt, 'getUserGroupList').mockResolvedValue({ userId: 'u-1', alp_role_study_researcher: ['ds-1'] })
    vi.spyOn(userMgmt, 'getMyStudyAccessRequests').mockResolvedValue([])

    const wrapper = mountWith()
    await flushPromises()

    expect(wrapper.text()).toContain('Demo Dataset')
    expect(wrapper.find('[data-testid="access-badge"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="request-access-button"]').exists()).toBe(false)
    expect(wrapper.html()).toContain('<strong>synthetic</strong>')
  })

  it('shows Pending access with the exact bespoke amber-on-cream colors and no button', async () => {
    vi.spyOn(userMgmt, 'getUserGroupList').mockResolvedValue({ userId: 'u-1', alp_role_study_researcher: [] })
    vi.spyOn(userMgmt, 'getMyStudyAccessRequests').mockResolvedValue([
      { id: 'r1', userId: 'u-1', studyId: 'ds-1', role: 'RESEARCHER' },
    ])

    const wrapper = mountWith()
    await flushPromises()

    expect(wrapper.text()).toContain('Pending access')
    expect(wrapper.find('[data-testid="request-access-button"]').exists()).toBe(false)

    const chip = wrapper.find('[data-testid="access-badge"]')
    const style = chip.attributes('style') ?? ''
    expect(style).toContain(hexToRgb('#FFF8E2'))
    expect(style).toContain(hexToRgb('#CD6000'))
    expect(chip.find('.mdi-clock-outline').exists()).toBe(true)
  })

  it('shows No access with the exact bespoke red-on-pink colors and a working Request Access button', async () => {
    vi.spyOn(userMgmt, 'getUserGroupList').mockResolvedValue({ userId: 'u-1', alp_role_study_researcher: [] })
    vi.spyOn(userMgmt, 'getMyStudyAccessRequests')
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'r1', userId: 'u-1', studyId: 'ds-1', role: 'RESEARCHER' }])
    const addSpy = vi.spyOn(userMgmt, 'addStudyAccessRequest').mockResolvedValue(undefined)

    const wrapper = mountWith({ showRequestAccess: true })
    await flushPromises()

    expect(wrapper.text()).toContain('No access')
    const chip = wrapper.find('[data-testid="access-badge"]')
    const style = chip.attributes('style') ?? ''
    expect(style).toContain(hexToRgb('#FDEDED'))
    expect(style).toContain(hexToRgb('#D53939'))
    expect(chip.find('.mdi-lock-outline').exists()).toBe(true)

    const button = wrapper.find('[data-testid="request-access-button"]')
    expect(button.exists()).toBe(true)

    await button.trigger('click')
    await flushPromises()

    expect(addSpy).toHaveBeenCalledWith('u-1', 'ds-1', 'RESEARCHER', 'tok')
    expect(wrapper.text()).toContain('Pending access')
  })

  it('shows a Restricted chip with the same red-on-pink colors as No access (octagon-alert icon) and a separate info tooltip icon', async () => {
    vi.spyOn(userMgmt, 'getUserGroupList').mockResolvedValue({ userId: 'u-1', alp_role_study_researcher: [] })
    vi.spyOn(userMgmt, 'getMyStudyAccessRequests').mockResolvedValue([])

    const wrapper = mountWith({ showRequestAccess: false })
    await flushPromises()

    expect(wrapper.text()).toContain('Restricted')
    expect(wrapper.find('[data-testid="request-access-button"]').exists()).toBe(false)

    const chip = wrapper.find('[data-testid="access-badge"]')
    const style = chip.attributes('style') ?? ''
    expect(style).toContain(hexToRgb('#FDEDED'))
    expect(style).toContain(hexToRgb('#D53939'))
    expect(chip.find('.mdi-alert-octagon-outline').exists()).toBe(true)

    // Separate info icon (with its own tooltip), not merged into the chip.
    expect(wrapper.find('[data-testid="restricted-info-icon"]').exists()).toBe(true)
  })

  it('renders a Description section heading above the markdown body', async () => {
    vi.spyOn(userMgmt, 'getUserGroupList').mockResolvedValue({ userId: 'u-1', alp_role_study_researcher: [] })
    vi.spyOn(userMgmt, 'getMyStudyAccessRequests').mockResolvedValue([])

    const wrapper = mountWith()
    await flushPromises()

    const heading = wrapper.findAll('h2').find(h => h.text() === 'Description')
    expect(heading).toBeTruthy()
  })

  it('renders the title and Description heading with the exact Figma typography spec', async () => {
    vi.spyOn(userMgmt, 'getUserGroupList').mockResolvedValue({ userId: 'u-1', alp_role_study_researcher: [] })
    vi.spyOn(userMgmt, 'getMyStudyAccessRequests').mockResolvedValue([])

    const wrapper = mountWith()
    await flushPromises()

    const title = wrapper.find('h1')
    const heading = wrapper.findAll('h2').find(h => h.text() === 'Description')!
    for (const el of [title, heading]) {
      const style = el.attributes('style') ?? ''
      expect(style).toContain(hexToRgb('#000080'))
      expect(style).toContain('18px')
      expect(style).toContain('IBM Plex Sans')
    }
  })
})
