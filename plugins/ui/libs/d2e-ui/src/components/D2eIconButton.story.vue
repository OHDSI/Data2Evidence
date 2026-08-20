<script setup lang="ts">
import D2eIconButton from "./D2eIconButton.vue";
</script>

<template>
  <Story title="D2eIconButton" group="components">
    <Variant title="categories">
      <div style="display: flex; gap: 12px; align-items: center">
        <D2eIconButton
          category="no-stroke"
          icon="mdi-bell"
          aria-label="Notifications"
        />
        <D2eIconButton
          category="secondary"
          icon="mdi-bell"
          aria-label="Notifications"
        />
        <D2eIconButton
          category="primary"
          icon="mdi-bell"
          aria-label="Notifications"
        />
      </div>
    </Variant>

    <Variant title="sizes">
      <div style="display: flex; gap: 12px; align-items: center">
        <D2eIconButton size="sm" icon="mdi-bell" aria-label="Small" />
        <D2eIconButton size="md" icon="mdi-bell" aria-label="Medium" />
        <D2eIconButton size="lg" icon="mdi-bell" aria-label="Large" />
      </div>
    </Variant>

    <Variant title="states">
      <div style="display: flex; gap: 12px; align-items: center">
        <D2eIconButton
          category="primary"
          icon="mdi-plus"
          aria-label="Enabled"
        />
        <D2eIconButton
          category="primary"
          icon="mdi-plus"
          aria-label="Disabled"
          disabled
        />
        <D2eIconButton
          icon="mdi-delete"
          aria-label="Disabled no stroke"
          disabled
        />
      </div>
    </Variant>
  </Story>
</template>
