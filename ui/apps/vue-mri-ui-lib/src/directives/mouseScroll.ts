export default {
  mounted(el, { value }: { value?: (event: any) => void }) {
    if (!value) {
      return
    }
    const wheelEvent = event => {
      value(event)
    }
    el.addEventListener('mousewheel', wheelEvent)
    el.addEventListener('DOMMouseScroll', wheelEvent)
  },
}
