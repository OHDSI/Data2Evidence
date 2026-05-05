import { describe, expect, it } from 'vitest'

describe('bootstrap/mountContainerLayout', () => {
  it('applies full-height flex styles to mount container and wrapper', async () => {
    const { applyMountContainerLayout } = await import('../mountContainerLayout')

    const mountContainer = document.createElement('div')
    mountContainer.id = 'single-spa-application:mri-app'
    const wrapper = document.createElement('div')
    wrapper.className = 'single-spa-container'
    mountContainer.appendChild(wrapper)
    document.body.appendChild(mountContainer)

    applyMountContainerLayout('single-spa-application:mri-app')

    expect(mountContainer.style.height).toBe('100%')
    expect(mountContainer.style.display).toBe('flex')
    expect(mountContainer.style.flexDirection).toBe('column')
    expect(mountContainer.style.flex).toContain('1')
    expect(mountContainer.style.minHeight).toBe('0')

    expect(wrapper.style.height).toBe('100%')
    expect(wrapper.style.display).toBe('flex')
    expect(wrapper.style.flexDirection).toBe('column')
    expect(wrapper.style.flex).toContain('1')
    expect(wrapper.style.minHeight).toBe('0')
  })

  it('does nothing when containerId is missing', async () => {
    const { applyMountContainerLayout } = await import('../mountContainerLayout')

    expect(() => applyMountContainerLayout(undefined)).not.toThrow()
  })
})
