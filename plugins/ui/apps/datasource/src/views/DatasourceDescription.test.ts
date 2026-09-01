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
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(systemPortal, 'getResources').mockResolvedValue([])
  })

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

  it('renders a Metadata table with a Dataset ID row, even with no attributes', async () => {
    vi.spyOn(userMgmt, 'getUserGroupList').mockResolvedValue({ userId: 'u-1', alp_role_study_researcher: [] })
    vi.spyOn(userMgmt, 'getMyStudyAccessRequests').mockResolvedValue([])

    const wrapper = mountWith()
    await flushPromises()

    expect(wrapper.findAll('h2').find(h => h.text() === 'Metadata')).toBeTruthy()
    expect(wrapper.text()).toContain('Dataset ID')
    expect(wrapper.text()).toContain('ds-1')
  })

  it('lists dataset attributes with their configured name and a formatted (comma-grouped) value', async () => {
    vi.spyOn(jwt, 'getIdpUserId').mockReturnValue('idp-1')
    vi.spyOn(systemPortal, 'getDataset').mockResolvedValue({
      id: 'ds-1',
      studyDetail: { name: 'Demo Dataset', description: 'x', showRequestAccess: true },
      attributes: [
        { id: 1, attributeId: 'patient_count', value: '1223234', studyId: 'ds-1', attributeConfig: { name: 'Patient count', dataType: 'number', isDisplayed: 'true' } },
        { id: 2, attributeId: 'version', value: 'omop5-2', studyId: 'ds-1', attributeConfig: { name: 'Version', dataType: 'string', isDisplayed: 'true' } },
      ],
    })
    vi.spyOn(userMgmt, 'getUserGroupList').mockResolvedValue({ userId: 'u-1', alp_role_study_researcher: [] })
    vi.spyOn(userMgmt, 'getMyStudyAccessRequests').mockResolvedValue([])

    const wrapper = mount(DatasourceDescription, {
      props: { sourceKey: 'ds-1', token: 'tok' },
      global: { plugins: [vuetify] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Patient count')
    expect(wrapper.text()).toContain('1,223,234')
    expect(wrapper.text()).toContain('Version')
    expect(wrapper.text()).toContain('omop5-2')
  })

  it('renders no Files section when the dataset has no files', async () => {
    vi.spyOn(userMgmt, 'getUserGroupList').mockResolvedValue({ userId: 'u-1', alp_role_study_researcher: [] })
    vi.spyOn(userMgmt, 'getMyStudyAccessRequests').mockResolvedValue([])

    const wrapper = mountWith()
    await flushPromises()

    expect(wrapper.findAll('h2').find(h => h.text() === 'Files')).toBeFalsy()
  })

  it('lists Files with filename and size, and downloads a file on click', async () => {
    vi.spyOn(userMgmt, 'getUserGroupList').mockResolvedValue({ userId: 'u-1', alp_role_study_researcher: [] })
    vi.spyOn(userMgmt, 'getMyStudyAccessRequests').mockResolvedValue([])
    vi.spyOn(systemPortal, 'getResources').mockResolvedValue([
      { name: 'cohort.csv', size: '12 KB', type: 'text/csv' },
    ])
    const downloadSpy = vi.spyOn(systemPortal, 'downloadResource').mockResolvedValue({ data: btoa('id,name'), contentType: 'text/csv' })
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn().mockReturnValue('blob:mock') })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const wrapper = mountWith()
    await flushPromises()

    expect(wrapper.findAll('h2').find(h => h.text() === 'Files')).toBeTruthy()
    expect(wrapper.text()).toContain('cohort.csv')
    expect(wrapper.text()).toContain('12 KB')

    const downloadButton = wrapper.find('[data-testid="resource-download-cohort.csv"]')
    expect(downloadButton.exists()).toBe(true)
    await downloadButton.trigger('click')
    await flushPromises()

    expect(downloadSpy).toHaveBeenCalledWith('ds-1', 'cohort.csv', 'tok')
    expect(clickSpy).toHaveBeenCalled()

    clickSpy.mockRestore()
    vi.unstubAllGlobals()
  })
})
