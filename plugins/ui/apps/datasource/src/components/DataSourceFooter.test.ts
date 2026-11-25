import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DataSourceFooter from './DataSourceFooter.vue'

describe('DataSourceFooter', () => {
  it('shows the D2E release version from the root package.json', () => {
    const w = mount(DataSourceFooter)
    expect(w.get('[data-testid="footer-version"]').text()).toBe(`Data2Evidence ${__D2E_VERSION__}`)
  })

  it('renders Documentation/Slack/Github links to the correct URLs, opening in a new tab', () => {
    const w = mount(DataSourceFooter)
    const cases: Array<[string, string]> = [
      ['documentation', 'https://data2evidence.org/docs/getting_started/'],
      ['slack', 'https://data2evidence.slack.com/ssb/redirect'],
      ['github', 'https://github.com/OHDSI/Data2Evidence'],
    ]
    for (const [key, url] of cases) {
      const a = w.get(`[data-testid="footer-link-${key}"]`)
      expect(a.attributes('href')).toBe(url)
      expect(a.attributes('target')).toBe('_blank')
      expect(a.attributes('rel')).toContain('noopener')
    }
  })
})
