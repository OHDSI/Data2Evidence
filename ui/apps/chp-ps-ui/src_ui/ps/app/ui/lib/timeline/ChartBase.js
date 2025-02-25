sap.ui.define([
    "jquery.sap.global",
    "./LaneBase",
    "sap/hc/hph/patient/app/ui/lib/utils/Utils",
    "sap/ui/thirdparty/d3"
], function (jQuery, LaneBase, Utils) {
    "use strict";
    /**
     * Constructor for a new ChartBase.
     *
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @class
     * The ChartBase control is an abstract base class of the Chart control.
     * @extends sap.ui.core.Control
     *
     * @author SAP SE
     * @version 1.0.0
     *
     * @constructor
     * @alias sap.hc.hph.patient.app.ui.lib.timeline.Chart
     */

    var ChartBase = LaneBase.extend("sap.hc.hph.patient.app.ui.lib.timeline.ChartBase", {
        metadata: {
            properties: {
                /**
                 * Formatter for the values in the ChartBase.
                 */
                formatter: {
                    type: "string",
                    group: "Misc",
                    defaultValue: ""
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
                dateColumn: {
                    type: "string",
                    group: "Data",
                    defaultValue: "start"
                },
                /**
                 * Name of the column that uniquely identifies a datapoint.
                 */
                keyColumn: {
                    type: "string",
                    group: "Data"
                },
                /**
                 * Name of the value column for the ChartBase.
                 */
                valueColumn: {
                    type: "string",
                    group: "Data",
                    defaultValue: "value"
                },
                /**
                 * Text that is shown as last value when there is no data.
                 */
                noDataText: {
                    type: "string",
                    group: "Misc",
                    defaultValue: "?"
                },
                /**
                 * Interaciton name shown in the lane header
                 */
                interactionName: {
                    type: "string",
                    group: "Data",
                    defaultValue: ""
                }
            }
        }
    });

    ChartBase.prototype.init = function () {
        var that = this;

        // Some data points are drawn in an SVG layed over the Canvas in order to easily realize mouse interactions and animations.
        // This array keeps track of those points. A data point enters this array when it gets the focus and leaves it after it losing the focus
        // and after the focus-out animation is finished.
        this._trackedPoints = [];

        // The reason to keep points in the SVG is if they are used as an anchor for a popover that opens when clicking them
        // Points in this array enter before the popover opens and leave after close.
        this._popoverPoints = [];

        this.yAxisScale = d3.scale.linear();
        this.yPadding = 10;
        this.bisectDate = d3.bisector(function (d) {
            return d[that.getDateColumn()];
        }).left;

        this.dateFunc = function (oDatapoint) {
            return this.getScale()(oDatapoint[this.getDateColumn()]);
        }.bind(this);

        this.valueFunc = function (oDatapoint) {
            return this.yAxisScale(oDatapoint[this.getValueColumn()]);
        }.bind(this);
    };

    /**
     * Return the SVG DOM element used to render the chart.
     * @returns {object} D3 selection of the SVG DOM element
     */
    ChartBase.prototype.getSVG = function () {
        return d3.select("#" + this.getId() + " svg");
    };

    /**
     * Update y-axis domain based on the extremes of the given data points and update the x/y-axis range based on the chart dimensions.
     */
    ChartBase.prototype._updateScales = function () {
        var svg = this.getSVG();
        var nHeight = jQuery(svg[0]).height();

        // We set the scale ourselves only when its not already set.
        // In general, we prefer updates from the parent timeline to be pixel synchronized.
        // If we try to always take our own width here to set the range, we get a wrong width due to a dynamic scrollbar which depends
        // on lanes rendered later, see hc/mri-pot#650.
        if (this.getScale().range[1] === 1) {
            var nWidth = jQuery(svg[0]).width();
            this.getScale().range([0, nWidth]);
        }
        this.yAxisScale.range([nHeight - this.yPadding, this.yPadding]);

        var aValues = this.getData().map(function (oDatapoint) {
            return oDatapoint[this.getValueColumn()];
        }, this);

        // Exclude "NoValue" for yAxis scale calculation
        var aNumericalValues = aValues.filter(function (oValue) {
            return typeof oValue === "number" && !isNaN(oValue);
        });

        this.yAxisScale.domain(d3.extent(aNumericalValues));
    };

    /**
     * Abstract base function to rerender the chart
     */
    ChartBase.prototype.refreshChart = function () {
        throw new Error("To be implemented by subclass");
    };

    /**
     * Abstract base function to render the chart initially
     */
    ChartBase.prototype.drawChart = function () {
        throw new Error("To be implemented by subclass");
    };

    /**
     * Update scales based on the y-values and the dimensions of the cart and render chart.
     */
    ChartBase.prototype.onAfterRendering = function () {
        LaneBase.prototype.onAfterRendering.apply(this, arguments);

        this._updateScales();
        this.drawChart();
    };

    /**
     * Lock a datapoint, i.e. it will be stored in the list of datapoints that should be kept as DOM elements in the SVG.
     * @param {Object} oDatapoint Object from the data aggregation.
     * @returns {object} DOM object to be used as the popover anchor
     */
    ChartBase.prototype.lockPoint = function (oDatapoint) {
        if (oDatapoint) {
            this._popoverPoints.push(oDatapoint);
            if (this._trackedPoints.indexOf(oDatapoint) === -1) {
                // The point doesn't exist in the SVG yet, render it
                this.updateFocusPoint();
            }
            var that = this;
            var oHook = this.getSVG().select(".sapTlTimelineChartDots").selectAll("g")
                .data([oDatapoint], function (oDatapoint2) {
                    return oDatapoint2[that.getKeyColumn()];
                })
                .select(".sapTlTimelineChartDotHook");
            return oHook[0] && oHook[0][0];
        }
    };

    /**
     * Unlock a datapoint, i.e. it will be potentially removed from the SVG (unless it is hovered or currently being animated).
     * @param {Object} oDatapoint Object from the data aggregation.
     */
    ChartBase.prototype.unlockPoint = function (oDatapoint) {
        if (oDatapoint) {
            var index = this._popoverPoints.indexOf(oDatapoint);
            if (index !== -1) {
                this._popoverPoints.splice(index, 1);
                if (this._trackedPoints.indexOf(oDatapoint) === -1) {
                    // No need to keep the point in the SVG any longer, remove it
                    this.updateFocusPoint();
                }
            }
        }
    };

    /**
     * Return the data point with minimal Euclidean distance to mouse cursor
     * @param {number[]} aPosition Mouse cursor coordinates [x,y]
     * @param {number}   nMaxDistance Euclidean distance cutoff
     * @param {object[]} aDatapoints (Optional) array of data points to examine (use 'data' aggregation if undefined)
     * @returns {object} The data point with minimal Euclidean distance to aPosition or undefined, if greater than distance cutoff
     */
    ChartBase.prototype.getClosestDatapoint = function (aPosition, nMaxDistance, aDatapoints) {
        var that = this;

        // Minimize Euklidian distance
        if (!nMaxDistance) {
            nMaxDistance = Infinity;
        }

        if (!aDatapoints) {
            aDatapoints = this.getData() || [];
        }

        return aDatapoints.reduce(function (oMin, oDatapoint) {
            var nDX = that.dateFunc(oDatapoint);
            var nDY = that.valueFunc(oDatapoint);
            if (!isNaN(nDX) && !isNaN(nDY)) {
                nDX -= aPosition[0];
                nDY -= aPosition[1];
                var nDist = Math.sqrt(nDX * nDX + nDY * nDY);
                if (nDist < oMin.dist) {
                    oMin.dist = nDist;
                    oMin.datapoint = oDatapoint;
                }
            }
            return oMin;
        }, {
            dist: nMaxDistance
        }).datapoint;
    };

    /**
     * Returns the last entry with a defined value column of the data array or undefined.
     * @returns {object|undefined} Last valid data entry or undefined
     */
    ChartBase.prototype.getLastDatapoint = function () {
        var aData = this.getData() || [];
        for (var i = aData.length - 1; i >= 0; --i) {
            if (aData[i].hasOwnProperty(this.getValueColumn())) {
                return aData[i];
            }
        }
    };

    /**
     * Returns the responsible Lane control.
     * @returns {sap.hc.hph.patient.app.ui.lib.timeline.Lane|undefined} Lane for this Chart
     */
    ChartBase.prototype.getLane = function () {
        var oParent = this.getParent();
        if (oParent instanceof sap.hc.hph.patient.app.ui.lib.timeline.Lane) {
            return oParent;
        }
    };

    /**
     * Return the formatted text a datapoint will show when focussed or being the minimal/maximal point in the viewport.
     * @param {object} oDataPoint Object from the data aggregation.
     * @returns {string} Formatted text
     */
    ChartBase.prototype.getDisplayValue = function (oDataPoint) {
        if (this.getFormatter()) {
            return this.getFormatter().replace(/{(\$?\w+)}/g, function (_, sPlaceholderAttributeId) {
                var aValues = oDataPoint[sPlaceholderAttributeId];
                if (Array.isArray(aValues)) {
                    return oDataPoint[sPlaceholderAttributeId].join(", ");
                } else {
                    return typeof aValues !== "undefined" ? aValues : "?";
                }
            });
        } else {
            return oDataPoint[this.getValueColumn()];
        }
    };

    /**
     * Updates scale, rerenders chart and forwards scale changes to all sublanes.
     * @param {object} oScale D3 scale object to convert from dates to pixels
     */
    ChartBase.prototype.setScale = function () {
        LaneBase.prototype.setScale.apply(this, arguments);
        if (this.getVisible()) {
            this.refreshChart();
        }
    };

    /**
     * Returns the most recent attribute value shown on the lane header.
     * @returns {string} The most recent attribute value or the no-value text
     * @override
     */
    ChartBase.prototype.getValue = function () {
        var mDatapoint = this.getLastDatapoint();
        if (mDatapoint) {
            return this.getDisplayValue(mDatapoint);
        } else {
            return this.getNoDataText();
        }
    };

    /**
     * Returns a formatted text with the timestamp of the most recent value used as tooltip on the lane header.
     * @returns {string} Formatted text with the timestamp of the most recent value
     * @override
     */
    ChartBase.prototype.getValueTooltip = function () {
        var mDatapoint = this.getLastDatapoint();
        if (mDatapoint) {
            var dStart = mDatapoint[this.getDateColumn()];
            var sDate = dStart ? Utils.formatDateTime(dStart, true) : "";
            return jQuery.sap.formatMessage(this.getProperty("valueTooltip"), [sDate]);
        } else {
            return "";
        }
    };

    return ChartBase;
});
