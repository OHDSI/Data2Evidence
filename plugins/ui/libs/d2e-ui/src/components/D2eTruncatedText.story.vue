<script setup lang="ts">
import D2eTruncatedText from "./D2eTruncatedText.vue";
import D2eTooltip from "./D2eTooltip.vue";
</script>

<template>
  <Story title="D2eTruncatedText" group="components">
    <Variant title="truncated and fitting">
      <div
        style="display: flex; flex-direction: column; gap: 12px; width: 220px"
      >
        <D2eTruncatedText
          style="
            display: block;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          "
          text="SNRI Users Researcher trial Hello Hospital"
        />
        <D2eTruncatedText
          style="
            display: block;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          "
          text="SNRI Users"
        />
      </div>
    </Variant>

    <Variant title="tooltip">
      <D2eTooltip text="Filter summary">
        <template #activator="{ props }">
          <span v-bind="props">Hover me</span>
        </template>
      </D2eTooltip>
    </Variant>
  </Story>
</template>
