/* eslint no-use-before-define: [2, "nofunc"] */
sap.ui.define([
    "sap/hc/mri/pa/ui/lib/ifr/InvalidArgumentException"
], function (InvalidArgumentException) {
    "use strict";

    function ParameterObjectValidator(parameterObjectToValidate) {
        if (!parameterObjectToValidate) {
            throw new InvalidArgumentException();
        }

        this._parameterObjectToValidate = parameterObjectToValidate;
    }

    ParameterObjectValidator.prototype.expectProperty = function (propertyName) {
        if (!this._parameterObjectHasProperty(propertyName)) {
            throw new InvalidArgumentException("Expected property with name \"" + propertyName + "\"");
        }

        return new TypeValidator(this, propertyName);
    };

    ParameterObjectValidator.prototype._parameterObjectHasProperty = function (propertyName) {
        return this.hasOwnProperty.call(this._parameterObjectToValidate, propertyName);
    };

    ParameterObjectValidator.prototype._parameterObjectPropertyIsDefined = function (propertyName) {
        return this._parameterObjectToValidate[propertyName] !== null && typeof this._parameterObjectToValidate[propertyName] !== "undefined";
    };

    ParameterObjectValidator.prototype.optionalProperty = function (propertyName) {
        if (this._parameterObjectHasProperty(propertyName) && this._parameterObjectPropertyIsDefined(propertyName)) {
            return new TypeValidator(this, propertyName);
        } else {
            return new DummyValidator(this);
        }
    };

    ParameterObjectValidator.prototype._throwIfPropertyInstanceTypeIsNotInList = function (propertyName, expectedTypes) {
        var isPropertyTypeInList = expectedTypes.some(function (expectedType) {
            return this._parameterObjectToValidate[propertyName] instanceof expectedType;
        }, this);

        if (!isPropertyTypeInList) {
            throw new InvalidArgumentException("Expected property \"" + propertyName + "\" to have any type of \"" + expectedTypes + "\"");
        }

        return this;
    };

    ParameterObjectValidator.prototype._throwIfPropertyIsNotOfType = function (propertyName, expectedType) {
        if (typeof this._parameterObjectToValidate[propertyName] !== expectedType) {
            throw new InvalidArgumentException("Expected property \"" + propertyName + "\" to be of type \"" + expectedType + "\"");
        }

        return this;
    };

    function TypeValidator(parentParameterObjectValidator, propertyName) {
        this._parentParameterObjectValidator = parentParameterObjectValidator;
        this._propertyName = propertyName;
    }

    TypeValidator.prototype.expectProperty = function (propertyName) {
        return this._parentParameterObjectValidator.expectProperty(propertyName);
    };

    TypeValidator.prototype.optionalProperty = function (propertyName) {
        return this._parentParameterObjectValidator.optionalProperty(propertyName);
    };

    TypeValidator.prototype.ofType = function (expectedType) {
        return this._parentParameterObjectValidator._throwIfPropertyInstanceTypeIsNotInList(this._propertyName, [expectedType]);
    };

    TypeValidator.prototype.ofTypeIn = function (listOfTypes) {
        return this._parentParameterObjectValidator._throwIfPropertyInstanceTypeIsNotInList(this._propertyName, listOfTypes);
    };

    TypeValidator.prototype.ofTypeObject = function () {
        return this._parentParameterObjectValidator._throwIfPropertyIsNotOfType(this._propertyName, "object");
    };

    TypeValidator.prototype.ofTypeNumber = function () {
        return this._parentParameterObjectValidator._throwIfPropertyIsNotOfType(this._propertyName, "number");
    };

    TypeValidator.prototype.ofTypeString = function () {
        return this._parentParameterObjectValidator._throwIfPropertyIsNotOfType(this._propertyName, "string");
    };

    TypeValidator.prototype.ofTypeBoolean = function () {
        return this._parentParameterObjectValidator._throwIfPropertyIsNotOfType(this._propertyName, "boolean");
    };

    function DummyValidator(parentParameterObjectValidator) {
        this._parentParameterObjectValidator = parentParameterObjectValidator;
    }

    DummyValidator.prototype.expectProperty = function (propertyName) {
        return this._parentParameterObjectValidator.expectProperty(propertyName);
    };

    DummyValidator.prototype.optionalProperty = function (propertyName) {
        return this._parentParameterObjectValidator.optionalProperty(propertyName);
    };

    DummyValidator.prototype.ofType = function () {
        return this._parentParameterObjectValidator;
    };

    DummyValidator.prototype.ofTypeIn = function () {
        return this._parentParameterObjectValidator;
    };

    DummyValidator.prototype.ofTypeObject = function () {
        return this._parentParameterObjectValidator;
    };

    DummyValidator.prototype.ofTypeNumber = function () {
        return this._parentParameterObjectValidator;
    };

    DummyValidator.prototype.ofTypeString = function () {
        return this._parentParameterObjectValidator;
    };

    DummyValidator.prototype.ofTypeBoolean = function () {
        return this._parentParameterObjectValidator;
    };

    return ParameterObjectValidator;
});
