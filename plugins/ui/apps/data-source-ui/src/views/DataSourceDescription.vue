<template>
  <v-container>
    <v-row v-if="loading">
      <v-col><v-progress-circular indeterminate color="primary" /></v-col>
    </v-row>
    <v-row v-else-if="error">
      <v-col><v-alert type="error">{{ error }}</v-alert></v-col>
    </v-row>
    <template v-else>
      <v-row class="mb-2">
        <v-col>
          <h1 class="text-h4 font-weight-bold">{{ dataSource?.name }}</h1>
          <div class="mt-2">
            <v-chip v-if="dataSource?.type" class="mr-2" color="primary" variant="tonal">{{ dataSource.type }}</v-chip>
            <v-chip v-if="dataSource?.dialect" class="mr-2" color="secondary" variant="tonal">{{ dataSource.dialect }}</v-chip>
            <v-chip v-if="dataSource?.database" variant="tonal">{{ dataSource.database }}</v-chip>
          </div>
        </v-col>
      </v-row>

      <v-tabs v-model="activeTab" color="primary">
        <v-tab value="overview">Overview</v-tab>
        <v-tab value="resources">Resources</v-tab>
        <v-tab value="access">Access Request</v-tab>
      </v-tabs>

      <v-tabs-window v-model="activeTab" class="mt-4">
        <v-tabs-window-item value="overview">
          <v-card variant="outlined">
            <v-card-text>
              <p v-if="dataSource?.description" class="text-body-1 mb-4">{{ dataSource.description }}</p>
              <p v-else class="text-body-2 text-medium-emphasis">No description available.</p>
              <v-divider class="my-4" />
              <v-list density="compact">
                <v-list-item title="Type" :subtitle="dataSource?.type || '—'" prepend-icon="mdi-database" />
                <v-list-item title="Dialect" :subtitle="dataSource?.dialect || '—'" prepend-icon="mdi-code-braces" />
                <v-list-item title="Database" :subtitle="dataSource?.database || '—'" prepend-icon="mdi-server" />
              </v-list>
            </v-card-text>
          </v-card>
        </v-tabs-window-item>

        <v-tabs-window-item value="resources">
          <v-card variant="outlined">
            <v-card-text class="text-medium-emphasis">Resources coming soon.</v-card-text>
          </v-card>
        </v-tabs-window-item>

        <v-tabs-window-item value="access">
          <v-card variant="outlined">
            <v-card-text class="text-medium-emphasis">Access request coming soon.</v-card-text>
          </v-card>
        </v-tabs-window-item>
      </v-tabs-window>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { fetchDataSource, type DataSource } from '../api/datasource'

const route = useRoute()
const dataSource = ref<DataSource | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const activeTab = ref('overview')

onMounted(async () => {
  try {
    dataSource.value = await fetchDataSource(route.params.id as string)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load data source.'
  } finally {
    loading.value = false
  }
})
</script>
