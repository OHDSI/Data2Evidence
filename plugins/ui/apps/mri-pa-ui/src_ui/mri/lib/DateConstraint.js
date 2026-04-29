sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "./datetimepicker/DatePicker",
    "./DateTimeConstraint"
], function (jQuery, Utils, DatePicker, DateTimeConstraint) {
    "use strict";

    /**
     * Constructor for a new DateConstraint.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * DateConstraint Control.
     * @extends sap.hc.mri.pa.ui.lib.DateTimeConstraint
     * @alias sap.hc.mri.pa.ui.lib.DateConstraint
     */
    var DateConstraint = DateTimeConstraint.extend("sap.hc.mri.pa.ui.lib.DateConstraint", {
        renderer: {}
    });

    /**
     * Validates the time range.
     * @private
     * @returns {Boolean} valid time range
     */
    DateConstraint.prototype._validateTimeRange = function () {
        if (this._lowerDateValid && this._upperDateValid && this._lowerInput.getValue() > this._upperInput.getValue()) {
            return false;
        } else {
            return true;
        }
    };

    /**
     * Validates the lower date. If the time range is invalid a proper error message is provided.
     * @private
     * @param {Boolean} bDateValid indicates whether the single date is valid (without time range validation)
     * @returns {Boolean} indicates whether date is valid (including time range validation)
     */
    DateConstraint.prototype._validateLowerDate = function (bDateValid) {
        // Parameter is undefined if event is triggered manually
        if (typeof bDateValid === "undefined") {
            bDateValid = this._lowerDateValid;
        } else {
            this._lowerDateValid = bDateValid;
        }

        // check whether time interval is valid
        var bTimeRangeValid = true;
        if (!this._validateTimeRange()) {
            bTimeRangeValid = false;
            this._lowerInput.setValueStateText(Utils.getText("MRI_PA_TIMERANGE_INVALID"));
        }

        return bDateValid && bTimeRangeValid;
    };

    /**
     * Validates the upper date. If the time range is invalid a proper error message is provided.
     * @private
     * @param {Boolean} bDateValid indicates whether the single date is valid (without time range validation)
     * @returns {Boolean} indicated whether date is valid (including time range validation)
     */
    DateConstraint.prototype._validateUpperDate = function (bDateValid) {
        // Parameter is undefined if event is triggered manually
        if (typeof bDateValid === "undefined") {
            bDateValid = this._upperDateValid;
        } else {
            this._upperDateValid = bDateValid;
        }

        // check whether time interval is valid
        var bTimeRangeValid = true;
        if (!this._validateTimeRange()) {
            bTimeRangeValid = false;
            this._upperInput.setValueStateText(Utils.getText("MRI_PA_TIMERANGE_INVALID"));
        }

        return bDateValid && bTimeRangeValid;
    };

    DateConstraint.prototype._createLower = function () {
        return new DatePicker({
            change: [function (oEvent) {
                // Check whether date is valid
                var bDateValid = oEvent.getParameter("valid");
                var bEntryValid = this._validateLowerDate(bDateValid);
                oEvent.getSource().setValueState(bEntryValid ? sap.ui.core.ValueState.None : sap.ui.core.ValueState.Error);
                this.setFromToolTip(this.preparePrefixToolTipString());
                this.fireChanged();

                // if other input was invalid it gets validated again
                if (bEntryValid && this._upperInput.getValueState() === sap.ui.core.ValueState.Error) {
                    this._upperInput.fireChange();
                }
            }, this],
            valueFormat: Utils.getISODatePattern(),
            placeholder: "{i18n>MRI_PA_INPUT_PLACEHOLDER_ALL}",
            width: "100%"
        });
    };

    DateConstraint.prototype._createUpper = function () {
        return new DatePicker({
            change: [function (oEvent) {
                // Check whether date is valid
                var bDateValid = oEvent.getParameter("valid");
                var bEntryValid = this._validateUpperDate(bDateValid);
                oEvent.getSource().setValueState(bEntryValid ? sap.ui.core.ValueState.None : sap.ui.core.ValueState.Error);
                this.setToToolTip(this.preparePrefixToolTipString());
                this.fireChanged();

                // if other input was invalid it gets validated again
                if (bEntryValid && this._lowerInput.getValueState() === sap.ui.core.ValueState.Error) {
                    this._lowerInput.fireChange();
                }
            }, this],
            valueFormat: Utils.getISODatePattern(),
            placeholder: "{i18n>MRI_PA_INPUT_PLACEHOLDER_TODAY}",
            width: "100%"
        });
    };

    /**
     * Sets the display pattern to be used by the picker control.
     * @override
     * @returns {string} Date pattern
     */
    DateConstraint.prototype.getDisplayPattern = function () {
        return Utils.getUserPrefsDatePattern();
    };

    /**
     * Formats the date using the formatter of the constraint.
     * @override
     * @param   {Date}   dDate Date object
     * @returns {string} formatted date
     */
    DateConstraint.prototype.nicelyFormatDate = function (dDate) {
        return Utils.formatDate(dDate, true);
    };

    /**
     * Gets the upper constraint as an ISO string. The date corresponds to the date displayed while the time part is
     * the end of the day to also work as expected when the attribute used for this constraint returns a time stamp.
     * @override
     * @returns {string} ISO string value in UTC
     */
    DateConstraint.prototype.getUpperConstraintISO = function () {
        if (this._upperInput.getValue() && this._upperInput.getValueState() === sap.ui.core.ValueState.None) {
            return Utils.formatISODate(this._toUTCEndOfDay(Utils.localToUtc(this._upperInput.getDateValue())));
        } else {
            return "";
        }
    };

    /**
     * Given a date object, it sets the time part to the last millisecond of the day (23:59:59.999)
     * @private
     * @param   {Date} dDate Date object
     * @returns {Date} the modified date
     */
    DateConstraint.prototype._toUTCEndOfDay = function (dDate) {
        if (dDate) {
            dDate.setUTCHours(23);
            dDate.setUTCMinutes(59);
            dDate.setUTCSeconds(59);
            dDate.setUTCMilliseconds(999);
            return dDate;
        }
        return dDate;
    };

    return DateConstraint;
});
