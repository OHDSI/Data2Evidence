import { beforeEach, describe, expect, it } from 'vitest'
import BooleanContainers from '../BooleanContainers'
import ControlGenerator from '../ControlGenerator'
import InternalFilterRepresentation from '../InternalFilterRepresentation'
import BoolContainerModel from '../../models/BoolContainerModel'
import KeyCounter from '../../utils/KeyCounter'

const PROC = 'patient.interactions.proc'
const VISIT = 'patient.interactions.visit'
const EPISODE = 'patient.interactions.episode'
const VISIT_DETAIL = 'patient.interactions.visitdetail'

function cardConfig(path: string, name: string, parentInteraction?: object) {
  return {
    getConfigPath: () => path,
    getName: () => name,
    getFilterAttributes: () => [],
    hasAnnotation: () => false,
    oInternalConfigFilterCard: parentInteraction ? { parentInteraction } : {},
  }
}

const configCards: Record<string, any> = {
  [PROC]: cardConfig(PROC, 'Procedure Occurrence', {
    possibleParent: [EPISODE, VISIT],
    parentLabel: 'Episode/Visit parent',
    parentInteractionsMapping: [
      { parentInteraction: VISIT, parentMappingInteractionLabel: 'Visit parent' },
      { parentInteraction: EPISODE, parentMappingInteractionLabel: 'Episode parent' },
    ],
  }),
  [VISIT]: cardConfig(VISIT, 'Visit'),
  [EPISODE]: cardConfig(EPISODE, 'Episode'),
  [VISIT_DETAIL]: cardConfig(VISIT_DETAIL, 'Visit Detail'),
}

const mriFrontendConfig = {
  getFilterCardByPath: (path: string) => configCards[path],
  getUnmodified: () => ({}),
}

function emptyAttribute(attrKey: string) {
  return new InternalFilterRepresentation.Attribute({
    configPath: `${PROC}.attributes.${attrKey}`,
    instanceID: `${PROC}.1.attributes.${attrKey}`,
    constraints: new BooleanContainers.Or([]),
  })
}

function bookmarkIFR(parentInteraction: string | string[] | undefined, attrKeys: string[]) {
  const procCard = new InternalFilterRepresentation.FilterCard({
    configPath: PROC,
    instanceNumber: 1,
    instanceID: `${PROC}.1`,
    name: 'Procedure A',
    parentInteraction,
    attributes: new BooleanContainers.And(attrKeys.map(emptyAttribute)),
  })
  return new InternalFilterRepresentation.Filter({
    configMetadata: new InternalFilterRepresentation.ConfigMetadata('A', 'cfg-id'),
    cards: new BooleanContainers.And([new BooleanContainers.Or([procCard])]),
  })
}

function parentFieldsOf(result: { controls: any }) {
  const procCard = result.controls.props.boolfiltercontainers[0].props.filterCards[0]
  return procCard.props.constraints.map(c => ({ attrKey: c.props.attrKey, value: c.props.value?.value ?? null }))
}

describe('ControlGenerator - parent interactions', () => {
  beforeEach(() => {
    KeyCounter.getKeyCountingStrategy('default', 1)
  })

  it('opens an old bookmark with one string in the matching field', () => {
    const result = ControlGenerator.generateWithReport(
      bookmarkIFR(`${VISIT}.1`, ['parentInteraction']),
      new BoolContainerModel(mriFrontendConfig)
    )
    expect(parentFieldsOf(result)).toEqual([{ attrKey: 'parentInteraction_visit', value: `${VISIT}.1` }])
    expect(result.droppedParentLinks).toEqual([])
  })

  it('opens a bookmark with two parents', () => {
    const result = ControlGenerator.generateWithReport(
      bookmarkIFR([`${EPISODE}.1`, `${VISIT}.2`], ['parentInteraction_episode', 'parentInteraction_visit']),
      new BoolContainerModel(mriFrontendConfig)
    )
    expect(parentFieldsOf(result)).toEqual([
      { attrKey: 'parentInteraction_episode', value: `${EPISODE}.1` },
      { attrKey: 'parentInteraction_visit', value: `${VISIT}.2` },
    ])
  })

  it('opens an empty field that the user left open', () => {
    const result = ControlGenerator.generateWithReport(
      bookmarkIFR(undefined, ['parentInteraction_episode']),
      new BoolContainerModel(mriFrontendConfig)
    )
    expect(parentFieldsOf(result)).toEqual([{ attrKey: 'parentInteraction_episode', value: null }])
  })

  it('reports a link to a parent type that is not configured', () => {
    const result = ControlGenerator.generateWithReport(
      bookmarkIFR([`${VISIT_DETAIL}.1`, `${VISIT}.1`], ['parentInteraction_visit']),
      new BoolContainerModel(mriFrontendConfig)
    )
    expect(parentFieldsOf(result)).toEqual([{ attrKey: 'parentInteraction_visit', value: `${VISIT}.1` }])
    expect(result.droppedParentLinks).toEqual([
      { cardName: 'Procedure A', parentId: `${VISIT_DETAIL}.1`, parentName: `${VISIT_DETAIL}.1` },
    ])
  })

  it('accepts a string or a string array as the IFR parent', () => {
    expect(() => bookmarkIFR([`${VISIT}.1`], [])).not.toThrow()
    expect(() => bookmarkIFR(`${VISIT}.1`, [])).not.toThrow()
    expect(() => bookmarkIFR([1] as any, [])).toThrow()
  })
})
