declare global {
  interface Window {
    System: System
  }

  const process: {
    env: {
      VUE_APP_NAVIGATION_ITEMS?: string
      [key: string]: string | undefined
    }
  }
}

export {}

