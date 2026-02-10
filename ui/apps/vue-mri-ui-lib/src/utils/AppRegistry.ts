import { registerApplication, start, navigateToUrl } from 'single-spa'
import { getNavigationConfig } from './config'
import { getPortalAPI } from './PortalUtils'
import { NavigationItem } from '@/types/navigation'

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
          app: async () => {
            const maxRetries = 3
            const retryDelay = 10000
            for (let attempt = 0; attempt <= maxRetries; attempt++) {
              try {
                const module = await window.System.import(item.appName)
                return module.default || module
              } catch (error) {
                if (attempt < maxRetries) {
                  console.warn(
                    `[AppRegistry] ${item.appName} - import failed, retrying in ${retryDelay / 1000}s (attempt ${attempt + 1}/${maxRetries})...`,
                    error
                  )
                  try {
                    window.System.delete(item.appName)
                  } catch (_e) {
                    /* ignore */
                  }
                  await new Promise(resolve => setTimeout(resolve, retryDelay))
                } else {
                  console.error(`[AppRegistry] ${item.appName} - import failed after ${maxRetries} retries`, error)
                  throw error
                }
              }
            }
          },
          activeWhen: location => item.autoMount || location.pathname === item.route,
          customProps: () => {
            const portalAPI = getPortalAPI()
            return {
              containerId: `single-spa-application:${item.appName}`,
              getToken: portalAPI?.getToken,
              username: portalAPI?.username,
              datasetId: portalAPI?.studyId,
              locale: portalAPI?.locale,
              isAtlas: portalAPI?.isLocal || false,
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
