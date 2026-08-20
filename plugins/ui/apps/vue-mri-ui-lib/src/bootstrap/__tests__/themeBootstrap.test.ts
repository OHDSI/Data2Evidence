import { beforeEach, describe, expect, it } from 'vitest'

describe('bootstrap/themeBootstrap', () => {
  beforeEach(() => {
    document.body.className = ''
  })

  it('applies d2e theme class and removes atlas class', async () => {
    const { applyAppTheme } = await import('../themeBootstrap')

    applyAppTheme()

    expect(document.body.classList.contains('theme-d2e')).toBe(true)
    expect(document.body.classList.contains('theme-atlas')).toBe(false)
  })

  it('removes a previously applied atlas class', async () => {
    const { applyAppTheme } = await import('../themeBootstrap')

    document.body.classList.add('theme-atlas')
    applyAppTheme()

    expect(document.body.classList.contains('theme-atlas')).toBe(false)
    expect(document.body.classList.contains('theme-d2e')).toBe(true)
  })

  it('loads theme stylesheet module without throwing', async () => {
    const { applyAppTheme } = await import('../themeBootstrap')

    applyAppTheme()
    expect(typeof applyAppTheme).toBe('function')
  })
})
