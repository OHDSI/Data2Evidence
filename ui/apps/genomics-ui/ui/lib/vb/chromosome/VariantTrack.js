jQuery.sap.require('hc.hph.genomics.ui.lib.vb.chromosome.Track');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.chromosome.VariantTrack');
hc.hph.genomics.ui.lib.vb.chromosome.Track.extend('hc.hph.genomics.ui.lib.vb.chromosome.VariantTrack', {
    metadata: {
        properties: {
            type: {
                type: 'string',
                defaultValue: 'variants'
            },
            name: {
                type: 'string',
                defaultValue: 'Variants'
            },
            height: {
                type: 'int',
                defaultValue: 20
            },
            refGroup: {
                type: 'string',
                defaultValue: 'session:*'
            }
        }
    },
    init: function () {
        hc.hph.genomics.ui.lib.vb.chromosome.Track.prototype.init.call(this);
        this.mShowBasePairs = false;
        this.mShowBasePairLabels = false;
    },
    renderer: {},
    getUpdateRequest: function () {
        return this.getInitRequest();
    },
    getInitRequest: function () {
        this.mHasInitialData = false;
        var params = sap.ui.getCore().byId(this.getBrowser()).getAggregation('_chromosomeDetails').getChromosomeRequestParameters();
        params.binSize = this.getBinSize() === 0 ? Math.max(1, this.mPxPerBp) / this.mPxPerBp : this.getBinSize() / this.mPxPerBp;
        $.extend(params, this.getParameters(), { binSize: this.getBinSize() === 0 ? Math.max(1, this.mPxPerBp) / this.mPxPerBp : this.getBinSize() / this.mPxPerBp });
        return {
            pluginFunction: this.getDataPlugin(),
            isInit: true,
            parameters: params,
            merge: false
        };
    },
    setData: function (oData, bNoRedraw) {
        var fMaxValue = 0;
        for (var sKey in oData) {
            if (oData[sKey] && d3.max(oData[sKey]) > fMaxValue) {
                fMaxValue = d3.max(oData[sKey]);
            }
        }
        if (!bNoRedraw) {
            this.getModel().setData(oData);
            this.triggerRedraw();
        } else {
            this.getModel().setData(oData);
        }
        return fMaxValue;
    },
    _drawGroupedVariants: function (oData, oBrowser, oThis) {
        var aCategorizedDensities = oData.groupedVariantDensity;
        if (!$.isEmptyObject(aCategorizedDensities)) {
            //Create y-scale
            var dTotalMaxValue = this.getMaxValue() ? this.getMaxValue() : oData.maxValue;
            var oVariantDensityYScale = d3.scale.linear().domain([
                0,
                oThis.getMaxValue() ? oThis.getMaxValue() : dTotalMaxValue
            ]).range([
                this.getHeight(),
                0
            ]);
            var oVariantDensityArea = d3.svg.area().interpolate('step-after').x(function (d, index) {
                return oThis.mPositionScale(oData.begin + index * oData.binSize);
            }).y0(function (d) {
                return oVariantDensityYScale(d.y0);
            }).y1(function (d) {
                return d.y >= oThis.getMinValue() ? oVariantDensityYScale(d.y + d.y0) : oVariantDensityYScale(0);
            });
            var oStack = d3.layout.stack().values(function (d) {
                return d ? d.values : 0;
            });
            var oVariantDensityAreaPath = this.mDynamicContent.selectAll('path.variantDensityArea').data(oStack(aCategorizedDensities));
            oVariantDensityAreaPath.exit().remove();
            oVariantDensityAreaPath.enter().append('path').attr('class', 'variantDensityArea').style('pointer-events', 'none').style('fill', function (d) {
                return oBrowser.getCategoryColor(d.category);
            }).attr('d', function (d) {
                return oVariantDensityArea(d.values);
            });
            oVariantDensityAreaPath.attr('d', function (d) {
                return oVariantDensityArea(d.values);
            });
        }
    },
    _drawNonGroupedVariants: function (oData, oThis) {
        //Create y-scale
        var oVariantDensityYScale = d3.scale.linear().domain([
            0,
            oThis.getMaxValue() ? oThis.getMaxValue() : oData.maxValue
        ]).range([
            this.getHeight(),
            0
        ]);
        //Create area function
        var oVariantDensityArea = d3.svg.area().x(function (d, i) {
            return oThis.mPositionScale(oData.begin + i * oData.binSize);
        }).y0(this.getHeight()).y1(function (d) {
            return d >= oThis.getMinValue() ? oVariantDensityYScale(d) : oVariantDensityYScale(0);
        }).interpolate("step-after");
        var oVariantDensityAreaPath = this.mDynamicContent.selectAll('path.variantDensityArea').data([oData.variantDensity]);
        oVariantDensityAreaPath.exit().remove();
        oVariantDensityAreaPath.enter().append('path').attr('class', 'variantDensityArea').style('pointer-events', 'none').style('fill', oThis.getColor()).style('stroke', oThis.getColor()).attr('d', oVariantDensityArea);
        oVariantDensityAreaPath.attr('d', oVariantDensityArea);
    },
    _drawSingleSample: function (oData, oThis) {
        //Remove drawn density area
        this.mDynamicContent.select('.variantDensityArea').remove();
        var oVariants = this.mDynamicContent.selectAll('g').data(oData.displayVariants);
        oVariants.exit().remove();
        oVariants.enter().append('g');
        oVariants.each(function (variant) {
            var oVariant = d3.select(this);
            var fPosition = oThis.mPositionScale(variant.pos);
            var fAlleleHeight = oThis.getHeight() / variant.copyNumber;
            var oAlleles = oVariant.selectAll('rect').data(variant.alleles);
            oAlleles.enter().append('rect');
            oAlleles.exit().remove();
            oAlleles.classed('simpleBase', true).classed('in', function (allele) {
                if (allele && allele !== "-") {
                    return allele.length > 1;
                } else {
                    return false;
                }
            }).classed('del', function (allele) {
                return !allele || allele === "-";
            }).attr('height', fAlleleHeight - 2).attr('width', oThis.mPxPerBp).attr('x', fPosition).attr('y', function (allele, index) {
                return index * fAlleleHeight + 1;
            }).style('fill', oThis.getColor());
            var oTooltips;
            if (oThis.mPxPerBp >= 12) {
                var oLabels = oVariant.selectAll('text').data(variant.alleles);
                oLabels.enter().append('text');
                oLabels.exit().remove();
                oLabels.attr('y', function (allele, index) {
                    return (index + 0.5) * fAlleleHeight;
                }).attr('x', fPosition + oThis.mPxPerBp / 2).text(function (allele) {
                    if (allele.length === 0) {
                        return '-';
                    } else if (allele.length === 1) {
                        return allele;
                    } else if (allele[0] === '<') {
                        return '?';
                    } else {
                        return '+';
                    }
                });
                oAlleles.filter(function (allele) {
                    return allele.length <= 1;
                }).selectAll("title").remove();
                oTooltips = oAlleles.filter(function (allele) {
                    return allele.length > 1;
                }).selectAll("title").data(function (allele) {
                    return [allele];
                });
            } else {
                oTooltips = oAlleles.selectAll("title").data(function (allele) {
                    return [allele];
                });
            }
            oTooltips.enter().append("title");
            oTooltips.text(function (allele) {
                return allele;
            });
        });
    },
    _drawRects: function (oData, oThis) {
        var aColors = d3.scale.category10();
        //Array of 10 different colors
        //Remove drawn density area
        this.mDynamicContent.select('.variantDensityArea').remove();
        var oRectGroup = this.mDynamicContent.select('g.bg');
        if (oRectGroup.empty()) {
            oRectGroup = this.mDynamicContent.append('g').attr('class', 'bg');
        }
        oRectGroup.selectAll('g').remove();
        var oVariants = oRectGroup.selectAll('g').data(oData.displayVariants);
        oVariants.enter().append('g');
        oVariants.exit().remove();
        oVariants.each(function (variant) {
            var oVariant = d3.select(this);
            var fPosition = oThis.mPositionScale(variant.pos);
            var fAlleleHeight = oThis.getHeight();
            var oAlleles = oVariant.selectAll('rect').data(variant.alleles);
            oAlleles.enter().append('rect');
            oAlleles.exit().remove();
            oAlleles.attr('x', fPosition).attr('y', function (allele) {
                return allele.y * fAlleleHeight;
            }).attr('width', oThis.mPxPerBp).attr('height', function (allele) {
                return allele.af * fAlleleHeight;
            }).attr('fill', function (allele, i) {
                return aColors.range()[i];
            });
        });
    },
    _drawMessage: function () {
        this.mDynamicContent.selectAll('g.bg rect').remove();
        this.mDynamicContent.selectAll('g.fg text').remove();
        var sDataMsg = this.getModel().getData().message;
        var oText = this.mForegroundContent.selectAll('text.message').data([sDataMsg]);
        oText.enter().append('text').attr('class', 'message').attr('y', this.getHeight() / 2 + 1).attr('text-anchor', 'middle');
        oText.exit().remove();
        oText.attr('x', this.mWidth * this.mPxPerBp / 2).text(sDataMsg);
    },
    _drawNoData: function () {
        this.mDynamicContent.selectAll('g.bg rect').remove();
        this.mDynamicContent.selectAll('g.fg text').remove();
        if (!this.mInitial) {
            var sNoDataMsg = this.getModel("i18n.vb").getResourceBundle().getText("error.NoData");
            var oText = this.mForegroundContent.selectAll('text.message').data([sNoDataMsg]);
            oText.enter().append('text').attr('class', 'message').attr('y', this.getHeight() / 2 + 1).attr('text-anchor', 'middle');
            oText.exit().remove();
            oText.attr('x', this.mWidth * this.mPxPerBp / 2).text(sNoDataMsg);
        }
    },
    _drawGroupedAlleleFrequencies: function (oData, oThis) {
        var oData = oData.groupedDisplayVariants;
        var oBrowser = sap.ui.getCore().byId(this.getBrowser());
        var dAlleleHeight = oThis.getHeight();
        //Remove drawn density area
        this.mDynamicContent.select('.variantDensityArea').remove();
        var oDynamicBackground = this.mDynamicContent.select('g.bg');
        if (oDynamicBackground.empty()) {
            oDynamicBackground = this.mDynamicContent.append('g').attr('class', 'bg');
        }
        var oDynamicForeground = this.mDynamicContent.select('g.fg');
        if (oDynamicForeground.empty()) {
            oDynamicForeground = this.mDynamicContent.append('g').attr('class', 'fg');
        }
        oDynamicBackground.selectAll('g').remove();
        oDynamicForeground.selectAll('g').remove();
        var oForegroundVariants = oDynamicForeground.selectAll('g.allele').data(oData);
        oForegroundVariants.enter().append('g').attr('class', 'allele').attr('transform', function (variant) {
            return 'translate(' + oThis.mPositionScale(variant.pos) + ', 0)';
        }).attr('width', oThis.mPxPerBp);
        oForegroundVariants.exit().remove();
        var oForegroundAlleleGroupRect = oForegroundVariants.selectAll('g.alleleGroup rect').data(function (variant) {
            var aAlleles = [];
            var aAlleleValues = Object.keys(variant.alleles);
            for (var i = 0; i < aAlleleValues.length; i++) {
                variant.alleles[aAlleleValues[i]].allele = aAlleleValues[i];
                aAlleles.push(variant.alleles[aAlleleValues[i]]);
            }
            var oStack = d3.layout.stack().values(function (d) {
                return d.alleleFrequency;
            }).y(function (d) {
                return d.af;
            });
            return oStack(aAlleles);
        }).enter();
        oForegroundAlleleGroupRect.append('g').attr('class', 'alleleGroup').append('rect').attr('y', function (allele) {
            return allele.alleleFrequency[0].y0 * dAlleleHeight;
        }).attr('width', oThis.mPxPerBp).attr('height', function (allele) {
            return allele.alleleFrequency[0].af * dAlleleHeight;
        }).attr('stroke', 'black').attr('stroke-width', '1').attr('fill', 'none').attr('pointer-events', 'all').append('title').text(function (oAllele) {
            return oAllele.allele;
        });
        var oBackgroundVariants = oDynamicBackground.selectAll('rect.alleleGroup').data(oData);
        oBackgroundVariants.enter().append('g').attr('class', 'allele').attr('transform', function (variant) {
            return 'translate(' + oThis.mPositionScale(variant.pos) + ', 0)';
        }).attr('width', oThis.mPxPerBp);
        oForegroundVariants.exit().remove();
        var oBackgroundAlleleGroupRect = oBackgroundVariants.selectAll('g.alleleCategories').data(function (variant) {
            var aAlleles = [];
            var aAlleleValues = Object.keys(variant.alleles);
            for (var i = 0; i < aAlleleValues.length; i++) {
                variant.alleles[aAlleleValues[i]].allele = aAlleleValues[i];
                aAlleles.push(variant.alleles[aAlleleValues[i]]);
            }
            var oStack = d3.layout.stack().values(function (d) {
                return d.alleleFrequency;
            }).y(function (d) {
                return d.af;
            });
            return oStack(aAlleles);
        });
        oBackgroundAlleleGroupRect.enter().append('g').attr('class', 'alleleCategories');
        oBackgroundAlleleGroupRect.exit().remove();
        var oCategoryRect = oBackgroundAlleleGroupRect.selectAll('rect.alleleCategory').data(function (allele) {
            var aResult = [];
            for (var i = 0; i < allele.groups.length; i++) {
                aResult.push({
                    alleleFrequency: allele.alleleFrequency,
                    group: allele.groups[i],
                    groupHeight: allele.alleleFrequency[0].af * dAlleleHeight / allele.groups.length
                });
            }
            return aResult;
        });
        oCategoryRect.enter().append('rect').attr('class', 'alleleCategory').attr('width', oThis.mPxPerBp).attr('y', function (allele, i) {
            return allele.alleleFrequency[0].y0 * dAlleleHeight + i * allele.groupHeight;
        }).attr('height', function (allele) {
            return allele.groupHeight;
        }).attr('fill', function (d) {
            return oBrowser.getCategoryColor(d.group);
        });
        oCategoryRect.exit().remove();
    },
    redraw: function () {
        var oThis = this;
        var oData = this.getModel().getData();
        var oBrowser = sap.ui.getCore().byId(this.getBrowser());
        //Handle message or empty data 
        if (oData.hasOwnProperty('message')) {
            this._drawMessage();
            return;
        } else if ($.isEmptyObject(oData)) {
            this._drawNoData();
            return;
        }
        //Remove drawn basepair text
        this.mDynamicContent.selectAll('.fg').remove();
        //Remove drawn basepair rectangles
        this.mDynamicContent.selectAll('.bg').remove();
        if (oData.hasOwnProperty("groupedVariantDensity")) {
            this._drawGroupedVariants(oData, oBrowser, oThis);
        } else if (oData.hasOwnProperty("groupedDisplayVariants")) {
            this._drawGroupedAlleleFrequencies(oData, oThis);
        } else if (oData.hasOwnProperty("variantDensity")) {
            this._drawNonGroupedVariants(oData, oThis);
        } else if (oData.sampleCount === 1) {
            this._drawSingleSample(oData, oThis);
        } else if (oData.hasOwnProperty("displayVariants")) {
            this._drawRects(oData, oThis);
        }
    }
});