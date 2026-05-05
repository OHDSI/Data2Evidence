const applyFlexFullHeight = (element: HTMLElement) => {
  element.style.height = '100%'
  element.style.display = 'flex'
  element.style.flexDirection = 'column'
  element.style.flex = '1'
  element.style.minHeight = '0'
}

export const applyMountContainerLayout = (containerId?: string) => {
  if (!containerId) {
    return
  }

  const mountContainer = document.getElementById(containerId)
  if (!mountContainer) {
    return
  }

  applyFlexFullHeight(mountContainer)

  const firstChild = mountContainer.firstElementChild
  if (firstChild instanceof HTMLElement) {
    applyFlexFullHeight(firstChild)
  }
}
