import { registerApplication, start, navigateToUrl } from 'single-spa'
import { getNavigationConfig } from './config'
import { NavigationItem } from '@/types/navigation'
import { getPortalContextBootstrap, resolveStandaloneAppCustomProps } from '@/bootstrap/portalContextBootstrap'

// Setup all import maps
function setupImportMaps() {
  try {
    const { apps } = getNavigationConfig()

    let overrides = {}
    if (window.importMapOverrides) {
      try {
        overrides = window.importMapOverrides.getOverrideMap().imports || {}
      } catch (e) {
        console.log('No existing overrides found')
      }
    }

    const existingImportMap = document.querySelector('script[type="systemjs-importmap"]')
    const importMapData = existingImportMap
      ? JSON.parse(existingImportMap.textContent || '{"imports":{}}')
      : { imports: {} }

    apps.forEach((item: any) => {
      if (item.appName && item.importUrl) {
        console.log(`Adding ${item.appName} to import map`)
        importMapData.imports[item.appName] = overrides[item.appName] || item.importUrl
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
    console.error('AppRegistry.ts - Failed to setup import maps:', error)
  }
}

// Function to register single-spa applications from navigation config
function registerNavigationApps() {
  try {
    const { apps } = getNavigationConfig()

    apps.forEach((item: NavigationItem) => {
      if (item.appName && item.importUrl && item.route) {
        console.log(`Registering single-spa app: ${item.appName} at ${item.route}`)

        registerApplication({
          name: item.appName,
          app: () => window.System.import(item.appName).then((module: any) => module.default || module),
          activeWhen: location => item.autoMount || location.pathname === item.route,
          customProps: () => {
            const searchParams = new URLSearchParams(window.location.search)
            const bootstrap = getPortalContextBootstrap()
            const contextProps = resolveStandaloneAppCustomProps(searchParams, import.meta.env, bootstrap)
            return {
              containerId: `single-spa-application:${item.appName}`,
              getToken: contextProps.getToken,
              username: contextProps.username,
              datasetId: contextProps.datasetId,
              locale: contextProps.locale,
              autoMount: item.autoMount,
              ...(item.customProps || {}),
            }
          },
        })
      }
    })
  } catch (error) {
    console.error('AppRegistry.ts - Failed to register navigation apps:', error)
  }
}

function navigateToRoute(route: string, navigationItem?: any) {
  try {
    navigateToUrl(route)

    // If this is a component navigation, emit the custom event
    if (navigationItem?.type === 'component' && navigationItem?.component) {
      window.dispatchEvent(
        new CustomEvent('component-navigation', {
          detail: { item: navigationItem, route },
        })
      )
    }
  } catch (error) {
    console.error('AppRegistry.ts - Failed to navigate to route:', error)
  }

  // Always dispatch concept-sets route change event
  setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent('route-change', {
        detail: { activeRoute: route },
      })
    )
  }, 0)
}

function initializeApps() {
  try {
    setupImportMaps()
    registerNavigationApps()

    start({
      urlRerouteOnly: true,
    })
  } catch (error) {
    console.error('AppRegistry.ts - Failed to initialize apps:', error)
  }
}

export { initializeApps, navigateToRoute }
