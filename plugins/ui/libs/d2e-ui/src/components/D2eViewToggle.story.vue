<script setup lang="ts">
import { ref } from "vue";
import D2eViewToggle from "./D2eViewToggle.vue";

const options = [
  { value: "grid", label: "Grid view", icon: "mdi-view-grid-outline" },
  { value: "list", label: "List view", icon: "mdi-view-list-outline" },
];

const grid = ref("grid");
const list = ref("list");
</script>

<template>
  <Story title="D2eViewToggle" group="components">
    <Variant title="grid selected">
      <D2eViewToggle v-model="grid" :options="options" label="View" />
    </Variant>

    <Variant title="list selected">
      <D2eViewToggle v-model="list" :options="options" label="View" />
    </Variant>
  </Story>
</template>
