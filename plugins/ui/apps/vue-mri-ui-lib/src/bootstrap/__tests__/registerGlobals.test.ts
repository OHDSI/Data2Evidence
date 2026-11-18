import { describe, expect, it, vi } from 'vitest'
import { D2E_DIALOG_ATTACH } from '@d2e/ui'
import { registerDirectivesAndComponents } from '../registerGlobals'
import { MRI_OVERLAY_TARGET } from '../overlayTarget'

describe('registerDirectivesAndComponents', () => {
  it('attaches D2eDialog to the vue-mri root, not to the first #app on the page', () => {
    const app = { component: vi.fn(), directive: vi.fn(), provide: vi.fn() }

    registerDirectivesAndComponents(app as never)

    expect(app.provide).toHaveBeenCalledWith(D2E_DIALOG_ATTACH, MRI_OVERLAY_TARGET)
    expect(MRI_OVERLAY_TARGET).toBe('.mri-app-vue-container')
  })
})
