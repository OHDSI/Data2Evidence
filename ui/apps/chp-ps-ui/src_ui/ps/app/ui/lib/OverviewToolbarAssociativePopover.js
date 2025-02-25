sap.ui.define([
    "sap/m/Popover",
    "sap/m/PopoverRenderer",
    "./OverviewToolbarAssociativePopoverControls"
], function (Popover, PopoverRenderer, OverviewToolbarAssociativePopoverControls) {
    "use strict";

    /**
     * Constructor for a new OverflowToolbarAssociativePopover.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * OverflowToolbarAssociativePopover is a version of Popover that uses an association in addition to the aggregation
     * @extends sap.ui.core.Popover
     * @alias sap.hc.hph.patient.app.ui.lib.OverflowToolbarAssociativePopover
     */
    var OverviewToolbarAssociativePopover = Popover.extend("hc.hph.patient.app.ui.lib.OverflowToolbarAssociativePopover", {
        metadata: {
            associations: {
                /**
                 * The same as content, but provided in the form of an association
                 */
                associatedContent: {
                    type: "sap.ui.core.Control",
                    multiple: true
                }
            }
        },
        renderer: PopoverRenderer.render
    });

    OverviewToolbarAssociativePopover.prototype.init = function () {
        Popover.prototype.init.apply(this, arguments);

        // Workaround - no arrow when on mobile so that the popover can snap to the opening button
        if (sap.ui.Device.system.phone) {
            this._removeOffsetTakenByTheArrow();
        }

        // Instantiate the helper that will manage controls entering/leaving the popover
        this.oControlsManager = new OverviewToolbarAssociativePopoverControls();
    };

    OverviewToolbarAssociativePopover.prototype.onBeforeRendering = function () {
        Popover.prototype.onBeforeRendering.apply(this, arguments);
        this.addStyleClass("sapMOTAPopover");

        var bHasButtonsWithIcons = this.getContent().some(function (oControl) {
            return oControl.hasStyleClass("sapMOTAPButtonWithIcon");
        });

        if (bHasButtonsWithIcons) {
            this.addStyleClass("sapMOTAPButtonsWithIcons");
        } else {
            this.removeStyleClass("sapMOTAPButtonsWithIcons");
        }
    };

    function fnCapitalize(sName) {
        return sName.substring(0, 1).toUpperCase() + sName.substring(1);
    }

    /**
     * Removes the offset taken by the arrow (should be only used on mobile devices where the arrow is hidden)
     * @private
     */
    OverviewToolbarAssociativePopover.prototype._removeOffsetTakenByTheArrow = function () {
        this._marginTop = 0;
        this._marginLeft = 0;
        this._marginRight = 0;
        this._marginBottom = 0;
        this._arrowOffset = 0;
        this._offsets = ["0 0", "0 0", "0 0", "0 0"];
        this._myPositions = ["begin bottom", "begin center", "begin top", "end center"];
        this._atPositions = ["begin top", "end center", "begin bottom", "begin center"];
    };

    /* Override API methods */
    OverviewToolbarAssociativePopover.prototype.addAssociatedContent = function (oControl) {
        this.addAssociation("associatedContent", oControl, true);
        this._preProcessControl(oControl);
        return this;
    };

    OverviewToolbarAssociativePopover.prototype.removeAssociatedContent = function (oControl) {
        var sResult = this.removeAssociation("associatedContent", oControl, true);
        var oControlObject;

        if (sResult) {
            oControlObject = sap.ui.getCore().byId(sResult);
            this._postProcessControl(oControlObject);
        }
        return sResult;
    };

    /**
     * Use the helper to modify controls that are about to enter the popover, so that they look good there
     * @private
     * @param   {sap.ui.core.Control}                                         oControl Control
     * @returns {sap.hc.hph.patient.app.ui.lib.OverviewToolbarAssociativePopover} this
     */
    OverviewToolbarAssociativePopover.prototype._preProcessControl = function (oControl) {
        var sCtrlClass = oControl.getMetadata().getName();
        var oCtrlConfig = OverviewToolbarAssociativePopoverControls.getControlConfig(oControl);
        var sAttachFnName;
        var sPreProcessFnName;

        // For each event that must close the popover, attach a handler
        oCtrlConfig.listenForEvents.forEach(function (sEventType) {
            sAttachFnName = "attach" + fnCapitalize(sEventType);
            oControl[sAttachFnName](this._closeOnInteraction, this);
        }, this);

        // Call preprocessor function, if any
        sPreProcessFnName = "_preProcess" + sCtrlClass.split(".").map(fnCapitalize).join("");
        if (typeof this.oControlsManager[sPreProcessFnName] === "function") {
            this.oControlsManager[sPreProcessFnName](oControl);
        }

        return this;
    };

    /**
     * Use the helper to restore controls that leave the popover to their previous state
     * @private
     * @param   {sap.ui.core.Control}                                         oControl Control
     * @returns {sap.hc.hph.patient.app.ui.lib.OverviewToolbarAssociativePopover} this
     */
    OverviewToolbarAssociativePopover.prototype._postProcessControl = function (oControl) {
        var sCtrlClass = oControl.getMetadata().getName();
        var oCtrlConfig = OverviewToolbarAssociativePopoverControls.getControlConfig(oControl);
        var sDetachFnName;
        var sPostProcessFnName;

        // For each event that must close the popover, detach the handler
        oCtrlConfig.listenForEvents.forEach(function (sEventType) {
            sDetachFnName = "detach" + fnCapitalize(sEventType);
            oControl[sDetachFnName](this._closeOnInteraction, this);
        }, this);

        // Call preprocessor function, if any
        sPostProcessFnName = "_postProcess" + sCtrlClass.split(".").map(fnCapitalize).join("");
        if (typeof this.oControlsManager[sPostProcessFnName] === "function") {
            this.oControlsManager[sPostProcessFnName](oControl);
        }

        // It is important to explicitly destroy the control from the popover's DOM when using associations, because the toolbar will render it again and there will be a DOM duplication side effect
        oControl.$().remove();

        return this;
    };

    /**
     * Many of the controls that enter the popover attach this function to some of their interaction events, such as button click, select choose, etc...
     * @private
     */
    OverviewToolbarAssociativePopover.prototype._closeOnInteraction = function () {
        this.close();
    };

    /**
     * Creates a hash of the ids of the controls in the content association, f.e. "__button1.__button2.__button3"
     * Useful to check if the same controls are in the popover in the same order compared to a point in the past
     * @returns {*|string|!Array.<T>} Content hash
     * @private
     */
    OverviewToolbarAssociativePopover.prototype._getContentIdsHash = function () {
        return this.getContent().join(".");
    };

    /**
     * Returns the content from the aggregation and association combined.
     * @returns {(Array.<T>|string|*|!Array)} Combined content.
     * @private
     */
    OverviewToolbarAssociativePopover.prototype.getContent = function () {
        var aAssociatedContent = this.getAssociatedContent().map(function (sId) {
            return sap.ui.getCore().byId(sId);
        });

        if (this.getPlacement() === sap.m.PlacementType.Top) {
            aAssociatedContent.reverse();
        }

        return Popover.prototype.getContent.call(this).concat(aAssociatedContent);
    };

    /**
     * Friendly function to be used externally to get the calculated popover position
     * @returns {Popover._oCalcedPos|*} Position
     */
    OverviewToolbarAssociativePopover.prototype.getCurrentPosition = function () {
        return this._oCalcedPos;
    };

    /**
     * Force the firing of the "afterOpen" event prematurely, immediately after the popover position is recalculated
     * This is needed for the popover shadow classes to be set before rendering so there is no shadow blinking
     * @returns {*} res
     * @private
     */
    OverviewToolbarAssociativePopover.prototype._calcPlacement = function () {
        var oRes = Popover.prototype._calcPlacement.call(this);
        this.fireAfterOpen({});
        return oRes;
    };

    return OverviewToolbarAssociativePopover;
});
