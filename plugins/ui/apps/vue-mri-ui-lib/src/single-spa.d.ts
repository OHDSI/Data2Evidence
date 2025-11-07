declare global {
  interface Window {
    System: System
    importMapOverrides?: {
      getOverrideMap: () => { imports: Record<string, string>; scopes: Record<string, any> }
    }
  }

  const process: {
    env: {
      VUE_APP_NAVIGATION_ITEMS?: string
      [key: string]: string | undefined
    }
  }
}

export {}
