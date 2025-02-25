sap.ui.define([
    "jquery.sap.global",
    "./MinimapLaneRenderer",
    "sap/hc/hph/patient/app/ui/lib/utils/Utils",
    "sap/ui/core/Element",
    "sap/ui/thirdparty/d3"
], function (jQuery, MinimapLaneRenderer, Utils, Element) {
    "use strict";
    /**
     * Constructor for a new MinimapLane.
     *
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @class
     * The MinimapLane control shows an overview of all interactions in one lane.
     * @extends sap.ui.core.Element
     *
     * @author SAP SE
     * @version 1.0.0
     *
     * @constructor
     * @alias sap.hc.hph.patient.app.ui.lib.timeline.MinimapLane
     */
    var MinimapLane = Element.extend("sap.hc.hph.patient.app.ui.lib.timeline.MinimapLane", {
        metadata: {
            properties: {
                /**
				 * Whether the control should be visible on the screen. If set to false, a placeholder is rendered instead of the real control
				 */
                visible: {
                    type: "boolean",
                    group: "Appearance",
                    defaultValue: true
                },
                /**
                 * Scale used to map dates to pixels.
                 */
                scale: {
                    type: "object",
                    group: "Data",
                    defaultValue: d3.time.scale()
                },
                /**
                 * Color of the MinimapLane
                 */
                color: {
                    type: "sap.hc.hph.patient.app.ui.lib.LaneColor",
                    group: "Appearance"
                },
                /**
                 * Array of unclustered tile data objects.
                 */
                data: {
                    type: "object[]",
                    group: "Data",
                    defaultValue: []
                },
                /**
                 * Name of the start date property in a tile data object.
                 */
                startColumn: {
                    type: "string",
                    group: "Data",
                    defaultValue: "start"
                },
                /**
                 * Name of the start date property in a tile data object.
                 */
                endColumn: {
                    type: "string",
                    group: "Data",
                    defaultValue: "end"
                }
            }
        }
    });

    MinimapLane.prototype.getScale = function () {
        return this.getParent().getScale();
    };

    MinimapLane.prototype._getStart = function (oData) {
        return oData[this.getStartColumn()];
    };

    MinimapLane.prototype._getEnd = function (oData) {
        return oData[this.getEndColumn()];
    };

    MinimapLane.prototype._getLeft = function (oData) {
        var dStart = this._getStart(oData);
        return this.getScale()(Utils.utcToLocal(dStart));
    };

    MinimapLane.prototype._getRight = function (oData) {
        var dEnd = this._getEnd(oData);
        return this.getScale()(Utils.utcToLocal(dEnd));
    };

    /**
     * Return the width of the MinimapLane in pixels.
     * @returns {number} Width in pixels
     */
    MinimapLane.prototype.getWidth = function () {
        return this.$().width();
    };

    MinimapLane.prototype._extract = function (oData) {
        return [this._getLeft(oData), this._getRight(oData)];
    };

    return MinimapLane;
});
