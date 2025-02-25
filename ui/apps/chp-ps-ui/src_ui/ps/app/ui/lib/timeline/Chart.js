sap.ui.define([
    "jquery.sap.global",
    "./ChartBase",
    "./CircleStencil",
    "sap/hc/hph/patient/app/ui/lib/library",
    "sap/ui/thirdparty/d3"
], function (jQuery, ChartBase, CircleStencil) {
    "use strict";
    /**
     * Constructor for a new Chart lane.
     *
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @class
     * The Chart control represents one group of attributes over time.
     * @extends sap.ui.core.Control
     *
     * @author SAP SE
     * @version 1.0.0
     *
     * @constructor
     * @alias sap.hc.hph.patient.app.ui.lib.timeline.Chart
     */

    var Chart = ChartBase.extend("sap.hc.hph.patient.app.ui.lib.timeline.Chart", {
        metadata: {
            properties: {
                /**
                 * Char mode Chart.
                 */
                mode: {
                    type: "sap.hc.hph.patient.app.ui.lib.timeline.ChartMode",
                    group: "Appearance",
                    defaultValue: sap.hc.hph.patient.app.ui.lib.timeline.ChartMode.Line
                }
            },
            events: {
                datapointClick: {
                    allowPreventDefault: true,
                    parameters: {
                        datapoint: {type: "string"},
                        d3Event: {type: "Event"}
                    }
                }
            }
        }
    });

    // Constants to distinguish the type of labels
    Chart.LAST_VALUE_TAG = 0;
    Chart.MIN_MAX_TAG = 1;
    Chart.FOCUS_TAG = 2;

    /** @const{number} The point with the shortest distance between center and mouse will get the focus if it is within this threshold */
    Chart.FOCUS_DISTANCE = 50;

    /** @const{number} Defines the circle radius of an unfocussed data point in pixels */
    Chart.CIRCLE_RADIUS = 4;

    /** @const{number} Defines the circle radius of a focussed data point in pixels */
    Chart.CIRCLE_TOUCH_RADIUS = Chart.CIRCLE_RADIUS * 3;

    /** @const{number} Pixel density of the circle stencil used to draw the data points.
     * Defines the resolution of the circle template used to draw all data points in the canvas. It should be >1 to avoid Jaggies.
     * Large values result in a poor anti-aliasing. A value of 2 turned out to work quite well.
     */
    Chart.STENCIL_DENSITY = 2;

    /** @const{number} Left and right margin of the lane.
     * The visible area is extended by a margin to the left and right. Data points with a center outside
     * this area are not drawn. The margin should be at least the radius of a focussed point.
     */
    Chart.CLIPPING_MARGIN = Math.ceil(Chart.CIRCLE_RADIUS * 1.7);

    Chart.prototype.init = function () {
        ChartBase.prototype.init.apply(this, arguments);

        // Array of all pending mousemove events. The delayed handling is required to detect the delayed mousemove event sent by a touch device
        this._delayedMouseMoveEvents = [];
    };

    /**
     * Update labels and focussed point given the position of the mouse cursor
     * @param {number[]} aPosition Mouse cursor coordinates [x,y]
     * @param {number} [nDistance=Chart.FOCUS_DISTANCE] Distance cutoff
     * @returns {object} The data point that is closed to aPosition and within distance cutoff
     */
    Chart.prototype.updateFocus = function (aPosition, nDistance) {
        var oFocusPoint;
        nDistance = nDistance || Chart.FOCUS_DISTANCE;
        this._focusPosition = aPosition;
        if (aPosition) {
            oFocusPoint = this.getClosestDatapoint(aPosition, nDistance, this._visibleData);
        }
        this._focusPoint = oFocusPoint;
        this.updateFocusPoint(this._visibleData);
        this.updateLabels(false);
        return oFocusPoint;
    };

    /**
     * Update the canvas and circle stencil in case of a change in size or resolution.
     */
    Chart.prototype._checkResize = function () {
        var oCanvas = this.$("canvas")[0];

        // It could be that we get here because of getVisible() === true,
        // but the DOM is not yet existent, because of a pending rendering event
        if (!oCanvas) {
            return;
        }

        // Update canvas if necessary
        var oCtx = oCanvas.getContext("2d");
        var iWidth = this.getScale().range()[1];
        var fDensity = window.devicePixelRatio ? window.devicePixelRatio : 1;

        // Prepare canvas for displays with a resolution that is higher than 1 pixel, e.g. Retina
        if (this._canvasWidth !== iWidth || this._canvasDensity !== fDensity) {
            this._canvasWidth = iWidth;
            this._canvasDensity = fDensity;

            // Prepare canvas for displays with a resolution that is higher than 1 pixel, e.g. Retina
            oCanvas.setAttribute("width", this._canvasWidth * this._canvasDensity);
            oCanvas.setAttribute("height", this._canvasHeight * this._canvasDensity);
            oCtx.scale(this._canvasDensity, this._canvasDensity);

            // Set canvas line and fill styles
            oCtx.strokeStyle = this._strokeColor;
            oCtx.fillStyle = this._fillColor;
            oCtx.lineWidth = 1.5;
            oCtx.lineJoin = "bevel";

            // Prepare dot stencil
            this._dotStencil = new CircleStencil({
                radius: Chart.CIRCLE_RADIUS,
                density: Chart.STENCIL_DENSITY * this._canvasDensity
            });
            this._dotStencil.prepareStencil(Chart.CIRCLE_RADIUS, this._strokeColor, this._fillColor);
            this._dirtyRect = [0, 0, this._canvasWidth, this._canvasHeight];
        }
    };

    /**
     * (Re-)render the whole chart, update labels and focussed point
     * @param {boolean} bInitial If true, labels slowly fade in
     */
    Chart.prototype.refreshChart = function (bInitial) {
        this._checkResize();

        // Rendering optimization:
        // 1. Only render points that are within the viewport
        var dMinRenderDate = this.getScale().invert(-Chart.CLIPPING_MARGIN);
        var dMaxRenderDate = this.getScale().invert(this.getScale().range()[1] + Chart.CLIPPING_MARGIN);
        var nFirstIndex = this.bisectDate(this.getData(), dMinRenderDate);
        var nLastIndex = this.bisectDate(this.getData(), dMaxRenderDate, nFirstIndex);

        var aValues = this.getData().map(function (oDatapoint) {
            return oDatapoint[this.getValueColumn()];
        }, this);

        // Exclude "NoValue" and malformed data for yAxis scale calculation
        var aNumericalValues = aValues.filter(function (oValue) {
            return typeof oValue === "number" && !isNaN(oValue);
        });

        this.yAxisScale.domain(d3.extent(aNumericalValues));
        aValues = aValues.slice(nFirstIndex, nLastIndex);

        delete this._minPoint;
        delete this._maxPoint;
        delete this._focusPoint;

        if (this.getData().length > 0) {
            var nMinIndex = aValues.reduce(function (oPrev, value, index) {
                if (typeof value === "number" && !isNaN(value) && value <= oPrev.value) {
                    oPrev.index = index;
                    oPrev.value = value;
                }
                return oPrev;
            }, {
                value: this.yAxisScale.domain()[1]
            }).index;

            var nMaxIndex = aValues.reduce(function (oPrev, value, index) {
                if (typeof value === "number" && !isNaN(value) && value >= oPrev.value) {
                    oPrev.index = index;
                    oPrev.value = value;
                }
                return oPrev;
            }, {
                value: this.yAxisScale.domain()[0]
            }).index;

            if (typeof nMaxIndex !== "undefined" && nFirstIndex + nMaxIndex !== this.getData().length - 1) {
                this._maxPoint = this.getData()[nFirstIndex + nMaxIndex];
            }
            if (typeof nMinIndex !== "undefined" && nFirstIndex + nMinIndex !== this.getData().length - 1 && nMinIndex !== nMaxIndex) {
                this._minPoint = this.getData()[nFirstIndex + nMinIndex];
            }
        }

        if (this.getData() && this.getMode() === sap.hc.hph.patient.app.ui.lib.timeline.ChartMode.Line) {
            if (nFirstIndex > 0) {
                nFirstIndex--;
            }
            if (nLastIndex < this.getData().length) {
                nLastIndex++;
            }
        }
        var aData = this.getData().slice(nFirstIndex, nLastIndex).filter(function (oDatapoint) {
            var o = this.valueFunc(oDatapoint);
            return typeof o === "number" && !isNaN(o);
        }, this);
        this._visibleData = aData;

        // Prune tracked points that are no longer visible
        this._trackedPoints = this._trackedPoints.filter(function (oDatapoint) {
            var dStart = oDatapoint[this.getDateColumn()];
            return dMinRenderDate <= dStart && dStart <= dMaxRenderDate;
        }, this);

        this.updatePoints(aData);
        this.updateFocus(this._focusPosition);
        this.updateLabels(bInitial);
    };

    /**
     * Rerender all points in the background canvas
     * @param {object[]} aData Array of data points to rerender in the canvas
     */
    Chart.prototype.updatePoints = function (aData) {
        var oCanvas = this.$("canvas")[0];

        // It could be that we get here because of getVisible() === true,
        // but the DOM is not yet existent, because of a pending rendering event
        if (!oCanvas) {
            return;
        }

        var oCtx = oCanvas.getContext("2d");
        var nPoints = aData.length;
        var nX;
        var nY;

        // Clear canvas
        oCtx.clearRect.apply(oCtx, this._dirtyRect);

        // Optionally render/update lines
        if (nPoints > 1 && this.getMode() === sap.hc.hph.patient.app.ui.lib.timeline.ChartMode.Line) {
            var oFirst = aData[0];
            nX = this.dateFunc(oFirst);
            nY = this.valueFunc(oFirst);

            oCtx.lineWidth = 1.5;
            oCtx.beginPath();
            oCtx.moveTo(nX, nY);
            for (var i = 1; i < nPoints; ++i) {
                var oDatapoint = aData[i];
                nX = this.dateFunc(oDatapoint);
                nY = this.valueFunc(oDatapoint);
                oCtx.lineTo(nX, nY);
            }
            oCtx.stroke();
        }

        // Render dots
        var oStencil = this._dotStencil;
        var oStencilCanvas = oStencil.getCanvas();
        var aCenter = oStencil.getCenter();
        var nWidth = oStencil.getWidth();
        var nHeight = oStencil.getHeight();
        for (var j = 0; j < nPoints; ++j) {
            var oDatapoint2 = aData[j];
            nX = this.dateFunc(oDatapoint2);
            nY = this.valueFunc(oDatapoint2);
            oCtx.drawImage(oStencilCanvas, nX - aCenter[0], nY - aCenter[1], nWidth, nHeight);
        }
        // keep track of the area that needs to be cleared before rendering the next time
        if (nPoints) {
            nX = this.dateFunc(aData[0]);
            this._dirtyRect = [nX - aCenter[0], 0, this.dateFunc(aData[nPoints - 1]) - nX + nWidth, this._canvasHeight];
        } else {
            this._dirtyRect = [0, 0, 0, 0];
        }
    };

    /**
     * Rerender only those points in the foreground SVG that are hovered or recently were (animation is still running)
     */
    Chart.prototype.updateFocusPoint = function () {
        var that = this;
        var nMinPos = this.getScale().range()[0] - Chart.CLIPPING_MARGIN;
        var nMaxPos = this.getScale().range()[1] + Chart.CLIPPING_MARGIN;

        // remove points from the lists that are no longer visible
        this._trackedPoints = this._trackedPoints.filter(function (oDatapoint) {
            var nLeft = this.dateFunc(oDatapoint);
            return nMinPos <= nLeft && nLeft <= nMaxPos;
        }, this);
        this._popoverPoints = this._popoverPoints.filter(function (oDatapoint) {
            var nLeft = this.dateFunc(oDatapoint);
            return nMinPos <= nLeft && nLeft <= nMaxPos;
        }, this);

        // Handler to remove points the tracked list and potentially from the DOM,
        // who lose their focus and whose unfocus-animation ended
        var fRemoveHandler = function (oDatapoint) {
            var nIndex = that._trackedPoints.indexOf(oDatapoint);
            if (nIndex >= 0) {
                that._trackedPoints.splice(nIndex, 1);
                // We can remove the DOM element only if the popover isn't using it as an anchor
                if (that._popoverPoints.indexOf(oDatapoint) === -1) {
                    d3.select(this).remove();
                }
            }
        };

        // Add current focus point to list of tracked points
        if (this._focusPoint) {
            if (this._trackedPoints.indexOf(this._focusPoint) === -1) {
                this._trackedPoints.push(this._focusPoint);
            }
        }

        // concat the lists of tracked and popover points, while removing duplicates
        var aSVGPoints = this._trackedPoints.concat(this._popoverPoints.filter(function (oTile) {
            return this._trackedPoints.indexOf(oTile) === -1;
        }, this));

        // Render/update data points
        var oCircle = this.getSVG().select(".sapTlTimelineChartDots").selectAll("g")
            .data(aSVGPoints, function (oDatapoint) {
                return oDatapoint[that.getKeyColumn()];
            })
            .attr("transform", function (oDatapoint) {
                return "translate(" + that.dateFunc(oDatapoint) + "," + that.valueFunc(oDatapoint) + ")";
            })
            .classed("focus", function (oDatapoint) {
                return oDatapoint === that._focusPoint;
            })
            .classed("focusInit", false)
            .on("transitionend", fRemoveHandler);

        var oGroup = oCircle.enter()
            .append("g")
            .attr("transform", function (oDatapoint) {
                return "translate(" + that.dateFunc(oDatapoint) + "," + that.valueFunc(oDatapoint) + ")";
            })
            .classed("focus", function (oDatapoint) {
                return oDatapoint === that._focusPoint;
            })
            .classed("focusInit", true)
            .on("transitionend", fRemoveHandler);

        oGroup.append("circle")
            .attr("r", Chart.CIRCLE_RADIUS)
            .on("click", function (d) {
                d3.event.stopPropagation(); // silence other listeners
                that.fireDatapointClick({
                    datapoint: d,
                    d3Event: d3.event});
            });

        // Add an invisible circle with a tiny radius as a centered anchor for the popover.
        // The circle above cannot be used as it changes its radius on hover and the popover would move
        oGroup.append("circle")
            .attr("r", 0.1)
            .classed("sapTlTimelineChartDotHook", true);

        oCircle.exit()
            .remove();

        // All but the focus point will be removed after their animation finishes
        this.getSVG().select(".sapTlTimelineChartDots").selectAll("g.focus")
            .on("transitionend", null);
    };

    /**
     * Update the labels of minimal/maximal/last/focussed data points.
     * @param {boolean} bInitial If true, labels slowly fade in
     */
    Chart.prototype.updateLabels = function (bInitial) {
        var that = this;
        var aExtremePoints = [];

        // last value
        if (this.getData().length > 0) {
            aExtremePoints.push([this.getLastDatapoint(), Chart.LAST_VALUE_TAG]);
        }

        // min/max points
        if (this._minPoint) {
            aExtremePoints.push([this._minPoint, Chart.MIN_MAX_TAG]);
        }

        if (this._maxPoint) {
            aExtremePoints.push([this._maxPoint, Chart.MIN_MAX_TAG]);
        }

        // focus
        if (this._focusPoint) {
            aExtremePoints.push([this._focusPoint, Chart.FOCUS]);
        }

        // Render/update labels
        var oLabel = d3.select("#" + this.getId() + " .sapTlTimelineChartLabels").selectAll(".sapTlTimelineChartLabel")
            .data(aExtremePoints, function (oDatapoint) {
                return oDatapoint[0][that.getKeyColumn()] + "$" + oDatapoint[1];
            })
            .style("left", function (oDatapoint) {
                return that.dateFunc(oDatapoint[0]) + "px";
            })
            .style("top", function (oDatapoint) {
                return that.valueFunc(oDatapoint[0]) + "px";
            })
            .text(function (oDatapoint) {
                return that.getDisplayValue(oDatapoint[0]);
            })
            .classed("focus", function (oDatapoint) {
                return oDatapoint[1] === Chart.FOCUS;
            });

        oLabel.enter()
            .append("div")
            .classed("sapTlTimelineChartLabel", true)
            .classed("focus", function (oDatapoint) {
                return oDatapoint[1] === Chart.FOCUS;
            })
            .style("left", function (oDatapoint) {
                return that.dateFunc(oDatapoint[0]) + "px";
            })
            .style("top", function (oDatapoint) {
                return that.valueFunc(oDatapoint[0]) + "px";
            })
            .text(function (oDatapoint) {
                return that.getDisplayValue(oDatapoint[0]);
            })
            .style("opacity", 0)
            .transition()
            .delay(function (oDatapoint) {
                return oDatapoint[1] === Chart.MIN_MAX_TAG && !bInitial ? 400 : 0;
            })
            .duration(function (oDatapoint) {
                return oDatapoint[1] === Chart.MIN_MAX_TAG && !bInitial ? 200 : 0;
            })
            .style("opacity", 1);


        oLabel.exit()
            .remove();
    };

    /**
     * Prepare stroke/fill styles of the canvas and render chart
     */
    Chart.prototype.drawChart = function () {
        var that = this;
        var oCanvas = this.$("canvas")[0];
        var bIsTouchDevice = "ontouchstart" in window || navigator.msMaxTouchPoints;

        this._canvasWidth = jQuery(oCanvas).width();
        this._canvasHeight = jQuery(oCanvas).height();
        this._canvasDensity = -1;

        // We set the getScale() ourselves only when its not already set.
        // In general, we prefer updates from the parent timeline to be pixel synchronized.
        // If we try to always take our own width here to set the range, we get a wrong width due to a dynamic scrollbar which depends
        // on lanes rendered later, see hc/mri-pot#650.
        if (this.getScale().range()[1] === 1) {
            this.getScale().range([0, this._canvasWidth]);
        }

        // Clone stroke and fill style from already visible elements and create stencil
        var oChartDom = this.$();
        this._strokeColor = oChartDom.find(".sapTlTimelineLaneDescriptionCount").css("color");
        this._fillColor = oChartDom.find(".sapTlTimelineLaneBody").css("background-color");
        this._trackedPoints = [];
        this._popoverPoints = [];

        // Attach listeners to SVG
        var oSVG = this.getSVG()
            .on("mousemove", function () {
                var pos = d3.mouse(this);
                if (bIsTouchDevice) {
                    // For backward compatibility, on a 1-finger tap touch devices fire a mousemove immediately before a click event
                    // The SVG-circle created in updateFocus() disturbes the mouse events and prevent the SVG from receiving the click event
                    // Hence, we delay the mousemove handler in case of a touch device and even prevent it from execution in case of a click event
                    var sTimeoutId = window.setTimeout(function () {
                        var index = that._delayedMouseMoveEvents.indexOf(sTimeoutId);
                        if (index >= 0) {
                            that._delayedMouseMoveEvents.splice(index, 1);
                        }
                        that.updateFocus(pos);
                    }, 10);
                    that._delayedMouseMoveEvents.push(sTimeoutId);
                } else {
                    that.updateFocus(pos);
                }
            })
            .on("mouseout", function () {
                // Prevent delayed mousemove handler execution after mouse left the lane
                that._delayedMouseMoveEvents.forEach(window.clearTimeout);
                that.updateFocus();
            });

        // Detect whether browser supports touch
        if ("ontouchstart" in window || navigator.msMaxTouchPoints) {
            // To support touch devices, we react on click events on the SVG directly.
            // A click within a scaled circle around a datapoint, will induce the click
            // event event directly. For touch devices we don't receive mousemove events
            // before which would allow us to create responsive SVG circles.
            oSVG.on("click", function () {
                var oFocusPoint = that.updateFocus(d3.mouse(this), Chart.CIRCLE_TOUCH_RADIUS);
                delete that._focusPosition;
                // Prevent delayed mousemove handler execution (no need for focussing circles that have been clicked already)
                that._delayedMouseMoveEvents.forEach(window.clearTimeout);
                if (oFocusPoint) {
                    that.fireDatapointClick({
                        datapoint: oFocusPoint,
                        d3Event: d3.event});
                }
            });
        }

        // TODO: Replace this by a one-way connection from timeline to charts, e.g. with property binding
        var timeline = this.getTimeline();
        this.getScale().domain(timeline.getScale().domain());

        this._dirtyRect = [0, 0, this._canvasWidth, this._canvasHeight];
        this.refreshChart(true);
    };

    return Chart;
});
