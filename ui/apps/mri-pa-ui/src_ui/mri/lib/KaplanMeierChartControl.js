sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "sap/m/HBox",
    "sap/m/Text",
    "sap/m/VBox",
    "sap/ui/core/Control",
    "sap/ui/core/HTML",
    "sap/ui/core/Popup",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/thirdparty/d3"
], function (jQuery, Utils, HBox, Text, VBox, Control, HTML, Popup, NumberFormat) {
    "use strict";


    /**
     * Constructor for a new Kaplan-Meier chart control.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * Kaplan-Meier chart control.
     * @extends sap.ui.core.Control
     * @alias sap.hc.mri.pa.ui.lib.KaplanMeierChartControl
     */
    var KaplanMeierChartControl = Control.extend("sap.hc.mri.pa.ui.lib.KaplanMeierChartControl", {
        metadata: {
            properties: {
                /**
                 * Points available for the length of the control area.
                 * (By changing xpoints and ypoints you can change the aspect ratio of the graph.)
                 */
                xpoints: {
                    type: "int",
                    defaultValue: 800
                },
                /**
                 * Points available for the height of the control area.
                 * (By changing xpoints and ypoints you can change the aspect ratio of the graph.)
                 */
                ypoints: {
                    type: "int",
                    defaultValue: 800
                },
                /**
                 * Horizontal distance from graph to control border.
                 */
                xpadding: {
                    type: "int",
                    defaultValue: 50
                },
                /**
                 * Vertical distance from graph to control border.
                 */
                ypadding: {
                    type: "int",
                    defaultValue: 20
                },
                maxDataday: "float",
                maxday: "float",
                minday: "float",
                minprob: {
                    type: "float",
                    defaultValue: 0.0
                },
                /**
                 * Maximum width of legend.
                 */
                maxlegendwidth: {
                    type: "int",
                    defaultValue: 200
                },
                showErrorlines: {
                    type: "boolean",
                    defaultValue: false
                },
                showCensoring: {
                    type: "boolean",
                    defaultValue: false
                },
                /**
                 * format of each series object:
                 * {
                 *   name: "DataSet1" // name of the series
                 *   points: [ [10, 0.2], [20, 0.5, 0.002] ]// array of points: either [day, probability, error] or [day, probability]
                 *   censored: [20,70,120,120], // days where censoring occurred
                 *   censored: [ [20, 2], [70, 1], [80, 4] ] // censoring events (e.g. 2 events on day 20, 1 on day 70, 4 on day 80)
                 *   errorlines: true, // whether to show error lines or not. If unset, this will be deduced from the data
                 *   color: "green" // color to use for the serie. If unset, it will be automatically picked
                 * }
                 */
                series: {
                    type: "object[]",
                    defaultValue: []
                },
                colorPalette: {
                    type: "string[]",
                    defaultValue: []
                }
            }
        },
        renderer: function (oRenderManager, oControl) {
            var series = oControl.getSeries();

            oRenderManager.write("<div ");
            oRenderManager.writeControlData(oControl);
            oRenderManager.addClass("sapMriPaKaplan");
            if (series.length <= 0) {
                oRenderManager.addClass("placeholder");
            }
            oRenderManager.writeClasses();
            oRenderManager.write(" >");
            oRenderManager.write("</div>");
        }
    });

    /**
    * Information on available time units.
    *
    * Format:
    * {
    *   label: (translated) label to be displayed for this unit
    *   avgDaysInUnit: average no. of days in this unit (conversion factor)
    *   upperRangeLimit: longest interval (in days) for which this unit could
    *                        be used (null means "arbitrarily long")
    *   digitsAfterDecimalPoint: number of post-decimal-point digits to use
    *                               when converting to string
    *   fontStyle: fontStyle ("italic" or "normal") to use for this unit
    *   fontWeight: font weight ("bold", "normal") to use for this unit
    * }
    */
    var DAYS_PER_DAY = 1;
    var DAYS_PER_WEEK = 7;
    var DAYS_PER_YEAR = 365.24;
    var DAYS_PER_MONTH = DAYS_PER_YEAR / 12;
    KaplanMeierChartControl.UNIT_DATA = {
        days: {
            label: Utils.getText("MRI_PA_KAPLAN_DAYS_LONG"),
            avgDaysInUnit: DAYS_PER_DAY,
            upperRangeLimit: DAYS_PER_MONTH,
            digitsAfterDecimalPoint: 1,
            fontStyle: "normal",
            fontWeight: "normal"
        },
        weeks: {
            label: Utils.getText("MRI_PA_KAPLAN_WEEKS_LONG"),
            avgDaysInUnit: DAYS_PER_WEEK,
            upperRangeLimit: 12 * DAYS_PER_WEEK,
            digitsAfterDecimalPoint: 1,
            fontStyle: "normal",
            fontWeight: "normal"
        },
        months: {
            label: Utils.getText("MRI_PA_KAPLAN_MONTHS_LONG"),
            avgDaysInUnit: DAYS_PER_MONTH,
            upperRangeLimit: 3 * DAYS_PER_YEAR,
            digitsAfterDecimalPoint: 1,
            fontStyle: "italic",
            fontWeight: "normal"
        },
        years: {
            label: Utils.getText("MRI_PA_KAPLAN_YEARS_LONG"),
            avgDaysInUnit: DAYS_PER_YEAR,
            upperRangeLimit: null,
            digitsAfterDecimalPoint: 1,
            fontStyle: "italic",
            fontWeight: "normal"
        }
    };

    /**
    * Get information on the optimal time unit for the given interval.
    *
    * "Optimal" means the smallest possible unit allowed for this length (as
    * info stored in the UNIT_DATA object).
    *
    * @private
    * @param {number} minDay - first day value in inteval
    * @param {number} maxDay - second day value in inteval
    * @returns {object} JSON holding information about the optimal unit
    */
    KaplanMeierChartControl._getOptimalUnitInfo = function (minDay, maxDay) {
        var unitKey = KaplanMeierChartControl._selectOptimalUnitForInterval(minDay, maxDay);
        var unitInfo = KaplanMeierChartControl._getUnitInfo(unitKey);
        return unitInfo;
    };

    /**
    * Get the optimal time unit for a given interval.
    *
    * "Optimal" means the smallest possible unit allowed for this length (as
    * info stored in the UNIT_DATA object).
    *
    * @private
    * @throws Error - Error thrown if interval is negative or no allowed unit is avilable
    * @param {number} minDay - first day value in inteval
    * @param {number} maxDay - second day value in inteval
    * @returns {string} key for the optimal unit
    */
    KaplanMeierChartControl._selectOptimalUnitForInterval = function (minDay, maxDay) {
        var keysSortedByUnitLength = Object.keys(KaplanMeierChartControl.UNIT_DATA)
                                .sort(function (a, b) {
                                    var aUnitNo = KaplanMeierChartControl.UNIT_DATA[a].avgDaysInUnit;
                                    var bUnitNo = KaplanMeierChartControl.UNIT_DATA[b].avgDaysInUnit;
                                    if (aUnitNo < bUnitNo) {
                                        return -1;
                                    } else if (aUnitNo > bUnitNo) {
                                        return 1;
                                    }
                                    return 0;
                                });
        if (typeof minDay !== "number" || typeof maxDay !== "number") {
            return keysSortedByUnitLength[keysSortedByUnitLength.length - 1];
        }
        if (minDay > maxDay) {
            throw new Error("The start of the interval (" + minDay + ") is smaller than the end (" + maxDay + ")!");
        }
        var lengthInDays = maxDay - minDay;
        var allowedUnitLabels = keysSortedByUnitLength.filter(function (unitKey) {
            var currentRangeLimit = KaplanMeierChartControl.UNIT_DATA[unitKey].upperRangeLimit;
            return typeof currentRangeLimit !== "number" || lengthInDays <= currentRangeLimit;
        });
        if (allowedUnitLabels.length === 0) {
            throw new Error("No allowed unit found for the interval (" + minDay + "," + maxDay + ")!");
        }
        var smallestAllowedUnitLabel = allowedUnitLabels[0];
        return smallestAllowedUnitLabel;
    };

    /**
    * Get information about the requested measurement unit.
    *
    * @private
    * @param {string} unitLabel - label for the requested unit
    * @throws {Error} Thrown of the passed unit label is not valid
    * @returns {object} JSON holding information about trequested type
    */
    KaplanMeierChartControl._getUnitInfo = function (unitLabel) {
        if (!KaplanMeierChartControl.UNIT_DATA.hasOwnProperty(unitLabel)) {
            var errorMsg = "Requested unit '" + unitLabel + "' is not valid!\nValid units are: " + Object.keys(KaplanMeierChartControl.UNIT_DATA).join(", ");
            throw new Error(errorMsg);
        }
        return KaplanMeierChartControl.UNIT_DATA[unitLabel];
    };

    /**
    * Generic formatting function for the axis values.
    *
    * @private
    * @param {number} days - number of days
    * @param {object} unitInfo - JSON with the unit info
    * @param {boolean} unitLabelIsNeeded - flag indicating whether a unit label should be added
    * @returns {string} correctly formatted string
    */
    KaplanMeierChartControl._genericDayFormatter = function (days, unitInfo, unitLabelIsNeeded) {
        if (typeof days !== "number") {
            return "";
        }
        var convertedValue = days / unitInfo.avgDaysInUnit;
        var numberFormatter = NumberFormat.getFloatInstance({
            decimals: unitInfo.digitsAfterDecimalPoint
        });
        var returnString = numberFormatter.format(convertedValue);
        if (unitLabelIsNeeded) {
            returnString += " " + unitInfo.label;
        }
        return returnString;
    };

    /**
    * Factory function for formatter using the current units.
    *
    * @param {boolean} unitLabelIsNeeded - flag indicating whether a unit label should be added
    * @returns {function} formatting function that takes the no. of days as its single argument
    */
    KaplanMeierChartControl.prototype.getActiveDayFormatter = function (unitLabelIsNeeded) {
        var minDay = this.getMinday();
        var maxDay = this.getMaxday();
        var currentUnitInfo = KaplanMeierChartControl._getOptimalUnitInfo(minDay, maxDay);
        var formatFunc = function (daysNo) {
            return KaplanMeierChartControl._genericDayFormatter(daysNo, currentUnitInfo, unitLabelIsNeeded);
        };
        return formatFunc;
    };

    KaplanMeierChartControl.prototype.init = function () {
        if (Control.prototype.init) {
            Control.prototype.init.call(this);
        }
    };

    KaplanMeierChartControl.prototype.destroy = function () {
        if (Control.prototype.destroy) {
            Control.prototype.destroy.call(this);
        }
        this.destroyPopups();
    };

    KaplanMeierChartControl.prototype.destroyPopups = function () {
        if (this._popup) {
            this._popup.forEach(function (p) {
                p.destroy();
            });
        }
    };

    KaplanMeierChartControl.prototype.getXScale = function () {
        return this._xScale;
    };


    KaplanMeierChartControl.prototype.getYScale = function () {
        return this._yScale;
    };

    KaplanMeierChartControl.prototype._updateLocationsModel = function () {
        var $this = this.getDomRef();
        // can be null during view creation
        if ($this === null) {
            return;
        }

        // get locations data and initially hide everything
        var oLocationsData = this.getModel(Utils.models.LOCATIONS).getData();
        for (var i = 0; i < sap.hc.mri.pa.ui.lib.dimensions.Count; i++) {
            oLocationsData.attr[i].visible = false;
        }

        // set the new locations to model
        this.getModel(Utils.models.LOCATIONS).setData(oLocationsData);
    };

    KaplanMeierChartControl.prototype.onAfterRendering = function () {
        var height = this.getYpoints();
        var width = this.getXpoints();

        var ypadding = this.getYpadding();
        var xpadding = this.getXpadding();
        var series = this.getSeries();
        var minprob = this.getMinprob();
        var minday = this.getMinday();
        var maxday = this.getMaxday();
        var dayFormatterNoUnitLabel = this.getActiveDayFormatter(false);
        var axislabelverticalpadding = 30; // additional padding between bottom of the control and the x-axis to leave enough space for rotated tick labels on the x-axis
        var coordinates;
        var offsetVerticalSpacingXAxisUnit = 14;
        var offsetHorizontalSpacingXAxisUnit = 2;

        // Set the unit to optimal value
        var currentUnitInfo = KaplanMeierChartControl._getOptimalUnitInfo(minday, maxday);

        var xTicks = Math.min(width / 40, 10); // how many ticks to show on the x axis
        var yTicks = Math.min(height / 40, 10); // ... and on the y axis

        // Find the largest day no (time interval) in data set
        var iMaxdayInData = 0;
        series.forEach(function (serie) {
            if (serie.points.length > 0) {
                var lastpoint = serie.points[serie.points.length - 1];
                iMaxdayInData = lastpoint[0] >= iMaxdayInData ? lastpoint[0] : iMaxdayInData;
            }
        });

        this.setMaxDataday(iMaxdayInData);

        this.getModel().updateBindings(true);

        // Ensure that mainday and maxday have sensible values
        if (iMaxdayInData && (typeof maxday === "undefined" || maxday > iMaxdayInData)) {
            maxday = iMaxdayInData;
            this.setMaxday(maxday);
        }

        if (typeof maxday !== "undefined" && minday > maxday || minday < 0 || typeof minday === "undefined") {
            minday = 0;
            this.setMinday(minday);
        }

        // Set x-axis scale
        var xScale = d3.scale
                    .linear()
                    .domain([minday, maxday])
                    .range([xpadding, width - xpadding]);
        this._xScale = xScale;

        // Set y-axis scale
        var yScale = d3.scale
                    .linear()
                    .domain([minprob, 1])
                    .range([height - ypadding - axislabelverticalpadding, ypadding]);
        this._yScale = yScale;


        var newnode = jQuery(this.getDomRef());
        if (series.length > 0) {
            var svg = d3
                        .select(newnode.get(0))
                        .append("svg");

            svg.attr("viewBox", "0 0 " + width + " " + height)
                .attr("preserveAspectRatio", "none")
                .attr("pointer-events", "all")
                .attr("width", width)
                .attr("height", height);

            // If we don't add an invisible rectangle that comprises the whole SVG,
            // click events to this latter won't be propagated correctly in IE.
            svg.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", width)
                .attr("height", height)
                .attr("fill", "none");

            var line = d3.svg.line()
                .x(function (d) {
                    return xScale(d[0]);
                })
                .y(function (d) {
                    return yScale(d[1]);
                })
                .interpolate("step-after");

            var standardAxisFontSize = "14px";

            // X-axis
            var xAxis = d3.svg
                        .axis()
                        .scale(xScale)
                        .tickFormat(dayFormatterNoUnitLabel)
                        .tickSize(6, 10)
                        .ticks(xTicks);
            svg.append("g")
                .attr("class", "axis kmXAxis")
                .attr("transform", "translate(0," + (height - ypadding - axislabelverticalpadding) + ")")
                .call(xAxis)
                .selectAll("text")
                .style("text-anchor", "middle")
                .style("font-size", standardAxisFontSize)
                .style("font-style", currentUnitInfo.fontStyle)
                .style("font-weight", currentUnitInfo.fontWeight)
                .attr("dy", "1em");

            // Add x-axis label
            svg.append("text")
                .attr("text-anchor", "middle")
                .attr("transform", "translate(" + (width / offsetHorizontalSpacingXAxisUnit) + "," + (height - offsetVerticalSpacingXAxisUnit) + ")")
                .style("font-size", standardAxisFontSize)
                .style("font-style", currentUnitInfo.fontStyle)
                .style("font-weight", currentUnitInfo.fontWeight)
                .text(currentUnitInfo.label)
                .attr("dy", ".2em");

            // Y-axis
            var yAxis = d3.svg
                        .axis()
                        .scale(yScale)
                        .orient("left")
                        .tickFormat(d3.format("p%"))
                        .ticks(yTicks);
            svg.append("g")
                .attr("class", "axis")
                .attr("transform", "translate(" + xpadding + ",0)")
                .call(yAxis)
                .selectAll("text")
                .style("font-size", standardAxisFontSize);

            // Add grid (Horizontal lines)
            var gridYAxis = d3.svg
                .axis()
                .scale(yScale)
                .orient("left")
                .ticks(yTicks)
                .tickSize(-(width - 2 * xpadding), 0)
                .tickFormat("");
            svg.append("g")
                .attr("class", "grid")
                .attr("transform", "translate(" + xpadding + ",0)")
                .call(gridYAxis);

            this.addColors(series);
            this.destroyPopups();
            this._popup = [];
            var oNumberFormatter = NumberFormat.getIntegerInstance({
                groupingEnabled: true
            });

            // Draw actual curves
            series.forEach(function (serie, i) {
                if (serie.points.length === 0) {
                    return;
                }
                // compute y values for censored data points
                serie._points = serie.points.slice(0);
                var iMinDistance = 10; // consoring events within this interval from each other will get a numeric label
                this._computeCensoredPoints(serie, minday, maxday, minprob, iMinDistance, xScale);


                // fix extremes by adding extra points
                // FIX LEFT-HAND SIDE: remove all points before minday.
                // Then, if first point does not has X=minday, add an extra point (0,firstpoint.Y)
                var j = 0;
                while (j < serie._points.length && serie._points[j][0] < minday) {
                    ++j;
                }
                serie._points.splice(0, j);

                if (serie._points.length > 0 && serie._points[0][0] !== minday) {
                    var newpoint = serie._points[0].slice(0);
                    newpoint[0] = minday;
                    serie._points.splice(0, 0, newpoint);
                }

                // FIX RIGHT-HAND SIDE:
                // remove points (X,Y) with X > maxday || Y < minprob
                j = serie._points.length - 1;
                while (j > 0 && (serie._points[j][0] > maxday || serie._points[j][1] < minprob)) {
                    --j;
                }
                serie._points.splice(j + 1, serie._points.length - j - 1);

                // Draw curves
                svg.append("g")
                    .attr("class", "curve")
                    .append("path")
                    .style("stroke", serie._color).style("pointer-events", "stroke")
                    .attr("d", line(serie._points));

                svg.append("g")
                    .attr("class", "shadow-curve")
                    .append("path")
                    .style("pointer-events", "stroke").style("opacity", 0).style("stroke-width", 5)
                    .attr("d", line(serie._points)).attr("series", i);

                this._popup.push(
                    new Popup(
                        new VBox({
                            items: [
                                new Text({
                                    text: serie.name
                                }),
                                new HTML({
                                    content: "<hr class=\"sapMriPaKMDivider\" />"
                                }),
                                new HBox({
                                    items: [
                                        new Text({
                                            text: "{i18n>MRI_PA_KAPLAN_TLTIP_PATIENTS_LABEL}"
                                        }).addStyleClass("sapUiSmallMarginEnd").setModel(this.getModel("i18n"), "i18n"),
                                        new Text({
                                            text: oNumberFormatter.format(serie.pcount)
                                        })
                                    ]
                                })
                            ]
                        }).addStyleClass("sapMriPaKMPopup"),
                        false, false, false
                    ).setModel(this.getModel("i18n"), "i18n")
                );

                // Draw uncertainty intervcal
                if (this.getShowErrorlines() && (serie.errorlines || typeof serie.errorlines === "undefined") && (serie._points.length > 0 && serie._points[0].length >
                        2)) {
                    var d3upperErrorLine = d3.svg.line()
                        .x(function (d) {
                            return xScale(d[0]);
                        })
                        .y(function (d) {
                            return d.length > 2 ? yScale(Math.min(d[1] + d[2], 1.0)) : yScale(d[1]);
                        })
                        .interpolate("step-after");

                    var d3lowerErrorLine = d3.svg.line()
                        .x(function (d) {
                            return xScale(d[0]);
                        })
                        .y(function (d) {
                            return d.length > 2 ? yScale(Math.max(d[1] - d[2], minprob)) : yScale(d[1]);
                        })
                        .interpolate("step-after");

                    svg.append("g")
                        .attr("class", "error-curve")
                        .append("path")
                        .style("stroke", serie._color)
                        .style("pointer-events", "none")
                        .attr("d", d3upperErrorLine(serie._points));

                    svg.append("g")
                        .attr("class", "error-curve")
                        .append("path")
                        .style("stroke", serie._color)
                        .style("pointer-events", "none")
                        .attr("d", d3lowerErrorLine(serie._points));
                }

                // Add censoring events
                if (serie._censored.length > 0) {
                    svg.append("g").style("stroke", serie._color)
                        .style("fill", "none")
                        .selectAll("line")
                        .data(serie._censored)
                        .enter()
                        .append("line")
                        .attr("x1", function (d) {
                            return xScale(d[0]);
                        })
                        .attr("y1", function (d) {
                            return yScale(d[1] - 0.02);
                        })
                        .attr("x2", function (d) {
                            return xScale(d[0]);
                        })
                        .attr("y2", function (d) {
                            return yScale(d[1] + 0.01);
                        });

                    svg.append("g").attr("class", "censored-label").selectAll("text")
                        .data(jQuery.grep(serie._censored, function (el) {
                            return el[2] > 1;
                        }))
                        .enter()
                        .append("text")
                        .attr("x", function (d) {
                            return xScale(d[0]);
                        })
                        .attr("y", function (d) {
                            return yScale(d[1]);
                        })
                        .attr("dy", -6)
                        .attr("text-anchor", "start")
                        .style("fill", serie._color)
                        .text(function (d) {
                            return d[2];
                        });
                }
            }, this);
        }

        var newypos = 0;
        var newxpos = 0;
        var ypos;
        var xpos;
        var maxwidth = 0;
        var maxlegendwidth = this.getMaxlegendwidth();
        var bisector = d3.bisector(function(d){ return d[0]; }).left;


        d3.select(this.getDomRef())
            .selectAll(".label-slot")
            .attr("transform", function () {
                var length = d3.select(this).select("text").node().getComputedTextLength() + 30;
                xpos = newxpos;
                ypos = newypos;
                if (maxlegendwidth < xpos + length) {
                    newxpos = xpos = 0;
                    newypos += 20;
                    ypos = newypos;
                }
                newxpos += length;
                if (newxpos > maxwidth) {
                    maxwidth = newxpos;
                }
                return "translate(" + xpos + "," + ypos + ")";
            });

        ypos = this.getYpadding() + 20;
        xpos = this.getXpoints() - this.getXpadding() - maxwidth;
        // position legend as far right as possible within the total width
        d3.select(this.getDomRef())
            .select(".label-area")
            .attr("transform", "translate(" + xpos + "," + ypos + ")");

        // Control curve pop-uo
        var that = this;
        jQuery("g.shadow-curve > path", this.getDomRef())
            .mouseover(function (eventObj) {
                var seriesKey = eventObj.currentTarget.getAttribute("series");
                var grid = that.$().find("g.grid")[0].getBoundingClientRect(); // taking the fixed boundary for getting the mouse coordinates
                var mouseX = (eventObj.clientX - grid.left) + xpadding; // adding xpadding value to get the x coordinate
                if(mouseX < xpadding) {
                    mouseX = xpadding;  // fixing left side where mouse X coordinate value doesnt make sense to be below 0
                }

                var approximateXDomainValue = Math.round(xScale.invert(mouseX)); //x value
                var position = bisector(that.getSeries()[seriesKey]._points, approximateXDomainValue);
                var larger = that.getSeries()[seriesKey]._points[position];
                var smaller = that.getSeries()[seriesKey]._points[position - 1];

                var finalValueSet = { x : approximateXDomainValue }; //use the x value derived from the mouse coordinate x position
                //compare which data x value is closest to x value derived from mouse x position
                var finalElement;
                if (smaller) {
                    finalElement = smaller;
                } else {
                    finalElement = larger;
                }
                finalValueSet.y = finalElement[1];
                finalValueSet.underRisk = finalElement[3];

                var numberFormatter = NumberFormat.getFloatInstance({
                    decimals: 2
                });

                var rect = eventObj.currentTarget.getBoundingClientRect();
                var offsetX = eventObj.clientX - rect.left;
                var offsetY = eventObj.clientY - rect.top;

                if (that._popup[seriesKey].isOpen()) {
                    that._popup[seriesKey].close();
                }
                that._popup[seriesKey].getContent().addItem(new sap.m.HBox({
                    items: [
                        new Text({
                            text: "{i18n>MRI_PA_KAPLAN_TLTIP_SURVIVAL_PERIOD_LABEL}"
                        }).addStyleClass("sapUiSmallMarginEnd").setModel(that.getModel("i18n"), "i18n"),
                        new Text({
                            text: that.getModel("i18n").getResourceBundle().getText("MRI_PA_KAPLAN_TLTIP_SURVIVAL_PERIOD_VALUE", oNumberFormatter.format(finalValueSet.x))
                        })
                    ]
                })).addItem(new sap.m.HBox({
                    items: [
                        new Text({
                            text: "{i18n>MRI_PA_KAPLAN_TLTIP_PROBABILITY_LABEL}"
                        }).addStyleClass("sapUiSmallMarginEnd").setModel(that.getModel("i18n"), "i18n"),
                        new Text({
                            text: that.getModel("i18n").getResourceBundle().getText("MRI_PA_KAPLAN_TLTIP_PERCENTAGE_UNIT", numberFormatter.format(finalValueSet.y * 100))
                        })
                    ]
                })).addItem(new sap.m.HBox({
                    items: [
                        new Text({
                            text: "{i18n>MRI_PA_KAPLAN_TLTIP_NUMBER_AT_RISK_LABEL}"
                        }).addStyleClass("sapUiSmallMarginEnd").setModel(that.getModel("i18n"), "i18n"),
                        new Text({
                            text: oNumberFormatter.format(finalValueSet.underRisk)
                        })
                    ]
                }));
                that._popup[seriesKey].open(0,
                    sap.ui.core.Popup.Dock.CenterBottom,
                    sap.ui.core.Popup.Dock.LeftTop,
                    this,
                    (offsetX + 100) + " " + (offsetY + 130));
                    that._popup[seriesKey]
                    .getContent()
                    .getItems()[0]
                    .$()
                    .css("color", that.getSeries()[seriesKey]._color);
            });
        jQuery("g.shadow-curve > path", this.getDomRef())
            .mouseout(function (eventObj) {
                var seriesKey = eventObj.currentTarget.getAttribute("series");
                var popupContent = that._popup[seriesKey].getContent();

                //remove last two items
                popupContent.removeItem(popupContent.getItems().length - 1);
                popupContent.removeItem(popupContent.getItems().length - 1);
                popupContent.removeItem(popupContent.getItems().length - 1);

                if (that._popup[seriesKey].isOpen()) {
                    that._popup[seriesKey].close();
                }
            });
    };

    KaplanMeierChartControl.prototype._computeCensoredPoints = function (series, minday, maxday, minprob, minDistance, xScale) {
        series._censored = [];
        if (this.getShowCensoring() && series.censored && series._points.length > 0) {
            // compute y values for censored data
            var j = 0;
            var iClusterStart = 0;
            var nClusterY = 0;
            var iClusterCount = 0;

            // Use some() to allow ending the loop early by returning true
            series.censored.some(function (censored, i) {
                var xvalue = censored[0];
                var iPointCount = censored[1];

                if (xvalue > maxday) {
                    return true;
                }
                if (iPointCount <= 0 || xvalue < minday) {
                    return false;
                }
                while (j < series._points.length - 1 && xvalue > series._points[j + 1][0]) {
                    ++j;
                }
                var yvalue = series._points[i][1];
                if (yvalue < minprob) {
                    return true;
                }
                var refPoint = iClusterCount > 0 ? iClusterStart : xvalue;

                var k = i + 1;
                if (k < series.censored.length && xScale(series.censored[k][0]) - xScale(refPoint) < minDistance) {
                    if (iClusterCount === 0) {
                        iClusterStart = refPoint;
                        nClusterY = yvalue;
                        iClusterCount = iPointCount;
                    }
                    iClusterCount += series.censored[k][1];
                } else if (iClusterCount === 0) {
                    series._censored.push([xvalue, yvalue, iPointCount]);
                } else {
                    series._censored.push([iClusterStart, nClusterY, iClusterCount]);
                    iClusterCount = 0;
                }
                return false;
            });
        }
    };

    KaplanMeierChartControl.prototype.addColors = function (series) {
        var colorPickerFction;
        var that = this;
        if (this.getColorPalette() && this.getColorPalette().length > 0) {
            colorPickerFction = this.pickColor;
        } else {
            // if no color palette was defined, use a standard d3 palette
            colorPickerFction = d3.scale.category10();
        }

        jQuery.each(series, function (i, s) {
            if (!s._color) {
                s._color = s.color;
                if (!s._color) {
                    s._color = colorPickerFction.call(that, i);
                }
            }
        });
    };

    KaplanMeierChartControl.prototype.pickColor = function (index) {
        var paletteLength = this.getColorPalette().length;
        return this.getColorPalette()[index % paletteLength];
    };

    return KaplanMeierChartControl;
});

