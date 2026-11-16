import { describe, it, expect } from 'vitest'
import { parseAtlasReportType, parsePluginSourceKey, pluginSourceHash, sourceTargetHash } from './routes'

describe('routes', () => {
  it('builds the plugin source page hash', () => {
    expect(pluginSourceHash('a b')).toBe('#/plugins/datasources/a%20b')
  })

  it('keeps the open Atlas3 report only for an accessible source', () => {
    expect(sourceTargetHash('abc', 'approved', '#/datasources/old/person')).toBe('#/datasources/abc/person')
    expect(sourceTargetHash('abc', 'approved', '#/datasources/old/plugin:datasources:description')).toBe('#/plugins/datasources/abc')
    expect(sourceTargetHash('abc', 'approved', '#/plugins/datasources/old')).toBe('#/plugins/datasources/abc')
    expect(sourceTargetHash('abc', 'no-access', '#/datasources/old/person')).toBe('#/plugins/datasources/abc')
    expect(sourceTargetHash('abc', 'pending', '#/datasources/old/dashboard')).toBe('#/plugins/datasources/abc')
  })

  it('parses the plugin source key only from a source route', () => {
    expect(parsePluginSourceKey('#/plugins/datasources/a%20b')).toBe('a b')
    expect(parsePluginSourceKey('#/plugins/datasources/')).toBeNull()
    expect(parsePluginSourceKey('#/datasources/abc/dashboard')).toBeNull()
  })

  it('parses the Atlas3 report type', () => {
    expect(parseAtlasReportType('#/datasources/abc/person')).toBe('person')
    expect(parseAtlasReportType('#/datasources/abc')).toBeNull()
  })
})
