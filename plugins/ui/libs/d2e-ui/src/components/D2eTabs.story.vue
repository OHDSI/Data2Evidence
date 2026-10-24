<script setup lang="ts">
import { ref } from "vue";
import D2eTabs from "./D2eTabs.vue";

const plain = ref("dashboard");
const withIcons = ref("checks");

const items = [
  { value: "dashboard", label: "Data quality dashboard" },
  { value: "checks", label: "Data quality checks" },
];

const iconItems = [
  { value: "dashboard", label: "Data quality dashboard", icon: "mdi-license" },
  {
    value: "checks",
    label: "Data quality checks",
    icon: "mdi-list-box-outline",
  },
];
</script>

<template>
  <Story title="D2eTabs" group="components">
    <Variant title="two tabs, first active">
      <D2eTabs v-model="plain" :items="items" aria-label="Data quality views" />
    </Variant>
    <Variant title="with icons (mdi-license, mdi-list-box-outline)">
      <D2eTabs
        v-model="withIcons"
        :items="iconItems"
        aria-label="Data quality views"
      />
    </Variant>
  </Story>
</template>
