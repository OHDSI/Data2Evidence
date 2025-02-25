jQuery.sap.require('hc.hph.genomics.ui.lib.vb.chromosome.Track');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.chromosome.GeneQualitativeTrack');
hc.hph.genomics.ui.lib.vb.chromosome.Track.extend('hc.hph.genomics.ui.lib.vb.chromosome.GeneQualitativeTrack', {
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
            zoomLevel: {
                type: 'float',
                defaultValue: 0.0003
            }
        }
    },
    init: function () {
        hc.hph.genomics.ui.lib.vb.chromosome.Track.prototype.init.call(this);
        this.setModel(new sap.ui.model.json.JSONModel());
    },
    renderer: {},
    getInitRequest: function () {
        this.mHasInitialData = false;
        //Always request the whole chromosome
        var params = sap.ui.getCore().byId(this.getBrowser()).getAggregation('_chromosomeDetails').getChromosomeRequestParameters();
        params.begin = 0;
        params.end = sap.ui.getCore().byId(this.getBrowser()).getAggregation('_chromosomeDetails').mChromosome.size;
        return {
            pluginFunction: this.getInitPlugin(),
            parameters: params,
            isInit: true,
            merge: false
        };
    },
    getUpdateRequest: function () {
        if (this.mPxPerBp >= this.getZoomLevel()) {
            var params = sap.ui.getCore().byId(this.getBrowser()).getAggregation('_chromosomeDetails').getChromosomeRequestParameters();
            $.extend(params, this.getParameters(), { binSize: this.getBinSize() === 0 ? Math.max(1, this.mPxPerBp) / this.mPxPerBp : this.getBinSize() / this.mPxPerBp });
            return {
                pluginFunction: this.getDataPlugin(),
                parameters: params,
                merge: false
            };
        } else {
            return this.getInitRequest();
        }
    },
    redraw: function (oParameters) {
        var oThis = this;
        var oData = this.getModel().getData();
        var oBrowser = sap.ui.getCore().byId(this.getBrowser());
        if (this.mPxPerBp >= this.getZoomLevel()) {
            this.removeGeneVariantTrack();
            this._drawQualitativeTrack();
        } else if ($.isEmptyObject(oData.message)) {
            this.removeQualitativeTrack();
            //Handle data returned if browser was configured regarding color coding
            if (oBrowser.isConfigured()) {
                if (!$.isEmptyObject(oData.categories)) {
                    this._drawGroupedVariants(oData, oBrowser, oThis);
                } else if ($.isEmptyObject(oData.genes)) {
                    this._drawNoDataMessage();
                } else {
                    this._drawNonGroupedVariants(oData, oThis);
                }
            }    //Handle data returned by non filtered variants
            else {
                if (!$.isEmptyObject(oData.genes)) {
                    this._drawNonGroupedVariants(oData, oThis);
                } else if ($.isEmptyObject(oData.categories)) {
                    this._drawNoDataMessage();
                } else {
                    this._drawGroupedVariants(oData, oBrowser, oThis);
                }
            }
        } else {
            this.removeGeneVariantTrack();
        }
    },
    _drawNonGroupedVariants: function (oData, oThis) {
        this.mDynamicContent.selectAll("text.message").remove();
        var oRects = this.mDynamicContent.selectAll('rect').data(oData.genes);
        oRects.enter().append('rect').style('fill', this.getColor()).style("stroke", this.getColor()).style('fill-opacity', 0.3);
        oRects.exit().remove();
        oRects.attr("x", function (oGene) {
            return oThis.mPositionScale(oGene.begin);
        }).attr("y", function (oGene) {
            return oThis.getHeight() * (1 - oGene.fraction);
        }).attr("width", function (oGene) {
            return oThis.mPxPerBp * (oGene.end - oGene.begin);
        }).attr("height", function (oGene) {
            return oThis.getHeight() * oGene.fraction;
        });
    },
    _drawGroupedVariants: function (oData, oBrowser, oThis) {
        this.mDynamicContent.selectAll("text.message").remove();
        var oGeneGroups = this.mDynamicContent.selectAll('g.variantCategory').data(Object.keys(oData.categories), function (d) {
            return d;
        });
        oGeneGroups.enter().append('g').attr('class', function (gene) {
            return 'geneGroup-' + gene;
        });
        oGeneGroups.exit().remove();
        var oRects = oGeneGroups.selectAll('rect').data(function (gene) {
            var aCategories = [];
            var y0 = 0;
            Object.keys(oData.categories[gene]).forEach(function (category) {
                aCategories.push({
                    category: category,
                    values: $.extend({ y1: y0 }, oData.categories[gene][category])
                });
                y0 += oData.categories[gene][category].fraction;
            });
            return aCategories;
        });
        oRects.enter().append('rect').style('fill-opacity', 0.3);
        oRects.attr("x", function (oGene) {
            return oThis.mPositionScale(oGene.values.begin);
        }).attr("y", function (oGene) {
            return oThis.getHeight() * (1 - (oGene.values.y1 + oGene.values.fraction));
        }).attr("width", function (oGene) {
            return oThis.mPxPerBp * (oGene.values.end - oGene.values.begin);
        }).attr("height", function (oGene) {
            return oThis.getHeight() * oGene.values.fraction;
        }).attr('stroke', function (oGene) {
            return oBrowser.getCategoryColor(oGene.category);
        }).attr('fill', function (oGene) {
            return oBrowser.getCategoryColor(oGene.category);
        });
        oRects.exit().remove();
    },
    _drawNoDataMessage: function () {
        this.mDynamicContent.selectAll("rect").remove();
        if (!this.mInitial) {
            var sNoDataMsg = this.getModel("i18n.vb").getResourceBundle().getText("error.NoData");
            var oText = this.mForegroundContent.selectAll('text.message').data([sNoDataMsg]);
            oText.enter().append('text').attr('class', 'message').attr('y', this.getHeight() / 2 + 1).attr('text-anchor', 'middle');
            oText.exit().remove();
            oText.attr('x', this.mWidth * this.mPxPerBp / 2).text(sNoDataMsg);
        }
    },
    _drawQualitativeTrack: function () {
        var oThis = this;
        var oData = this.getModel().getData();
        var oBrowser = sap.ui.getCore().byId(this.getBrowser());
        if (!$.isEmptyObject(oData.qualitativeData)) {
            this.mDynamicContent.selectAll("text.message").remove();
            var maxHeight = this.getHeight() - this.getHeight() * 0.80;
            var oSampleYScale = d3.scale.linear().domain([
                0,
                1
            ]).range([
                this.getHeight(),
                maxHeight
            ]);
            var oQualitativeAreaPath = this.mDynamicContent.selectAll('path.qualitativeData').data([oData.qualitativeData]);
            oQualitativeAreaPath.enter().append('path').attr('class', 'qualitativeData').style('pointer-events', 'none').style('fill', oThis.getColor()).style('stroke', oThis.getColor());
            oQualitativeAreaPath.exit().remove();
            oQualitativeAreaPath.attr('d', function (aData) {
                var sPath = "";
                aData.forEach(function (oDataPoint) {
                    sPath += "M" + (oThis.mPositionScale(oDataPoint.begin) + oThis.mPxPerBp * 0.5) + "," + oThis.getHeight() + "L" + (oThis.mPositionScale(0.5 * (oDataPoint.begin + oDataPoint.end)) + oThis.mPxPerBp * 0.5) + "," + oSampleYScale(oDataPoint.fraction) + "L" + (oThis.mPositionScale(oDataPoint.end) + oThis.mPxPerBp * 0.5) + "," + oThis.getHeight() + "Z";
                });
                return sPath;
            });
            var oPie = d3.layout.pie().value(function (data) {
                return data.percent;
            }).sort(null);
            var oArc = d3.svg.arc().outerRadius(maxHeight * 0.5);
            var oMutationAreaPath = this.mDynamicContent.selectAll('g.mutationData').data(oData.qualitativeData);
            oMutationAreaPath.enter().append('g').attr('class', 'mutationData').style('pointer-events', 'none').attr('transform', function (data) {
                var x = oThis.mPositionScale(0.5 * (data.begin + data.end)) + oThis.mPxPerBp * 0.5;
                var y = oSampleYScale(data.fraction) - maxHeight * 0.5;
                return 'translate(' + x + ',' + y + ')';
            });
            oMutationAreaPath.exit().remove();
            oMutationAreaPath.selectAll('g.mutationData').data(function (data) {
                return oPie(data.mutationData);
            }).enter().append("path").attr('d', oArc).attr('fill', function (data) {
                var color = oBrowser.getCategoryColor(data.data.type);
                if (!color) {
                    color = oThis.getColor();
                }
                return color;
            });
        } else {
            this.removeQualitativeTrack();
        }
    },
    removeQualitativeTrack: function () {
        this.mDynamicContent.selectAll("path.qualitativeData").remove();
        this.mDynamicContent.selectAll("g.mutationData").remove();
        this.mDynamicContent.selectAll("g.fg").remove();
    },
    removeGeneVariantTrack: function () {
        this.mDynamicContent.selectAll("rect").remove();
        this.mDynamicContent.selectAll("g.variantCategory").remove();
        this.mDynamicContent.selectAll("g.fg").remove();
    }
});