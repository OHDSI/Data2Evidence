sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "./datetimepicker/DateTimePicker",
    "./Constraint",
    "./ifr/BooleanContainers",
    "./ifr/InternalFilterRepresentation",
    "sap/m/Label"
], function (jQuery, Utils, DateTimePicker, Constraint, BooleanContainers, InternalFilterRepresentation, Label) {
    "use strict";

    /**
     * Constructor for a new DateTimeConstraint.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * DateTimeConstraint Control.
     * @extends sap.hc.mri.pa.ui.lib.Constraint
     * @alias sap.hc.mri.pa.ui.lib.DateTimeConstraint
     */
    var DateTimeConstraint = Constraint.extend("sap.hc.mri.pa.ui.lib.DateTimeConstraint", {
        renderer: {}
    });

    DateTimeConstraint.prototype._createInputContent = function () {
        // set up lower bound input controls
        this._lowerInput = this._createLower();
        this._lowerInput.setDisplayFormat(this.getDisplayPattern());

        this._upperInput = this._createUpper();
        this._upperInput.setDisplayFormat(this.getDisplayPattern());

        var oSeparatorLabel = new Label({
            text: "–", // en-dash
            width: "1rem",
            textAlign: sap.ui.core.TextAlign.Center
        });

        this._setGrowingLayout(this._lowerInput);
        this._setGrowingLayout(this._upperInput);

        return [this._lowerInput, oSeparatorLabel, this._upperInput];
    };

    DateTimeConstraint.prototype.setLower = function (value) {
        this._lowerInput.setValue(value);
        this.fireChanged();
    };

    DateTimeConstraint.prototype.setUpper = function (value) {
        this._upperInput.setValue(value);
        this.fireChanged();
    };

    DateTimeConstraint.prototype._createLower = function () {
        return new DateTimePicker({
            change: [function (oEvent) {
                oEvent.getSource().setValueState(oEvent.getParameter("valid") ? sap.ui.core.ValueState.None : sap.ui.core.ValueState.Error);
                this.setFromToolTip(this.preparePrefixToolTipString());
                this.fireChanged();
            }, this],
            valueFormat: Utils.getISODatePattern(),
            placeholder: "{i18n>MRI_PA_INPUT_PLACEHOLDER_ALL}",
            width: "100%"
        });
    };

    DateTimeConstraint.prototype._createUpper = function () {
        return new DateTimePicker({
            change: [function (oEvent) {
                oEvent.getSource().setValueState(oEvent.getParameter("valid") ? sap.ui.core.ValueState.None : sap.ui.core.ValueState.Error);
                this.setToToolTip(this.preparePrefixToolTipString());
                this.fireChanged();
            }, this],
            valueFormat: Utils.getISODatePattern(),
            placeholder: "{i18n>MRI_PA_INPUT_PLACEHOLDER_TODAY}",
            width: "100%"
        });
    };

    /**
     * Sets the display pattern to be used by the picker control. To be overriden.
     * @returns {string} Date pattern
     */
    DateTimeConstraint.prototype.getDisplayPattern = function () {
        return Utils.getUserPrefsDateTimePattern();
    };

    /**
     * Formats the date using the formatter of the constraint. To be overriden by inheritance.
     * @param   {Date}   dDate Date object
     * @returns {string} Formatted date string
     */
    DateTimeConstraint.prototype.nicelyFormatDate = function (dDate) {
        return Utils.formatDateTime(dDate, true);
    };

    /**
     * Gets the upper constraint as ISO string in UTC
     * @returns {string} ISO date string
     */
    DateTimeConstraint.prototype.getUpperConstraintISO = function () {
        if (this._upperInput.getValue() && this._upperInput.getValueState() === sap.ui.core.ValueState.None) {
            return Utils.formatISODate(Utils.localToUtc(this._upperInput.getDateValue()));
        } else {
            return "";
        }
    };

    /**
     * Gets the lower constraint as ISO string in UTC
     * @returns {string} ISO date string
     */
    DateTimeConstraint.prototype.getLowerConstraintISO = function () {
        if (this._lowerInput.getValue() && this._lowerInput.getValueState() === sap.ui.core.ValueState.None) {
            return Utils.formatISODate(Utils.localToUtc(this._lowerInput.getDateValue()));
        } else {
            return "";
        }
    };

    /**
     * Gets the lower constraint as user friendly formatted string
     * @returns {string} Formatted date string
     */
    DateTimeConstraint.prototype.getLowerConstraintFormatted = function () {
        if (this._lowerInput.getDateValue()) {
            return this.nicelyFormatDate(this._lowerInput.getDateValue());
        } else {
            return "";
        }
    };

    /**
     * Gets the upper constraint as user friendly formatted string
     * @returns {string} Formatted date string
     */
    DateTimeConstraint.prototype.getUpperConstraintFormatted = function () {
        if (this._upperInput.getDateValue()) {
            return this.nicelyFormatDate(this._upperInput.getDateValue());
        } else {
            return "";
        }
    };

    /**
     * Check if the DateTimeConstraint has a selected value.
     * @override
     * @returns {boolean} True, if neither lower nor upper are set.
     */
    DateTimeConstraint.prototype.isEmpty = function () {
        return !this._upperInput.getDateValue() && !this._upperInput.getDateValue();
    };

    /**
     * Sets the lower constraint from an ISO string
     * @param {string} sValue ISO string value in UTC to be set as lower constraint
     */
    DateTimeConstraint.prototype.setLowerConstraint = function (sValue) {
        if (Utils.parseISODate(sValue)) {
            this._lowerInput.setDateValue(Utils.utcToLocal(Utils.parseISODate(sValue)));
            this.setFromToolTip(this.preparePrefixToolTipString());
        }
    };

    /**
     * Sets the upper constraint from an ISO string
     * @param {string} sValue ISO string value in UTC to be set as upper constraint
     */
    DateTimeConstraint.prototype.setUpperConstraint = function (sValue) {
        if (Utils.parseISODate(sValue)) {
            this._upperInput.setDateValue(Utils.utcToLocal(Utils.parseISODate(sValue)));
            this.setToToolTip(this.preparePrefixToolTipString());
        }
    };

    DateTimeConstraint.prototype._getIFRExpressions = function () {
        var aExpressions = [];

        if (this._lowerInput.getValue() && this._lowerInput.getValueState() === sap.ui.core.ValueState.None) {
            aExpressions.push(new InternalFilterRepresentation.Expression({
                operator: ">=",
                value: this.getLowerConstraintISO()
            }));
        }
        if (this._upperInput.getValue() && this._upperInput.getValueState() === sap.ui.core.ValueState.None) {
            aExpressions.push(new InternalFilterRepresentation.Expression({
                operator: "<=",
                value: this.getUpperConstraintISO()
            }));
        }
        return [new BooleanContainers.And(aExpressions)];
    };

    /**
     * Add an expression to the DateTimeConstraint which sets either the lower or the upper input value.
     * @throws {Error} When an operator other than >= or <= is given.
     * @param {string} sOperator Operator as string
     * @param {string} sValue    Date value in format YYYYmmDD
     */
    DateTimeConstraint.prototype.addExpression = function (sOperator, sValue) {
        if (sOperator === ">=") {
            this.setLowerConstraint(sValue);
        } else if (sOperator === "<=") {
            this.setUpperConstraint(sValue);
        } else {
            throw new Error("DateTimeConstraint does not support operator " + sOperator);
        }
    };

    /**
     * Resets the Constraint to the initial state.
     */
    DateTimeConstraint.prototype.clear = function () {
        this._lowerInput.setValue("");
        this._upperInput.setValue("");
        this.fireChanged();
    };

    /**
     * Add an expression that consists of an anded combination of expression.
     * @param {object[]} aExpressions List of expression objects
     */
    DateTimeConstraint.prototype.addBooleanExpression = function (aExpressions) {
        aExpressions.forEach(function (mExpression) {
            this.addExpression(mExpression.operator, mExpression.value);
        }, this);
    };

    DateTimeConstraint.prototype.onSetConstraintToolTip = function (prefixString) {
        this.setFromToolTip(prefixString);
        this.setToToolTip(prefixString);
    };

    DateTimeConstraint.prototype.setFromToolTip = function (prefixString) {
        var fromStr = Utils.getText("MRI_PA_FILTERCARD_FROM_RANGE");
        this._lowerInput.setTooltip(prefixString + "-" + fromStr + ": " + this.getLowerConstraintFormatted());
    };

    DateTimeConstraint.prototype.setToToolTip = function (prefixString) {
        var toStr = Utils.getText("MRI_PA_FILTERCARD_TO_RANGE");
        this._upperInput.setTooltip(prefixString + "-" + toStr + ": " + this.getUpperConstraintFormatted());
    };

    /**
     * Set some values to the constraint.
     * @param {string[]} values The values to be added. The values should be ISO string in UTC.
     */
    DateTimeConstraint.prototype.setFilterValues = function (values) {
        if (values && values.length > 0) {
            // the only supported mode is override  because the current constraint can only support one date range
            this._overrideFilterValues(values);
            this.fireChanged();
        }
    };

    DateTimeConstraint.prototype._overrideFilterValues = function (values) {
        this._lowerInput.setValue("");
        this._upperInput.setValue("");

        // find the minimum and the maximum from the values; these values will be used for the range limits
        var limits = values.reduce(function (previousValue, currentValue) {
            var currentDate = sap.hc.mri.pa.ui.Utils.parseISODate(currentValue);
            if (currentDate) {
                if (!previousValue.minDate || previousValue.minDate.getTime() > currentDate.getTime()) {
                    previousValue.minDate = currentDate;
                }
                if (!previousValue.maxDate || previousValue.maxDate.getTime() < currentDate.getTime()) {
                    previousValue.maxDate = currentDate;
                }
            }
            return previousValue;
        }, {
                minDate: null,
                maxDate: null
            });
        if (limits.minDate) {
            this.setLowerConstraint(Utils.formatISODate(limits.minDate));
        }
        if (limits.maxDate) {
            this.setUpperConstraint(Utils.formatISODate(limits.maxDate));
        }
    };

    return DateTimeConstraint;
});
