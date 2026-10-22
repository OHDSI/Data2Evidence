<template>
  <D2eStatusChip
    :data-testid="testId"
    :variant="badge.variant"
    :icon="badge.icon"
    :label="badge.label"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { D2eStatusChip } from '@d2e/ui'
import type { D2eStatusChipVariant } from '@d2e/ui'
import type { AccessState } from '../composables/useDatasourceAccess'

interface AccessBadge {
  label: string
  icon: string
  variant: D2eStatusChipVariant
}

// The access/pending/denied colours are the D2E status-chip variants, so the
// chip styling (and its token wiring) comes entirely from D2eStatusChip — no
// local --ds-access-* overrides needed.
const ACCESS_BADGE: Record<AccessState, AccessBadge> = {
  approved: { label: 'Have access', icon: 'mdi-check-circle-outline', variant: 'have-access' },
  pending: { label: 'Pending access', icon: 'mdi-clock-outline', variant: 'pending-access' },
  'no-access': { label: 'No access', icon: 'mdi-lock-outline', variant: 'locked' },
  restricted: { label: 'Restricted', icon: 'mdi-alert-octagon-outline', variant: 'locked' },
}

const props = withDefaults(defineProps<{ access: AccessState; testId?: string }>(), {
  testId: 'access-badge',
})
const badge = computed(() => ACCESS_BADGE[props.access])
</script>
