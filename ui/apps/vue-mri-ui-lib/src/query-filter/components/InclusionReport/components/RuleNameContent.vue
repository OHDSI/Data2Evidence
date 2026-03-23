<script setup lang="ts">
import { computed } from 'vue'
import type { RuleFilterCardDetails } from '@/query-filter/types/InclusionReportTypes'

const props = defineProps<{
  stat: { id: number; name: string; isExclude: boolean }
  filterCardDetails?: RuleFilterCardDetails[]
}>()

/** Pairs each non-OR name part with its corresponding FilterCardDetail (if available) */
const nameParts = computed(() => {
  const parts = props.stat.name.split(/\b(OR)\b/)
  const ruleDetails = props.filterCardDetails?.[props.stat.id]
  let fcIndex = 0
  return parts.map(part => ({
    text: part,
    isOr: part === 'OR',
    fc: part !== 'OR' ? ruleDetails?.[fcIndex++] : undefined,
  }))
})
</script>

<template>
  <span>{{ stat.isExclude ? '-' : '+' }}&nbsp;</span>
  <template v-for="(part, i) in nameParts" :key="i">
    <b v-if="part.isOr">OR</b>
    <template v-else>
      {{ part.text }}
      <div v-if="part.fc" class="filter-card-details">
        <template v-for="attribute in part.fc.visibleAttributes" :key="attribute.name">
          <div class="bookmark-attribute">
            <span class="bookmark-element">{{ attribute.name }}: </span>
            <span
              v-for="(constraint, cIdx) in attribute.visibleConstraints"
              :key="constraint"
              class="bookmark-element bookmark-constraint"
              >{{ constraint }}{{ cIdx < attribute.visibleConstraints.length - 1 ? ', ' : '' }}</span
            >
          </div>
        </template>
        <template v-for="atf in part.fc.visibleAdvanceTime" :key="atf">
          <div class="bookmark-attribute">
            <span class="bookmark-element">{{ atf.replace(/<\/?b>/g, '') }}</span>
          </div>
        </template>
      </div>
    </template>
  </template>
</template>
