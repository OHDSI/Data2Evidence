export default {
  // When the bound element is inserted into the DOM...
  mounted(el) {
    // Focus the element
    el.addEventListener('click', () => {
      el.focus()
    })
  },
}
