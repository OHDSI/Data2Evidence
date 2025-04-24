import { debounce } from 'underscore'

const positionWindow = (el, containerId) => {
  const clientRect = el.getBoundingClientRect()

  let containerWidth = window.innerWidth
  let containerHeight = window.innerHeight

  if (containerId) {
    const containerEl = document.getElementById(containerId)
    if (containerEl) {
      const { width, height } = containerEl.getBoundingClientRect()
      containerWidth = width
      containerHeight = height
    }
  }

  let marginRight = 0
  let marginTop = 0

  if (el.style.marginRight && el.style.marginRight.indexOf('px') > -1) {
    marginRight = parseFloat(el.style.marginRight)
  }

  if (el.style.marginTop && el.style.marginTop.indexOf('px') > -1) {
    marginTop = parseFloat(el.style.marginTop)
  }

  el.style.right = `${containerWidth / 2 - clientRect.width / 2 - marginRight}px`
  el.style.top = `${containerHeight / 2 - clientRect.height / 2 - marginTop}px`
}

const initWindowPosition = (el, containerId, context) => {
  const clientRect = el.getBoundingClientRect()
  if (clientRect.x) {
    el.style.marginRight = `${clientRect.x}px`
    el.style.marginLeft = `${clientRect.x}px`
  }
  if (clientRect.y) {
    el.style.marginTop = `${clientRect.y}px`
    el.style.marginBottom = `${clientRect.y}px`
  }

  context.$nextTick(() => {
    positionWindow(el, containerId)
  })
}

let debouncedFn
export default {
  mounted(el, binding, vnode) {
    initWindowPosition(el, binding.value, vnode.context)
  },
  beforeMount(el, binding) {
    debouncedFn = debounce(() => positionWindow(el, binding.value), 300)
    window.addEventListener('resize', debouncedFn)
  },
  unmounted() {
    window.removeEventListener('resize', debouncedFn)
  },
}
