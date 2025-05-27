<template>
  <p-layout-default class="flow">
    <template #header>
      <PageHeadingFlow v-if="flow" :flow="flow" @delete="deleteFlow" />
    </template>

    <p-tabs v-model:selected="tab" :tabs="tabs">
      <template #details>
        <FlowDetails v-if="flow" :flow="flow" />
      </template>

      <template #runs>
        <FlowRunFilteredList :filter="flowRunsFilter" selectable prefix="runs" />
      </template>
    </p-tabs>
  </p-layout-default>
</template>
  
  <script lang="ts" setup>
import {
  PageHeadingFlow,
  FlowDetails,
  FlowRunFilteredList,
  useWorkspaceApi,
  useFlowRunsFilter
} from '@prefecthq/prefect-ui-library'
import { useSubscription, useRouteParam, useRouteQueryParam } from '@prefecthq/vue-compositions'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { routes } from '@/router/routes'

const api = useWorkspaceApi()
const flowId = useRouteParam('flowId')
const flowIds = computed(() => [flowId.value])
const router = useRouter()
const tab = useRouteQueryParam('tab', 'Runs')
const tabs = ['Runs', 'Details']

const subscriptionOptions = {
  interval: 300000
}

const flowSubscription = useSubscription(api.flows.getFlow, [flowId.value], subscriptionOptions)
const flow = computed(() => flowSubscription.response)

const { filter: flowRunsFilter } = useFlowRunsFilter({
  flows: {
    id: flowIds
  }
})

function deleteFlow(): void {
  router.push(routes.flows())
}
</script>