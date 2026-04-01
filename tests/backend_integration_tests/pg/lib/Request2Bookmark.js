'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const DELIMITER = '.'
let trim = x => {
  let isPrimitive = z => {
    return typeof z === 'string' || typeof z === 'number' || typeof z === 'boolean'
  }
  try {
    if (x instanceof Object) {
      Object.keys(x).forEach(y => {
        if (x[y] === null) {
          delete x[y]
        } else if (isPrimitive(x[y])) {
          return
        } else if (x[y] && Object.keys(x[y]).length > 0) {
          trim(x[y])
        }
      })
    } else if (x instanceof Array) {
      x.forEach(y => trim(y))
    }
  } catch (e) {
    throw e
  }
}
class PatientVisitor {
  constructor(patient) {
    this.patient = patient
    this.axes = []
    this.cards = []
    this.specialAttributes = ['_succ', '_tempQ', 'parentInteraction']
    this.visitPatient()
  }
  visitPatient() {
    let pathId = ['patient']
    this.basicData = this.patient.attributes ? [this.visitBasicData(pathId, this.patient.attributes)] : []
    this.cards = [
      ...this.visitConditions(pathId, this.patient.conditions),
      ...this.visitInteractions(pathId, this.patient.interactions)
    ]
    this.configData = this.patient.configData
      ? this.patient.configData
      : { version: 'No config version', id: 'No config id' }
  }
  visitBasicData(parentPathId, basicData) {
    let pathId = [...parentPathId]
    if (basicData.pcount) {
      this.axes.push(
        this.createAxis('yaxis', parentPathId, '0', [...pathId, 'attributes', 'pcount'], basicData.pcount[0])
      )
    }
    return {
      type: 'FilterCard',
      configPath: parentPathId.join(DELIMITER),
      instanceNumber: 0,
      instanceID: parentPathId.join(DELIMITER),
      attributes: {
        type: 'BooleanContainer',
        op: 'AND',
        content: Object.keys(basicData)
          .filter(e => e !== 'pcount') //handle pcount attribute as an axis elsewhere
          .map(attributeName => this.visitAttributes(pathId, attributeName, basicData[attributeName][0], '0'))
      }
    }
  }
  visitConditions(parentPathId, conditions) {
    return conditions
      ? Object.keys(conditions).reduce((filtercards, conditionName) => {
          let condition = conditions[conditionName]
          Object.keys(condition.interactions).forEach(interactionType => {
            let interaction = condition.interactions[interactionType]
            Object.keys(interaction).forEach(instanceNumber => {
              let filter = interaction[instanceNumber]
              let configPath = [...parentPathId, 'conditions', conditionName, 'interactions', interactionType]
              let instanceID = [...configPath, instanceNumber]
              let attributes = filter.attributes
              let filtercard = {
                type: 'FilterCard',
                configPath: configPath.join(DELIMITER),
                instanceNumber: parseInt(instanceNumber, 10),
                instanceID: instanceID.join(DELIMITER),
                attributes: {
                  type: 'BooleanContainer',
                  op: 'AND',
                  content: attributes
                    ? Object.keys(attributes)
                        .filter(e => this.specialAttributes.indexOf(e) === -1)
                        .reduce((attributeConstraints, attributeName) => {
                          attributeConstraints.push(
                            this.visitAttributes(instanceID, attributeName, attributes[attributeName][0], '0')
                          )
                          return attributeConstraints
                        }, [])
                    : []
                },
                successor: attributes && attributes._succ ? this.createSuccessor(attributes._succ[0]) : null,
                parentInteraction: filter.parentInteraction ? filter.parentInteraction[0].value : null,
                advanceTimeFilter: filter._tempQ ? filter._tempQ : null
              }
              filtercards.push(
                filter.exclude ? { type: 'BooleanContainer', op: 'NOT', content: [filtercard] } : filtercard
              )
            })
          })
          return filtercards
        }, [])
      : []
  }
  visitInteractions(parentPathId, interactions) {
    return interactions
      ? Object.keys(interactions).reduce((filtercards, interactionName) => {
          let interaction = interactions[interactionName]
          Object.keys(interaction).forEach(instanceNumber => {
            let filter = interaction[instanceNumber]
            let configPath = [...parentPathId, 'interactions', interactionName]
            let instanceID = [...configPath, instanceNumber]
            let attributes = filter.attributes
            let filtercard = {
              type: 'FilterCard',
              configPath: configPath.join(DELIMITER),
              instanceNumber: parseInt(instanceNumber, 10),
              instanceID: instanceID.join(DELIMITER),
              attributes: {
                type: 'BooleanContainer',
                op: 'AND',
                content: attributes
                  ? Object.keys(attributes)
                      .filter(e => this.specialAttributes.indexOf(e) === -1)
                      .reduce((attributeConstraints, attributeName) => {
                        attributeConstraints.push(
                          this.visitAttributes(instanceID, attributeName, attributes[attributeName][0], '0')
                        )
                        return attributeConstraints
                      }, [])
                  : []
              },
              successor: attributes && attributes._succ ? this.createSuccessor(attributes._succ[0]) : null,
              parentInteraction:
                attributes && attributes.parentInteraction ? attributes.parentInteraction[0].value : null,
              advanceTimeFilter: attributes && attributes._tempQ ? attributes._tempQ : null
            }
            filtercards.push(
              filter.exclude ? { type: 'BooleanContainer', op: 'NOT', content: [filtercard] } : filtercard
            )
          })
          return filtercards
        }, [])
      : []
  }
  visitAttributes(parentPathId, attributeName, attribute, instanceNumber, isFiltercard) {
    let pathId = [...parentPathId, 'attributes', attributeName]
    Object.keys(attribute)
      .filter(e => e === 'xaxis' || e === 'yaxis')
      .forEach(f => this.axes.push(this.createAxis(f, parentPathId, instanceNumber, pathId, attribute, isFiltercard)))
    return {
      type: 'Attribute',
      configPath: pathId.join(DELIMITER),
      instanceID:
        instanceNumber !== '0'
          ? [...parentPathId, instanceNumber, 'attributes', attributeName].join(DELIMITER)
          : pathId.join(DELIMITER),
      constraints: this.visitConstraint(attribute.filter)
    }
  }
  visitConstraint(filter) {
    let constraint = {
      type: 'BooleanContainer',
      op: 'OR',
      content: []
    }
    if (filter) {
      constraint.content = filter.map(e => {
        return e.and
          ? {
              type: 'BooleanContainer',
              op: 'AND',
              content: e.and.map(f => {
                return { type: 'Expression', operator: f.op, value: f.value }
              })
            }
          : { type: 'Expression', operator: e.op, value: e.value }
      })
    }
    return constraint
  }
  createAxis(axisType, parentPathId, instanceNumber, pathId, attribute, isFiltercard) {
    if (attribute.aggregation) {
      return {
        attributeId: pathId.join(DELIMITER),
        binsize: attribute.binsize ? attribute.binsize : '',
        categoryId: axisType.substring(0, 1) + attribute[axisType],
        aggregation: attribute.aggregation
      }
    }

    return {
      attributeId: pathId.join(DELIMITER),
      binsize: attribute.binsize ? attribute.binsize : '',
      categoryId: axisType.substring(0, 1) + attribute[axisType]
    }
  }
  createSuccessor(attribute) {
    let succ = {
      id: attribute.value,
      minDaysBetween: null,
      maxDaysBetween: null
    }
    attribute.filter[0].and.forEach(e => {
      if (e.op === '>=') {
        succ.minDaysBetween = e.value
      } else if (e.op === '<') {
        succ.maxDaysBetween = e.value
      }
    })
    return succ
  }
}
function request2Bookmark(request, chartType) {
  request = request instanceof Array ? request : [request]
  let req = request.map(e => new PatientVisitor(e.patient))
  let filter = {
    configMetadata: req[0].configData
  }
  let matchAll = req[0].basicData
  let matchAny = []
  if (req.length > 1) {
    //compare first 2 requests, search for common filters and add them to matchAll category
    let counter = 0
    let lhs
    let rhs
    //identifies matchAll filtercards
    do {
      lhs = JSON.stringify(req[0].cards[counter])
      rhs = JSON.stringify(req[1].cards[counter])
      if (lhs === rhs) {
        matchAll.push(req[0].cards[counter])
      }
      ++counter
    } while (lhs === rhs)
    //identifies matchAny filtercards
    matchAny = req.reduce((matchAnyList, filter) => {
      filter.cards.forEach(e => {
        if (matchAll.filter(f => JSON.stringify(f) === JSON.stringify(e)).length === 0) {
          matchAnyList.push(e)
        }
      })
      return matchAnyList
    }, [])
  } else {
    matchAll = matchAll.concat(req[0].cards)
    matchAny = []
  }
  filter.cards = {
    type: 'BooleanContainer',
    op: 'AND',
    content: matchAll.map(f => ({
      type: 'BooleanContainer',
      op: 'OR',
      content: [f]
    }))
  }
  if (chartType === 'km') {
    if (request[0].kmEventIdentifier) {
      let bookmarkKey = 'selected_event'
      filter[bookmarkKey] = {
        key: request[0].kmEventIdentifier
      }
    }
    if (request[0].kmEndEventIdentifier) {
      let bookmarkKey = 'selected_end_event'
      filter[bookmarkKey] = {
        key: request[0].kmEndEventIdentifier
      }
    }
    if (request[0].kmStartEventOccurence) {
      let bookmarkKey = 'selected_start_event_occ'
      filter[bookmarkKey] = {
        key: request[0].kmStartEventOccurence
      }
    }
    if (request[0].kmEndEventOccurence) {
      let bookmarkKey = 'selected_end_event_occ'
      filter[bookmarkKey] = {
        key: request[0].kmEndEventOccurence
      }
    }
  }
  let bookmark = {
    filter,
    axisSelection: req[0].axes,
    chartType: chartType ? chartType : 'stacked'
  }
  // Furnish IFR with additional options if any
  Object.keys(request[0])
    .filter(e => e !== 'patient')
    .forEach(f => {
      bookmark[f] = request[0][f]
    })
  trim(bookmark)
  return bookmark
}
exports.request2Bookmark = request2Bookmark
//# sourceMappingURL=Request2Bookmark.js.map
