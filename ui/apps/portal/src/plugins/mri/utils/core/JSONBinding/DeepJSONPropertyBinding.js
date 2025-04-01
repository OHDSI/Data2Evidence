sap.ui.define(
  ["jquery.sap.global", "sap/ui/model/json/JSONPropertyBinding"],
  function (jQuery, JSONPropertyBinding) {
    "use strict";
    /**
     *
     * @class
     * Property binding implementation for JSON format.
     * This implementation also reports change events for any changes within the bound object.
     *
     * @param {sap.ui.model.json.JSONModel} oModel
     * @param {string} sPath
     * @param {sap.ui.model.Context} oContext
     * @param {object} [mParameters]
     * @alias hc.hph.core.ui.JSONBinding.DeepJSONPropertyBinding
     * @extends sap.ui.model.json.JSONPropertyBinding
     */
    var DeepJSONPropertyBinding = JSONPropertyBinding.extend(
      "hc.hph.core.ui.JSONBinding.DeepJSONPropertyBinding",
      {
        constructor: function () {
          JSONPropertyBinding.apply(this, arguments);
          this._setLastCheckedValue(this._getValue());
        },
        /**
         * Check whether this Binding has changed since the last check.
         *
         * @param {boolean} bForceupdate Whether to fire a change event without checking for changes
         * @override
         */
        checkUpdate: function (bForceupdate) {
          var oValue = this._getValue();
          if (this._hasChanged(oValue) || bForceupdate) {
            this.oValue = oValue;
            this._setLastCheckedValue(oValue);
            this._fireChange({ reason: sap.ui.model.ChangeReason.Change });
          }
        },
        /**
         * Compares the current value with the one from the last check.
         * Objects are compared in a stringified version. This allows a compare of the
         * whole object structure, without missing out on date changes.
         *
         * @private
         *
         * @param {object} oValue   Value at last check
         * @returns {boolean}       Whether the value has changed
         */
        _hasChanged: function (oValue) {
          if (typeof oValue !== "object") {
            return !jQuery.sap.equal(oValue, this.lastCheckedValue);
          } else {
            return this.lastCheckedValue !== JSON.stringify(oValue);
          }
        },
        /**
         * Saves the last checked value.
         * Objects are stored in a stringified version.
         * @private
         *
         * @param {object} oValue Value at last check
         *
         */
        _setLastCheckedValue: function (oValue) {
          if (typeof oValue === "object") {
            this.lastCheckedValue = JSON.stringify(oValue);
          } else {
            this.lastCheckedValue = oValue;
          }
        },
      }
    );
    return DeepJSONPropertyBinding;
  }
);
