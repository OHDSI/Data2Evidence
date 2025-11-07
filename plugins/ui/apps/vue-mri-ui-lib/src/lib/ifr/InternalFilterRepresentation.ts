// tslint:disable:max-classes-per-file

import BooleanContainers from './BooleanContainers'
import InvalidArgumentException from './InvalidArgumentException'
import ParameterObjectValidator from './ParameterObjectValidator'

function ConfigMetadata(version?, id?) {
  this.version = version
  this.id = id
}

/**
 * Create a new Expression.
 * @constructor
 * @param {object} params Parameter object with operator and value
 *
 * @classdesc
 * IFR Expression
 * @alias hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.Expression
 */
class Expression {
  public operator: any
  public value: any
  constructor(params) {
    // operator, value
    new ParameterObjectValidator(params).expectProperty('operator').ofTypeString().expectProperty('value')

    if (['=', '!=', '<', '<=', '>', '>=', 'contains', 'invalid_op'].indexOf(params.operator) < 0) {
      throw new InvalidArgumentException()
    }

    if (!(typeof params.value === 'string') && !(typeof params.value === 'number') && !(params.value instanceof Date)) {
      throw new InvalidArgumentException()
    }

    this.operator = params.operator
    this.value = params.value
  }

  public accept(visitor) {
    visitor.visitExpression(this.operator, this.value)
  }
}
/**
 * Create a new Attribute.
 * @constructor
 * @param {object} params Parameter object with configPath, instanceId, and constraints
 *
 * @classdesc
 * IFR Attribute
 * @alias hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.Attribute
 */

class Attribute {
  public configPath: any
  public instanceID: any
  public constraints: any
  constructor(params) {
    new ParameterObjectValidator(params)
      .expectProperty('configPath')
      .ofTypeString()
      .expectProperty('instanceID')
      .ofTypeString()
      .expectProperty('constraints')
      .ofTypeIn([BooleanContainers.BooleanContainer, Expression])

    this.configPath = params.configPath
    this.instanceID = params.instanceID
    this.constraints = params.constraints
  }

  public accept(visitor) {
    visitor.visitAttribute(this.configPath, this.instanceID, this.constraints)
  }
}

/**
 * Create a new Successor.
 * @constructor
 * @param {string}   id             FilterCard instance id
 * @param {number}   minDaysBetween Minimum days between this and successor
 * @param {number}   maxDaysBetween Maximum days between this and successor
 *
 * @classdesc
 * IFR Successor
 * @alias hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.Successor
 */
function Successor(id, minDaysBetween, maxDaysBetween) {
  // FIXME: add configPath && instanceNumber
  this.id = id
  this.minDaysBetween = minDaysBetween
  this.maxDaysBetween = maxDaysBetween
}

/**
 * Create a new FilterCard.
 * @constructor
 * @param {object} params Parameter object with configPath,
 * instanceNumber, instanceId, successor, and attributes
 *
 * @classdesc
 * IFR FilterCard
 * @alias hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.FilterCard
 */
class FilterCard {
  public configPath: any
  public instanceNumber: any
  public instanceID: any
  public name: any
  public successor: any
  public advanceTimeFilter: any
  public parentInteraction: any
  public attributes: any
  public inactive: any
  public isEntry: any
  public isExit: any
  constructor(params) {
    new ParameterObjectValidator(params)
      .expectProperty('configPath')
      .ofTypeString()
      .expectProperty('instanceNumber')
      .ofTypeNumber()
      .expectProperty('instanceID')
      .ofTypeString()
      .expectProperty('name')
      .ofTypeString()
      .optionalProperty('successor')
      .ofType(Successor)
      .optionalProperty('advanceTimeFilter')
      .ofTypeObject()
      .optionalProperty('parentInteraction')
      .ofTypeString()
      .optionalProperty('inactive')
      .ofTypeBoolean()
      .optionalProperty('isEntry')
      .ofTypeBoolean()
      .optionalProperty('isExit')
      .ofTypeBoolean()
      .expectProperty('attributes')
      .ofTypeIn([BooleanContainers.BooleanContainer, Attribute])

    this.configPath = params.configPath
    this.instanceNumber = params.instanceNumber
    this.instanceID = params.instanceID
    this.name = params.name
    this.successor = params.successor
    this.advanceTimeFilter = params.advanceTimeFilter
    this.parentInteraction = params.parentInteraction
    this.attributes = params.attributes
    this.inactive = params.inactive
    this.isEntry = params.isEntry
    this.isExit = params.isExit
  }

  public accept(visitor) {
    visitor.visitFilterCard(
      this.configPath,
      this.instanceNumber,
      this.instanceID,
      this.name,
      this.successor,
      this.advanceTimeFilter,
      this.parentInteraction,
      this.attributes,
      this.inactive,
      this.isEntry,
      this.isExit
    )
  }
}
/**
 * Create a new Filter.
 * @constructor
 * @param {object} params Parameter object with configMetadata and cards
 *
 * @classdesc
 * IFR Filter
 * @alias hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.Filter
 */
class Filter {
  public configMetadata: any
  public cards: any
  constructor(params) {
    new ParameterObjectValidator(params)
      .expectProperty('configMetadata')
      .ofType(ConfigMetadata)
      .expectProperty('cards')
      .ofTypeIn([BooleanContainers.BooleanContainer, FilterCard])

    this.configMetadata = params.configMetadata
    this.cards = params.cards
  }

  public accept(visitor) {
    visitor.visitFilter(this.configMetadata, this.cards)
  }
}

export default {
  Attribute,
  ConfigMetadata,
  Expression,
  Filter,
  FilterCard,
  Successor,
}
