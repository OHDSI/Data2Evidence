sap.ui.define([
    "jquery.sap.global",
    "./MinimapLane",
    "./MinimapLaneRenderer",
    "sap/hc/hph/patient/app/ui/lib/utils/Utils",
    "sap/ui/core/Control",
    "sap/ui/thirdparty/d3"
], function (jQuery, MinimapLane, MinimapLaneRenderer, Utils, Control) {
    "use strict";
    /**
     * Constructor for a new Minimap.
     *
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @class
     * The Minimap control shows an overview of all interactions in different lanes.
     * @extends sap.ui.core.Control
     *
     * @author SAP SE
     * @version 1.0.0
     *
     * @constructor
     * @alias sap.hc.hph.patient.app.ui.lib.timeline.Minimap
     */
    var Minimap = Control.extend("sap.hc.hph.patient.app.ui.lib.timeline.Minimap", {
        metadata: {
            defaultAggregation: "lanes",
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
                 * The patient's date of birth as Date object.
                 */
                dateOfBirth: {
                    type: "object",
                    group: "Data"
                },
                /**
                 * The patient's date of death as Date object.
                 */
                dateOfDeath: {
                    type: "object",
                    group: "Data"
                }
            },
            aggregations: {
                /**
                 * Minimap lanes.
                 */
                lanes: {
                    type: "sap.hc.hph.patient.app.ui.lib.timeline.MinimapLane",
                    multiple: true
                }
            }
        }
    });

    /** @constant {number} Minimal number of rows that the minimap should have. Each lane consumes one row. */
    Minimap.MINIMAP_MIN_ROWS = 3;

    /**
     * Adjust the date of birth time to be displayed in UTC instead of browser local
     * @override
     */
    Minimap.prototype.getDateOfBirth = function () {
        return Utils.utcToLocal(this.getProperty("dateOfBirth"));
    };

    /**
     * Adjust the date of death time to be displayed in UTC instead of browser local
     * @override
     */
    Minimap.prototype.getDateOfDeath = function () {
        return Utils.utcToLocal(this.getProperty("dateOfDeath"));
    };

    /**
     * Returns the D3 scale that the minimap should use for mapping dates to pixels.
     * @returns {object} D3 scale to map dates to pixels
     */
    Minimap.prototype.getScale = function () {
        return this.getParent().getMinimapScale();
    };

    /**
     * Returns the height of the minimap in pixels.
     * @returns {number} Minimap height in pixels.
     */
    Minimap.prototype.getHeight = function () {
        var aVisibleLanes = this.getLanes().filter(function (oLane) {
            return oLane.getVisible();
        });
        return MinimapLaneRenderer.MINIMAP_LANE_HEIGHT * Math.max(aVisibleLanes.length, Minimap.MINIMAP_MIN_ROWS) + 0;
    };

    /**
     * Returns the DOM Element that contains the minimap lanes.
     * @protected
     * @override
     * @returns {HTMLElement} DOM Element that contains lanes.
     */
    Minimap.prototype._getLanesDomRef = function () {
        return this.$("lanes").get(0);
    };

    /**
     * Returns the DOM Element that contains the minimap lanes.
     * @protected
     * @override
     * @returns {HTMLElement} DOM Element that contains lanes.
     */
    Minimap.prototype._getPointsInTimeDomRef = function () {
        return this.$("pit").get(0);
    };

    /**
     * (Re-)renders the minimap lanes using D3.
     */
    Minimap.prototype.renderLanes = function () {
        this.getRenderer().renderLanes(this._getLanesDomRef(), this);
    };

    /**
     * Fills the empty SVG (created with the UI5 Renderer) with actual content.
     * It renders the gray areas outside the patient's lifespan, the today line and the minimap lanes.
     */
    Minimap.prototype.onAfterRendering = function () {
        var group = d3.select(this._getPointsInTimeDomRef());
        var scale = this.getScale();
        var iMinimapHeight = this.getHeight();

        // Add DOB indicator to minimap if it is a valid date
        if (!isNaN(this.getDateOfBirth())) {
            group.append("svg:rect")
                .classed("sapTlTimelineMapDOBArea", true)
                .attr("width", scale(this.getDateOfBirth()))
                .attr("height", iMinimapHeight);
            group.append("svg:line")
                .classed("sapTlTimelineMapDOBLine", true)
                .attr("x1", scale(this.getDateOfBirth()))
                .attr("x2", scale(this.getDateOfBirth()))
                .attr("y2", iMinimapHeight);
        }

        // Add DOD indicator to minimap if it is a valid date
        if (!isNaN(this.getDateOfDeath())) {
            group.append("svg:rect")
                .classed("sapTlTimelineMapDODArea", true)
                .attr("x", scale(this.getDateOfDeath()))
                .attr("width", scale.range()[1] - scale(this.getDateOfDeath()))
                .attr("height", iMinimapHeight);
            group.append("svg:line")
                .classed("sapTlTimelineMapDODLine", true)
                .attr("x1", scale(this.getDateOfDeath()))
                .attr("x2", scale(this.getDateOfDeath()))
                .attr("y2", iMinimapHeight);
        }

        // Add today indicator to minimap if it falls within the map's timeframe
        var dToday = new Date();
        if (dToday > scale.domain()[0] && dToday < scale.domain()[1]) {
            group.append("svg:line")
                .classed("sapTlTimelineMapToday", true)
                .attr("x1", scale(dToday))
                .attr("x2", scale(dToday))
                .attr("y2", iMinimapHeight);
        }
        this.renderLanes();
    };

    return Minimap;
});
