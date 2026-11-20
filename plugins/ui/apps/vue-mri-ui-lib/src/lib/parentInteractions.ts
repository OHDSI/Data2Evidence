export const PARENT_ATTR_PREFIX = 'parentInteraction'

export interface ParentMapping {
  parentInteraction?: string
  parentMappingInteractionLabel?: string
}

export interface ParentConfig {
  possibleParent?: string[]
  parentLabel?: string
  parentInteractionsMapping?: ParentMapping[]
}

export interface ParentOption {
  parentPath: string
  attrKey: string
  label: string
}

export interface ParentFieldValue {
  attrKey: string
  value: string | null | undefined
}

export interface SplitParentIds {
  byAttrKey: Record<string, string>
  dropped: string[]
}

const INSTANCE_SUFFIX = /\.\d+$/

export function parentKeyOf(parentPath: string): string {
  return parentPath.substring(parentPath.lastIndexOf('.') + 1)
}

export function parentAttrKey(parentPath: string): string {
  return `${PARENT_ATTR_PREFIX}_${parentKeyOf(parentPath)}`
}

export function isParentAttrKey(attrKey: string): boolean {
  return attrKey === PARENT_ATTR_PREFIX || attrKey.startsWith(`${PARENT_ATTR_PREFIX}_`)
}

export function cardTypeOf(cardId: string): string {
  return cardId.replace(INSTANCE_SUFFIX, '')
}

export function isCardOfType(cardId: string, parentPath: string): boolean {
  return cardTypeOf(cardId) === parentPath
}

const nonBlank = (text: string | undefined | null): string => (text || '').trim()

function mappingLabel(config: ParentConfig, parentPath: string): string {
  const mapping = (config.parentInteractionsMapping || []).find(m => m.parentInteraction === parentPath)
  return nonBlank(mapping?.parentMappingInteractionLabel)
}

const DEFAULT_OLD_LABEL = 'parent'

function oldParentLabel(config: ParentConfig): string {
  const label = nonBlank(config.parentLabel)
  return label === DEFAULT_OLD_LABEL ? '' : label
}

export function parentOptions(
  config: ParentConfig | undefined,
  nameOf: (parentPath: string) => string,
  defaultLabel: string
): ParentOption[] {
  const parents = config?.possibleParent || []
  const fallbackLabel = (parentPath: string): string => {
    const name = nonBlank(nameOf(parentPath))
    const nameLabel = name ? `${name} parent` : ''
    if (parents.length > 1) {
      return nameLabel || nonBlank(config.parentLabel) || defaultLabel
    }
    return oldParentLabel(config) || nameLabel || defaultLabel
  }
  const labelled = parents.map(parentPath => ({
    parentPath,
    attrKey: parentAttrKey(parentPath),
    label: mappingLabel(config, parentPath) || fallbackLabel(parentPath),
  }))
  return labelled.map(option => {
    const isShared = labelled.filter(other => other.label === option.label).length > 1
    const name = nonBlank(nameOf(option.parentPath))
    return isShared && name ? { ...option, label: `${option.label} (${name})` } : option
  })
}

function toIdList(ids: string | string[] | undefined | null): string[] {
  const list = Array.isArray(ids) ? ids : [ids]
  return list.filter((id): id is string => typeof id === 'string' && id.length > 0)
}

export function splitParentIds(ids: string | string[] | undefined | null, options: ParentOption[]): SplitParentIds {
  return toIdList(ids).reduce<SplitParentIds>(
    (result, id) => {
      const option = options.find(o => isCardOfType(id, o.parentPath))
      if (!option || result.byAttrKey[option.attrKey]) {
        return { ...result, dropped: [...result.dropped, id] }
      }
      return { ...result, byAttrKey: { ...result.byAttrKey, [option.attrKey]: id } }
    },
    { byAttrKey: {}, dropped: [] }
  )
}

export function collectParentIds(values: ParentFieldValue[], options: ParentOption[]): string[] {
  return options
    .map(option => values.find(v => v.attrKey === option.attrKey)?.value)
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
}

export const DEFAULT_PARENT_LABEL = 'MRI_PA_FILTERCARD_CONSTRAINT_PARENT'

export interface FilterCardConfigLike {
  getName?: () => string
  oInternalConfigFilterCard?: { parentInteraction?: ParentConfig }
}

export interface FrontendConfigLike {
  getFilterCardByPath: (path: string) => FilterCardConfigLike | undefined
}

export function parentOptionsForCard(
  frontendConfig: FrontendConfigLike,
  cardKey: string,
  defaultLabel: string = DEFAULT_PARENT_LABEL
): ParentOption[] {
  const cardConfig = frontendConfig.getFilterCardByPath(cardKey)
  const nameOf = (path: string) => frontendConfig.getFilterCardByPath(path)?.getName?.() || ''
  return parentOptions(cardConfig?.oInternalConfigFilterCard?.parentInteraction, nameOf, defaultLabel)
}
