<template>
  <transition name="modal">
    <div v-bind:class="['modal-mask', { 'modal-mask-dim': dim }]">
      <div class="modal-wrapper" @click.self="$emit('close')" @keyup="keymonitor" tabindex="0">
        <div ref="dialogBody" class="modal-container" v-bind:style="dialogStyle" @mouseleave="onMouseLeave()">
          <loadingAnimation v-if="busy"></loadingAnimation>
          <span v-if="!!arrow" :class="arrowClasses" :style="arrowPosition"></span>
          <header v-if="hasHeaderSlot" class="modal-header">
            <div class="modal-header-container">
              <span>
                <slot name="header"></slot>
              </span>
            </div>
          </header>
          <div v-if="hasBodySlot" class="modal-body">
            <slot name="body"></slot>
          </div>
          <footer v-if="hasFooterSlot" class="modal-footer">
            <slot name="footer"></slot>
          </footer>
        </div>
      </div>
    </div>
  </transition>
</template>

<script lang="ts">
import LoadingAnimation from './LoadingAnimation.vue'

export default {
  name: 'dialogBox',
  props: {
    close: Number,
    dim: {
      type: Boolean,
      required: true,
      default: false,
    },
    position: {
      type: Object,
      default() {
        return null
      },
    },
    dialogWidth: {
      type: String,
      default: 'inherit',
    },
    arrow: {
      type: String,
      default() {
        return ''
      },
    },
    arrowPosition: {
      type: Object,
      default() {
        return null
      },
    },
    busy: {
      type: Boolean,
      default: false,
    },
    onMouseLeaveClose: {
      type: Boolean,
      default: false,
    },
  },
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
    dialogStyle() {
      const style: any = {}
      if (this.position && (this.position.left || this.position.right || this.position.top || this.position.bottom)) {
        style.position = 'fixed'
        if (this.position.left) {
          style.left = this.position.left
        }
        if (this.position.right) {
          style.right = this.position.right
        }
        if (this.position.top) {
          style.top = this.position.top

          if (!!window.navigator.userAgent.match(/Chrome|Firefox/)) {
            /*
            There is an offset of 46px (fiori launchpad app header) between getBoundingClientRect() and position=fixed.
            Due to the usage of 'perspective' and 'top' css properties (at viewPortContainer and shell-cntnt).
            This can be simply fixed by set the 'perspective' to none; However, majority of us consider the unknown impact.
            */
            const viewportContainer = document.getElementById('viewPortContainer')
            if (!!viewportContainer && !!this.position.top.match(/px$/)) {
              const offsetTop = window.innerHeight - viewportContainer.getBoundingClientRect().height
              style.top = `${parseFloat(this.position.top) - offsetTop}px`
            }
          }
        }
        if (this.position.bottom) {
          style.bottom = this.position.bottom
        }
      } else {
        style.margin = '0px auto'
      }

      if (this.dialogWidth) {
        style.width = this.dialogWidth
      }
      return style
    },
    arrowClasses() {
      return [this.arrow, { arrowUpVariant2: this.arrow === 'arrowUp' && this.hasHeaderSlot }]
    },
  },
  methods: {
    keymonitor({ key }) {
      if (key === 'Escape') {
        this.$emit('close')
      }
    },
    onMouseLeave() {
      if (this.onMouseLeaveClose) {
        this.$emit('close')
      }
    },
  },
  components: {
    LoadingAnimation,
  },
}
</script>
