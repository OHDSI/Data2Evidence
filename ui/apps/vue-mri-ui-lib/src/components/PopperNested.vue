<template>
  <div ref="content" style="display: none">
    <slot />
  </div>
</template>

<script lang="ts">
import Popper from './Popper.vue'

export default {
  name: 'popperNested',
  extends: Popper,
  props: {
    subPopper: {
      // Store the child popper
      type: Object,
      default: null,
    },
  },
  watch: {
    subPopper(subPopper, old) {
      if (subPopper === old) {
        return
      }

      if (old == null && subPopper) {
        this.setWhileOpenListeners(true, subPopper)
      }

      if (subPopper == null && old) {
        this.setWhileOpenListeners(false, subPopper)
      }
    },
  },
  methods: {
    hide() {
      if (!this.popperEl) {
        return
      }

      this.$emit('hide')
      this.hideNestedPopper()
    },
    hideNestedPopper() {
      while (this.subPopper && this.subPopper.popperEl) {
        this.subPopper.hideNestedPopper()
      }
      this.cleanUp()
    },
    isOutside(element) {
      while (this.subPopper && this.subPopper.popperEl) {
        return this.subPopper.isOutside(element)
      }
      return !this.isPopperOrTarget(element)
    },
  },
}
</script>
