sap.ui.define([
    "./LaneBase"
], function (LaneBase) {
    "use strict";
    /**
     * Constructor for a new Lane.
     *
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @class
     * The Lane control represents one group of interactions in the Timeline.
     * @extends sap.hc.hph.patient.app.ui.lib.timeline.LaneBase
     *
     * @author SAP SE
     * @version 1.0.0
     *
     * @constructor
     * @alias sap.hc.hph.patient.app.ui.lib.timeline.Lane
     */
    var Lane = LaneBase.extend("sap.hc.hph.patient.app.ui.lib.timeline.Lane", {
        metadata: {
            defaultAggregation: "content",
            aggregations: {
                /**
                 * Content that will be rendered in the lane body (part right of the lane header).
                 */
                content: {
                    type: "sap.ui.core.Control",
                    multiple: true
                }
            }
        }
    });

    /**
     * Return a the jQuery selection of the lane body (part right of the lane header.
     * @returns {number} jQuery selection of the lane body
     */
    Lane.prototype.getBody = function () {
        return this.$("body");
    };

    /**
     * Return the width of the Lane in pixels.
     * @returns {number} Width in pixels
     */
    Lane.prototype.getWidth = function () {
        return this.getBody().width();
    };

    /**
     * Forward scale changes to all Controls in the content and sublanes aggregations.
     * @param {object} oScale D3 scale object to convert from dates to pixels
     */
    Lane.prototype.setScale = function (oScale) {
        if (this.getVisible()) {
            this.getContent().forEach(function (oControl) {
                if (oControl.setScale) {
                    oControl.setScale(oScale);
                }
            });
        }
        LaneBase.prototype.setScale.apply(this, arguments);
    };

    return Lane;
});
