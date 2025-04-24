<template>
  <p-layout-well v-if="deployment" class="deployment">
    <template #header>
      <PageHeadingDeployment
        :deployment="deployment"
        @update="deploymentSubscription.refresh"
        @delete="routeToDeployments"
      />
    </template>

    <p-tabs v-model:selected="tab" :tabs="tabs">
      <template #parameters>
        <ParametersTable :deployment="deployment" />
      </template>

      <template #configuration>
        <DeploymentConfiguration :deployment="deployment" />
      </template>

      <template #details>
        <DeploymentDetails :deployment="deployment" @update="deploymentSubscription.refresh" />
      </template>

      <template #runs>
        <template v-if="nextRun">
          <p-heading heading="6" class="workspace-deployment__next-run"> Next Run </p-heading>
          <FlowRunListItem :flow-run="nextRun" />
          <p-divider />
        </template>
        <FlowRunFilteredList :filter="flowRunsFilter" selectable prefix="runs" />
      </template>

      <template #upcoming>
        <FlowRunFilteredList :filter="upcomingFlowRunsFilter" selectable prefix="upcoming" />
      </template>
    </p-tabs>

    <template #well>
      <DeploymentDetails
        :deployment="deployment"
        alternate
        @update="deploymentSubscription.refresh"
      />
    </template>
  </p-layout-well>
</template>
  
  <script lang="ts" setup>
import { media } from '@prefecthq/prefect-design'
import {
  FlowRunListItem,
  DeploymentDetails,
  PageHeadingDeployment,
  ParametersTable,
  useTabs,
  useWorkspaceApi,
  useFlowRunsFilter,
  prefectStateNames,
  DeploymentConfiguration,
  useNextFlowRun,
  FlowRunFilteredList
} from '@prefecthq/prefect-ui-library'
import { useRouteParam, useRouteQueryParam, useSubscription } from '@prefecthq/vue-compositions'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { routes } from '@/router'

const deploymentId = useRouteParam('deploymentId')
const deploymentIds = computed(() => [deploymentId.value])
const router = useRouter()
const api = useWorkspaceApi()

const subscriptionOptions = {
  interval: 300000
}

const deploymentSubscription = useSubscription(
  api.deployments.getDeployment,
  [deploymentId.value],
  subscriptionOptions
)
const deployment = computed(() => deploymentSubscription.response)

const computedTabs = computed(() => [
  { label: 'Details', hidden: media.xl },
  { label: 'Runs' },
  { label: 'Upcoming' },
  { label: 'Parameters', hidden: deployment.value?.deprecated },
  { label: 'Configuration', hidden: deployment.value?.deprecated }
])
const tab = useRouteQueryParam('tab', 'Details')
const { tabs } = useTabs(computedTabs, tab)

function routeToDeployments(): void {
  router.push(routes.deployments())
}

const { filter: flowRunsFilter } = useFlowRunsFilter({
  deployments: {
    id: deploymentIds
  },
  flowRuns: {
    state: {
      name: prefectStateNames.filter((stateName) => stateName !== 'Scheduled')
    }
  }
})

const { filter: upcomingFlowRunsFilter } = useFlowRunsFilter({
  sort: 'START_TIME_ASC',
  deployments: {
    id: deploymentIds
  },
  flowRuns: {
    state: {
      name: ['Scheduled']
    }
  }
})

const { flowRun: nextRun } = useNextFlowRun(() => ({
  deployments: {
    id: deploymentIds.value
  }
}))
</script>
  
  <style>
.deployment__infra-overrides {
  @apply px-4
    py-3;
}
</style>