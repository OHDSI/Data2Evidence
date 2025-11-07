class Visitor {
  public result: any
  constructor() {
    this.result = null
  }

  public visitFilter(configMetadata, cards) {
    const res = visit(cards)

    const configMetadataJson = {
      id: configMetadata.id,
      version: configMetadata.version,
    }

    this.result = {
      configMetadata: configMetadataJson,
      cards: res,
    }
  }

  public visitAnd(andContent) {
    const res = visitAll(andContent)
    this.result = buildBooleanLogicJSON('AND', res)
  }

  public visitOr(orContent) {
    const res = visitAll(orContent)
    this.result = buildBooleanLogicJSON('OR', res)
  }

  public visitNot(notContent) {
    const res = visitAll(notContent)
    this.result = buildBooleanLogicJSON('NOT', res)
  }

  public visitFilterCard(
    configPath,
    instanceNumber,
    instanceID,
    name,
    successor,
    advanceTimeFilter,
    parentInteraction,
    attributes,
    inactive,
    isEntry,
    isExit
  ) {
    const res = visit(attributes)

    let successorJson

    let advanceTimeFilterJson = null

    if (successor) {
      successorJson = {
        id: successor.id,
        minDaysBetween: successor.minDaysBetween,
        maxDaysBetween: successor.maxDaysBetween,
      }
    }

    if (advanceTimeFilter) {
      advanceTimeFilterJson = advanceTimeFilter
    }

    this.result = {
      configPath,
      instanceNumber,
      instanceID,
      name,
      parentInteraction,
      inactive,
      isEntry,
      isExit,
      type: 'FilterCard',
      attributes: res,
      successor: successorJson,
      advanceTimeFilter: advanceTimeFilterJson,
    }
  }

  public visitAttribute(configPath, instanceID, constraints) {
    this.result = {
      configPath,
      instanceID,
      type: 'Attribute',
      constraints: visit(constraints),
    }
  }

  public visitExpression(comparisonOperation, comparisonValue) {
    this.result = {
      type: 'Expression',
      operator: comparisonOperation,
      value: comparisonValue,
    }
  }
}

function buildBooleanLogicJSON(operation, content) {
  return {
    content,
    type: 'BooleanContainer',
    op: operation,
  }
}

function visitAll(listOfVisitables) {
  const result: any[] = []
  listOfVisitables.forEach(visitable => {
    result.push(visit(visitable))
  }, this)
  return result
}

function visit(visitable) {
  const tempVisitor = new Visitor()
  visitable.accept(tempVisitor)
  return tempVisitor.result
}

export default function ifr2bookmark(ifr) {
  const ov = new Visitor()
  ifr.accept(ov)
  return ov.result
}
