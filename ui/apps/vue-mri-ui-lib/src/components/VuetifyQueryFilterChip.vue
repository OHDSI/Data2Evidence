<script lang="ts">
export default {
  name: 'VuetifyQueryFilterChip'
}
</script>

<script setup lang="ts">
import { computed, defineProps, defineEmits } from 'vue'
import { QueryFilterChip } from '../lib/models/QueryFilterModel'

const props = defineProps<{
  chip: QueryFilterChip
  removable?: boolean
  variant?: 'default' | 'primary' | 'secondary'
}>()

const emit = defineEmits(['remove'])

const chipColor = computed(() => {
  if (props.chip.color) {
    const colorMap: Record<string, string> = {
      blue: 'light-blue-lighten-4',
      green: 'green-lighten-4',
      red: 'red-lighten-4',
      yellow: 'yellow-lighten-4',
      purple: 'deep-purple-lighten-4',
      gray: 'grey-lighten-3',
    }
    return colorMap[props.chip.color] || 'light-blue-lighten-4'
  }

  const variantMap = {
    default: 'light-blue-lighten-4',
    primary: 'blue-lighten-4',
    secondary: 'grey-lighten-3',
  }
  
  return variantMap[props.variant || 'default']
})

const textColor = computed(() => {
  if (props.chip.color) {
    const colorMap: Record<string, string> = {
      blue: 'light-blue-darken-2',
      green: 'green-darken-2',
      red: 'red-darken-2',
      yellow: 'yellow-darken-3',
      purple: 'deep-purple-darken-2',
      gray: 'grey-darken-2',
    }
    return colorMap[props.chip.color] || 'light-blue-darken-2'
  }

  const variantMap = {
    default: 'light-blue-darken-2',
    primary: 'blue-darken-2',
    secondary: 'grey-darken-2',
  }
  
  return variantMap[props.variant || 'default']
})
</script>

<template>
  <v-chip
    :color="chipColor"
    :text-color="textColor"
    size="small"
    :closable="removable ?? true"
    @click:close="$emit('remove')"
    class="vuetify-query-filter-chip"
  >
    <v-icon start size="x-small">mdi-pencil</v-icon>
    {{ chip.label }}
  </v-chip>
</template>

<style lang="scss" scoped>
.vuetify-query-filter-chip {
  font-size: 13px;
  max-width: 200px;

  :deep(.v-chip__content) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>