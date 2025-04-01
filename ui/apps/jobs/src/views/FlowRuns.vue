<template>
  <p-layout-default class="flow-runs">
    <template #header>
      <p-heading heading="4"> Job Runs </p-heading>
    </template>

    <template v-if="loaded">
      <template v-if="empty">
        <FlowRunsPageEmptyState />
      </template>
      <template v-else>
        <p-content>
          <FlowRunsFilterGroup
            v-model:nameSearch="flowRunNameLike"
            :filter="dashboardFilter"
            @update:filter="setDashboardFilter"
          />
          <p-content>
            <p-list-header class="min-h-10" sticky>
              <p-select-all-checkbox
                v-if="flowRunsAreSelectable"
                v-model="selectedFlowRuns"
                :selectable="flowRuns.map((flowRun) => flowRun.id)"
                item-name="flow run"
              />
              <ResultsCount v-if="selectedFlowRuns.length == 0" :count="flowRunCount" label="run" />
              <SelectedCount v-else :count="selectedFlowRuns.length" />
              <FlowRunsDeleteButton
                v-if="can.delete.flow_run"
                :selected="selectedFlowRuns"
                @delete="deleteFlowRuns"
              />

              <template #controls>
                <div class="runs__subflows-toggle">
                  <p-toggle v-model="hideSubflows" append="Hide subflows" />
                </div>
                <template v-if="media.md">
                  <SearchInput
                    v-model="flowRunNameLike"
                    size="small"
                    placeholder="Search by flow run name"
                    class="min-w-64"
                    label="Search by flow run name"
                  />
                </template>
              </template>

              <template #sort>
                <FlowRunsSort v-model="flowRunsSort" small />
              </template>
            </p-list-header>

            <template v-if="flowRunCount > 0">
              <FlowRunList
                v-model:selected="selectedFlowRuns"
                :selectable="flowRunsAreSelectable"
                :flow-runs="flowRuns"
              />
              <p-pager v-model:limit="limit" v-model:page="flowRunsPage" :pages="flowRunPages" />
            </template>

            <template v-else-if="!flowRunsSubscription.executed && flowRunsSubscription.loading">
              <p-loading-icon class="m-auto" />
            </template>

            <template v-else-if="!flowRunsSubscription.executed">
              <p-message type="error">
                An error occurred while loading flow runs. Please try again.
              </p-message>
            </template>

            <template v-else>
              <p-empty-results>
                <template #message> No flow runs </template>
                <template v-if="isCustomFilter" #actions>
                  <p-button size="sm" @click="clear"> Clear Filters </p-button>
                </template>
              </p-empty-results>
            </template>
          </p-content>
        </p-content>
      </template>
    </template>
  </p-layout-default>
</template>
  
  <script lang="ts" setup>
import { Getter, PEmptyResults, media } from '@prefecthq/prefect-design'
import {
  FlowRunsPageEmptyState,
  FlowRunsSort,
  FlowRunList,
  SearchInput,
  ResultsCount,
  FlowRunsFilterGroup,
  useWorkspaceApi,
  SelectedCount,
  FlowRunsDeleteButton,
  usePaginatedFlowRuns,
  useWorkspaceFlowRunDashboardFilterFromRoute,
  FlowRunsFilter,
  FlowRunSortValuesSortParam,
  FlowRunsPaginationFilter
} from '@prefecthq/prefect-ui-library'
import {
  BooleanRouteParam,
  NullableStringRouteParam,
  NumberRouteParam,
  useDebouncedRef,
  useLocalStorage,
  useRouteQueryParam,
  useSubscription
} from '@prefecthq/vue-compositions'
import merge from 'lodash.merge'
import { computed, ref, toRef } from 'vue'
import { useRouter } from 'vue-router'
import { useCan } from '@/compositions/useCan'
import { routes } from '@/router'
import { mapper } from '@/utils/mapper'

const router = useRouter()
const api = useWorkspaceApi()
const can = useCan()

const tab = useRouteQueryParam('tab', 'flow-runs')

const flowRunsCountAllSubscription = useSubscription(api.flowRuns.getFlowRunsCount)

const loaded = computed(
  () => flowRunsCountAllSubscription.executed
)
const empty = computed(
  () => flowRunsCountAllSubscription.response === 0
)

const {
  filter: dashboardFilter,
  setFilter: setDashboardFilter,
  isCustom: isCustomDashboardFilter
} = useWorkspaceFlowRunDashboardFilterFromRoute()

const flowRunNameLike = useRouteQueryParam('flow-run-search', NullableStringRouteParam, null)
const flowRunNameLikeDebounced = useDebouncedRef(flowRunNameLike, 1200)

const taskRunNameLike = useRouteQueryParam('task-run-search', NullableStringRouteParam, null)
const taskRunNameLikeDebounced = useDebouncedRef(taskRunNameLike, 1200)

const hideSubflows = useRouteQueryParam('hide-subflows', BooleanRouteParam, false)
const flowRunsSort = useRouteQueryParam(
  'flow-runs-sort',
  FlowRunSortValuesSortParam,
  'START_TIME_DESC'
)

const flowRunsPage = useRouteQueryParam('flow-runs-page', NumberRouteParam, 1)

const { value: limit } = useLocalStorage('workspace-runs-list-limit', 10)

const flowRunsFilter: Getter<FlowRunsPaginationFilter> = () => {
  const filter = mapper.map('SavedSearchFilter', dashboardFilter, 'FlowRunsFilter')

  return merge({}, filter, {
    flowRuns: {
      nameLike: flowRunNameLikeDebounced.value ?? undefined,
      parentTaskRunIdNull: hideSubflows.value ? true : undefined
    },
    sort: flowRunsSort.value,
    limit: limit.value,
    page: flowRunsPage.value
  })
}

const isCustomFilter = computed(
  () => isCustomDashboardFilter.value || hideSubflows.value || flowRunNameLike.value
)

const interval = 30000

const {
  flowRuns,
  count: flowRunCount,
  pages: flowRunPages,
  subscription: flowRunsSubscription
} = usePaginatedFlowRuns(flowRunsFilter, {
  interval
})

const flowRunsAreSelectable = computed(() => can.delete.flow_run)
const selectedFlowRuns = ref([])


function clear(): void {
  router.push(routes.runs({ tab: tab.value }))
}

const deleteFlowRuns = (): void => {
  selectedFlowRuns.value = []
  flowRunsSubscription.refresh()
}

</script>
  
<style>
</style>