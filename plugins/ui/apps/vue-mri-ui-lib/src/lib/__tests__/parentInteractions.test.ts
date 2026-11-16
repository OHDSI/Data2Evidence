import { describe, expect, it } from 'vitest'
import {
  cardTypeOf,
  collectParentIds,
  isCardOfType,
  isParentAttrKey,
  parentAttrKey,
  parentKeyOf,
  parentOptions,
  parentOptionsForCard,
  splitParentIds,
} from '../parentInteractions'

const VISIT = 'patient.interactions.visit'
const EPISODE = 'patient.interactions.episode'
const VISIT_DETAIL = 'patient.interactions.visitdetail'

const names: Record<string, string> = {
  [VISIT]: 'Visit',
  [EPISODE]: 'Episode',
  [VISIT_DETAIL]: 'Visit Detail',
}
const nameOf = (path: string) => names[path] || ''

describe('parentInteractions', () => {
  describe('keys', () => {
    it('takes the last segment of the parent path', () => {
      expect(parentKeyOf(VISIT)).toBe('visit')
      expect(parentKeyOf('patient.conditions.acme.interactions.priDiag')).toBe('priDiag')
    })

    it('builds an attribute key without a dot', () => {
      expect(parentAttrKey(EPISODE)).toBe('parentInteraction_episode')
    })

    it('knows the old and the new parent keys', () => {
      expect(isParentAttrKey('parentInteraction')).toBe(true)
      expect(isParentAttrKey('parentInteraction_visit')).toBe(true)
      expect(isParentAttrKey('parentInteractionX')).toBe(false)
      expect(isParentAttrKey('visit')).toBe(false)
      expect(isParentAttrKey('_succ')).toBe(false)
    })
  })

  describe('card type', () => {
    it('removes the instance number', () => {
      expect(cardTypeOf(`${VISIT}.1`)).toBe(VISIT)
      expect(cardTypeOf(`${VISIT}.12`)).toBe(VISIT)
      expect(cardTypeOf(VISIT)).toBe(VISIT)
    })

    it('matches the exact parent path only', () => {
      expect(isCardOfType(`${VISIT}.1`, VISIT)).toBe(true)
      expect(isCardOfType(`${VISIT_DETAIL}.1`, VISIT)).toBe(false)
      expect(isCardOfType(`${VISIT}.1`, VISIT_DETAIL)).toBe(false)
    })
  })

  describe('parentOptions', () => {
    it('returns nothing without a config', () => {
      expect(parentOptions(undefined, nameOf, 'Parent')).toEqual([])
      expect(parentOptions({ possibleParent: [] }, nameOf, 'Parent')).toEqual([])
    })

    it('uses the mapping label for each parent, in config order', () => {
      const options = parentOptions(
        {
          possibleParent: [EPISODE, VISIT],
          parentLabel: 'Episode/Visit parent',
          parentInteractionsMapping: [
            { parentInteraction: VISIT, parentMappingInteractionLabel: 'Visit parent' },
            { parentInteraction: EPISODE, parentMappingInteractionLabel: 'Episode parent' },
          ],
        },
        nameOf,
        'Parent'
      )
      expect(options).toEqual([
        { parentPath: EPISODE, attrKey: 'parentInteraction_episode', label: 'Episode parent' },
        { parentPath: VISIT, attrKey: 'parentInteraction_visit', label: 'Visit parent' },
      ])
    })

    it('falls back to the parent label, then the name, then the default', () => {
      expect(
        parentOptions({ possibleParent: [VISIT], parentLabel: 'Visit Occurrence Parent' }, nameOf, 'Parent')[0].label
      ).toBe('Visit Occurrence Parent')
      expect(parentOptions({ possibleParent: [VISIT], parentLabel: '' }, nameOf, 'Parent')[0].label).toBe(
        'Visit parent'
      )
      expect(parentOptions({ possibleParent: ['patient.interactions.unknown'] }, nameOf, 'Parent')[0].label).toBe(
        'Parent'
      )
    })

    it('ignores a blank mapping label', () => {
      const options = parentOptions(
        {
          possibleParent: [VISIT],
          parentInteractionsMapping: [{ parentInteraction: VISIT, parentMappingInteractionLabel: '  ' }],
        },
        nameOf,
        'Parent'
      )
      expect(options[0].label).toBe('Visit parent')
    })

    it('replaces the default old label "parent" with "<name> parent" for one parent', () => {
      const labelFor = (parentLabel: string) =>
        parentOptions({ possibleParent: [VISIT], parentLabel }, nameOf, 'Parent')[0].label
      expect(labelFor('parent')).toBe('Visit parent')
      expect(labelFor('Parent ')).toBe('Visit parent')
      expect(labelFor('Visit Occurrence Parent')).toBe('Visit Occurrence Parent')
    })

    it('uses "<name> parent" for two parents without mapping labels', () => {
      const options = parentOptions(
        { possibleParent: [EPISODE, VISIT], parentLabel: 'Episode/Visit parent' },
        nameOf,
        'Parent'
      )
      expect(options.map(o => o.label)).toEqual(['Episode parent', 'Visit parent'])
    })

    it('adds the parent name when two labels are the same', () => {
      const options = parentOptions(
        {
          possibleParent: [EPISODE, VISIT],
          parentInteractionsMapping: [
            { parentInteraction: EPISODE, parentMappingInteractionLabel: 'Parent' },
            { parentInteraction: VISIT, parentMappingInteractionLabel: 'Parent' },
          ],
        },
        nameOf,
        'Parent'
      )
      expect(options.map(o => o.label)).toEqual(['Parent (Episode)', 'Parent (Visit)'])
    })
  })

  describe('splitParentIds', () => {
    const options = parentOptions({ possibleParent: [EPISODE, VISIT] }, nameOf, 'Parent')

    it('reads an old bookmark with one string', () => {
      expect(splitParentIds(`${VISIT}.1`, options)).toEqual({
        byAttrKey: { parentInteraction_visit: `${VISIT}.1` },
        dropped: [],
      })
    })

    it('reads an array of two parents', () => {
      expect(splitParentIds([`${VISIT}.2`, `${EPISODE}.1`], options)).toEqual({
        byAttrKey: { parentInteraction_visit: `${VISIT}.2`, parentInteraction_episode: `${EPISODE}.1` },
        dropped: [],
      })
    })

    it('ignores empty values', () => {
      expect(splitParentIds('', options)).toEqual({ byAttrKey: {}, dropped: [] })
      expect(splitParentIds(undefined, options)).toEqual({ byAttrKey: {}, dropped: [] })
      expect(splitParentIds(null, options)).toEqual({ byAttrKey: {}, dropped: [] })
      expect(splitParentIds(['', `${VISIT}.1`], options).dropped).toEqual([])
    })

    it('drops a parent whose type is not configured', () => {
      expect(splitParentIds([`${VISIT_DETAIL}.1`, `${VISIT}.1`], options)).toEqual({
        byAttrKey: { parentInteraction_visit: `${VISIT}.1` },
        dropped: [`${VISIT_DETAIL}.1`],
      })
    })

    it('drops a second parent of the same type', () => {
      expect(splitParentIds([`${VISIT}.1`, `${VISIT}.2`], options)).toEqual({
        byAttrKey: { parentInteraction_visit: `${VISIT}.1` },
        dropped: [`${VISIT}.2`],
      })
    })
  })

  describe('collectParentIds', () => {
    const options = parentOptions({ possibleParent: [EPISODE, VISIT] }, nameOf, 'Parent')

    it('returns the selected values in config order', () => {
      expect(
        collectParentIds(
          [
            { attrKey: 'parentInteraction_visit', value: `${VISIT}.1` },
            { attrKey: 'parentInteraction_episode', value: `${EPISODE}.3` },
          ],
          options
        )
      ).toEqual([`${EPISODE}.3`, `${VISIT}.1`])
    })

    it('leaves out empty fields and unknown keys', () => {
      expect(
        collectParentIds(
          [
            { attrKey: 'parentInteraction_visit', value: null },
            { attrKey: 'parentInteraction_episode', value: `${EPISODE}.1` },
            { attrKey: 'parentInteraction_other', value: 'x.1' },
          ],
          options
        )
      ).toEqual([`${EPISODE}.1`])
      expect(collectParentIds([], options)).toEqual([])
    })
  })

  describe('parentOptionsForCard', () => {
    const PROC = 'patient.interactions.proc'
    const cards: Record<string, any> = {
      [PROC]: {
        getName: () => 'Procedure Occurrence',
        oInternalConfigFilterCard: { parentInteraction: { possibleParent: [VISIT], parentLabel: '' } },
      },
      [VISIT]: { getName: () => 'Visit' },
    }
    const frontendConfig = { getFilterCardByPath: (path: string) => cards[path] }

    it('reads the card config and the parent names', () => {
      expect(parentOptionsForCard(frontendConfig, PROC)).toEqual([
        { parentPath: VISIT, attrKey: 'parentInteraction_visit', label: 'Visit parent' },
      ])
    })

    it('returns nothing for an unknown card', () => {
      expect(parentOptionsForCard(frontendConfig, 'patient.interactions.none')).toEqual([])
    })
  })
})
