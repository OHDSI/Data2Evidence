sap.ui.define([
    "jquery.sap.global",
    "./library",
    "sap/m/Input"
], function (jQuery, library, Input) {
    "use strict";

    /**
     * Constructor for a new EnterAwareInput.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * This control extends the regular Input to react to onsapenter.
     * @extends sap.m.Input
     * @alias hc.hph.patient.app.ui.lib.EnterAwareInput
     */
    var EnterAwareInput = Input.extend("hc.hph.patient.config.ui.lib.EnterAwareInput", {
        metadata: {
            library: "hc.hph.patient.config.ui.lib",
            events: {
                /**
                 * event fired when enter is pressed to register to
                 */
                enter: {}
            }
        }
    });

    /**
     * Function is called before the rendering of the control is started.
     * Set the type of the Input to Unstyled, so we can apply our own styles easily.
     * @override
     * @protected
     */
    EnterAwareInput.prototype.onsapenter = function () {
        if (sap.m.InputBase.prototype.onsapenter) {
            sap.m.InputBase.prototype.onsapenter.apply(this, arguments);
        }
        if (this._iSuggestDelay) {
            jQuery.sap.clearDelayedCall(this._iSuggestDelay);
            this._iSuggestDelay = null;
        }
        if (this._oSuggestionPopup && this._oSuggestionPopup.isOpen()) {
            if (this._iPopupListSelectedIndex >= 0) {
                var s = this._oList.getItems()[this._iPopupListSelectedIndex];
                if (s) {
                    this._fireSuggestionItemSelectedEvent(s);
                }
                this._doSelect();
                this._iPopupListSelectedIndex = -1;
            }
            this._oSuggestionPopup.close();
        }

        this.fireEnter();
    };

    return EnterAwareInput;
});
