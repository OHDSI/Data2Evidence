export const applyTheme = (theme: 'atlas' | 'd2e') => {
  document.body.classList.remove('theme-atlas', 'theme-d2e')
  document.body.classList.add(`theme-${theme}`)
}
