<template>
  <v-progress-circular
    v-bind="$attrs"
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <!-- Pass through all slots -->
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </v-progress-circular>
</template>

<script setup lang="ts">
/**
 * VProgressCircular - A pass-through wrapper for Vuetify's VProgressCircular component
 *
 * This component provides a thin wrapper around Vuetify's v-progress-circular that:
 * - Passes through all props via v-bind="$attrs"
 * - Passes through all slots dynamically
 * - Provides proper v-model support via modelValue prop
 *
 * Usage:
 * <VProgressCircular :model-value="50" :size="48" :width="4" />
 * <VProgressCircular indeterminate />
 *
 * With v-model:
 * <VProgressCircular v-model="progress" />
 *
 * With default slot for inner content:
 * <VProgressCircular :model-value="progress">{{ progress }}%</VProgressCircular>
 *
 * All Vuetify VProgressCircular props are supported.
 */

interface Props {
  modelValue?: number
}

withDefaults(defineProps<Props>(), {
  modelValue: 0,
})

defineEmits<{
  'update:modelValue': [value: number]
}>()
</script>

<style scoped></style>
