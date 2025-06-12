<template>
  <p-layout-default v-if="blockType" class="blocks-catalog-create">
    <template #header>
      <PageHeadingBlocksCatalogCreate :block-type="blockType" />
    </template>

    <template v-if="blockType">
      <BlockTypeCardLayout :block-type="blockType">
        <template v-if="blockSchema">
          <BlockSchemaCreateForm :key="blockSchema.id" :block-schema="blockSchema" v-on="{ submit, cancel }" />
        </template>
      </BlockTypeCardLayout>
    </template>
  </p-layout-default>

  <p-layout-default v-else>
    <Loader />
  </p-layout-default>
</template>

<script lang="ts" setup>
  import { showToast } from '@prefecthq/prefect-design'
  import { PageHeadingBlocksCatalogCreate, BlockTypeCardLayout, BlockSchemaCreateForm, BlockDocumentCreateNamed, asSingle, useWorkspaceApi } from '@prefecthq/prefect-ui-library'
  import { useRouteParam, useRouteQueryParam, useSubscriptionWithDependencies } from '@prefecthq/vue-compositions'
  import { computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { routes } from '@/router'

  const api = useWorkspaceApi()
  const router = useRouter()
  const redirect = useRouteQueryParam('redirect')

  const blockTypeSlugParam = useRouteParam('blockTypeSlug')
  const blockTypeSubscriptionArgs = computed<Parameters<typeof api.blockTypes.getBlockTypeBySlug> | null>(() => {
    if (!blockTypeSlugParam.value) {
      return null
    }

    return [blockTypeSlugParam.value]
  })

  const blockTypeSubscription = useSubscriptionWithDependencies(api.blockTypes.getBlockTypeBySlug, blockTypeSubscriptionArgs)
  const blockType = computed(() => blockTypeSubscription.response)

  const blockSchemaSubscriptionArgs = computed<Parameters<typeof api.blockSchemas.getBlockSchemaForBlockType> | null>(() => {
    if (!blockType.value) {
      return null
    }

    return [blockType.value.id]
  })

  const blockSchemaSubscription = useSubscriptionWithDependencies(api.blockSchemas.getBlockSchemaForBlockType, blockSchemaSubscriptionArgs)
  const blockSchema = computed(() => blockSchemaSubscription.response)

  function submit(request: BlockDocumentCreateNamed): void {
    api.blockDocuments
      .createBlockDocument(request)
      .then(({ id }) => onSuccess(id))
      .catch(err => {
        showToast('Failed to create block', 'error')
        console.error(err)
      })
  }

  function cancel(): void {
    router.back()
  }

  function onSuccess(id: string): void {
    showToast('Block created successfully', 'success')

    if (redirect.value) {
      const route = router.resolve(asSingle(redirect.value))

      router.push(route)
      return
    }

    router.push(routes.block(id))
  }
</script>