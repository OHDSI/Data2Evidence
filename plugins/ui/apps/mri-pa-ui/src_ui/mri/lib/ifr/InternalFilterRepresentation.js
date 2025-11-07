/* eslint no-use-before-define: [2, "nofunc"] */
sap.ui.define([
    "sap/hc/mri/pa/ui/lib/ifr/BooleanContainers",
    "sap/hc/mri/pa/ui/lib/ifr/InvalidArgumentException",
    "sap/hc/mri/pa/ui/lib/ifr/ParameterObjectValidator"
], function (BooleanContainers, InvalidArgumentException, ParameterObjectValidator) {
    "use strict";

    function ConfigMetadata(version, id) {
        this.version = version;
        this.id = id;
    }

    /**
     * Create a new Filter.
     * @constructor
     * @param {object} params Parameter object with configMetadata and cards
     *
     * @classdesc
     * IFR Filter
     * @alias sap.hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.Filter
     */
    function Filter(params) {
        new ParameterObjectValidator(params)
            .expectProperty("configMetadata").ofType(ConfigMetadata)
            .expectProperty("cards").ofTypeIn([BooleanContainers.BooleanContainer, FilterCard]);

        this.configMetadata = params.configMetadata;
        this.cards = params.cards;
    }

    Filter.prototype.accept = function (visitor) {
        visitor.visitFilter(this.configMetadata, this.cards);
    };

    /**
     * Create a new Successor.
     * @constructor
     * @param {string}   id             FilterCard instance id
     * @param {number}   minDaysBetween Minimum days between this and successor
     * @param {number}   maxDaysBetween Maximum days between this and successor
     *
     * @classdesc
     * IFR Successor
     * @alias sap.hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.Successor
     */
    function Successor(id, minDaysBetween, maxDaysBetween) {
        // FIXME: add configPath && instanceNumber
        this.id = id;
        this.minDaysBetween = minDaysBetween;
        this.maxDaysBetween = maxDaysBetween;
    }

    /**
     * Create a new FilterCard.
     * @constructor
     * @param {object} params Parameter object with configPath, instanceNumber, instanceId, successor, and attributes
     *
     * @classdesc
     * IFR FilterCard
     * @alias sap.hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.FilterCard
     */
    function FilterCard(params) {
        new ParameterObjectValidator(params)
            .expectProperty("configPath").ofTypeString()
            .expectProperty("instanceNumber").ofTypeNumber()
            .expectProperty("instanceID").ofTypeString()
            .expectProperty("name").ofTypeString()
            .optionalProperty("successor").ofType(Successor)
            .optionalProperty("advanceTimeFilter").ofTypeObject()
            .optionalProperty("parentInteraction").ofTypeString()
            .optionalProperty("inactive").ofTypeBoolean()
            .expectProperty("attributes").ofTypeIn([BooleanContainers.BooleanContainer, Attribute]);

        this._configPath = params.configPath;
        this._instanceNumber = params.instanceNumber;
        this._instanceID = params.instanceID;
        this._name = params.name;
        this._successor = params.successor;
        this._advanceTimeFilter = params.advanceTimeFilter;
        this._parentInteraction = params.parentInteraction;
        this._attributes = params.attributes;
        this._inactive = params.inactive;
    }

    FilterCard.prototype.accept = function (visitor) {
        visitor.visitFilterCard(this._configPath, this._instanceNumber, this._instanceID, this._name, this._successor, this._advanceTimeFilter, this._parentInteraction, this._attributes, this._inactive);
    };

    /**
     * Create a new Attribute.
     * @constructor
     * @param {object} params Parameter object with configPath, instanceId, and constraints
     *
     * @classdesc
     * IFR Attribute
     * @alias sap.hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.Attribute
     */
    function Attribute(params) {
        new ParameterObjectValidator(params)
            .expectProperty("configPath").ofTypeString()
            .expectProperty("instanceID").ofTypeString()
            .expectProperty("constraints").ofTypeIn([BooleanContainers.BooleanContainer, Expression]);

        this._configPath = params.configPath;
        this._instanceID = params.instanceID;
        this._constraints = params.constraints;
    }

    Attribute.prototype.accept = function (visitor) {
        visitor.visitAttribute(this._configPath, this._instanceID, this._constraints);
    };

    /**
     * Create a new Expression.
     * @constructor
     * @param {object} params Parameter object with operator and value
     *
     * @classdesc
     * IFR Expression
     * @alias sap.hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.Expression
     */
    function Expression(params) {
        // operator, value
        new ParameterObjectValidator(params)
            .expectProperty("operator").ofTypeString()
            .expectProperty("value");

        if (["=", "!=", "<", "<=", ">", ">=", "contains"].indexOf(params.operator) < 0) {
            throw new InvalidArgumentException();
        }

        if (!(typeof params.value === "string") && !(typeof params.value === "number") && !(params.value instanceof Date)) {
            throw new InvalidArgumentException();
        }

        this._operator = params.operator;
        this._value = params.value;
    }

    Expression.prototype.accept = function (visitor) {
        visitor.visitExpression(this._operator, this._value);
    };

    return {
        Attribute: Attribute,
        ConfigMetadata: ConfigMetadata,
        Expression: Expression,
        Filter: Filter,
        FilterCard: FilterCard,
        Successor: Successor
    };
});
