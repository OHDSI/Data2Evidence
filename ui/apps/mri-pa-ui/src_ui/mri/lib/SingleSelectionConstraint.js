sap.ui.define([
    "jquery.sap.global",
    "./Constraint",
    "sap/ui/commons/DropdownBox"
], function (jQuery, Constraint, DropdownBox) {
    "use strict";

    /**
     * Constructor for a new SingleSelectionConstraint.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * Constraint that allows the selection of a single value.
     * @extends sap.hc.mri.pa.ui.lib.Constraint
     * @alias sap.hc.mri.pa.ui.lib.SingleSelectionConstraint
     */
    var SingleSelectionConstraint = Constraint.extend("sap.hc.mri.pa.ui.lib.SingleSelectionConstraint", {
        renderer: {}
    });

    SingleSelectionConstraint.prototype._createInputContent = function () {
        this._dropDown = new DropdownBox({
            width: "100%",
            change: [this.onChange, this]
        });
        return this._dropDown;
    };

    SingleSelectionConstraint.prototype.onChange = function () {
        this.selectedKey = this._dropDown.getSelectedKey();
        this.onSetConstraintToolTip(this.preparePrefixToolTipString());
        this.fireChanged();
    };

    /**
     * Resets the Constraint to the initial state.
     */
    SingleSelectionConstraint.prototype.clear = function () {
        this.setSelectedKey("");
    };

    /**
     * Check if the SingleSelectionConstraint has a selected value.
     * @override
     * @returns {boolean} True, if there is no filtering value in the Constraint.
     */
    SingleSelectionConstraint.prototype.isEmpty = function () {
        return !this.selectedKey;
    };

    /**
     * Get the selected key of the Constraint.
     * @returns {string} Selected key.
     */
    SingleSelectionConstraint.prototype.getSelectedKey = function () {
        return this.selectedKey;
    };

    SingleSelectionConstraint.prototype.setSelectedKey = function (value) {
        this._dropDown.setSelectedKey(value);
        // save the selected key in another field since it is not returned by the dropdown box until the items are populated
        this.selectedKey = value;
        this.fireChanged();
    };

    SingleSelectionConstraint.prototype.setValueState = function (value) {
        this._dropDown.setValueState(value);
    };

    SingleSelectionConstraint.prototype.setItems = function (items) {
        this._dropDown.removeAllItems();
        items.each(this._dropDown.addItem);
    };

    /**
     * Add an expression to the SingleSelectionConstraint which sets the selection.
     * @throws {Error} When an operator other than = is given.
     * @param {string} sOperator Operator as string
     * @param {string} sValue    Selection key
     */
    SingleSelectionConstraint.prototype.addExpression = function (sOperator, sValue) {
        if (sOperator === "=") {
            this._dropDown.setSelectedKey(sValue);
            this.selectedKey = sValue;
        } else {
            throw new Error("SingleSelectionConstraint does not support operator " + sOperator);
        }
    };

    SingleSelectionConstraint.prototype.onSetConstraintToolTip = function (prefixString) {
        this._dropDown.setTooltip(prefixString + ": " + this._dropDown.getValue());
    };

    SingleSelectionConstraint.prototype.bindItems = function () {
        this._dropDown.bindItems.apply(this._dropDown, arguments);
    };

    return SingleSelectionConstraint;
});
