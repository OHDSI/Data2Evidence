import { createRouter, createMemoryHistory } from 'vue-router'
import DataSourceDescription from '../views/DataSourceDescription.vue'
import ResourcesPlaceholder from '../views/ResourcesPlaceholder.vue'
import AccessPlaceholder from '../views/AccessPlaceholder.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    {
      path: '/datasources/:id',
      component: DataSourceDescription,
      children: [],
    },
    {
      path: '/datasources/:id/resources',
      component: ResourcesPlaceholder,
    },
    {
      path: '/datasources/:id/access',
      component: AccessPlaceholder,
    },
  ],
})

export default router
