<template>
  <p-layout-default class="artifact">
    <template #header>
      <PageHeadingArtifactKey v-if="artifact" :artifact="artifact" />
    </template>

    <ArtifactDescription v-if="artifact" :artifact="artifact" />

    <template v-if="artifact">
      <ArtifactTimeline v-if="artifact.key" :artifact-key="artifact.key" />
    </template>

    <template v-else>
      <Loader/>
    </template>
  </p-layout-default>
</template>

<script lang="ts" setup>
import Loader from '@/components/Loader.vue'
import {
  PageHeadingArtifactKey,
  ArtifactDescription,
  ArtifactTimeline,
  useWorkspaceApi
} from '@prefecthq/prefect-ui-library'
import { useSubscription, useRouteParam } from '@prefecthq/vue-compositions'
import { computed } from 'vue'

const api = useWorkspaceApi()
const artifactKey = useRouteParam('artifactKey')

const artifactSubscription = useSubscription(api.artifacts.getArtifactCollection, [artifactKey])
const artifact = computed(() => artifactSubscription.response)

</script>