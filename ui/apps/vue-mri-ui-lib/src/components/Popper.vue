<template>
  <div ref="content" style="display: none">
    <slot />
  </div>
</template>

<script lang="ts">
import Popper from 'popper.js'

const BoundaryIsValid = value =>
  typeof value === 'string' ? ['scrollParent', 'window', 'viewport'].includes(value) : true

const TriggersIsValid = value =>
  value
    .trim()
    .split(/\s+/)
    .reduce((valid, t) => {
      return valid && ['hover', 'click', 'focus'].includes(t)
    }, true)

const PlacementIsValid = value => {
  const placements = [
    'auto',
    'auto-start',
    'auto-end',
    'top',
    'top-start',
    'top-end',
    'right',
    'right-start',
    'right-end',
    'bottom',
    'bottom-start',
    'bottom-end',
    'left',
    'left-start',
    'left-end',
  ]
  return placements.includes(value)
}

export default {
  name: 'popper',
  props: {
    target: {
      // String ID of element, or element/component reference
      type: [String, Object, HTMLElement, Function],
      required: true,
    },
    placement: {
      type: String,
      default: 'bottom',
      validator: PlacementIsValid,
    },
    triggers: {
      // Event to trigger the popper
      // Space-delimited for multiple triggers
      type: String,
      default: 'click',
      validator: TriggersIsValid,
    },
    container: {
      // String ID of container, if null body is used (default)
      type: String,
      default: null,
    },
    boundary: {
      // String: scrollParent, window, or viewport
      // Element: element reference
      type: [String, HTMLElement],
      default: 'scrollParent',
      validator: BoundaryIsValid,
    },
    arrowElement: {
      type: [String, Element],
    },
    wrapperHTML: {
      // Single HTML element without any child
      type: String,
      default: '<div class="popper" role="popper"></div>',
    },
    showOnCreate: { type: Boolean, default: false },
    outsideDismiss: { type: Boolean, default: true },
    autoSize: { type: Boolean, default: true },
  },
  data() {
    return {
      $popper: null,
      targetEl: null,
      popperEl: null,
      containerEl: null,
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.create()
    })
  },
  beforeDestroy() {
    this.setListeners(false)
    this.hide()

    this.targetEl = null
    this.containerEl = null
    this.popperEl = null
  },
  watch: {
    target(target, old) {
      if (this.targetEl !== null) {
        this.create(true)
      }
    },
  },
  methods: {
    create(recreate) {
      if (this.target) {
        this.targetEl = this.getTarget(recreate)
        if (this.targetEl) {
          this.containerEl = this.getContainer()

          if (this.showOnCreate) {
            if (recreate) {
              this.setListeners(false)
              this.hide()
            }
            this.show()
          }
          this.setListeners(true)
        }
      }
    },
    setListeners(on) {
      if (this.targetEl) {
        this.getEvents().forEach(event => {
          if (this.targetEl instanceof Element) {
            this.attachEvent(on, this.targetEl, event, this.handleEvent)
          }
        })
      }
    },
    setWhileOpenListeners(on) {
      const triggers = this.triggers.trim().split(/\s+/)

      if (this.popperEl && this.popperEl instanceof Element) {
        if (triggers.includes('focus')) {
          this.attachEvent(on, this.popperEl, 'focusout', this.handleEvent)
        } else if (triggers.includes('hover')) {
          this.attachEvent(on, this.popperEl, 'mouseleave', this.handleEvent)
        }
      }

      if (this.outsideDismiss) {
        this.attachEvent(on, window, 'click', this.clickOutside)
      }
    },
    getEvents() {
      const events = []
      const triggers = this.triggers.trim().split(/\s+/)

      triggers.forEach(trigger => {
        switch (trigger) {
          case 'hover':
            events.push('mouseenter')
            events.push('mouseleave')
            break
          case 'focus':
            events.push('focusin')
            events.push('focusout')
            break
          case 'blur':
            events.push('focusout')
            break
          case 'click':
            events.push('click')
            events.push('keydown')
            break
        }
      })

      return events
    },
    handleEvent(e) {
      const { type, target, relatedTarget, keyCode } = e

      switch (type) {
        case 'focusin':
        case 'mouseenter':
          this.show()
          break

        case 'focusout':
          if (!this.isOutside(relatedTarget)) {
            break
          }
          this.hide()
          break

        case 'mouseleave':
          if (this.isOutside(target)) {
            break
          }
          if (!this.isOutside(relatedTarget)) {
            break
          }
          this.hide()
          break

        case 'click':
          this.toggle()
          break

        case 'keydown':
          if (keyCode === 13) {
            this.show()
          } else if (keyCode === 27) {
            this.hide()
          }
          break
      }
    },
    toggle() {
      !this.popperEl ? this.show() : this.hide()
    },
    show() {
      if (!this.targetEl) {
        return
      }
      if (!document.body.contains(this.targetEl)) {
        return
      }

      this.popperEl = this.getWrapperElement()
      if (!this.popperEl) {
        return
      }

      this.$emit('show')

      const popperOpts = this.getPopperOpts()
      this.$popper = new Popper(this.targetEl, this.popperEl, popperOpts)
      this.$nextTick(() => {
        if (this.$popper) {
          this.$popper.scheduleUpdate()
        }
      })

      if (!document.body.contains(this.popperEl)) {
        this.containerEl.appendChild(this.popperEl)
        this.setPopperContent()

        if (this.autoSize) {
          if (this.popperEl.firstElementChild) {
            this.popperEl.firstElementChild.style.position = 'relative'
            this.popperEl.firstElementChild.style.overflowY = 'auto'
            this.popperEl.firstElementChild.style.maxHeight = `${this.getMaxHeight()}px`
          }
        }
      }

      this.setWhileOpenListeners(true)
    },
    hide() {
      if (!this.popperEl) {
        return
      }

      this.$emit('hide')
      this.cleanUp()
    },
    cleanUp() {
      this.setWhileOpenListeners(false)
      this.bringItBack()

      if (this.$popper) {
        this.$popper.destroy()
        this.$popper = null
      }
      if (this.popperEl) {
        if (this.popperEl.parentNode) {
          this.popperEl.parentNode.removeChild(this.popperEl)
        }

        this.popperEl = null
      }
    },
    clickOutside(event) {
      if (this.isOutside(event.target)) {
        this.hide()
      }
    },
    isOutside(element) {
      return !this.isPopperOrTarget(element)
    },
    isPopperOrTarget(el) {
      if (this.targetEl && this.targetEl.contains(el)) {
        return true
      }
      if (this.popperEl && this.popperEl.contains(el)) {
        return true
      }
      return false
    },
    getMaxHeight(reduceBy = 7) {
      if (this.containerEl) {
        return this.containerEl.getBoundingClientRect().height - reduceBy
      }
      return window.innerHeight - reduceBy
    },
    getTarget(recreate) {
      if (this.target && (!this.targetEl || recreate)) {
        let target = this.target
        if (typeof target === 'function') {
          target = target()
        }
        if (typeof target === 'string') {
          // Assume ID of element
          return document.getElementById(/^#/.test(target) ? target.slice(1) : target)
        } else if (typeof target === 'object') {
          if (target.$el && target.$el.nodeType) {
            // Component reference
            return target.$el
          } else if (target && target.nodeType) {
            // Element reference
            return target
          }
        }
        return null
      }
      return this.targetEl
    },
    getContainer() {
      if (!this.containerEl) {
        const body = document.body
        return this.container ? this.select(this.container, body) : body
      }
      return this.containerEl
    },
    getWrapperElement() {
      if (!this.popperEl) {
        const div = document.createElement('div')
        div.innerHTML = this.wrapperHTML.trim()
        this.mergeElementClasses(div)
        return div.firstElementChild
      }
      return this.popperEl
    },
    getPopperOpts(): Popper.PopperOptions {
      const opts: Popper.PopperOptions = {
        placement: this.placement,
        modifiers: {
          preventOverflow: {
            boundariesElement: this.boundary,
          },
        },
      }

      if (this.arrowElement) {
        if (opts.modifiers) {
          opts.modifiers.arrow = { element: this.arrowElement }
        }
      }

      return opts
    },
    setPopperContent(isHtml = true) {
      const container = this.popperEl
      const content = this.getPopperContent()

      if (!container) {
        return
      }
      if (!content) {
        return
      }

      if (isHtml) {
        if (content.parentElement !== container) {
          container.innerHTML = ''
          container.appendChild(content)
        }
      } else {
        container.innerText = content.innerText
      }
    },
    getPopperContent() {
      if (this.$refs.content && this.$refs.content.nodeType) {
        return this.$refs.content.firstElementChild
      }
    },
    bringItBack() {
      if (this.$refs.content && this.popperEl && this.popperEl.firstElementChild) {
        this.$refs.content.innerHTML = ''
        this.$refs.content.appendChild(this.popperEl.firstElementChild)
      }
    },
    mergeElementClasses(target) {
      if (!this.$el.className || !target || !target.firstElementChild) {
        return
      }

      const classes = this.$el.className.trim().split(/\s+/)
      target.firstElementChild.className += ` ${classes}`
    },
    attachEvent(isAttach, element, type, listener) {
      isAttach ? element.addEventListener(type, listener) : element.removeEventListener(type, listener)
    },
    select(selector, element) {
      if (!(element && element.nodeType)) {
        element = document
      }
      return element.querySelector(selector) || null
    },
  },
}
</script>
