<template>
  <p-layout-default class="deployments">
    <template #header>
      <p-heading heading="4"> Jobs </p-heading>
    </template>

    <template v-if="loaded">
      <template v-if="empty">
        <DeploymentsPageEmptyState />
      </template>

      <template v-else>
        <DeploymentList @delete="deploymentsSubscription.refresh" />
      </template>
    </template>
  </p-layout-default>
</template>
  
  <script lang="ts" setup>
import {
  DeploymentList,
  DeploymentsPageEmptyState,
  useWorkspaceApi
} from '@prefecthq/prefect-ui-library'
import { useSubscription } from '@prefecthq/vue-compositions'
import { computed } from 'vue'

const api = useWorkspaceApi()
const subscriptionOptions = {
  interval: 30000
}

const deploymentsSubscription = useSubscription(
  api.deployments.getDeployments,
  [{}],
  subscriptionOptions
)
const deployments = computed(() => deploymentsSubscription.response ?? [])
const empty = computed(() => deploymentsSubscription.executed && deployments.value.length === 0)
const loaded = computed(() => deploymentsSubscription.executed)
</script>