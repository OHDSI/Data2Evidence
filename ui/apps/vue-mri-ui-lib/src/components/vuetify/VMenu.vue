<template>
  <v-menu v-bind="$attrs" v-model="isOpen">
    <template #activator="{ props: activatorProps }">
      <slot name="activator" :props="activatorProps" />
    </template>
    <v-list>
      <slot />
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
/**
 * This component provides a wrapper around Vuetify's v-menu that:
 * - Renders dropdown items inside a v-list
 * - Passes through all props via v-bind="$attrs"
 * - Provides an activator slot for the trigger element
 * - Provides a default slot for v-list-item entries
 *
 * Usage:
 * <VMenu>
 *   <template #activator="{ props }">
 *     <VButton v-bind="props">Open Menu</VButton>
 *   </template>
 *   <v-list-item @click="handleAction1">Action 1</v-list-item>
 *   <v-list-item @click="handleAction2">Action 2</v-list-item>
 * </VMenu>
 *
 * All Vuetify VMenu props are supported.
 */
import { ref } from 'vue'

const isOpen = ref(false)
</script>

<style lang="scss" scoped></style>
