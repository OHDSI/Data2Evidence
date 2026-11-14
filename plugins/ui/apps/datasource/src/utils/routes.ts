import type { AccessState } from '../composables/useDataSourceAccess'

export const DESCRIPTION_REPORT = 'plugin:datasources:description'

export function atlasSourceHash(sourceKey: string, reportType: string = DESCRIPTION_REPORT): string {
  return `#/datasources/${encodeURIComponent(sourceKey)}/${reportType}`
}

export function pluginSourceHash(sourceKey: string): string {
  return `#/plugins/datasources/${encodeURIComponent(sourceKey)}`
}

export function sourceTargetHash(sourceKey: string, access: AccessState, currentHash: string): string {
  const report = parseAtlasReportType(currentHash)
  return access === 'approved' && report && report !== DESCRIPTION_REPORT
    ? atlasSourceHash(sourceKey, report)
    : pluginSourceHash(sourceKey)
}

export function parsePluginSourceKey(hash: string): string | null {
  const m = hash.match(/^#\/plugins\/datasources\/([^/?#]+)/)
  return m ? decodeURIComponent(m[1]) : null
}

export function parseAtlasReportType(hash: string): string | null {
  const m = hash.match(/^#\/datasources\/[^/?#]+\/([^/?#]+)/)
  return m ? m[1] : null
}
