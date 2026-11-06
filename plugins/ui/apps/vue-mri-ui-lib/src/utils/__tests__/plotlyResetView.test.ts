import { describe, it, expect, vi } from 'vitest'
import { createResetViewButton, ignoreNonPrimaryDrag } from '../plotlyResetView'

describe('createResetViewButton', () => {
  it('describes the Reset view mode bar button', () => {
    const button = createResetViewButton(() => undefined)

    expect(button.name).toBe('resetScaleCustom')
    expect(button.title).toBe('Reset view')
    expect(button.icon.path).toMatch(/^m857 350/)
    expect(button.icon.transform).toBe('matrix(1 0 0 -1 0 850)')
  })

  it('hands the clicked graph to the reset handler', () => {
    const onReset = vi.fn()
    const graphDiv = document.createElement('div')

    createResetViewButton(onReset).click(graphDiv)

    expect(onReset).toHaveBeenCalledWith(graphDiv)
  })
})

describe('ignoreNonPrimaryDrag', () => {
  const pressOn = (init: MouseEventInit) => {
    const graphDiv = document.createElement('div')
    const dragLayer = document.createElement('div')
    graphDiv.appendChild(dragLayer)
    graphDiv.addEventListener('mousedown', ignoreNonPrimaryDrag, true)
    const plotlyDrag = vi.fn()
    dragLayer.addEventListener('mousedown', plotlyDrag)

    dragLayer.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, ...init }))
    return plotlyDrag
  }

  it('lets a primary button press start a drag', () => {
    expect(pressOn({ button: 0 })).toHaveBeenCalledOnce()
  })

  it('keeps a secondary button press from starting a drag', () => {
    expect(pressOn({ button: 2 })).not.toHaveBeenCalled()
  })

  it('keeps a middle button press from starting a drag', () => {
    expect(pressOn({ button: 1 })).not.toHaveBeenCalled()
  })

  it('keeps a control-click, which macOS treats as a right click, from starting a drag', () => {
    expect(pressOn({ button: 0, ctrlKey: true })).not.toHaveBeenCalled()
  })
})
