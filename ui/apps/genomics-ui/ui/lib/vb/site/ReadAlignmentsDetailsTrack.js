sap.ui.define(["hc/hph/genomics/ui/lib/vb/site/DetailsTrack"], function (DetailsTrack) {
    "use strict";
    var ReadAlignmentsDetailsTrack = DetailsTrack.extend("hc.hph.genomics.ui.lib.vb.site.ReadAlignmentsDetailsTrack", {
        metadata: {
            properties: {
                reads: {
                    type: "object[]",
                    defaultValue: null
                },
                referenceSequence: {
                    type: "string",
                    defaultValue: null
                },
                positionBegin: {
                    type: "int",
                    defaultValue: null
                },
                positionEnd: {
                    type: "int",
                    defaultValue: null
                },
                minPosition: {
                    type: "int",
                    defaultValue: null
                }
            }
        },
        // implement control functionality
        renderer: {
            render: function (oRenderManager, oControl) {
                oRenderManager.write("<div");
                oRenderManager.writeControlData(oControl);
                oRenderManager.addClass("sapUiGen-SiteDetailsTrack-ReadAlignments");
                oRenderManager.addClass("sapUiForm");
                oRenderManager.addClass("sapMText");
                oRenderManager.writeClasses();
                oRenderManager.addStyle("display", oControl.getVisible() ? null : "none");
                oRenderManager.writeStyles();
                oRenderManager.write(">");
                this.renderTitle(oRenderManager, oControl.getTitle());
                oRenderManager.write("</div>");
            }
        },
        onAfterRendering: function () {
            this.update();
        },
        update: function () {
            function convertToScreenOffset(baseOffset, extraOffset) {
                return baseOffset > 0 ? "calc( " + 1.5 * baseOffset + "em + " + 2 * baseOffset + (extraOffset ? "px " + extraOffset + ")" : "px)") : null;
            }
            var aReads = this.getReads() ? this.getReads().filter(function (oRead) {
                return !oRead.flags.unmapped;
            }).sort(function (oLeft, oRight) {
                return oRight.mapq === oLeft.mapq ? oLeft.pos - oRight.pos : oRight.mapq - oLeft.mapq;
            }) : [];
            var oSequenceContainer = d3.select('#' + this.getId() + " > .container");
            var oMessage = d3.select('#' + this.getId() + " > .message");
            if (this.getError()) {
                oSequenceContainer.remove();
                if (oMessage.empty()) {
                    oMessage = d3.select('#' + this.getId()).append("div").attr("class", "message");
                }
                oMessage.classed("info", false).classed("error", true).text(this.getErrorMessage());
            } else if (aReads.length > 0) {
                oMessage.remove();
                if (oSequenceContainer.empty()) {
                    oSequenceContainer = d3.select('#' + this.getId()).append("div").attr("class", "container");
                }
                var oHighlight = oSequenceContainer.select(".highlight");
                if (oHighlight.empty()) {
                    oHighlight = oSequenceContainer.append("span").attr("class", "highlight");
                }
                // enable panning for scrolling
                var oDrag = d3.behavior.drag().on("dragstart", function () {
                    oSequenceContainer.classed("dragging", true);
                }).on("drag", function () {
                    this.scrollLeft = this.scrollLeft - d3.event.dx;
                }).on("dragend", function () {
                    oSequenceContainer.classed("dragging", false);
                });
                oSequenceContainer.call(oDrag);
                // turn reference sequence into sequence format and compute min/max reference position
                var referenceBegin = this.getMinPosition();
                var aReference = this.getReferenceSequence().split("").map(function (allele, alleleIndex) {
                    return {
                        pos: referenceBegin + alleleIndex,
                        allele: allele,
                        op: '='
                    };
                });
                var referenceEnd = referenceBegin + aReference.length;
                var isAltAllele = function (oAllele, sBase, iBaseIndex) {
                    switch (oAllele.op) {
                    case '=':
                    case 'S':
                        return false;
                    case 'M':
                        return oAllele.allele !== aReference[oAllele.pos - referenceBegin].allele;
                    case 'I':
                        return iBaseIndex > 0 || sBase !== aReference[oAllele.pos - referenceBegin].allele;
                    case 'D':
                        return true;
                    default:
                        return false;
                    }
                };
                // compute the max allele length for each reference position
                var maxAlleleLength = {};
                for (var readIndex = 0; readIndex < aReads.length; ++readIndex) {
                    var read = aReads[readIndex];
                    for (var alleleIndex = 0; alleleIndex < read.alleles.length; alleleIndex++) {
                        var alleleInfo = read.alleles[alleleIndex];
                        if (!maxAlleleLength[alleleInfo.pos]) {
                            maxAlleleLength[alleleInfo.pos] = 1;
                        }
                        if (alleleInfo.allele) {
                            maxAlleleLength[alleleInfo.pos] = Math.max(maxAlleleLength[alleleInfo.pos], alleleInfo.allele.length);
                        }
                    }
                }
                // compute offset including insertion shifts for each reference position
                var offset = {};
                offset[referenceBegin] = 0;
                for (var position = referenceBegin; position < referenceEnd; ++position) {
                    offset[position + 1] = (maxAlleleLength[position] ? maxAlleleLength[position] : 1) + offset[position];
                }
                aReads.splice(0, 0, { alleles: aReference });
                // render sequences
                var oSequences = oSequenceContainer.selectAll(".sequence").data(aReads);
                oSequences.enter().append("div").attr("class", "sequence");
                oSequences.exit().remove();
                oSequences.classed("fwd", function (oRead) {
                    return oRead.flags && !oRead.flags.reverseComplemented;
                }).classed("rev", function (oRead) {
                    return oRead.flags && oRead.flags.reverseComplemented;
                }).classed("clipped", function (oRead) {
                    return oRead.flags && oRead.alleles[oRead.flags.reverseComplemented ? 0 : oRead.alleles.length - 1].op === 'S';
                }).style("margin-left", function (oRead) {
                    return convertToScreenOffset(oRead.flags && oRead.flags.reverseComplemented ? offset[oRead.pos] - 1 : offset[oRead.pos]);
                });
                // render alleles within sequences
                var oAlleles = oSequences.selectAll(".allele").data(function (oRead) {
                    return oRead.alleles;
                });
                oAlleles.enter().append("span").attr("class", "allele");
                oAlleles.exit().remove();
                oAlleles.classed("clipped", function (oAllele) {
                    return oAllele.op === 'S';
                }).style("margin-right", function (oAllele) {
                    return convertToScreenOffset(maxAlleleLength[oAllele.pos] - (oAllele.allele ? oAllele.allele.length : 1));
                });
                // render bases within alleles
                var oBases = oAlleles.selectAll(".base").data(function (oAllele) {
                    return oAllele.allele ? oAllele.allele.split("") : ['-'];
                });
                oBases.enter().append("span").attr("class", "base");
                oBases.exit().remove();
                oBases.classed("alt", function (sBase, iBaseIndex) {
                    return isAltAllele(d3.select(this.parentNode).datum(), sBase, iBaseIndex);
                }).text(function (sBase) {
                    return sBase;
                });
                // highlight relevant section
                oHighlight.style("left", convertToScreenOffset(offset[this.getPositionBegin()], "- 1.5px")).style("width", convertToScreenOffset(offset[this.getPositionEnd()] - offset[this.getPositionBegin()], "- 1px"));
                oSequenceContainer.transition().each("end", function () {
                    this.scrollLeft = oHighlight.node().offsetLeft - Math.max(0, Math.ceil((this.clientWidth - oHighlight.node().clientWidth) / 2));
                });
            } else {
                oSequenceContainer.remove();
                if (oMessage.empty()) {
                    oMessage = d3.select('#' + this.getId()).append("div").attr("class", "message");
                }
                oMessage.classed("info", true).classed("error", false).text(this.getModel("i18n.vb").getResourceBundle().getText("siteTrack.NoReadsFound"));
            }
        }
    });
    return ReadAlignmentsDetailsTrack;
});