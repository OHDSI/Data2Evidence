<template>
  <D2eTextField
    class="d2e-search-field"
    :model-value="modelValue"
    :placeholder="placeholder"
    prepend-inner-icon="mdi-magnify"
    :hide-details="true"
    v-bind="$attrs"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import D2eTextField from "./D2eTextField.vue";

interface Props {
  modelValue?: string;
  placeholder?: string;
}

withDefaults(defineProps<Props>(), {
  modelValue: "",
  placeholder: "Search",
});

defineEmits<{
  "update:modelValue": [value: string];
}>();

defineOptions({ inheritAttrs: false });
</script>

<style scoped lang="scss">
.d2e-search-field {
  font-family: var(--d2e-font-family);

  :deep(.v-field) {
    padding-inline: var(--d2e-spacing-xs-s);
    border-radius: var(--d2e-radius-sm);
  }

  :deep(.v-field__outline) {
    --v-field-border-opacity: 1;
    --v-field-border-width: var(--d2e-border-width-sm);
    color: var(--d2e-color-neutral-light);
  }

  :deep(.v-field:hover .v-field__outline) {
    color: var(--d2e-color-neutral);
  }

  :deep(.v-field--focused .v-field__outline) {
    --v-field-border-width: var(--d2e-border-width-md);
    color: var(--d2e-color-primary);
  }

  :deep(.v-field__input) {
    min-height: 40px;
    padding: 0 0 0 6px;
    color: var(--d2e-color-neutral-black);
    font-size: var(--d2e-font-body1-size);
    font-weight: var(--d2e-font-body1-weight);
  }

  :deep(.v-field__input::placeholder),
  :deep(.v-field__input input::placeholder) {
    color: var(--d2e-color-neutral-light);
    font-style: italic;
    opacity: 1;
  }

  :deep(.v-field__prepend-inner) {
    align-items: center;
    padding: 0;

    .v-icon {
      font-size: 24px;
      color: var(--d2e-color-text-secondary);
      opacity: 1;
    }
  }
}
</style>
