export interface NavigationItem {
  id: string
  title: string
  route?: string
  component?: string
  appName?: string
  importUrl?: string
  visible?: boolean
  active?: boolean
  type?: 'app' | 'component'
}

export interface InternalNavigationEvent {
  item: NavigationItem
  route: string
}

export interface NavigationConfig {
  apps: NavigationItem[]
  components: NavigationItem[]
}
