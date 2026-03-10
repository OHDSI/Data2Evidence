<template>
  <v-dialog v-bind="$attrs" :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <!-- Pass through all slots -->
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </v-dialog>
</template>

<script setup lang="ts">
/**
 * VDialog - A pass-through wrapper for Vuetify's VDialog component
 *
 * This component provides a thin wrapper around Vuetify's v-dialog that:
 * - Passes through all props via v-bind="$attrs"
 * - Passes through all slots dynamically
 * - Passes through all events via inheritAttrs
 * - Provides proper v-model support via modelValue prop
 *
 * Usage:
 * <v-dialog v-model="dialog" max-width="600">
 *   <template #activator="{ props }">
 *     <v-btn v-bind="props">Open Dialog</v-btn>
 *   </template>
 *   <v-card>
 *     <v-card-title>Dialog Title</v-card-title>
 *     <v-card-text>Dialog content goes here</v-card-text>
 *   </v-card>
 * </v-dialog>
 *
 * All Vuetify VDialog props are supported:
 */

interface Props {
  modelValue?: boolean
}

withDefaults(defineProps<Props>(), {
  modelValue: false,
})

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<style scoped></style>
