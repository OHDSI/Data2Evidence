import Popper from 'popper.js'

const MRI_ROOT_CONTAINER = 'app'

const create = (reference, popper, options = {}) => {
  return new Popper(reference, popper, getDefaultOptions(options))
}

const destroy = (popper: Popper) => {
  if (popper) {
    popper.destroy()
  }
}

const getMaxHeight = (boundariesElement = MRI_ROOT_CONTAINER, buffer = 7) => {
  const vueContainer = document.getElementById(boundariesElement || MRI_ROOT_CONTAINER)
  if (vueContainer) {
    return vueContainer.getBoundingClientRect().height - buffer
  }
  return window.innerHeight - buffer
}

const getDefaultOptions = (options): Popper.PopperOptions => {
  return {
    placement: 'bottom-start',
    modifiers: {
      preventOverflow: {
        boundariesElement: document.getElementById(MRI_ROOT_CONTAINER) || 'scrollParent',
        ...options.modifiers.preventOverflow,
      },
      ...options.modifiers,
    },
    ...options,
  }
}

export default {
  create,
  destroy,
  getMaxHeight,
  defaultBoundaries: MRI_ROOT_CONTAINER,
}
