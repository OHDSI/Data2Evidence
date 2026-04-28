import IFRBuilder from '../ifr/IFRBuilder'
import InternalFilterRepresentation from '../ifr/InternalFilterRepresentation'
import ParameterObjectValidator from '../ifr/ParameterObjectValidator'
import KeyCounter from '../utils/KeyCounter'

function parseBooleanContainer(currentLevelParsingFunction, filterBuilder, booleanContainerJson) {
  new ParameterObjectValidator(booleanContainerJson).expectProperty('op').expectProperty('content')

  let nextLevelBuilder
  const nextLevelContent = booleanContainerJson.content

  switch (booleanContainerJson.op) {
    case 'AND':
      nextLevelBuilder = filterBuilder.addAnd()
      break
    case 'OR':
      nextLevelBuilder = filterBuilder.addOr()
      break
    case 'NOT':
      nextLevelBuilder = filterBuilder.addNot()
      break
    default:
      throw new Error('Unexpected BooleanContainer op!')
  }

  nextLevelContent.forEach(element => {
    currentLevelParsingFunction(nextLevelBuilder, element)
  })
}

function migrateOldBookmark(filterCardContainerJson) {
  const keyCounter: any = KeyCounter.getInstance()
  const matchAllIndex = filterCardContainerJson.content.findIndex(container => container.op === 'AND')
  const matchAll = filterCardContainerJson.content.splice(matchAllIndex, 1)[0]
  const matchAny = filterCardContainerJson.content[0]

  const content = matchAll.content.map(filterCard => ({
    op: 'OR',
    type: 'BooleanContainer',
    content: [filterCard],
  }))
  content.push(matchAny)

  filterCardContainerJson.content = content
}

function parseFilterContent(filterBuilder, filterCardContainerJson) {
  new ParameterObjectValidator(filterCardContainerJson).expectProperty('type')

  switch (filterCardContainerJson.type) {
    case 'BooleanContainer':
      const oldBmWithMatchAll = filterCardContainerJson.content.find(container => container.op === 'AND')
      if (oldBmWithMatchAll) {
        migrateOldBookmark(filterCardContainerJson)
      }

      parseBooleanContainer(parseFilterContent, filterBuilder, filterCardContainerJson)
      break
    case 'FilterCard':
      parseFilterCard(filterBuilder, filterCardContainerJson)
      break
    default:
      throw new Error('Unexpected type on FilterCard level!')
  }
}

function parseFilterCard(filterBuilder, filterCardJson) {
  new ParameterObjectValidator(filterCardJson).expectProperty('attributes')

  let filterCardParam = filterCardJson

  if (filterCardJson.successor) {
    const successorJson = filterCardJson.successor

    new ParameterObjectValidator(successorJson)
      .expectProperty('id')
      .expectProperty('minDaysBetween')
      .expectProperty('maxDaysBetween')

    const successor = new InternalFilterRepresentation.Successor(
      successorJson.id,
      successorJson.minDaysBetween,
      successorJson.maxDaysBetween
    )

    // Copy the JSON to NOT alter the original bookmark
    filterCardParam = {
      successor,
      configPath: filterCardJson.configPath,
      instanceNumber: filterCardJson.instanceNumber,
      instanceID: filterCardJson.instanceID,
      name: filterCardJson.name,
      advanceTimeFilter: filterCardParam.advanceTimeFilter,
      parentInteraction: filterCardParam.parentInteraction,
      isEntry: filterCardParam.isEntry,
      isExit: filterCardParam.isExit,
    }
  }

  const filterCardBuilder = filterBuilder.addFilterCard().setParameters(filterCardParam)

  if (filterCardJson.attributes) {
    parseFilterCardContent(filterCardBuilder, filterCardJson.attributes)
  }
}

function parseFilter(bookmarkJson) {
  new ParameterObjectValidator(bookmarkJson).expectProperty('configMetadata').expectProperty('cards')

  const configMetadataJson = bookmarkJson.configMetadata
  new ParameterObjectValidator(configMetadataJson).expectProperty('version').expectProperty('id')

  const filterBuilder = new IFRBuilder().setParameters({
    configMetadata: new InternalFilterRepresentation.ConfigMetadata(configMetadataJson.version, configMetadataJson.id),
  })

  if (bookmarkJson.cards) {
    parseFilterContent(filterBuilder, bookmarkJson.cards)
  }

  return filterBuilder.build()
}

function parseFilterCardContent(filterBuilder, attributeContainerJson) {
  new ParameterObjectValidator(attributeContainerJson).expectProperty('type')

  switch (attributeContainerJson.type) {
    case 'BooleanContainer':
      parseBooleanContainer(parseFilterCardContent, filterBuilder, attributeContainerJson)
      break
    case 'Attribute':
      parseAttribute(filterBuilder, attributeContainerJson)
      break
    default:
      throw new Error('Unexpected type on Attribute level!')
  }
}

function parseAttribute(filterBuilder, attributeJson) {
  new ParameterObjectValidator(attributeJson).expectProperty('constraints')

  const attributeBuilder = filterBuilder.addAttribute().setParameters(attributeJson)

  if (attributeJson.constraints) {
    parseAttributeContent(attributeBuilder, attributeJson.constraints)
  }
}

function parseAttributeContent(attributeBuilder, constraintContainerJson) {
  new ParameterObjectValidator(constraintContainerJson).expectProperty('type')

  switch (constraintContainerJson.type) {
    case 'BooleanContainer':
      parseBooleanContainer(parseAttributeContent, attributeBuilder, constraintContainerJson)
      break
    case 'Expression':
      parseExpression(attributeBuilder, constraintContainerJson)
      break
    default:
      throw new Error('Unexpected type on Expression level!')
  }
}

function parseExpression(attributeBuilder, constraintJson) {
  new ParameterObjectValidator(constraintJson).expectProperty('operator').expectProperty('value')

  attributeBuilder.addExpression().setParameters(constraintJson)
}

export default {
  convertBM2IFR: parseFilter,
}
