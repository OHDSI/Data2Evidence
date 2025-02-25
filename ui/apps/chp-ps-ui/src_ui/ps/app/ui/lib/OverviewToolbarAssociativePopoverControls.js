sap.ui.define([
    "jquery.sap.global",
    "sap/ui/base/Metadata"
], function (jQuery, Metadata) {
    "use strict";

    var OverviewToolbarAssociativePopoverControls = Metadata.createClass("hc.hph.patient.app.ui.lib.OverflowToolbarAssociativePopoverControls", {
        /**
         * @private
         */
        constructor: function () {
            this._mControlsCache = {};
        }
    });

    // Button - modifications similar to action sheet
    OverviewToolbarAssociativePopoverControls.prototype._preProcessSapMButton = function (oControl) {
        this._mControlsCache[oControl.getId()] = {
            buttonType: oControl.getType()
        };

        if (oControl.getType() === sap.m.ButtonType.Transparent) {
            oControl.setProperty("type", sap.m.ButtonType.Default, true);
        }

        // Set some css classes to apply the proper paddings in cases of buttons with/without icons
        if (oControl.getIcon()) {
            oControl.addStyleClass("sapMOTAPButtonWithIcon");
        } else {
            oControl.addStyleClass("sapMOTAPButtonNoIcon");
        }

        oControl.attachEvent("_change", this._onSapMButtonUpdated, this);
    };

    OverviewToolbarAssociativePopoverControls.prototype._postProcessSapMButton = function (oControl) {
        var oPrevState = this._mControlsCache[oControl.getId()];

        if (oControl.getType() !== oPrevState.buttonType) {
            oControl.setProperty("type", oPrevState.buttonType, true);
        }

        oControl.removeStyleClass("sapMOTAPButtonNoIcon");
        oControl.removeStyleClass("sapMOTAPButtonWithIcon");

        oControl.detachEvent("_change", this._onSapMButtonUpdated, this);
    };

    OverviewToolbarAssociativePopoverControls.prototype._onSapMButtonUpdated = function (oEvent) {
        var sParameterName = oEvent.getParameter("name");
        var oButton = oEvent.getSource();
        var sButtonId = oButton.getId();

        if (typeof this._mControlsCache[sButtonId] === "undefined") {
            return;
        }

        if (sParameterName === "type") {
            this._mControlsCache[sButtonId].buttonType = oButton.getType();
        }
    };

    // ToggleButton - same as button
    OverviewToolbarAssociativePopoverControls.prototype._preProcessSapMToggleButton = function (oControl) {
        this._preProcessSapMButton(oControl);
    };

    OverviewToolbarAssociativePopoverControls.prototype._postProcessSapMToggleButton = function (oControl) {
        this._postProcessSapMButton(oControl);
    };

    // OverviewButton - same as button
    OverviewToolbarAssociativePopoverControls.prototype._preProcessSapHcHphPatientUiLibOverviewButton = function (oControl) {
        this._preProcessSapMButton(oControl);
    };

    OverviewToolbarAssociativePopoverControls.prototype._postProcessSapHcHphPatientUiLibOverviewButton = function (oControl) {
        this._postProcessSapMButton(oControl);
    };

    /**
     * A map of all controls that are commonly found in an overflow toolbar
     * canOverflow - tells if the control can go to the popover or is forced to always stay in the toolbar (f.e. labels, radio buttons can never overflow)
     * listenForEvents - all events that, when fired, suggest that the interaction with the control is over and the popup must be closed (f.e. button click, select change)
     * noInvalidationProps - all properties of a control that, when changed, do not affect the size of the control, thus don't require a re-rendering of the toolbar (f.e. input value)
     * @private
     */
    OverviewToolbarAssociativePopoverControls._mSupportedControls = {
        "sap.m.ToggleButton": {
            canOverflow: true,
            listenForEvents: ["press"],
            noInvalidationProps: ["enabled", "pressed"]
        },
        "sap.hc.hph.patient.app.ui.lib.OverviewButton": {
            canOverflow: true,
            listenForEvents: ["press"],
            noInvalidationProps: ["enabled", "pressed"]
        }
    };

    /**
     * Returns the control configuration for a given control class (obtained through the control instance)
     * @param {sap.ui.core.Control|string} vControl either a control instance object, or a control class name string
     * @returns {object} Config for supported control
     */
    OverviewToolbarAssociativePopoverControls.getControlConfig = function (vControl) {
        if (typeof vControl === "object") {
            vControl = vControl.getMetadata().getName();
        }
        return OverviewToolbarAssociativePopoverControls._mSupportedControls[vControl];
    };

    /**
     * Tells if a control is supported by the associative popover (i.e. can overflow to it)
     * @param {sap.ui.core.Control|string} vControl either a control instance object, or a control class name string
     * @returns {boolean} true if supported
     */
    OverviewToolbarAssociativePopoverControls.supportsControl = function (vControl) {
        if (typeof vControl === "object") {
            vControl = vControl.getMetadata().getName();
        }
        var oCtrlConfig = OverviewToolbarAssociativePopoverControls._mSupportedControls[vControl];
        return typeof oCtrlConfig !== "undefined" && oCtrlConfig.canOverflow;
    };

    return OverviewToolbarAssociativePopoverControls;
});
