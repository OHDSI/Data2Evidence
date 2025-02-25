<template>
  <div class="resize-observer" tabindex="-1"></div>
</template>

<script>
/**
 * MIT License. Copyright Guillaume Chau.
 * Reference: https://github.com/Akryum/vue-resize/blob/master/src/components/ResizeObserver.vue
 */
import BrowserUtils from '../utils/BrowserUtils'
import { debounce } from 'underscore'

export default {
  name: 'resizeObserver',
  props: {
    debounce: {
      type: Number,
      default: 300,
    },
  },
  data() {
    return {
      width: 0,
      height: 0,
      isIE: false,
    }
  },
  mounted() {
    this.isIE = BrowserUtils.getIEVersion() !== -1

    this.debounceCompareAndNotify = debounce(this.compareAndNotify, this.debounce)

    this.$nextTick(() => {
      this.width = this.$el.offsetWidth
      this.height = this.$el.offsetHeight
    })

    this.detector = document.createElement('object')
    this.detector.setAttribute('aria-hidden', 'true')
    this.detector.setAttribute('tabindex', -1)
    this.detector.onload = this.addResizeHandlers
    this.detector.type = 'text/html'
    if (this.isIE) {
      this.$el.appendChild(this.detector)
    }
    this.detector.data = 'about:blank'
    if (!this.isIE) {
      this.$el.appendChild(this.detector)
    }
  },
  beforeDestroy() {
    this.removeResizeHandlers()
  },
  methods: {
    compareAndNotify() {
      if (this.width !== this.$el.offsetWidth || this.height !== this.$el.offsetHeight) {
        this.width = this.$el.offsetWidth
        this.height = this.$el.offsetHeight

        const emitArgs = { width: this.width, height: this.height }
        this.$emit('notify', emitArgs)
      }
    },
    addResizeHandlers() {
      this.detector.contentDocument.defaultView.addEventListener('resize', this.debounceCompareAndNotify)
      this.compareAndNotify()
    },
    removeResizeHandlers() {
      if (this.detector && this.detector.onload) {
        if (!this.isIE && this.detector.contentDocument) {
          this.detector.contentDocument.defaultView.removeEventListener('resize', this.debounceCompareAndNotify)
        }
        delete this.detector.onload
      }
    },
  },
}
</script>

<style scoped>
.resize-observer {
  position: absolute;
  top: 0;
  left: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  border: none;
  background-color: transparent;
  pointer-events: none;
  display: block;
  overflow: hidden;
  opacity: 0;
}

.resize-observer :deep(object) {
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
  pointer-events: none;
  z-index: -1;
}
</style>
