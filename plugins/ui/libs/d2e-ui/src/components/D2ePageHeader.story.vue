<script setup lang="ts">
import D2ePageHeader from "./D2ePageHeader.vue";
</script>

<template>
  <Story title="D2ePageHeader" group="components">
    <Variant title="with actions">
      <D2ePageHeader
        eyebrow="D2E · Data Exploration"
        title="Data Exploration"
        subtitle="Get quick insights about your data source, an easy way to validate whether a cohort is possible before defining it further for your study."
      >
        <template #actions>
          <div
            style="
              width: 208px;
              height: 40px;
              border: 1px solid #acaba8;
              border-radius: 4px;
            "
          />
        </template>
      </D2ePageHeader>
    </Variant>

    <Variant title="title only">
      <D2ePageHeader title="Data Exploration" />
    </Variant>
  </Story>
</template>
