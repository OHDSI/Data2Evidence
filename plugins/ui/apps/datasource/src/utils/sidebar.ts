export interface MountPoint {
  id: string
  surface: string
  name: string
  icon?: string
  group?: string
  order?: number
  insertBefore?: string
  insertAfter?: string
  visible?: boolean
  requiredPermissions?: string[]
}

export interface PluginConfig {
  plugins: Array<{ id: string; mountPoints?: MountPoint[] }>
}

export interface SidebarItem {
  id: string
  label: string
  icon: string
}

export interface SidebarGroup {
  label: string
  items: SidebarItem[]
}

export const SIDEBAR_SURFACE = 'datasource-sidebar'

export const CORE_SIDEBAR: SidebarGroup[] = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'mdi-view-dashboard-outline' },
      { id: 'datadensity', label: 'Data Density', icon: 'mdi-chart-bell-curve-cumulative' },
    ],
  },
  {
    label: 'Demographics',
    items: [
      { id: 'person', label: 'Person', icon: 'mdi-account-outline' },
      { id: 'observationPeriod', label: 'Observation Period', icon: 'mdi-calendar-range-outline' },
      { id: 'death', label: 'Death', icon: 'mdi-grave-stone' },
    ],
  },
  {
    label: 'Clinical Domains',
    items: [
      { id: 'visit', label: 'Visit', icon: 'mdi-hospital-building' },
      { id: 'conditionOccurrence', label: 'Condition Occurrence', icon: 'mdi-stethoscope' },
      { id: 'conditionEra', label: 'Condition Era', icon: 'mdi-clock-outline' },
      { id: 'procedure', label: 'Procedure', icon: 'mdi-medical-bag' },
      { id: 'drugExposure', label: 'Drug Exposure', icon: 'mdi-pill' },
      { id: 'drugEra', label: 'Drug Era', icon: 'mdi-pill-multiple' },
      { id: 'measurement', label: 'Measurement', icon: 'mdi-test-tube' },
      { id: 'observation', label: 'Observation', icon: 'mdi-eye-outline' },
    ],
  },
]

export function mountKey(pluginId: string, itemId: string): string {
  return `plugin:${pluginId}:${itemId}`
}

interface ResolvedMount extends MountPoint {
  key: string
  order: number
}

function resolveMounts(config: PluginConfig, hasPermission: (p: string) => boolean): ResolvedMount[] {
  const byKey = new Map<string, ResolvedMount>()
  for (const plugin of config.plugins ?? []) {
    for (const point of plugin.mountPoints ?? []) {
      if (point.surface !== SIDEBAR_SURFACE || point.visible === false) continue
      if (point.requiredPermissions?.length && !point.requiredPermissions.some(hasPermission)) continue
      const key = mountKey(plugin.id, point.id)
      byKey.set(key, { ...point, key, order: point.order ?? 999 })
    }
  }
  return [...byKey.values()].sort((a, b) => a.order - b.order)
}

function interleave(core: SidebarItem[], mounts: ResolvedMount[]): SidebarItem[] {
  const ids = new Set(core.map(c => c.id))
  const before = new Map<string, ResolvedMount[]>()
  const after = new Map<string, ResolvedMount[]>()
  const rest: ResolvedMount[] = []
  for (const m of mounts) {
    if (m.insertBefore && ids.has(m.insertBefore)) before.set(m.insertBefore, [...(before.get(m.insertBefore) ?? []), m])
    else if (m.insertAfter && ids.has(m.insertAfter)) after.set(m.insertAfter, [...(after.get(m.insertAfter) ?? []), m])
    else rest.push(m)
  }
  const toItem = (m: ResolvedMount): SidebarItem => ({ id: m.key, label: m.name, icon: m.icon ?? 'mdi-puzzle-outline' })
  const out: SidebarItem[] = []
  for (const c of core) {
    out.push(...(before.get(c.id) ?? []).map(toItem), c, ...(after.get(c.id) ?? []).map(toItem))
  }
  return [...out, ...rest.map(toItem)]
}

export function buildSidebar(
  config: PluginConfig | null,
  hasPermission: (p: string) => boolean = () => false,
): SidebarGroup[] {
  const groups = CORE_SIDEBAR.map(g => ({ ...g, items: [...g.items] }))
  if (!config) return groups
  const byGroup = new Map<string, ResolvedMount[]>()
  for (const m of resolveMounts(config, hasPermission)) {
    const label = m.group ?? 'Plugins'
    byGroup.set(label, [...(byGroup.get(label) ?? []), m])
  }
  for (const [label, mounts] of byGroup) {
    const target = groups.find(g => g.label.toLowerCase() === label.toLowerCase())
    if (target) target.items = interleave(target.items, mounts)
    else groups.push({ label, items: interleave([], mounts) })
  }
  return groups
}
