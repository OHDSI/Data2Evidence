sap.ui.define(
    [
        "sap/ui/core/Control",
        'sap/ui/core/Fragment'
    ],
    function (Control, Fragment) {
        "use strict";

        jQuery.sap.includeStyleSheet("/hc/hph/genomics/ui/lib/genetables/Matrix.css", "hc.hph.genomics.ui.lib.genetables.Matrix.css");

        var Matrix = Control.extend("hc.hph.genomics.ui.lib.genetables.Matrix", {
            metadata:
            {
                properties:
                {
                    correlations: { type: "object" },
                    min: { type: "any", defaultValue: null },
                    max: { type: "any", defaultValue: null }
                }
            },

            init: function () {
                this.mPopover = null;
            },

            setCorrelations: function (oCorrelations) {
                this.setProperty("correlations", oCorrelations, true);
                if (oCorrelations) {
                    this.update();
                }
            },

            setMin: function (fMin) {
                this.setProperty("min", fMin, true);
                this.update();
            },

            setMax: function (fMax) {
                this.setProperty("max", fMax, true);
                this.update();
            },

            // implement control functionality

            renderer:
            {
                render: function (oRenderManager, oControl) {
                    oRenderManager.write("<div");
                    oRenderManager.writeControlData(oControl);
                    oRenderManager.addClass("sapUiCPH-correlationMatrix");
                    oRenderManager.writeClasses();
                    oRenderManager.addStyle("display", oControl.getVisible() ? null : "none");
                    oRenderManager.writeStyles();
                    oRenderManager.write("></div>");
                }
            },

            onAfterRendering: function () {
                this.update();
            },

            update: function () {
                var that = this;
                var oControl = d3.select("#" + this.getId());
                if (oControl.empty()) {
                    return;
                }

                var aCorrelations = d3.entries(this.getCorrelations()).sort(function (oLeft, oRight) { return d3.ascending(Object.keys(oLeft.value.right).length, Object.keys(oRight.value.right).length); });

                var aMinMax = aCorrelations.reduce(
                    function (aValues, oElement) {
                        var iMinRight = d3.min(oElement.value.right ? $.map(oElement.value.right, function (value, index) { return value[0]; }) : {});
                        var iMin = iMinRight;
                        var iMaxRight = d3.max(oElement.value.right ? $.map(oElement.value.right, function (value, index) { return value[0]; }) : {});
                        var iMax = iMaxRight;

                        return [
                            iMin === undefined ? aValues[0] : aValues[0] === null ? iMin : Math.min(aValues[0], iMin),
                            iMax === undefined ? aValues[1] : aValues[1] === null ? iMax : Math.max(aValues[1], iMax)
                        ];
                    },
                    [null, null]
                );
                if (this.getMin() !== null) {
                    aMinMax[0] = this.getMin();
                }
                else {
                    aMinMax[0] *= 0.99;
                }
                if (this.getMax() !== null) {
                    aMinMax[1] = this.getMax();
                }
                else {
                    aMinMax[1] *= 1.01;
                }
                var oColorScaleBlue = d3.scale.linear()
                    .domain(aMinMax)
                    .range(["#EFF4F9", "#427CAC"]);

                var oColorScaleRed = d3.scale.linear()
                    .domain(aMinMax)
                    .range(["#FFEEEE", "#BB0000"]);

                var oRows = oControl.selectAll("div.row")
                    .data(aCorrelations);
                oRows.enter()
                    .append("div")
                    .attr("class", "row")
                    .append("span")
                    .attr("class", "label");
                oRows.exit()
                    .remove();
                oRows.select("span.label")
                    .text(function (oElement) { return oElement.key; });

                var oSquaresLeft = oRows.selectAll("span.value.left")
                    .data(function (oElement, iElementColumn) {
                        return aCorrelations.slice(iElementColumn + 1).map(function (oRow) {
                            return { gene1: oElement.key, gene2: oRow.key, value: oElement.value.left ? oElement.value.left[oRow.key][0] : undefined, trend: oElement.value.left ? oElement.value.left[oRow.key][1] : undefined, logOddsRatio: oElement.value.left ? oElement.value.left[oRow.key][2] : undefined, origPValue: oElement.value.left ? oElement.value.left[oRow.key][3] : undefined };
                        });
                    });
                oSquaresLeft.enter()
                    .insert("span", "span.label")
                    .attr("class", "value left");
                oSquaresLeft.exit()
                    .remove();
                oSquaresLeft
                    .classed("filtered", function (oElement) {
                        return (oElement.value === undefined) || (oElement.value < aMinMax[0]) || (oElement.value > aMinMax[1]);
                    })
                    .style("background-color", function (oElement) {
                        return (oElement.value !== undefined) && (oElement.value >= aMinMax[0]) && (oElement.value <= aMinMax[1])
                            ? (oElement.trend === "co-occurrence" ? oColorScaleBlue(oElement.value) : oColorScaleRed(oElement.value)) : null;
                    })
                    .style("border-color", function (oElement) {
                        return (oElement.value !== undefined) && (oElement.value >= aMinMax[0]) && (oElement.value <= aMinMax[1])
                            ? (oElement.trend === "co-occurrence" ? oColorScaleBlue(oElement.value) : oColorScaleRed(oElement.value)) : null;
                    })
                    //.attr( "title", function ( oElement ) { return oElement.gene1 + "/" + oElement.gene2; } )
                    .text(function (oElement) { return oElement.value === undefined ? null : (oElement.value > 99 ? ">" : oElement.value.toFixed(oElement.value >= 10 ? 0 : 1)); });

                var oSquaresRight = oRows.selectAll("span.value.right")
                    .data(function (oElement, iElementColumn) {
                        return aCorrelations.slice(0, iElementColumn).reverse().map(function (oRow) {
                            return {
                                gene1: oElement.key, gene2: oRow.key, value: oElement.value.right ? oElement.value.right[oRow.key][0] : undefined,
                                trend: oElement.value.right ? oElement.value.right[oRow.key][1] : undefined,
                                logOddsRatio: oElement.value.right ? oElement.value.right[oRow.key][2] : undefined,
                                origPValue: oElement.value.right ? oElement.value.right[oRow.key][3] : undefined,
                                BHadjustedPValue: oElement.value.right ? oElement.value.right[oRow.key][4] : undefined,
                                BonfAdjustedPValue: oElement.value.right ? oElement.value.right[oRow.key][5] : undefined
                            };
                        });
                    });
                oSquaresRight.enter()
                    .append("span")
                    .attr("class", "value right");
                oSquaresRight.exit()
                    .remove();
                oSquaresRight
                    .classed("filtered", function (oElement) {
                        return (oElement.value === undefined) || (oElement.value < aMinMax[0]) || (oElement.value > aMinMax[1]);
                    })
                    .style("background-color", function (oElement) {
                        return (oElement.value !== undefined) && (oElement.value >= aMinMax[0]) && (oElement.value <= aMinMax[1])
                            ? (oElement.trend === "co-occurrence" ? oColorScaleBlue(oElement.value) : oColorScaleRed(oElement.value)) : null;
                    })
                    .style("border-color", function (oElement) {
                        return (oElement.value !== undefined) && (oElement.value >= aMinMax[0]) && (oElement.value <= aMinMax[1])
                            ? (oElement.trend === "co-occurrence" ? oColorScaleBlue(oElement.value) : oColorScaleRed(oElement.value)) : null;
                    })
                    .attr("title", function (oElement) { return oElement.gene1 + "/" + oElement.gene2; })
                    .on("click", function (oElement) {
                        if (!that.mPopover) {
                            that.mPopover = sap.ui.xmlfragment("hc.hph.genomics.ui.lib.genetables.Popover", this);
                            that.addDependent(that.mPopover);
                            that.mPopover.setModel(new sap.ui.model.json.JSONModel());
                        }
                        that.mPopover.getModel().setData(oElement);
                        that.mPopover.openBy(this);
                    })
                    .text(function (oElement) { return oElement.value === undefined ? null : (oElement.value > 99 ? ">" : oElement.value.toFixed(oElement.value >= 10 ? 0 : 1)); });

                // Add hover effect
                oRows.select("span.label")
                    .style("width", null)
                    .on("mouseover",
                        function (oElementRow, iElementRow) {
                            // Fade out everything
                            oControl
                                .classed("hover", true);
                            // Add markers to labels
                            oRows.select(".label")
                                .classed("hover", true)
                                .classed("top", function (oLabelRow, iLabelRow) { return (iLabelRow === iElementRow) && oLabelRow.value.left && (iElementRow > 0); })
                                .classed("bottom", function (oLabelRow, iLabelRow) { return (iLabelRow === iElementRow) && oLabelRow.value.right && (iElementRow < (aCorrelations.length - 1)); })
                                .classed("left", function (oLabelRow, iLabelRow) { return (iLabelRow === iElementRow) && oLabelRow.value.left && (iElementRow < (aCorrelations.length - 1)); })
                                .classed("right", function (oLabelRow, iLabelRow) { return (iLabelRow === iElementRow) && oLabelRow.value.right && (iElementRow > 0); });
                            // Fade in all values in the same row
                            d3.select(this.parentNode)
                                .selectAll(".value")
                                .classed("hover", true);
                            // Fade in all values and labels in the same column
                            oRows.selectAll(".value, .label")
                                .filter(function (oElement, iElementColumn) { return (iElementColumn === (aCorrelations.length - iElementRow - 1)); })
                                .classed("hover", true);
                        }
                    )
                    .on("mouseout",
                    function () {
                        oControl
                            .classed("hover", false);
                        oRows.select(".label")
                            .classed("top", false)
                            .classed("bottom", false)
                            .classed("left", false)
                            .classed("right", false);
                        oRows.selectAll(".value, .label")
                            .classed("hover", false);
                    }
                    );
                oRows.each(
                    function (oElementRow, iElementRow) {
                        d3.select(this)
                            .selectAll(".value")
                            .on("mouseover",
                            function (fValue, iElementColumn) {
                                if (this.textContent) {
                                    var bLeft = (iElementRow + iElementColumn) < (aCorrelations.length - 1);
                                    // Fade out everything
                                    oControl
                                        .classed("hover", true);
                                    // Fade in matching labels and add markers
                                    oRows.select(".label")
                                        .classed("hover", function (oLabelRow, iLabelRow) { return (iLabelRow === iElementRow) || (iLabelRow === (aCorrelations.length - iElementColumn - (bLeft ? 1 : 2))); })
                                        .classed("top", function (oLabelRow, iLabelRow) { return (iLabelRow > iElementRow); })
                                        .classed("bottom", function (oLabelRow, iLabelRow) { return (iLabelRow < iElementRow); })
                                        .classed("left", function (oLabelRow, iLabelRow) { return bLeft && (iLabelRow === iElementRow); })
                                        .classed("right", function (oLabelRow, iLabelRow) { return (!bLeft) && (iLabelRow === iElementRow); });
                                    // Fade in selected value
                                    d3.select(this)
                                        .classed("hover", true);
                                }
                            }
                            )
                            .on("mouseout",
                                function () {
                                    oControl
                                        .classed("hover", false);
                                    oRows.select(".label")
                                        .classed("hover", false)
                                        .classed("top", false)
                                        .classed("bottom", false)
                                        .classed("left", false)
                                        .classed("right", false);
                                    d3.select(this)
                                        .classed("hover", false);
                                }
                            );
                    }
                );

                // Adjust widths of all labels after rendering
                oRows.select("span.label")
                    .transition()
                    .each("end",
                        function () {
                            var iMaxWidth = 0;
                            oRows.select("span.label")
                                .each(
                                function () {
                                    iMaxWidth = Math.max(iMaxWidth, parseFloat(window.getComputedStyle(this).width));
                                }
                                )
                                .style("width", iMaxWidth + "px");
                        }
                    );
            }
        });

        return Matrix;
    });