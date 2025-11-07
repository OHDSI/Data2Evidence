<template>
  <p-layout-default v-if="blockType" class="blocks-catalog-view">
    <template #header>
      <PageHeadingBlocksCatalogView :block-type="blockType" />
    </template>

    <BlockTypeCard :block-type="blockType" />
  </p-layout-default>

  <p-layout-default v-else>
    <Loader />
  </p-layout-default>
</template>

<script lang="ts" setup>
import Loader from '@/components/Loader.vue'
import { PageHeadingBlocksCatalogView, BlockTypeCard, useWorkspaceApi } from '@prefecthq/prefect-ui-library'
  import { useRouteParam, useSubscriptionWithDependencies } from '@prefecthq/vue-compositions'
  import { computed } from 'vue'

  const api = useWorkspaceApi()
  const blockTypeSlugParam = useRouteParam('blockTypeSlug')
  const blockTypeSubscriptionArgs = computed<Parameters<typeof api.blockTypes.getBlockTypeBySlug> | null>(() => {
    if (!blockTypeSlugParam.value) {
      return null
    }

    return [blockTypeSlugParam.value]
  })

  const blockTypeSubscription = useSubscriptionWithDependencies(api.blockTypes.getBlockTypeBySlug, blockTypeSubscriptionArgs)
  const blockType = computed(() => blockTypeSubscription.response)
</script>