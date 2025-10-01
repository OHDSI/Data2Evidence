import { NavigationConfig, NavigationItem } from '@/types/navigation'

const MAIN_NAV_ITEM: NavigationItem = {
  id: 'cohorts',
  title: 'Cohorts',
  route: '/cohorts',
  visible: true,
  active: true,
}

let cachedNavigationItems: NavigationItem[] | null = null

export const getNavigationItems = (): NavigationItem[] => {
  if (cachedNavigationItems !== null) {
    return cachedNavigationItems
  }

  try {
    const envItems: NavigationItem[] = process.env.VUE_APP_NAVIGATION_ITEMS
      ? JSON.parse(process.env.VUE_APP_NAVIGATION_ITEMS)
      : []

    const items: NavigationItem[] = [...envItems, MAIN_NAV_ITEM]

    const validItems: NavigationItem[] = items
      .filter(item => {
        if (!item.id || !item.title || !item.route) {
          console.warn('Invalid navigation item (missing id/title/route):', item)
          return false
        }
        if (!item.visible || typeof item.visible !== 'boolean') {
          item.visible = true
        }
        return true
      })
      .map(item => ({
        ...item,
        type: item.appName && item.importUrl ? 'app' : 'component',
      }))

    cachedNavigationItems = validItems
    return cachedNavigationItems
  } catch (error) {
    console.warn('Failed to parse VUE_APP_NAVIGATION_ITEMS, using defaults:', error)
    cachedNavigationItems = [MAIN_NAV_ITEM]
    return cachedNavigationItems
  }
}

export const getNavigationConfig = (): NavigationConfig => {
  const navigationItems = getNavigationItems()
  const apps = navigationItems.filter(item => item.type === 'app' && item.importUrl && item.route)
  const components = navigationItems.filter(item => item.type === 'component' && item.component && item.route)

  return {
    apps,
    components,
  }
}
