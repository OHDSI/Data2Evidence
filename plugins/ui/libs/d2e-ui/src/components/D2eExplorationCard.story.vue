<script setup lang="ts">
import { ref } from "vue";
import D2eExplorationCard from "./D2eExplorationCard.vue";
import D2eIconButton from "./D2eIconButton.vue";

const selected = ref(false);
</script>

<template>
  <Story title="D2eExplorationCard" group="components">
    <Variant title="exploration card">
      <D2eExplorationCard
        v-model:selected="selected"
        name="CAD-AF-Correlation A"
        :status="{
          variant: 'have-access',
          label: 'Have access',
          icon: 'mdi-check-circle',
        }"
        :metadata="[
          { label: 'Last Materialised on', value: '12 Aug 2026, 14:32' },
          { label: 'Exploration ID', value: '4c3d7779-b0a6-4707-a…' },
          { label: 'Description', value: 'Correlation cohort for CAD-AF' },
        ]"
      >
        <template #toolbar>
          <D2eIconButton
            category="no-stroke"
            icon="mdi-database-arrow-up"
            aria-label="Materialize"
          />
          <D2eIconButton
            category="no-stroke"
            icon="mdi-pencil"
            aria-label="Rename"
          />
          <D2eIconButton
            category="no-stroke"
            icon="mdi-delete"
            aria-label="Delete"
          />
        </template>
      </D2eExplorationCard>
    </Variant>

    <Variant title="selected">
      <D2eExplorationCard
        v-model:selected="selected"
        name="SNRI Users"
        :status="{ variant: 'positive', label: 'Ready' }"
        :metadata="[{ label: 'Exploration ID', value: '9f1c…' }]"
        :selected="true"
      >
        <template #toolbar>
          <D2eIconButton icon="mdi-dots-horizontal" aria-label="More actions" />
        </template>
      </D2eExplorationCard>
    </Variant>
  </Story>
</template>
