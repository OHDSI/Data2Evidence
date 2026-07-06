import { beforeEach, describe, expect, it } from 'vitest'

describe('bootstrap/themeBootstrap', () => {
  beforeEach(() => {
    document.body.className = ''
  })

  it('applies d2e theme class and removes atlas class', async () => {
    const { applyAppTheme } = await import('../themeBootstrap')

    applyAppTheme('atlas')
    applyAppTheme('d2e')

    expect(document.body.classList.contains('theme-d2e')).toBe(true)
    expect(document.body.classList.contains('theme-atlas')).toBe(false)
  })

  it('applies atlas theme class and removes d2e class', async () => {
    const { applyAppTheme } = await import('../themeBootstrap')

    applyAppTheme('d2e')
    applyAppTheme('atlas')

    expect(document.body.classList.contains('theme-atlas')).toBe(true)
    expect(document.body.classList.contains('theme-d2e')).toBe(false)
  })

  it('loads theme stylesheet module without throwing', async () => {
    const { applyAppTheme } = await import('../themeBootstrap')

    applyAppTheme('d2e')
    expect(typeof applyAppTheme).toBe('function')
  })
})
