function traverse(parentContainer, container, cards) {
  let parentFilterCard = parentContainer
  if (container && container.type && container.type === 'FilterCard') {
    parentFilterCard = container
  }

  if (container.op === 'NOT') {
    return null
  }

  if (container.type === 'FilterCard' && container.inactive) {
    return null
  }

  // do not consider boolFilterContainers that have more than one filtercard
  if (parentContainer.content && container.content && container.content.length > 1) {
    return null
  }

  if (container.type === 'FilterCard') {
    if (!cards[container.instanceID]) {
      cards[container.instanceID] = {
        configPath: container.configPath,
        name: container.name,
        attributes: [],
      }
    }
  }

  if (container.type === 'Attribute') {
    if (!cards[parentContainer.instanceID]) {
      cards[parentContainer.instanceID] = {
        configPath: parentContainer.configPath,
        name: parentContainer.name,
        attributes: [],
      }
    }
    cards[parentContainer.instanceID].attributes.push(container)
  }

  if (container.content) {
    for (let i = 0; i < container.content.length; i += 1) {
      if (parentContainer.type === 'FilterCard') {
        traverse(parentFilterCard, container.content[i], cards)
      } else {
        traverse(container, container.content[i], cards)
      }
    }
  }

  if ('attributes' in container) {
    traverse(container, container.attributes, cards)
  }

  return cards
}

export default function getChartableCards(bm, frontendConfig) {
  const cards = {}
  traverse(bm, bm.cards, cards)

  return Object.keys(cards).map(instanceId => {
    const card = cards[instanceId]

    const attributes = frontendConfig.getFilterCardByPath(card.configPath).aAllAttributes.map(att => ({
      attributeId: `${instanceId}.attributes.${att.sConfigPath.split('.').pop()}`,
      sConfigPath: att.sConfigPath,
      sParentPath: att.sParentPath,
      name: att.oInternalConfigAttribute.name,
      category: att.oInternalConfigAttribute.category,
      measure: att.oInternalConfigAttribute.measure,
      aggregated: att.oInternalConfigAttribute.aggregated,
      oInternalConfigAttribute: att.oInternalConfigAttribute,
    }))

    const visibleAttributes = card.attributes
      .map(({ configPath }) => configPath.split('.').pop())
      .concat(attributes.filter(({ measure }) => measure).map(({ sConfigPath }) => sConfigPath.split('.').pop()))

    return {
      instanceId,
      attributes,
      visibleAttributes,
      id: instanceId,
      name: card.name,
      configPath: card.configPath,
    }
  })
}
