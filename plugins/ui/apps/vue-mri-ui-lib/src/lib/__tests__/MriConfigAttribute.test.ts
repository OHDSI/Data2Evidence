import { describe, expect, it } from 'vitest'
import MriConfigAttribute from '../MriConfigAttribute'

const make = (internal: any) =>
  new (MriConfigAttribute as any)('imageoccurrence.attributes.action', internal, 'imageoccurrence')

describe('MriConfigAttribute link accessors', () => {
  it('getPatientListLink returns the link config when present', () => {
    const attr = make({ patientlist: { visible: true, link: { label: 'OHIF viewer' } } })
    expect(attr.getPatientListLink()).toEqual({ label: 'OHIF viewer' })
  })

  it('getPatientListLink returns undefined when there is no link config', () => {
    expect(make({ patientlist: { visible: true } }).getPatientListLink()).toBeUndefined()
    expect(make({}).getPatientListLink()).toBeUndefined()
  })
})
