sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "./Constraint",
    "sap/m/Label",
    "sap/ui/commons/TextField",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/type/Float"
], function (jQuery, Utils, Constraint, Label, TextField, JSONModel, Float) {
    "use strict";

    /**
     * Constructor for a new LegacyRangeConstraint.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * Legacy Constraint that allows input of a start and end point to define a range.
     * @extends sap.hc.mri.pa.ui.lib.Constraint
     * @alias sap.hc.mri.pa.ui.lib.LegacyRangeConstraint
     */
    var LegacyRangeConstraint = Constraint.extend("sap.hc.mri.pa.ui.lib.LegacyRangeConstraint", {
        renderer: {}
    });

    LegacyRangeConstraint.prototype._createInputContent = function () {
        var that = this;
        this._model = new JSONModel({
            lowerValue: null,
            upperValue: null,
            valueState: sap.ui.core.ValueState.None
        });
        var oFloatType = new Float();
        /**
         * Overwrite for the internal parse function.
         * This is necessary because the SAPUI5 function doesn't allow empty strings as values.
         * Therefore if the value of an input using the Float type is set to empty (after having had a value before),
         * the parse function throws an error as parsing an empty string to float results in NaN.
         * This however means that further formatting is skipped and the value in the model keeps the old value.
         * @param   {any}    oValue        Value to be parsed, most likely string.
         * @param   {string} sInternalType Type of the value.
         * @returns {number} Float represantation of the value or undefined if the value was an empty string.
         */
        oFloatType.parseValue = function (oValue, sInternalType) {
            if (oValue === "") {
                return;
            }
            return Float.prototype.parseValue.call(this, oValue, sInternalType);
        };

        // set up lower bound input controls
        this._lowerInput = new TextField({
            placeholder: "0",
            value: {
                path: "constraints>/lowerValue",
                type: oFloatType
            },
            valueState: "{constraints>/valueState}",
            width: "100%",
            change: function () {
                that.setFromToolTip(that.preparePrefixToolTipString());
                that.fireChanged();
            },
            liveChange: function (oEvent) {
                var oModel = oEvent.getSource().getModel("constraints");
                var sLiveValue = oEvent.getParameter("liveValue");
                var iUpperValue = oModel.getProperty("/upperValue");

                // If both values are set, check if lower is bigger than higher and set state to error.
                if (sLiveValue && iUpperValue && sLiveValue > iUpperValue) {
                    oModel.setProperty("/valueState", sap.ui.core.ValueState.Error);
                } else {
                    oModel.setProperty("/valueState", sap.ui.core.ValueState.None);
                }
            }
        }).setModel(this._model, "constraints");

        this._upperInput = new TextField({
            placeholder: "{i18n>MRI_PA_INPUT_PLACEHOLDER_ALL}",
            value: {
                path: "constraints>/upperValue",
                type: oFloatType
            },
            valueState: "{constraints>/valueState}",
            width: "100%",
            change: function () {
                that.setToToolTip(that.preparePrefixToolTipString());
                that.fireChanged();
            },
            liveChange: function (oEvent) {
                var oModel = oEvent.getSource().getModel("constraints");
                var sLiveValue = oEvent.getParameter("liveValue");
                var iLowerValue = oModel.getProperty("/lowerValue");

                // If both values are set, check if lower is bigger than higher and set state to error.
                if (sLiveValue && iLowerValue && sLiveValue < iLowerValue) {
                    oModel.setProperty("/valueState", sap.ui.core.ValueState.Error);
                } else {
                    oModel.setProperty("/valueState", sap.ui.core.ValueState.None);
                }
            }
        }).setModel(this._model, "constraints");

        var oSeparatorLabel = new Label({
            text: "–", // en-dash
            width: "1rem",
            textAlign: sap.ui.core.TextAlign.Center
        });

        this._setGrowingLayout(this._lowerInput);
        this._setGrowingLayout(this._upperInput);

        return [this._lowerInput, oSeparatorLabel, this._upperInput];
    };

    LegacyRangeConstraint.prototype.setLower = function (value) {
        this._model.setProperty("/lowerValue", value);
        this.fireChanged();
    };

    LegacyRangeConstraint.prototype.setUpper = function (value) {
        this._model.setProperty("/upperValue", value);
        this.fireChanged();
    };

    LegacyRangeConstraint.prototype.getLower = function () {
        return this._model.getProperty("/lowerValue");
    };

    LegacyRangeConstraint.prototype.getUpper = function () {
        return this._model.getProperty("/upperValue");
    };

    /**
     * Add an expression to the LegacyRangeConstraint which sets either the lower or the upper input value.
     * @throws {Error} When an operator other than >= or <= is given.
     * @param {string} sOperator Operator as string
     * @param {string} sValue    Number value
     */
    LegacyRangeConstraint.prototype.addExpression = function (sOperator, sValue) {
        if (sOperator === ">=") {
            this._model.setProperty("/lowerValue", sValue);
        } else if (sOperator === "<=") {
            this._model.setProperty("/upperValue", sValue);
        } else {
            throw new Error("LegacyRangeConstraint does not support operator " + sOperator);
        }
    };

    /**
     * Resets the Constraint to the initial state.
     */
    LegacyRangeConstraint.prototype.clear = function () {
        this._model.setProperty("/lowerValue");
        this._model.setProperty("/upperValue");
        this.fireChanged();
    };


    /**
     * Check if the LegacyRangeConstraint has a selected value.
     * @override
     * @returns {boolean} True, if neither lower nor upper are set.
     */
    LegacyRangeConstraint.prototype.isEmpty = function () {
        return !this._model.getProperty("/lowerValue") && !this._model.getProperty("/upperValue");
    };

    LegacyRangeConstraint.prototype.onSetConstraintToolTip = function (prefixString) {
        this.setFromToolTip(prefixString);
        this.setToToolTip(prefixString);
    };

    LegacyRangeConstraint.prototype.setFromToolTip = function (prefixString) {
        var fromStr = Utils.getText("MRI_PA_FILTERCARD_FROM_RANGE");
        this._lowerInput.setTooltip(prefixString + " - " + fromStr + ": " + this._lowerInput.getValue());
    };

    LegacyRangeConstraint.prototype.setToToolTip = function (prefixString) {
        var toStr = Utils.getText("MRI_PA_FILTERCARD_TO_RANGE");
        this._upperInput.setTooltip(prefixString + " - " + toStr + ": " + this._upperInput.getValue());
    };

    return LegacyRangeConstraint;
});
