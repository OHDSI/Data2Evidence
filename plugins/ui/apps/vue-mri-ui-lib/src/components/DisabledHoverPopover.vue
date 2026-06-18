<template>
  <span ref="trigger" class="disabled-hover-popover" @mouseenter="onMouseEnter">
    <slot />
    <dialogBox
      v-if="show"
      @close="show = false"
      :dim="false"
      :position="popoverPosition"
      :dialogWidth="dialogWidth"
      :arrow="arrow"
      :onMouseLeaveClose="true"
    >
      <template v-slot:body>
        <div class="patientCountContent-container">
          <div class="patientCountHeader">
            <label
              ><strong>{{ header }}</strong></label
            >
          </div>
          <div class="patientCountContent-data">{{ message }}</div>
        </div>
      </template>
    </dialogBox>
  </span>
</template>

<script lang="ts">
import dialogBox from './DialogBox.vue'

export default {
  name: 'DisabledHoverPopover',
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
    header: {
      type: String,
      default: '',
    },
    message: {
      type: String,
      default: '',
    },
    dialogWidth: {
      type: String,
      default: '302px',
    },
    arrow: {
      type: String,
      default: 'arrowUp',
    },
  },
  data() {
    return {
      show: false,
      popoverPosition: {} as Record<string, string>,
    }
  },
  methods: {
    onMouseEnter() {
      if (!this.disabled) return
      const rect = (this.$refs.trigger as HTMLElement).getBoundingClientRect()
      const popoverWidth = parseFloat(this.dialogWidth) || 302
      const arrowFraction = this.arrow === 'arrowUp' ? 0.55 : 0.5
      this.popoverPosition = {
        top: `${rect.bottom + 12}px`,
        left: `${rect.left + rect.width / 2 - popoverWidth * arrowFraction}px`,
      }
      this.show = true
    },
  },
  components: {
    dialogBox,
  },
}
</script>

<style scoped>
.disabled-hover-popover {
  display: inline-flex;
  align-items: center;
}
.patientCountContent-data {
  color: var(--color-neutral);
}
</style>
