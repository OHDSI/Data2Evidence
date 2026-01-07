import { ref, onMounted, onUnmounted } from 'vue'
import { getNavigationConfig } from '../utils/config'
import { getComponents, loadComponentByRoute, loadComponent } from '../utils/ComponentRegistry'
import Landing from '../components/Landing.vue'

export function useNavigation() {
  const isAppActive = ref(false)
  const currentRoute = ref(window.location.pathname)
  const currentComponent = ref(null)
  const apps = ref([])
  const components = ref([])

  const initializeNavigation = () => {
    const config = getNavigationConfig()
    apps.value = config.apps
    components.value = getComponents()
  }

  const handleRouteChange = async () => {
    const currentPath = window.location.pathname
    currentRoute.value = currentPath

    const appRoutes = apps.value.map(app => app.route)
    isAppActive.value = appRoutes.includes(currentPath)

    // Handle root route to show Landing component
    if (currentPath === '/') {
      currentComponent.value = Landing
      return
    }

    currentComponent.value = await loadComponentByRoute(currentPath)
    if (!currentComponent.value && !isAppActive.value) {
      currentComponent.value = null
    }
  }

  const handleComponentNavigation = async (event: CustomEvent<any>) => {
    const { item } = event.detail
    if (item.component) {
      currentComponent.value = await loadComponent(item.component)
    }
  }

  const setupEventListeners = () => {
    window.addEventListener('single-spa:routing-event', handleRouteChange)
    window.addEventListener('component-navigation', handleComponentNavigation)
  }

  const cleanupEventListeners = () => {
    window.removeEventListener('single-spa:routing-event', handleRouteChange)
    window.removeEventListener('component-navigation', handleComponentNavigation)
  }

  onMounted(() => {
    initializeNavigation()
    handleRouteChange()
    setupEventListeners()
  })

  onUnmounted(() => {
    cleanupEventListeners()
  })

  return {
    isAppActive,
    currentRoute,
    currentComponent,
    apps,
    components,
  }
}
