'use strict'
var DELIMITER = '.'
function trim(x) {
  try {
    if (x instanceof Object) {
      Object.keys(x).forEach(function (y) {
        if (x[y] === null) {
          delete x[y]
        } else if (isPrimitive(x[y])) {
          return
        } else if (x[y] && Object.keys(x[y]).length > 0) {
          trim(x[y])
        }
      })
    } else if (x instanceof Array) {
      x.forEach(function (y) {
        return trim(y)
      })
    }
  } catch (e) {
    throw e
  }
  function isPrimitive(z) {
    return typeof z === 'string' || typeof z === 'number' || typeof z === 'boolean'
  }
}
var PatientVisitor = (function () {
  function PatientVisitor(patient) {
    this.patient = patient
    this.axes = []
    this.cards = []
    this.specialAttributes = ['_succ', '_tempQ', 'parentInteraction']
    this.visitPatient()
  }
  PatientVisitor.prototype.visitPatient = function () {
    var pathId = ['patient']
    this.basicData = this.patient.attributes ? [this.visitBasicData(pathId, this.patient.attributes)] : []
    this.cards = this.visitConditions(pathId, this.patient.conditions).concat(
      this.visitInteractions(pathId, this.patient.interactions)
    )
    this.configData = this.patient.configData
      ? this.patient.configData
      : { configVersion: 'No config version', configId: 'No config id' }
  }
  PatientVisitor.prototype.visitBasicData = function (parentPathId, basicData) {
    var _this = this
    var pathId = parentPathId.slice()
    if (basicData.pcount) {
      this.axes.push(
        this.createAxis('yaxis', parentPathId, '0', pathId.concat(['attributes', 'pcount']), basicData.pcount[0])
      )
    }
    return {
      _configPath: parentPathId.join(DELIMITER),
      _instanceNumber: 0,
      _instanceID: parentPathId.join(DELIMITER),
      _attributes: {
        content: Object.keys(basicData)
          .filter(function (e) {
            return e !== 'pcount'
          }) //handle pcount attribute as an axis elsewhere
          .map(function (attributeName) {
            return _this.visitAttributes(pathId, attributeName, basicData[attributeName][0], '0')
          })
      }
    }
  }
  PatientVisitor.prototype.visitConditions = function (parentPathId, conditions) {
    var _this = this
    return conditions
      ? Object.keys(conditions).reduce(function (filtercards, conditionName) {
          var condition = conditions[conditionName]
          Object.keys(condition.interactions).forEach(function (interactionType) {
            var interaction = condition.interactions[interactionType]
            Object.keys(interaction).forEach(function (instanceNumber) {
              var filter = interaction[instanceNumber]
              var configPath = parentPathId.concat(['conditions', conditionName, 'interactions', interactionType])
              var instanceID = configPath.concat([instanceNumber])
              var attributes = filter.attributes
              var filtercard = {
                _configPath: configPath.join(DELIMITER),
                _instanceNumber: parseInt(instanceNumber, 10),
                _instanceID: instanceID.join(DELIMITER),
                _attributes: {
                  content: attributes
                    ? Object.keys(attributes)
                        .filter(function (e) {
                          return _this.specialAttributes.indexOf(e) === -1
                        })
                        .reduce(function (attributeConstraints, attributeName) {
                          attributeConstraints.push(
                            _this.visitAttributes(instanceID, attributeName, attributes[attributeName][0], '0')
                          )
                          return attributeConstraints
                        }, [])
                    : []
                },
                _successor: attributes && attributes._succ ? _this.createSuccessor(attributes._succ[0]) : null,
                _parentInteraction: filter.parentInteraction ? filter.parentInteraction[0].value : null,
                _advance_time_filter: filter._tempQ ? filter._tempQ : null
              }
              filtercards.push(filter.exclude ? { content: [filtercard] } : filtercard)
            })
          })
          return filtercards
        }, [])
      : []
  }
  PatientVisitor.prototype.visitInteractions = function (parentPathId, interactions) {
    var _this = this
    return interactions
      ? Object.keys(interactions).reduce(function (filtercards, interactionName) {
          var interaction = interactions[interactionName]
          Object.keys(interaction).forEach(function (instanceNumber) {
            var filter = interaction[instanceNumber]
            var configPath = parentPathId.concat(['interactions', interactionName])
            var instanceID = configPath.concat([instanceNumber])
            var attributes = filter.attributes
            var filtercard = {
              _configPath: configPath.join(DELIMITER),
              _instanceNumber: parseInt(instanceNumber, 10),
              _instanceID: instanceID.join(DELIMITER),
              _attributes: {
                content: attributes
                  ? Object.keys(attributes)
                      .filter(function (e) {
                        return _this.specialAttributes.indexOf(e) === -1
                      })
                      .reduce(function (attributeConstraints, attributeName) {
                        attributeConstraints.push(
                          _this.visitAttributes(instanceID, attributeName, attributes[attributeName][0], '0')
                        )
                        return attributeConstraints
                      }, [])
                  : []
              },
              _successor: attributes && attributes._succ ? _this.createSuccessor(attributes._succ[0]) : null,
              _parentInteraction:
                attributes && attributes.parentInteraction ? attributes.parentInteraction[0].value : null,
              _advance_time_filter: attributes && attributes._tempQ ? attributes._tempQ : null
            }
            filtercards.push(filter.exclude ? { content: [filtercard] } : filtercard)
          })
          return filtercards
        }, [])
      : []
  }
  PatientVisitor.prototype.visitAttributes = function (
    parentPathId,
    attributeName,
    attribute,
    instanceNumber,
    isFiltercard
  ) {
    var _this = this
    var pathId = parentPathId.concat(['attributes', attributeName])
    Object.keys(attribute)
      .filter(function (e) {
        return e === 'xaxis' || e === 'yaxis'
      })
      .forEach(function (f) {
        return _this.axes.push(_this.createAxis(f, parentPathId, instanceNumber, pathId, attribute, isFiltercard))
      })
    return {
      _configPath: pathId.join(DELIMITER),
      _instanceID:
        instanceNumber !== '0'
          ? parentPathId.concat([instanceNumber, 'attributes', attributeName]).join(DELIMITER)
          : pathId.join(DELIMITER),
      _constraints: this.visitConstraint(attribute.filter)
    }
  }
  PatientVisitor.prototype.visitConstraint = function (filter) {
    var constraint = {
      content: []
    }
    if (filter) {
      constraint.content = filter.map(function (e) {
        return e.and
          ? {
              content: e.and.map(function (f) {
                return { _operator: f.op, _value: f.value }
              })
            }
          : { _operator: e.op, _value: e.value }
      })
    }
    return constraint
  }
  PatientVisitor.prototype.createAxis = function (
    axisType,
    parentPathId,
    instanceNumber,
    pathId,
    attribute,
    isFiltercard
  ) {
    return {
      instanceID:
        instanceNumber !== '0' ? parentPathId.concat([instanceNumber]).join(DELIMITER) : parentPathId.join(DELIMITER),
      configPath: parentPathId.join(DELIMITER),
      id: pathId.join(DELIMITER),
      axis: axisType.substring(0, 1),
      seq: attribute[axisType],
      binsize: attribute.binsize ? attribute.binsize : null,
      aggregation: attribute.aggregation ? attribute.aggregation : null,
      order: attribute.order ? attribute.order : null,
      isFiltercard: typeof isFiltercard !== 'undefined' ? isFiltercard : null
    }
  }
  PatientVisitor.prototype.createSuccessor = function (attribute) {
    var succ = {
      id: attribute.value,
      minDaysBetween: null,
      maxDaysBetween: null
    }
    attribute.filter[0].and.forEach(function (e) {
      if (e.op === '>=') {
        succ.minDaysBetween = e.value
      } else if (e.op === '<') {
        succ.maxDaysBetween = e.value
      }
    })
    return succ
  }
  return PatientVisitor
})()
function request2IFR(request) {
  request = request instanceof Array ? request : [request]
  var req = request.map(function (e) {
    return new PatientVisitor(e.patient)
  })
  var ifr = {
    configData: req[0].configData,
    axes: req[0].axes
  }
  var matchAll = req[0].basicData
  var matchAny = []
  if (req.length > 1) {
    //compare first 2 requests, search for common filters and add them to matchAll category
    var counter = 0
    var lhs = void 0
    var rhs = void 0
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
    matchAny = req.reduce(function (matchAnyList, filter) {
      filter.cards.forEach(function (e) {
        if (
          matchAll.filter(function (f) {
            return JSON.stringify(f) === JSON.stringify(e)
          }).length === 0
        ) {
          matchAnyList.push(e)
        }
      })
      return matchAnyList
    }, [])
  } else {
    matchAll = matchAll.concat(req[0].cards)
    matchAny = []
  }
  ifr.cards = {
    content: [
      {
        content: matchAll
      },
      {
        content: matchAny
      }
    ]
  }
  // Furnish IFR with additional options if any
  Object.keys(request[0])
    .filter(function (e) {
      return e !== 'patient'
    })
    .forEach(function (f) {
      ifr[f] = request[0][f]
    })
  trim(ifr)
  return ifr
}
exports.request2IFR = request2IFR
//# sourceMappingURL=Request2IFR.js.map
