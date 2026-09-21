import { describe, it, expect } from 'vitest'
import {
  resolveAtlasPluginBaseUrl,
  resolveAtlasPluginEntryUrl,
  resolveAtlasPluginStyleUrl,
} from '../atlasPluginUrl'

const SHELL = 'https://host.example/atlas/'

describe('resolveAtlasPluginBaseUrl', () => {
  it('resolves a sibling from the relative uiFilesUrl Atlas sends', () => {
    expect(resolveAtlasPluginBaseUrl('data-quality', './plugins/patient-analytics/', SHELL)).toBe(
      'https://host.example/atlas/plugins/data-quality/'
    )
  })

  it('resolves a sibling from a root-absolute uiFilesUrl', () => {
    expect(resolveAtlasPluginBaseUrl('data-quality', '/atlas/plugins/patient-analytics/', SHELL)).toBe(
      'https://host.example/atlas/plugins/data-quality/'
    )
  })

  it('tolerates a uiFilesUrl with no trailing slash', () => {
    expect(resolveAtlasPluginBaseUrl('data-quality', './plugins/patient-analytics', SHELL)).toBe(
      'https://host.example/atlas/plugins/data-quality/'
    )
  })

  it('resolves against the hash-routed shell URL, which is what document.baseURI gives', () => {
    expect(
      resolveAtlasPluginBaseUrl(
        'data-quality',
        './plugins/patient-analytics/',
        'https://host.example/atlas/#/plugins/patient-analytics/'
      )
    ).toBe('https://host.example/atlas/plugins/data-quality/')
  })

  it('handles the deployed id variant, so a renamed host plugin still finds its sibling', () => {
    expect(resolveAtlasPluginBaseUrl('data-quality', './plugins/patient-analytics-native/', SHELL)).toBe(
      'https://host.example/atlas/plugins/data-quality/'
    )
  })

  it('falls back to /atlas/plugins/<id>/ when the host sent no uiFilesUrl', () => {
    expect(resolveAtlasPluginBaseUrl('data-quality', undefined, SHELL)).toBe(
      'https://host.example/atlas/plugins/data-quality/'
    )
    expect(resolveAtlasPluginBaseUrl('data-quality', '   ', SHELL)).toBe(
      'https://host.example/atlas/plugins/data-quality/'
    )
  })

  it('falls back rather than throwing on a malformed uiFilesUrl', () => {
    expect(resolveAtlasPluginBaseUrl('data-quality', 'http://[::bad::', SHELL)).toBe(
      'https://host.example/atlas/plugins/data-quality/'
    )
  })

  it('always ends in a slash, so a filename can be appended directly', () => {
    for (const ui of [undefined, './plugins/patient-analytics/', '/atlas/plugins/patient-analytics']) {
      expect(resolveAtlasPluginBaseUrl('data-quality', ui, SHELL).endsWith('/')).toBe(true)
    }
  })
})

describe('entry and style URLs', () => {
  it('appends the SystemJS entry Atlas serves', () => {
    expect(resolveAtlasPluginEntryUrl('data-quality', './plugins/patient-analytics/', SHELL)).toBe(
      'https://host.example/atlas/plugins/data-quality/index.system.js'
    )
  })

  it('appends the stylesheet Atlas injects beside it', () => {
    expect(resolveAtlasPluginStyleUrl('data-quality', './plugins/patient-analytics/', SHELL)).toBe(
      'https://host.example/atlas/plugins/data-quality/style.css'
    )
  })
})
