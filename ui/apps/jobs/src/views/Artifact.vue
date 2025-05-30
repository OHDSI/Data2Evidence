<template>
    <p-layout-well class="artifact">
        <template #header>
            <PageHeadingArtifact v-if="artifact" :artifact="artifact" />
        </template>

        <section v-if="artifact">
            <ArtifactDescription :artifact="artifact" />

            <p-divider />

            <template v-if="media.xl">
                <p-content>
                    <ArtifactDataView :artifact="artifact" />

                    <p-button class="artifact__raw-data-button" small @click="showRaw = !showRaw">
                        {{ showRaw ? 'Hide' : 'Show' }} raw data
                    </p-button>

                    <ArtifactDataRaw v-if="showRaw" :artifact="artifact" />
                </p-content>
            </template>
            <template v-else>
                <p-tabs v-model="tab" :tabs="tabs">
                    <template #artifact>
                        <ArtifactDataView :artifact="artifact" />
                    </template>

                    <template #details>
                        <ArtifactDetails :artifact="artifact" />
                    </template>

                    <template #raw>
                        <ArtifactDataRaw :artifact="artifact" />
                    </template>
                </p-tabs>
            </template>
        </section>

        <section v-else>
            <Loader />
        </section>
        <template #well>
            <ArtifactDetails v-if="artifact" :artifact="artifact" alternate />
        </template>
    </p-layout-well>
</template>

<script lang="ts" setup>
import { media } from '@prefecthq/prefect-design'
import {
    PageHeadingArtifact,
    ArtifactDataView,
    ArtifactDescription,
    ArtifactDetails,
    ArtifactDataRaw,
    useWorkspaceApi
} from '@prefecthq/prefect-ui-library'
import { useSubscription, useRouteParam, useRouteQueryParam } from '@prefecthq/vue-compositions'
import { computed, ref } from 'vue'
import Loader from '@/components/Loader.vue'

const api = useWorkspaceApi()
const artifactId = useRouteParam('artifactId')

const artifactSubscription = useSubscription(api.artifacts.getArtifact, [artifactId])
const artifact = computed(() => artifactSubscription.response)

const showRaw = ref(false)

const tabs = [{ label: 'Artifact' }, { label: 'Details' }, { label: 'Raw' }]
const tab = useRouteQueryParam('tab', 'Artifact')

</script>

<style>
.artifact__raw-data-button {
    @apply mt-4 inline-block mx-auto;
}
</style>