// tslint:disable:max-classes-per-file
import InvalidArgumentException from './InvalidArgumentException'

class TypeValidator {
  public propertyName: any
  public parentParameterObjectValidator: any
  constructor(parentParameterObjectValidator, propertyName) {
    this.parentParameterObjectValidator = parentParameterObjectValidator
    this.propertyName = propertyName
  }

  public expectProperty(propertyName) {
    return this.parentParameterObjectValidator.expectProperty(propertyName)
  }

  public optionalProperty(propertyName) {
    return this.parentParameterObjectValidator.optionalProperty(propertyName)
  }

  public ofType(expectedType) {
    return this.parentParameterObjectValidator.throwIfPropertyInstanceTypeIsNotInList(this.propertyName, [expectedType])
  }

  public ofTypeIn(listOfTypes) {
    return this.parentParameterObjectValidator.throwIfPropertyInstanceTypeIsNotInList(this.propertyName, listOfTypes)
  }

  public ofTypeObject() {
    return this.parentParameterObjectValidator.throwIfPropertyIsNotOfType(this.propertyName, 'object')
  }

  public ofTypeNumber() {
    return this.parentParameterObjectValidator.throwIfPropertyIsNotOfType(this.propertyName, 'number')
  }

  public ofTypeString() {
    return this.parentParameterObjectValidator.throwIfPropertyIsNotOfType(this.propertyName, 'string')
  }

  public ofTypeBoolean() {
    return this.parentParameterObjectValidator.throwIfPropertyIsNotOfType(this.propertyName, 'boolean')
  }
}

class DummyValidator {
  public parentParameterObjectValidator: any
  constructor(parentParameterObjectValidator) {
    this.parentParameterObjectValidator = parentParameterObjectValidator
  }

  public expectProperty(propertyName) {
    return this.parentParameterObjectValidator.expectProperty(propertyName)
  }

  public optionalProperty(propertyName) {
    return this.parentParameterObjectValidator.optionalProperty(propertyName)
  }

  public ofType() {
    return this.parentParameterObjectValidator
  }

  public ofTypeIn() {
    return this.parentParameterObjectValidator
  }

  public ofTypeObject() {
    return this.parentParameterObjectValidator
  }

  public ofTypeNumber() {
    return this.parentParameterObjectValidator
  }

  public ofTypeString() {
    return this.parentParameterObjectValidator
  }

  public ofTypeBoolean() {
    return this.parentParameterObjectValidator
  }
}

class ParameterObjectValidator {
  public parameterObjectToValidate: any
  constructor(parameterObjectToValidate) {
    if (!parameterObjectToValidate) {
      throw new InvalidArgumentException()
    }

    this.parameterObjectToValidate = parameterObjectToValidate
  }

  public expectProperty(propertyName) {
    if (!this.parameterObjectHasProperty(propertyName)) {
      throw new InvalidArgumentException(`Expected property with name "${propertyName}"`)
    }

    return new TypeValidator(this, propertyName)
  }

  public parameterObjectHasProperty(propertyName) {
    return this.hasOwnProperty.call(this.parameterObjectToValidate, propertyName)
  }

  public parameterObjectPropertyIsDefined(propertyName) {
    return (
      this.parameterObjectToValidate[propertyName] !== null &&
      typeof this.parameterObjectToValidate[propertyName] !== 'undefined'
    )
  }

  public optionalProperty(propertyName) {
    if (this.parameterObjectHasProperty(propertyName) && this.parameterObjectPropertyIsDefined(propertyName)) {
      return new TypeValidator(this, propertyName)
    }
    return new DummyValidator(this)
  }

  public throwIfPropertyInstanceTypeIsNotInList(propertyName, expectedTypes) {
    const isPropertyTypeInList = expectedTypes.some(
      expectedType => this.parameterObjectToValidate[propertyName] instanceof expectedType
    )

    if (!isPropertyTypeInList) {
      throw new InvalidArgumentException(`Expected property "${propertyName}" to have any type of "${expectedTypes}"`)
    }

    return this
  }

  public throwIfPropertyIsNotOfType(propertyName, expectedType) {
    const objType = typeof this.parameterObjectToValidate[propertyName]
    if (objType !== expectedType) {
      throw new InvalidArgumentException(`Expected property "${propertyName}" to be of type "${expectedType}"`)
    }
    return this
  }
}

export default ParameterObjectValidator
