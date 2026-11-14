import { describe, it, expect } from 'vitest'
import { buildSidebar, CORE_SIDEBAR, type PluginConfig } from './sidebar'

const D2E_CONFIG: PluginConfig = {
  plugins: [
    { id: 'wizards', mountPoints: [{ id: 'wizards', surface: 'analysis-tabs', name: 'Wizard' }] },
    {
      id: 'data-quality',
      mountPoints: [
        { id: 'checks', surface: 'datasource-sidebar', name: 'Data quality checks', icon: 'mdi-list-box-outline', group: 'Data quality', order: 20 },
        { id: 'dashboard', surface: 'datasource-sidebar', name: 'Data quality dashboard', icon: 'mdi-license', group: 'Data quality', order: 10 },
      ],
    },
    {
      id: 'datasources',
      mountPoints: [
        { id: 'description', surface: 'datasource-sidebar', name: 'Description', icon: 'mdi-file-document-outline', group: 'Overview', order: 5, insertBefore: 'dashboard' },
      ],
    },
  ],
}

const ids = (groups: ReturnType<typeof buildSidebar>) => groups.map(g => [g.label, g.items.map(i => i.id)])

describe('buildSidebar', () => {
  it('returns the core reports when there is no config', () => {
    expect(buildSidebar(null)).toEqual(CORE_SIDEBAR)
  })

  it('places plugin mounts the way Atlas3 does', () => {
    expect(ids(buildSidebar(D2E_CONFIG))).toEqual([
      ['Overview', ['plugin:datasources:description', 'dashboard', 'datadensity']],
      ['Demographics', ['person', 'observationPeriod', 'death']],
      ['Clinical Domains', CORE_SIDEBAR[2].items.map(i => i.id)],
      ['Data quality', ['plugin:data-quality:dashboard', 'plugin:data-quality:checks']],
    ])
  })

  it('matches groups case-insensitively, appends unanchored items, and defaults the group to Plugins', () => {
    const groups = buildSidebar({
      plugins: [
        {
          id: 'p',
          mountPoints: [
            { id: 'a', surface: 'datasource-sidebar', name: 'A', group: 'demographics' },
            { id: 'b', surface: 'datasource-sidebar', name: 'B', group: 'Demographics', insertAfter: 'person' },
            { id: 'c', surface: 'datasource-sidebar', name: 'C' },
          ],
        },
      ],
    })
    expect(ids(groups)[1]).toEqual(['Demographics', ['person', 'plugin:p:b', 'observationPeriod', 'death', 'plugin:p:a']])
    expect(ids(groups)[3]).toEqual(['Plugins', ['plugin:p:c']])
  })

  it('drops hidden items and items whose permissions the user lacks', () => {
    const config: PluginConfig = {
      plugins: [
        {
          id: 'p',
          mountPoints: [
            { id: 'hidden', surface: 'datasource-sidebar', name: 'H', visible: false },
            { id: 'admin', surface: 'datasource-sidebar', name: 'Admin', requiredPermissions: ['admin:read'] },
          ],
        },
      ],
    }
    expect(buildSidebar(config)).toHaveLength(3)
    expect(ids(buildSidebar(config, p => p === 'admin:read'))[3]).toEqual(['Plugins', ['plugin:p:admin']])
  })
})
