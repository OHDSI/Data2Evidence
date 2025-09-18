import { registerApplication, start, navigateToUrl } from 'single-spa'
import { getNavigationConfig } from './config'

// Setup all import maps
function setupImportMaps() {
  try {
    const { apps } = getNavigationConfig()

    const existingImportMap = document.querySelector('script[type="systemjs-importmap"]')
    const importMapData = existingImportMap
      ? JSON.parse(existingImportMap.textContent || '{"imports":{}}')
      : { imports: {} }

    apps.forEach((item: any) => {
      if (item.appName && item.importUrl) {
        console.log(`Adding ${item.appName} to import map`)
        importMapData.imports[item.appName] = item.importUrl
      }
    })

    if (existingImportMap) {
      existingImportMap.remove()
    }

    const newScript = document.createElement('script')
    newScript.type = 'systemjs-importmap'
    newScript.textContent = JSON.stringify(importMapData, null, 2)
    document.head.appendChild(newScript)
  } catch (error) {
    console.warn('Failed to setup import maps:', error)
  }
}

// Function to register single-spa applications from navigation config
function registerNavigationApps() {
  try {
    const { apps } = getNavigationConfig()

    apps.forEach((item: any) => {
      if (item.appName && item.importUrl && item.route) {
        console.log(`Registering single-spa app: ${item.appName} at ${item.route}`)

        registerApplication({
          name: item.appName,
          app: () => window.System.import(item.appName).then((module: any) => module.default || module),
          activeWhen: location => location.pathname === item.route,
        })
      }
    })
  } catch (error) {
    console.warn('Failed to register navigation apps:', error)
  }
}

function navigateToRoute(route: string, navigationItem?: any) {
  navigateToUrl(route)

  // If this is a component navigation, emit the custom event
  if (navigationItem?.type === 'component' && navigationItem?.component) {
    window.dispatchEvent(
      new CustomEvent('component-navigation', {
        detail: { item: navigationItem, route },
      })
    )
  }
}

function initializeApps() {
  setupImportMaps()
  registerNavigationApps()

  start({
    urlRerouteOnly: true,
  })
}

export { initializeApps, navigateToRoute }
