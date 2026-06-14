<template>
  <v-snackbar
    v-bind="$attrs"
    :model-value="modelValue"
    :timeout="timeout"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <!-- Pass through all slots -->
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </v-snackbar>
</template>

<script setup lang="ts">
/**
 * VSnackbar - A pass-through wrapper for Vuetify's VSnackbar component
 *
 * This component provides a thin wrapper around Vuetify's v-snackbar that:
 * - Passes through all props via v-bind="$attrs"
 * - Passes through all slots dynamically
 * - Provides proper v-model support via modelValue prop
 *
 * Usage:
 * <v-snackbar v-model="snackbar" location="top right" color="#C8E6C9" :timeout="3000">
 *   Message goes here
 * </v-snackbar>
 *
 * All Vuetify VSnackbar props are supported.
 */

interface Props {
  modelValue?: boolean
  timeout?: number | string
}

withDefaults(defineProps<Props>(), {
  modelValue: false,
  timeout: 5000,
})

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<style scoped></style>
