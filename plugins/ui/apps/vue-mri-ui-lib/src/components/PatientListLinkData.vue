<template>
  <a
    v-if="isValidLink"
    class="patient-list-link"
    :href="url"
    target="_blank"
    rel="noopener noreferrer"
  >
    <span>{{ label }}</span>
    <ExternalLinkIcon class="patient-list-link__icon" />
  </a>
  <span v-else>{{ text }}</span>
</template>

<script lang="ts">
import ExternalLinkIcon from './icons/ExternalLinkIcon.vue'
import { isValidHttpUrl } from '../utils/urlUtils'

// Generic fallback link text used only when the attribute config does not
// supply a `patientlist.link.label`. A config-provided label (e.g. "OHIF
// viewer" for the radiology column) always takes precedence.
const DEFAULT_LINK_LABEL = 'Open'

function hasProp(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop)
}

export default {
  name: 'patientListLinkData',
  components: { ExternalLinkIcon },
  props: ['item', 'meta'],
  computed: {
    url(): string | null {
      if (this.item && hasProp(this.item, this.meta.path)) {
        return this.item[this.meta.path]
      }
      return null
    },
    text(): string {
      return this.url == null ? '' : String(this.url)
    },
    label(): string {
      return this.meta.link && this.meta.link.label ? this.meta.link.label : DEFAULT_LINK_LABEL
    },
    isValidLink(): boolean {
      return isValidHttpUrl(this.url)
    },
  },
}
</script>

<style scoped>
.patient-list-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.patient-list-link__icon {
  flex: 0 0 auto;
}
</style>
