<script setup lang="ts">
import { ref } from "vue";
import D2eSplitButton from "./D2eSplitButton.vue";

const last = ref("");
const items = [
  { label: "Download as CSV", value: "csv" },
  { label: "Download as JSON", value: "json" },
];
</script>

<template>
  <Story title="D2eSplitButton" group="components">
    <Variant title="Download">
      <D2eSplitButton
        label="Download"
        icon="mdi-tray-arrow-down"
        :items="items"
        @click="last = 'main (csv)'"
        @select="last = $event"
      />
      <p>Last action: {{ last || "none" }}</p>
    </Variant>
    <Variant title="disabled">
      <D2eSplitButton
        label="Download"
        icon="mdi-tray-arrow-down"
        :items="items"
        disabled
      />
    </Variant>
  </Story>
</template>
