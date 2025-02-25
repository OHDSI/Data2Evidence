sap.ui.define(
    [
        "sap/ui/core/Control"
    ],
    function (Control) {
        "use strict";

        jQuery.sap.includeStyleSheet("/hc/hph/genomics/ui/lib/genetables/Circle.css", "hc.hph.genomics.ui.lib.genetables.Circle.css");

        var Circle = Control.extend("hc.hph.genomics.ui.lib.genetables.Circle", {
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
                var oThis = this;
                this.mResizeHandlerID = null;
                this.mResizeTimer = null;

                sap.ui.getCore().attachInit(
                    function () {
                        oThis.mResizeHandlerID = sap.ui.core.ResizeHandler.register(oThis,
                            function () {
                                if ((this.iWidth > 0) && (this.iHeight > 0)) {
                                    if (oThis.mResizeTimer) {
                                        clearTimeout(oThis.mResizeTimer);
                                    }
                                    oThis.mResizeTimer = setTimeout(
                                        function () {
                                            oThis.update();
                                            oThis.mResizeTimer = null;
                                        },
                                        250
                                    );
                                }
                            }
                        );
                    }
                );
            },

            exit: function () {
                if (this.mResizeTimer) {
                    clearTimeout(this.mResizeTimer);
                }
                if (this.mResizeHandlerID) {
                    sap.ui.core.ResizeHandler.deregister(this.mResizeHandlerID);
                }
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
                    oRenderManager.addClass("sapUiCPH-correlationCircle");
                    oRenderManager.writeClasses();
                    oRenderManager.addStyle("display", oControl.getVisible() ? null : "none");
                    oRenderManager.writeStyles();
                    oRenderManager.write("><svg><g></g></svg><div");
                    oRenderManager.addClass("popoverDiv");
                    oRenderManager.writeClasses();
                    oRenderManager.write("/></div>");
                }
            },

            onAfterRendering: function () {
                this.update();
            },

            update: function () {
                var that = this;
                var oGroup = d3.select("#" + this.getId() + " > svg > g");
                if (oGroup.empty()) {
                    return;
                }

                var iRadius = Math.min(this.$().innerWidth(), this.$().innerHeight()) / 2 - 20;
                oGroup.attr("transform", "translate(" + (this.$().innerWidth() / 2) + "," + (this.$().innerHeight() / 2) + ")");

                var aCorrelations = d3.entries(this.getCorrelations()).sort(function (oLeft, oRight) { return d3.ascending(Object.keys(oLeft.value.right).length, Object.keys(oRight.value.right).length); });

                var oArcGenerator = d3.svg.arc()
                    .innerRadius(iRadius * 0.99)
                    .outerRadius(iRadius)
                    .startAngle(function (oSection, iSection) { return 2 * Math.PI / aCorrelations.length * (iSection + 0.05); })
                    .endAngle(function (oSection, iSection) { return 2 * Math.PI / aCorrelations.length * (iSection + 0.95); });
                var oChordGenerator = d3.svg.chord()
                    .radius(iRadius * 0.99)
                    .source(function (oChord) {
                        return {
                            startAngle: 2 * Math.PI / aCorrelations.length * (oChord.sourceIndex + 0.05),
                            endAngle: 2 * Math.PI / aCorrelations.length * (oChord.sourceIndex + 0.95)
                        };
                    })
                    .target(function (oChord) {
                        return {
                            startAngle: 2 * Math.PI / aCorrelations.length * (oChord.targetIndex + 0.05),
                            endAngle: 2 * Math.PI / aCorrelations.length * (oChord.targetIndex + 0.95)
                        };
                    });

                var aMinMax = aCorrelations.reduce(
                    function (aValues, oElement) {
                        var iMinLeft = d3.min(oElement.value.left ? $.map(oElement.value.left, function (value, index) { return value[0]; }) : {});
                        var iMinRight = d3.min(oElement.value.right ? $.map(oElement.value.right, function (value, index) { return value[0]; }) : {});
                        var iMin = iMinLeft === undefined ? iMinRight : iMinRight === undefined ? undefined : Math.min(iMinLeft, iMinRight);
                        var iMaxLeft = d3.max(oElement.value.left ? $.map(oElement.value.left, function (value, index) { return value[0]; }) : {});
                        var iMaxRight = d3.max(oElement.value.right ? $.map(oElement.value.right, function (value, index) { return value[0]; }) : {});
                        var iMax = iMaxLeft === undefined ? iMaxRight : iMaxRight === undefined ? undefined : Math.max(iMaxLeft, iMaxRight);

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

                var oOpacityScale = d3.scale.log()
                    .domain(aMinMax)
                    .range([0, 1]);

                var oSections = oGroup.selectAll("g.section")
                    .data(aCorrelations);
                var oSectionsEnter = oSections.enter()
                    .append("g")
                    .attr("class", "section");
                oSectionsEnter.append("g").attr("class", "chords");
                oSectionsEnter.append("path").attr("class", "section");
                oSectionsEnter.append("text");
                oSections.exit()
                    .remove();

                oSections.select("text")
                    .attr("y", -iRadius - 4)
                    .attr("transform", function (oSection, iSection) { return "rotate(" + (360 / aCorrelations.length * (iSection + 0.5)) + ")"; })
                    .text(function (oSection) { return oSection.key; });
                oSections.select("path.section")
                    .attr("d", oArcGenerator);

                var oChords = oSections.select("g.chords").selectAll("path")
                    .data(function (oSection, iSection) {
                        return aCorrelations.slice(0, iSection).map(function (oTarget, iTarget) {
                            return {
                                value: oSection.value.right[oTarget.key][0],
                                sourceIndex: iSection,
                                targetIndex: iTarget,
                                trend: oSection.value.right[oTarget.key][1],
                                logOddsRatio: oSection.value.right[oTarget.key][2],
                                origPValue: oSection.value.right[oTarget.key][3],
                                BHadjustedPValue: oSection.value.right[oTarget.key][4],
                                BonfAdjustedPValue: oSection.value.right[oTarget.key][5],
                                gene1: oSection.key,
                                gene2: oTarget.key
                            };
                        });
                    });
                oChords.enter()
                    .append("path")
                    .append("title");
                oChords.exit()
                    .remove();
                oChords
                    .classed("filtered", function (oTarget) { return (oTarget.value === undefined) || (oTarget.value < aMinMax[0]) || (oTarget.value > aMinMax[1]); })
                    .attr("d", oChordGenerator)
                    .attr("fill", function (oElement) { return (oElement.trend === "co-occurrence" ? oColorScaleBlue(oElement.value) : oColorScaleRed(oElement.value)); })
                    .attr("fill-opacity", function (oElement) { return oOpacityScale(oElement.value); })
                    .on("click", function (oElement) {
                        var popDiv = d3.select("#" + that.getId() + ">.popoverDiv").node();
                        var mouseCoordinates = d3.mouse(popDiv);
                        popDiv.style.position = "absolute";
                        popDiv.style.left = popDiv.offsetLeft + mouseCoordinates[0] + 'px';
                        popDiv.style.top = popDiv.offsetTop + mouseCoordinates[1] + 'px';
                        if (!that.mPopover) {
                            that.mPopover = sap.ui.xmlfragment("hc.hph.genomics.ui.lib.genetables.Popover", this);
                            that.addDependent(that.mPopover);
                            that.mPopover.setModel(new sap.ui.model.json.JSONModel());
                        }
                        that.mPopover.getModel().setData(oElement);
                        that.mPopover.openBy(popDiv);

                    })
                    .on("mouseover", function (oElement) {
                        oChords.classed("hover", true);
                        d3.select(this).classed("hover", false);
                        oSections.select("text").classed("hover", function (oSection) {
                            return !(oSection.key === oElement.gene1 || oSection.key === oElement.gene2);
                        });
                        oSections.select(".section").classed("hover", function (oSection) {
                            return !(oSection.key === oElement.gene1 || oSection.key === oElement.gene2);
                        });
                    })
                    .on("mouseout", function (oElement) {
                        oChords.classed("hover", false);
                        d3.select(this).classed("hover", false);
                        oSections.select("text").classed("hover", false);
                        oSections.select(".section").classed("hover", false);
                    })
                    .select("title")
                    .text(function (oTarget) { return oTarget.value.toFixed(2); });
            }
        });

        return Circle;
    });