<template>
  <transition name="modal">
    <div class="chartPopover" v-bind:style="popoverStyle" @blur.native="onBlur">
      <header v-if="hasHeaderSlot" class="popover-header">
        <div class="popover-header-container">
          <slot name="header"></slot>
        </div>
      </header>
      <div v-if="hasBodySlot" class="popover-body">
        <slot name="body"></slot>
      </div>
      <div v-if="hasFooterSlot" class="popover-footer">
        <slot name="footer"></slot>
      </div>
    </div>
  </transition>
</template>

<script lang="ts">
export default {
  name: 'chartPopover',
  data() {
    return {
      adjustedPositioning: false,
      adjustedPosition: {},
    }
  },
  mounted() {
    const rect = this.$el.getBoundingClientRect()
    if (rect.left < 0) {
      this.adjustedPositioning = true
      this.adjustedPosition.left = '0px'
    } else if (this.position.left) {
      this.adjustedPosition.left = this.position.left
    }
    if (rect.right > window.innerWidth) {
      this.adjustedPositioning = true
      this.adjustedPosition.right = '0px'
      if (this.adjustedPosition.left) {
        delete this.adjustedPosition.left
      }
    } else if (this.position.right && !this.adjustedPosition.left) {
      this.adjustedPosition.right = this.position.right
    }
    if (rect.top < 0) {
      this.adjustedPositioning = true
      this.adjustedPosition.top = '0px'
    } else if (this.position.top) {
      this.adjustedPosition.top = this.position.top
    }
    if (rect.bottom > window.innerHeight) {
      this.adjustedPositioning = true
      this.adjustedPosition.bottom = '0px'
      if (this.adjustedPosition.top) {
        delete this.adjustedPosition.top
      }
    } else if (this.position.bottom && !this.adjustedPosition.top) {
      this.adjustedPosition.bottom = this.position.bottom
    }
  },
  props: ['blur', 'position'],
  computed: {
    hasHeaderSlot() {
      return !!this.$slots.header
    },
    hasBodySlot() {
      return !!this.$slots.body
    },
    hasFooterSlot() {
      return !!this.$slots.footer
    },
    popoverStyle() {
      const style: any = {}
      if (this.adjustedPositioning) {
        if (this.adjustedPosition.left) {
          style.left = this.adjustedPosition.left
        }
        if (this.adjustedPosition.right) {
          style.right = this.adjustedPosition.right
        }
        if (this.adjustedPosition.top) {
          style.top = this.adjustedPosition.top
        }
        if (this.adjustedPosition.bottom) {
          style.bottom = this.adjustedPosition.bottom
        }
      } else if (
        this.position &&
        (this.position.left || this.position.right || this.position.top || this.position.bottom)
      ) {
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
      } else {
        style.margin = '0px auto'
      }
      return style
    },
    onBlur() {
      this.$emit('blur')
    },
  },
}
</script>
