<template>
  <transition name="fade">
    <div class="chartPopoverDrill" v-bind:style="popoverStyle">
      <span class="arrowDown"></span>
      <header class="popover-header">
        <div class="popover-header-container">
          <span class="popover-header-text">{{ getText('MRI_PA_CURRENT_SELECTION') }}</span>
          <appButton
            class="popover-header-close"
            :tooltip="getText('MRI_PA_CLOSE')"
            :click="onClose"
            :icon="'close'"
          ></appButton>
        </div>
      </header>
      <div class="popover-body">
        <slot name="body"></slot>
      </div>
      <div class="popover-footer">
        <appButton :click="drilldown" :text="getText('MRI_PA_DRILL_DOWN')" :icon="'drilldown'"></appButton>
      </div>
    </div>
  </transition>
</template>

<script lang="ts">
import { mapGetters } from 'vuex'
import appButton from '../lib/ui/app-button.vue'

export default {
  name: 'chartPopoverDrill',
  props: ['blur', 'position'],
  computed: {
    ...mapGetters(['getText']),
    popoverStyle() {
      const style: any = {}
      if (this.position && (this.position.left || this.position.right || this.position.top || this.position.bottom)) {
        if (this.position.left) {
          style.left = this.position.left
        }
        if (this.position.right) {
          style.right = this.position.right
        }
        if (this.position.top) {
          style.top = this.position.top
        }
        if (this.position.bottom) {
          style.bottom = this.position.bottom
        }
        if (this.position.height) {
          style.height = this.position.height - 16
        }
        if (this.position.width) {
          style.width = this.position.width
        }

        Object.keys(style).forEach(prop => {
          style[prop] = `${style[prop]}px`
        })
      } else {
        style.margin = '0px auto'
      }
      return style
    },
  },
  methods: {
    drilldown() {
      this.$emit('drilldown')
    },
    onClose: function close() {
      this.$emit('close')
    },
  },
  components: {
    appButton,
  },
}
</script>
<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>
