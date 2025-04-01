<template>
  <p-layout-default v-if="flowRun" :key="flowRun.id" class="flow-run">
    <template #header>
      <PageHeadingFlowRun :flow-run-id="flowRun.id" @delete="goToFlowRuns" />
    </template>

    <FlowRunGraphs v-if="!isPending" :flow-run="flowRun" />

    <p-button v-if="showResultButton" lg @click="displayResultsDialog">View Results</p-button>

    <p-tabs v-model:selected="tab" :tabs="tabs">
      <template #details>
        <FlowRunDetails :flow-run="flowRun" />
      </template>

      <template #logs>
        <FlowRunLogs :flow-run="flowRun" />
      </template>

      <template #artifacts>
        <FlowRunArtifacts :flow-run="flowRun" />
      </template>

      <template #task-runs>
        <FlowRunTaskRuns :flow-run-id="flowRun.id" />
      </template>

      <template #subflow-runs>
        <FlowRunFilteredList :filter="subflowsFilter" />
      </template>

      <template #parameters>
        <CopyableWrapper :text-to-copy="parameters">
          <p-code-highlight lang="json" :text="parameters" class="flow-run__parameters" />
        </CopyableWrapper>
      </template>

      <template #job-variables>
        <CopyableWrapper :text-to-copy="jobVariables">
          <p-code-highlight lang="json" :text="jobVariables" class="flow-run__job-variables" />
        </CopyableWrapper>
      </template>
    </p-tabs>
  </p-layout-default>
</template>
  
  <script lang="ts" setup>
import {
  PageHeadingFlowRun,
  FlowRunArtifacts,
  FlowRunDetails,
  FlowRunLogs,
  FlowRunTaskRuns,
  FlowRunFilteredList,
  useFavicon,
  CopyableWrapper,
  isPendingStateType,
  useTabs,
  httpStatus,
  useFlowRun,
  useFlowRunsFilter,
  stringify
} from '@prefecthq/prefect-ui-library'
import { useRouteParam, useRouteQueryParam } from '@prefecthq/vue-compositions'
import { computed, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import FlowRunGraphs from '@/components/FlowRunGraphs.vue'
import { routes } from '@/router'
import { RUN_TYPES } from '@/types/runs'
import { mapFlowRunResults } from '@/utils/mapFlowRunResults'

const router = useRouter()
const flowRunId = useRouteParam('flowRunId')

const { flowRun, subscription: flowRunSubscription } = useFlowRun(flowRunId, { interval: 20000 })

const tags = computed(() => flowRun.value?.tags ?? [])
const showResultButton = computed(
  () =>
    (tags.value.includes(RUN_TYPES.DATA_QUALITY) ||
      tags.value.includes(RUN_TYPES.DATA_CHARACTERIZATION)) &&
    flowRun.value?.stateType === 'completed'
)
const displayResultsDialog = () => {
  const job = mapFlowRunResults(flowRun.value)
  const event = new CustomEvent('alp-results-dialog-open', {
    detail: {
      props: {
        job: job
      }
    }
  })
  window.dispatchEvent(event)
}

const parameters = computed(() => stringify(flowRun.value?.parameters ?? {}))

const isPending = computed(() => {
  return flowRun.value?.stateType ? isPendingStateType(flowRun.value.stateType) : true
})

const jobVariables = computed(() => stringify(flowRun.value?.jobVariables ?? {}))

const computedTabs = computed(() => [
  { label: 'Logs' },
  { label: 'Task Runs', hidden: isPending.value },
  { label: 'Subflow Runs', hidden: isPending.value },
  { label: 'Artifacts', hidden: isPending.value },
  { label: 'Details' },
  { label: 'Parameters' },
  { label: 'Job Variables' }
])
const tab = useRouteQueryParam('tab', 'Logs')
const { tabs } = useTabs(computedTabs, tab)

const parentFlowRunIds = computed(() => [flowRunId.value])
const { filter: subflowsFilter } = useFlowRunsFilter({
  flowRuns: {
    parentFlowRunId: parentFlowRunIds
  }
})

function goToFlowRuns(): void {
  router.push(routes.flowRuns())
}

const stateType = computed(() => flowRun.value?.stateType)
useFavicon(stateType)

watchEffect(() => {
  if (flowRunSubscription.error) {
    const status = httpStatus(flowRunSubscription.error)

    if (status.isInRange('clientError')) {
      router.replace(routes[404]())
    }
  }
})
</script>
  
  <style>
.flow-run {
  @apply items-start;
}

.flow-run__logs {
  @apply max-h-screen;
}

.flow-run__header-meta {
  @apply flex
    gap-2
    items-center
    xl:hidden;
}

.flow-run__job-variables,
.flow-run__parameters {
  @apply px-4
    py-3;
}
</style>
  