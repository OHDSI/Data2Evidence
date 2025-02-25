jQuery.sap.require('hc.hph.genomics.ui.lib.vb.chromosome.Track');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.chromosome.GeneVariantTrack');
hc.hph.genomics.ui.lib.vb.chromosome.Track.extend('hc.hph.genomics.ui.lib.vb.chromosome.GeneVariantTrack', {
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
        if (this.mHasInitialData) {
            return {};
        } else {
            return this.getInitRequest();
        }
    },
    redraw: function (oParameters) {
        var oThis = this;
        var oData = this.getModel().getData();
        var oBrowser = sap.ui.getCore().byId(this.getBrowser());
        if ($.isEmptyObject(oData.message)) {
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
            this.mDynamicContent.selectAll("rect").remove();
            this.mDynamicContent.selectAll("g.variantCategory").remove();
            this.mDynamicContent.selectAll("g.fg").remove();
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
        }).attr('cursor', this.isInteractive() ? 'pointer' : null).attr('pointer-events', this.isInteractive() ? 'all' : null).on("click", function (oGene) {
            sap.ui.getCore().byId(oThis.getBrowser()).selectChromosome(null, oGene.begin, oGene.end - oGene.begin);
            d3.event.stopPropagation();
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
        oRects.enter().append('rect').style('fill-opacity', 0.3).attr('cursor', this.isInteractive() ? 'pointer' : null).attr('pointer-events', this.isInteractive() ? 'all' : null);
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
        }).on("click", function (oGene) {
            sap.ui.getCore().byId(oThis.getBrowser()).selectChromosome(oThis.mChromosomeIndex, oGene.begin, oGene.end - oGene.begin);
            d3.event.stopPropagation();
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
    }
});