import { RouteGuardExecutioner, createWorkspaceRouteRecords } from '@prefecthq/prefect-ui-library'
import { RouteRecordRaw, createRouter, createWebHistory } from 'vue-router'
import { routes, NamedRoute, AppRouteLocation, AppRouteRecord } from '@/router/routes'
import AppRouterView from '@/views/AppRouterView.vue'
import Sidebar from '@/components/Sidebar.vue'

const workspaceRoutes = createWorkspaceRouteRecords({
  deployment: () => import('@/views/Deployment.vue'),
  deployments: () => import('@/views/Deployments.vue'),
  deploymentEdit: () => import('@/views/DeploymentEdit.vue'),
  deploymentFlowRunCreate: () => import('@/views/FlowRunCreate.vue'),
  flows: () => import('@/views/Flows.vue'),
  flow: () => import('@/views/Flow.vue'),
  runs: () => import('@/views/FlowRuns.vue'),
  flowRun: () => import('@/views/FlowRun.vue')
})

const routeRecords: AppRouteRecord[] = [
  {
    name: 'root',
    path: '/',
    redirect: routes.runs(),
    components: { default: AppRouterView, sidebar: Sidebar },
    children: workspaceRoutes as AppRouteRecord[]
  }
]

const router = createRouter({
  history: createWebHistory('/portal/systemadmin/jobs'),
  routes: routeRecords as RouteRecordRaw[]
})

router.beforeEach(async (to, from) => {
  return await RouteGuardExecutioner.before(to, from)
})

router.afterEach((to, from) => {
  return RouteGuardExecutioner.after(to, from)
})

export default router
export { routes }
export type { NamedRoute, AppRouteLocation, AppRouteRecord }
