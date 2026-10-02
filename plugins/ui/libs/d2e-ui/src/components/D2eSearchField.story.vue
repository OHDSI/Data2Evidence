<script setup lang="ts">
import { ref } from "vue";
import D2eSearchField from "./D2eSearchField.vue";

const query = ref("");
const filled = ref("SNRI");
</script>

<template>
  <Story title="D2eSearchField" group="components">
    <Variant title="empty">
      <div style="width: 466px">
        <D2eSearchField v-model="query" />
      </div>
    </Variant>

    <Variant title="filled">
      <div style="width: 466px">
        <D2eSearchField v-model="filled" />
      </div>
    </Variant>
  </Story>
</template>
