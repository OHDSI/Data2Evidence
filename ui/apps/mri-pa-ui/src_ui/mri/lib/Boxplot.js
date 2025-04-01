sap.ui.define([
    "jquery.sap.global",
    "./ChartPopoverContent",
    "sap/m/Bar",
    "sap/m/Button",
    "sap/m/Popover",
    "sap/ui/core/Control",
    "sap/ui/thirdparty/d3"
], function (jQuery, ChartPopoverContent, Bar, Button, Popover, Control) {
    "use strict";

    /**
     * Constructor for a new Boxplot.
     * @constructor
     * @param {string} [sId] id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * This control displays a box plot chart.
     * @extends sap.ui.core.Control
     * @alias sap.hc.mri.pa.ui.lib.Boxplot
     */
    var Boxplot = Control.extend("sap.hc.mri.pa.ui.lib.Boxplot", {
        metadata: {
            library: "sap.hc.mri.pa.ui.lib",
            properties: {
                /**
                 * Defines the width of the Chart.
                 */
                width: {
                    type: "sap.ui.core.CSSSize",
                    group: "Appearance",
                    defaultValue: "100%"
                },
                /**
                 * Defines the height of the Chart.
                 */
                height: {
                    type: "sap.ui.core.CSSSize",
                    group: "Appearance",
                    defaultValue: "100%"
                },
                /**
                 * List of data points used in the Chart.
                 */
                data: {
                    type: "object[]",
                    group: "Data"
                },
                /**
                 * List of Dimensions to define the X-Axis.
                 */
                dimensions: {
                    type: "object[]",
                    group: "Data"
                },
                /**
                 * List of Measures to define the Y-Axis.
                 * Should only be one.
                 */
                measures: {
                    type: "object[]",
                    group: "Data"
                }
            },
            defaultAggregation: "noData",
            aggregations: {
                /**
                 * Control to display if the data (or dimension) is empty.
                 */
                noData: {
                    type: "sap.ui.core.Control",
                    multiple: false
                }
            },
            events: {
                /**
                 * Fired when the DrillDown-Button in the Popover is clicked.
                 */
                drillDown: {},
                /**
                 * Fired when the selection is changed.
                 */
                selectionChange: {}
            }
        }
    });

    /** @constant {Number} Padding between edge of chart and drawable area. */
    var PADDING = 24;

    /** @constant {Number} Space for the Y-Axis. */
    var Y_AXIS_PADDING = 38;

    /** @constant {Number} Width of the Y-Axis tick marks. */
    var Y_AXIS_TICK = 5;

    /** @constant {Number} Padding below X-Axis. */
    var X_AXIS_BASE_PADDING = 14;

    /** @constant {Number} Height of each level of X-Axis labels. */
    var X_AXIS_DIMENSION_PADDING = 24;

    /** @constant {Number} Range Band Padding. (Proportion of Band that is padding) */
    var RANGE_BAND_PADDING = 0.3;

    /** @constant {Number} Max width of a Box. */
    var BOX_MAX_WIDTH = 24;

    /** @constant {Array} List of translatable keys for the Boxplot values. */
    Boxplot.ValueKeyList = ["MRI_PA_MIN_VAL", "MRI_PA_Q1", "MRI_PA_MEDIAN", "MRI_PA_Q3", "MRI_PA_MAX_VAL"];

    /**
     * Initialise the control.
     * Create the Popover used fo selections and register a resize handler.
     * @override
     * @protected
     */
    Boxplot.prototype.init = function () {
        this._aSelection = [];
        this._nCurrentBoxWidth = BOX_MAX_WIDTH;

        this._oPopover = new Popover({
            contentWidth: "16rem",
            placement: sap.m.PlacementType.Vertical, // FUTURE: VerticalPreferedTop
            title: "{i18n>MRI_PA_CURRENT_SELECTION}",
            endButton: new Button({
                icon: "sap-icon://decline",
                tooltip: "{i18n>MRI_PA_CLOSE}",
                press: [function () {
                    this._oPopover.close();
                }, this]
            }),
            content: new ChartPopoverContent(),
            footer: new Bar({
                contentMiddle: new Button({
                    icon: "sap-icon://drill-down",
                    text: "{i18n>MRI_PA_DRILL_DOWN}",
                    press: [function () {
                        this.fireDrillDown();
                    }, this]
                })
            })
        });
        this.addDependent(this._oPopover);

        this._oInfoContent = new ChartPopoverContent();
        this.addDependent(this._oInfoContent);

        sap.ui.core.ResizeHandler.register(this, function (oEvent) {
            oEvent.control.invalidate();
        });
    };

    /**
     * Return the currently selected data.
     * @returns {Array} List of selected data points in the same format as the input data.
     */
    Boxplot.prototype.getSelection = function () {
        return this._aSelection;
    };

    /**
     * Create a CSS class name with an optional suffix.
     * @param   {Array|String} [vClass] Single class suffix or list of suffixes
     * @returns {String}       Single CSS class or multiple space separated classes.
     */
    Boxplot.prototype.getClass = function (vClass) {
        var sBaseClass = "sapHcMriPaBoxplotChart";
        if (!vClass) {
            return sBaseClass;
        } else if (!Array.isArray(vClass)) {
            vClass = [vClass];
        }
        return vClass.map(function (sClass) {
            return sBaseClass + sClass;
        }).join(" ");
    };

    /**
     * Property setter for the data.
     * Also resets the selection.
     * @override
     * @param {Array} aData List of Data points
     */
    Boxplot.prototype.setData = function (aData) {
        this._aSelection = [];
        this.setProperty("data", aData);
    };

    /**
     * Generate the Chart after the DOM has been created.
     * Only executes if the data is not empty.
     * @override
     * @protected
     */
    Boxplot.prototype.onAfterRendering = function () {
        this._aData = this.getData();
        this._aDimensions = this.getDimensions();
        var bHasData = Array.isArray(this._aData) && this._aData.length;
        var bHasDimension = Array.isArray(this._aDimensions) && this._aData.length;
        if (!bHasData || !bHasDimension) {
            return;
        }

        var aDimensions = this._aDimensions.concat().reverse();
        var that = this;
        var $this = jQuery(this.getDomRef());
        var iHeight = $this.height();
        var iWidth = $this.width();
        var iPlotHeight = iHeight - (X_AXIS_BASE_PADDING + X_AXIS_DIMENSION_PADDING * aDimensions.length) - PADDING * 2;
        var iPlotWidth = iWidth - Y_AXIS_PADDING - PADDING * 2;

        aDimensions.forEach(function (mDimension) {
            mDimension.values = [];
            that._aData.forEach(function (mData) {
                var sValue = mData[mDimension.id];
                if (!mDimension.values.length || mDimension.values[mDimension.values.length - 1] !== sValue) {
                    mDimension.values.push(sValue);
                }
            });
            mDimension.xScale = d3.scale.ordinal()
                .domain(Object.keys(mDimension.values))
                .rangeBands([0, iPlotWidth]);
        });

        // Calculate a range for the Y-Scale
        var iMax = d3.max(this._aData, function (mData) {
            // ignore NoValue for the calculation of max
            return mData.values[4] === "NoValue" ? -Infinity : mData.values[4];
        });
        var iMin = d3.min(this._aData, function (mData) {
            // ignore NoValue for the calculation of min
            return mData.values[0] === "NoValue" ? Infinity : mData.values[0];
        });
        var iDeltaPadding = (iMax - iMin) * 0.1 || iMax * 0.05;

        // Define the Y-Scale
        var d3yScale = d3.scale.linear()
            .domain([iMin - iDeltaPadding, iMax + iDeltaPadding])
            .range([iPlotHeight, 0])
            .nice(10);

        // Define the Y-Axis
        var d3yAxis = d3.svg.axis()
            .scale(d3yScale)
            .orient("left")
            .tickFormat(function (iNumber) {
                return iNumber;
            })
            .tickSize(-Y_AXIS_TICK, -Y_AXIS_TICK);

        // Define the X-Scale for the Boxes
        var d3xValueScale = d3.scale.ordinal()
            .domain(this._aData.map(function (_, iValueIndex) {
                return iValueIndex;
            }))
            .rangeBands([0, iPlotWidth], RANGE_BAND_PADDING, RANGE_BAND_PADDING / 2);

        // Select the SVG and set the dimensions
        var d3svg = d3.select(this.getDomRef()).select("svg")
            .classed(this.getClass("Selection"), this._aSelection.length)
            .attr("width", iWidth)
            .attr("height", iHeight);

        // Add the Background
        d3svg.append("svg:rect")
            .classed(this.getClass("Background"), true)
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", iWidth)
            .attr("height", iHeight)
            .on("click", function () {
                that._aData.forEach(function (mSelectedData) {
                    delete mSelectedData.selected;
                });
                that._updateSelection();
            });

        // Add a main group and translate for padding
        var d3main = d3svg.append("svg:g")
            .attr("transform", "translate(" + PADDING + ", " + PADDING + ")");

        // Add the Y-Axis and the horizontal gridlines
        d3main.append("svg:g")
            .classed(this.getClass("yAxis"), true)
            .attr("transform", "translate(" + (Y_AXIS_PADDING - Y_AXIS_TICK) + ", 0)")
            .call(d3yAxis)
            .call(function (d3selection) {
                d3selection.selectAll(".tick")
                    .append("svg:line")
                    .classed(that.getClass("Gridline"), true)
                    .attr("x1", 5)
                    .attr("x2", iPlotWidth + Y_AXIS_TICK);
            });

        // Add the X-Axis group
        var d3xAxisGroup = d3main.append("svg:g")
            .classed(this.getClass("xAxis"), true)
            .attr("transform", "translate(" + Y_AXIS_PADDING + "," + iPlotHeight + ")");

        // Add the 0-Line to the X-Axis
        d3xAxisGroup.append("svg:line")
            .attr("x2", iPlotWidth);

        var d3ticks = d3xAxisGroup.append("svg:g")
            .classed(this.getClass("Ticks"), true);

        // Add X-Axis first tick mark
        d3ticks.append("svg:line")
            .classed(this.getClass(["Tick", "Outer"]), true)
            .attr("y2", Y_AXIS_TICK);

        // Add X-Axis inner tick marks
        d3ticks.selectAll("." + this.getClass("Inner"))
            .data(aDimensions[0].values.slice(1))
            .enter().append("svg:line")
            .classed(this.getClass(["Tick", "Inner"]), true)
            .attr("x1", function (_, iValueIndex) {
                return aDimensions[0].xScale(iValueIndex + 1);
            })
            .attr("x2", function (_, iValueIndex) {
                return aDimensions[0].xScale(iValueIndex + 1);
            })
            .attr("y2", function (_, iTickIndex) {
                var iDimensions = 0;
                aDimensions.slice(1).forEach(function (mDimension) {
                    var iStep = aDimensions[0].values.length / mDimension.values.length;
                    if ((iTickIndex + 1) % iStep === 0) {
                        iDimensions++;
                    }
                });
                if (iDimensions) {
                    d3.select(this).classed(that.getClass("Divider"), true);
                    return X_AXIS_DIMENSION_PADDING * (iDimensions + 0.5);
                }
                return Y_AXIS_TICK;
            });

        // Add X-Axis last tick mark
        d3ticks.append("svg:line")
            .classed(this.getClass(["Tick", "Outer"]), true)
            .attr("x1", iPlotWidth)
            .attr("x2", iPlotWidth)
            .attr("y2", Y_AXIS_TICK);

        // Add the X-Axis Labels
        aDimensions.forEach(function (mDimension, iDimensionIndex) {
            var d3labels = d3xAxisGroup.append("svg:g");

            // Add X-Axis Label groups with click handler
            var d3label = d3labels.selectAll("." + that.getClass("Label"))
                .data(mDimension.values)
                .enter().append("svg:g")
                .classed(that.getClass("Label"), true)
                .attr("transform", function (_, iValueIndex) {
                    var nTranslateX = mDimension.xScale(iValueIndex);
                    var nTranslateY = X_AXIS_DIMENSION_PADDING * iDimensionIndex;
                    return "translate(" + nTranslateX + ", " + nTranslateY + ")";
                })
                .on("click", function (_, iRectIndex) {
                    var iStep = that._aData.length / mDimension.values.length;
                    that._aData.slice(iRectIndex * iStep, (iRectIndex + 1) * iStep).forEach(function (mSelectedData) {
                        mSelectedData.selected = true;
                    });
                    that._updateSelection(iRectIndex * iStep);
                });

            // Add X-Axis Label Tooltip
            d3label.append("svg:title")
                .text(function (sValue) {
                    return sValue;
                });

            // Add X-Axis Label background rect
            d3label.append("svg:rect")
                .classed(that.getClass("LabelBackground"), true)
                .attr("x", mDimension.xScale.rangeBand() - 2 >= 1 ? 1 : 0)
                .attr("y", 1)
                .attr("width", mDimension.xScale.rangeBand() - (mDimension.xScale.rangeBand() - 2 >= 1 ? 2 : 0))
                .attr("height", X_AXIS_DIMENSION_PADDING - 1);

            // Add X-Axis Label text
            d3label.append("svg:text")
                .text(function (sValue) {
                    return sValue;
                })
                .classed(that.getClass("LabelTextHidden"), function () {
                    return this.getBBox().width > mDimension.xScale.rangeBand() - 2;
                })
                .attr("x", mDimension.xScale.rangeBand() / 2)
                .attr("y", X_AXIS_DIMENSION_PADDING * 0.75);
        });

        // Add the Plot Area
        var d3plot = d3main.append("svg:g")
            .attr("transform", "translate(" + Y_AXIS_PADDING + ", 0)");

        // Add the Boxes
        d3plot.selectAll("." + this.getClass("Boxplot"))
            .data(this._aData)
            .enter().append("svg:g")
            .classed(this.getClass("Boxplot"), true)
            .classed(this.getClass("Selected"), function (mData) {
                return mData.selected;
            })
            .each(function (mData, iIndex) {
                var d3this = d3.select(this);

                // replace the "NoValue" values with proper numeric values
                var mDataValues = mData.values.map(function (value) {
                    if (value === "NoValue") {
                        // always display "NoValue" values at the min bound of the scale
                        return d3yScale.domain()[0];
                    } else {
                        return value;
                    }
                });

                // Calculate position and width of the boxes
                var iBoxBegin = d3xValueScale(iIndex);
                that._nCurrentBoxWidth = d3xValueScale.rangeBand();
                if (that._nCurrentBoxWidth > BOX_MAX_WIDTH) {
                    iBoxBegin += (that._nCurrentBoxWidth - BOX_MAX_WIDTH) / 2;
                    that._nCurrentBoxWidth = BOX_MAX_WIDTH;
                }
                var iHLineBegin = iBoxBegin + that._nCurrentBoxWidth / 4;
                var iHLineEnd = iHLineBegin + that._nCurrentBoxWidth / 2;
                var iXCenter = d3xValueScale(iIndex) + d3xValueScale.rangeBand() / 2;

                // Calculate height of boxes
                var nWhiskerHeight = d3yScale(mDataValues[0]) - d3yScale(mDataValues[4]);
                var nBoxHeight = d3yScale(mDataValues[1]) - d3yScale(mDataValues[3]);

                // Only draw whiskers if the minimun is different from the maximum
                if (nWhiskerHeight > 0) {
                    // Add box top vertical line
                    d3this.append("svg:line")
                        .classed(that.getClass("Whisker"), true)
                        .attr("x1", iXCenter)
                        .attr("x2", iXCenter)
                        .attr("y1", d3yScale(mDataValues[0]))
                        .attr("y2", d3yScale(mDataValues[1]));

                    // Add box bottom vertical line
                    d3this.append("svg:line")
                        .classed(that.getClass("Whisker"), true)
                        .attr("x1", iXCenter)
                        .attr("x2", iXCenter)
                        .attr("y1", d3yScale(mDataValues[3]))
                        .attr("y2", d3yScale(mDataValues[4]));

                    // Add box top horizontal line
                    d3this.append("svg:line")
                        .classed(that.getClass("Whisker"), true)
                        .attr("x1", iHLineBegin)
                        .attr("x2", iHLineEnd)
                        .attr("y1", d3yScale(mDataValues[0]))
                        .attr("y2", d3yScale(mDataValues[0]));

                    // Add box bottom horizontal line
                    d3this.append("svg:line")
                        .classed(that.getClass("Whisker"), true)
                        .attr("x1", iHLineBegin)
                        .attr("x2", iHLineEnd)
                        .attr("y1", d3yScale(mDataValues[4]))
                        .attr("y2", d3yScale(mDataValues[4]));
                }

                // Add actual box
                d3this.append("svg:rect")
                    .classed(that.getClass("Box"), true)
                    .attr("x", iBoxBegin)
                    .attr("y", d3yScale(mDataValues[3]) - (nBoxHeight === 0 ? 1 : 0))
                    .attr("width", that._nCurrentBoxWidth)
                    .attr("height", nBoxHeight || 2)
                    .attr("rx", 2)
                    .attr("ry", 2);

                // Add box median horizontal line if there is a full box
                if (nBoxHeight > 0) {
                    d3this.append("svg:line")
                        .classed(that.getClass("Median"), true)
                        .attr("x1", iBoxBegin)
                        .attr("x2", iBoxBegin + that._nCurrentBoxWidth)
                        .attr("y1", d3yScale(mDataValues[2]))
                        .attr("y2", d3yScale(mDataValues[2]));
                }

                // Add box overlay with click and mouse handlers
                d3this.append("svg:rect")
                    .classed(that.getClass("Overlay"), true)
                    .attr("x", iBoxBegin)
                    .attr("y", d3yScale(mDataValues[4]) - (nWhiskerHeight === 0 ? 2 : 0))
                    .attr("width", that._nCurrentBoxWidth)
                    .attr("height", nWhiskerHeight || 4)
                    .on("click", function (mClickedData) {
                        mClickedData.selected = !mClickedData.selected;
                        var iOpenerIndex;
                        if (mClickedData.selected) {
                            iOpenerIndex = iIndex;
                        }
                        that._updateSelection(iOpenerIndex);
                        that._hideTooltip();
                    })
                    .on("mouseenter", function () {
                        if (!that._oPopover.isOpen()) {
                            that._updateTooltip(iIndex);
                            that._showTooltip();
                            that._positionTooltip(iXCenter);
                        }
                    })
                    .on("mousemove", function () {
                        that._positionTooltip(iXCenter);
                    })
                    .on("mouseleave", function () {
                        that._hideTooltip();
                    });
            });
    };

    /**
     * Update the selection of the chart.
     * Hides the selection Popover if open.
     * If there is a selection, open the Popover again.
     * The position and detailed Information are by default the first selected box, but can be overridden by giving an
     * index as parameter.
     * @private
     * @param {Number} [iOpenerIndex] Desired index of the position of the Popover
     */
    Boxplot.prototype._updateSelection = function (iOpenerIndex) {
        this._oPopover.close();
        this._aSelection = this._aData.filter(function (mFilterData, iFilterIndex) {
            if (typeof iOpenerIndex === "undefined" && mFilterData.selected) {
                iOpenerIndex = iFilterIndex;
            }
            return mFilterData.selected;
        });
        this.fireSelectionChange();
        var bHAsSelection = Boolean(this._aSelection.length);
        d3.select(this.getDomRef()).select("svg")
            .classed(this.getClass("Selection"), bHAsSelection)
            .selectAll("." + this.getClass("Boxplot"))
            .classed(this.getClass("Selected"), function (mData) {
                return mData.selected;
            });
        if (bHAsSelection) {
            var mData = this._aData[iOpenerIndex];
            this._oPopover.setOffsetX(Math.round(this._nCurrentBoxWidth / 2));
            var oContent = this._oPopover.getContent()[0];
            oContent.setDimensionValues(this._aDimensions.map(function (mDimension) {
                return {
                    name: mDimension.name,
                    value: mData[mDimension.id]
                };
            }));
            oContent.setMeasureValues(mData.values.map(function (mValue, iIndex) {
                return {
                    name: this.getMeasures()[0].name,
                    type: this.getModel("i18n").getResourceBundle().getText(Boxplot.ValueKeyList[iIndex]),
                    value: mValue
                };
            }, this).reverse());
            oContent.setPatientCount(mData.NUM_ENTRIES);
            oContent.setSelectionCount(this._aSelection.length);
            this._oPopover.openBy(jQuery(this.getDomRef()).find("." + this.getClass("Boxplot")).get(iOpenerIndex));
        }
    };

    /**
     * Show the tooltip. Does not change the values.
     * @private
     */
    Boxplot.prototype._showTooltip = function () {
        jQuery(this.getDomRef()).find("." + this.getClass("Tooltip")).show();
    };

    /**
     * Hide the tooltip. Does not change the values.
     * @private
     */
    Boxplot.prototype._hideTooltip = function () {
        jQuery(this.getDomRef()).find("." + this.getClass("Tooltip")).hide();
    };

    /**
     * Calculate the position of the tooltip.
     * The x-value is given as it does not depend on the mouse position, but the location of the box.
     * The y-value is taken from d3.event which has information on the position of the mouse pointer.
     * @private
     * @param {Number} iX Horizontal position (middle of hovered box)
     */
    Boxplot.prototype._positionTooltip = function (iX) {
        var $this = jQuery(this.getDomRef());
        var iY = d3.event.clientY - $this.offset().top;
        var bTop = iY < $this.height() / 2;
        var iTop = bTop ? iY + PADDING : "";
        var iBottom = bTop ? "" : $this.height() - iY + 10;
        var $tooltip = $this.find("." + this.getClass("Tooltip"));
        var iLeft = iX - $tooltip.width() / 2 + PADDING + Y_AXIS_PADDING;
        if (iLeft + $tooltip.width() >= $this.width()) {
            iLeft = $this.width() - $tooltip.width() - 5;
        }
        $tooltip.css({
            left: iLeft,
            top: iTop,
            bottom: iBottom
        });
    };

    /**
     * Update the values of the tooltip.
     * @private
     * @param {Number} iDataIndex Index of the hovered box
     */
    Boxplot.prototype._updateTooltip = function (iDataIndex) {
        var mData = this._aData[iDataIndex];
        this._oInfoContent.setDimensionValues(this._aDimensions.map(function (mDimension) {
            return {
                name: mDimension.name,
                value: mData[mDimension.id]
            };
        }));
        this._oInfoContent.setMeasureValues(mData.values.map(function (mValue, iIndex) {
            return {
                name: this.getMeasures()[0].name,
                type: this.getModel("i18n").getResourceBundle().getText(Boxplot.ValueKeyList[iIndex]),
                value: mValue
            };
        }, this).reverse());
        this._oInfoContent.setPatientCount(mData.NUM_ENTRIES);
    };

    return Boxplot;
});
