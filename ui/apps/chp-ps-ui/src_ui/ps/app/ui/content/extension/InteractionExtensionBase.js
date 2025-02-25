sap.ui.define([
    "jquery.sap.global",
    "sap/ui/base/Object"
], function (jQuery, Object) {
    "use strict";

    /**
     * Constructor for a Patient Summary InteractionExtensionBase.
     * @constructor
     *
     * @classdesc
     * @abstract
     * Provides an abstract base for an interaction extensions.
     * @extends sap.ui.base.Object
     * @alias sap.hc.hph.patient.app.ui.content.extension.InteractionExtensionBase
     */
    var InteractionExtensionBase = Object.extend("sap.hc.hph.patient.app.ui.content.extension.InteractionExtensionBase", {
        metadata: {
            publicMethods: [
                "getOverviewControl",
                "getTimelineControl"
            ],
            abstract: true
        }
    });

    /**
     * Get the Controls from this extension for the Patient Summary Overview.
     * @abstract
     * @param   {string}                sAnnotation Name of the annotation
     * @param   {string[]}              aValue      Values of the annotated attribute
     * @returns {sap.ui.core.Control[]} Controls to be added to the Patient Summary Overview
     */
    InteractionExtensionBase.prototype.getOverviewControls = function (sAnnotation, aValue) {
        throw new Error("getOverviewControl must be implemented in subclass");
    };

    /**
     * Get the Controls from this extension for the Patient Summary Timeline.
     * @abstract
     * @param   {string}                sAnnotation Name of the annotation
     * @param   {string[]}              aValue      Values of the annotated attribute
     * @returns {sap.ui.core.Control[]} Controls to be added to the Patient Summary Timeline
     */
    InteractionExtensionBase.prototype.getTimelineControls = function (sAnnotation, aValue) {
        throw new Error("getTimelineControl must be implemented in subclass");
    };

    return InteractionExtensionBase;
});
