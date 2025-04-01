<template>
  <p-layout-default>
    <template #header>
      <p-heading heading="4"> Jobs </p-heading>
    </template>

    <template v-if="loaded">
      <template v-if="empty">
        <FlowsPageEmptyState />
      </template>

      <template v-else>
        <FlowList @delete="handleDelete" />
      </template>
    </template>
  </p-layout-default>
</template>

<script lang="ts" setup>
import {
  FlowList,
  FlowsPageEmptyState,
  useWorkspaceApi
} from '@prefecthq/prefect-ui-library'
import { useSubscription } from '@prefecthq/vue-compositions'
import { computed } from 'vue'

const api = useWorkspaceApi()
const subscriptionOptions = {
  interval: 30000
}

const flowsCountSubscription = useSubscription(api.flows.getFlowsCount, [{}], subscriptionOptions)
const flowsCount = computed(() => flowsCountSubscription.response ?? 0)
const empty = computed(() => flowsCountSubscription.executed && flowsCount.value === 0)
const loaded = computed(() => flowsCountSubscription.executed)

const handleDelete = (): void => {
  flowsCountSubscription.refresh()
}

</script>
