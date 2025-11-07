import type { Component } from 'vue'
import { getNavigationConfig } from './config'
import type { NavigationItem } from '../types/navigation'

let componentsCache: NavigationItem[] = []
let componentInstanceCache = new Map<string, Component>()

function initializeComponents() {
  try {
    const { components } = getNavigationConfig()
    componentsCache = components
    console.log('Components initialized:', componentsCache.length)
  } catch (error) {
    console.warn('Failed to initialize components:', error)
  }
}

async function loadComponent(componentPath: string) {
  try {
    if (componentInstanceCache.has(componentPath)) {
      return componentInstanceCache.get(componentPath)
    }

    const component = await import(/* webpackChunkName: "dynamic-components" */ `../plugins/${componentPath}`)
    const componentInstance = component.default || component
    componentInstanceCache.set(componentPath, componentInstance)

    console.log(`Loaded component: ${componentPath}`)
    return componentInstance
  } catch (error) {
    console.error('Failed to load component:', componentPath, error)
    return null
  }
}

function getComponents() {
  if (componentsCache.length === 0) {
    initializeComponents()
  }
  return componentsCache
}

function findComponentByRoute(route: string) {
  const components = getComponents()
  return components.find(comp => comp.route === route)
}

async function loadComponentByRoute(route: string) {
  const component = findComponentByRoute(route)
  if (component) {
    return await loadComponent(component.component)
  }
  return null
}

export { initializeComponents, loadComponent, getComponents, loadComponentByRoute }
