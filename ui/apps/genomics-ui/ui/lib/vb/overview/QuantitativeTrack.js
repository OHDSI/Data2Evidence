jQuery.sap.require('hc.hph.genomics.ui.lib.vb.overview.Track');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.overview.QuantitativeTrack');
hc.hph.genomics.ui.lib.vb.overview.Track.extend('hc.hph.genomics.ui.lib.vb.overview.QuantitativeTrack', {
    metadata: {
        properties: {
            height: {
                type: 'int',
                defaultValue: 5
            },
            attribute: {
                type: 'string',
                defaultValue: 'onco_Score'
            },
            level: {
                type: 'string',
                defaultValue: 'Variants'
            },
            aggregate: {
                type: 'string',
                defaultValue: 'max'
            },
            logScale: {
                type: 'string',
                defaultValue: ''
            }
        },
        aggregations: {
            legends: {
                type: 'sap.ui.core.Control',
                multiple: true
            }
        },
        defaultAggregation: "legends"
    },
    init: function () {
        hc.hph.genomics.ui.lib.vb.overview.Track.prototype.init.call(this);
        this.setAggregation('_standardLegend', new hc.hph.genomics.ui.lib.vb.StandardLegend());
        this.mBrowser = null;
    },
    getInitRequest: function () {
        var oData = this.getModel().getData();
        var params = this.getParameters();
        $.extend(params, { level: this.getProperty("level") }, { attr: this.getProperty("attribute") }, { aggr: this.getProperty("aggregate") }, this.getParameters(), { binSize: sap.ui.getCore().byId(this.getBrowser()).mArcBinSize });
        if (!$.isEmptyObject(oData)) {
            return {
                defaultData: oData,
                pluginFunction: this.getInitPlugin(),
                parameters: params,
                merge: false
            };
        } else {
            return {
                pluginFunction: this.getInitPlugin(),
                parameters: params,
                merge: false
            };
        }
    },
    draw: function () {
        var oData = this.getModel().getData();
        var qData = oData.quantitativeData;
        if (qData) {
            var oBrowser = sap.ui.getCore().byId(this.getBrowser());
            var oThis = this;
            var binSize = sap.ui.getCore().byId(this.getBrowser()).mArcBinSize;
            var oGroup = oBrowser.getChromosomeGroups().each(function (oChromosome, iChromosome) {
                var oChromosomeGroup = d3.select('#' + oThis.getId() + '-' + iChromosome);
                var chromosomeEnd = oChromosome.info.size;
                if (qData) {
                    var scores = qData[oChromosome.index];
                    if (scores) {
                        var aggrScore = oData.aggrScore[oChromosome.index] ? oThis.getLogValue(oData.aggrScore[oChromosome.index]) : 0;
                        var fMinValue = oThis.getMinValue() ? this.getMinValue() : 0;
                        var fMaxValue = oThis.getMaxValue() ? this.getMaxValue() : aggrScore;
                        var oRadiusScale = d3.scale.linear().domain([
                            0,
                            aggrScore
                        ]).range([
                            oThis.mOuterRadius,
                            oThis.mInnerRadius
                        ]);
                        if (oChromosomeGroup.empty()) {
                            oChromosomeGroup = d3.select(this).append('g').attr('id', oThis.getId() + '-' + iChromosome);
                        }
                        var oScores = oChromosomeGroup.selectAll("circle.quantitativeData").data(scores);
                        oScores.enter().append("circle").attr('class', 'quantitativeData').style('pointer-events', 'none').style("fill", oThis.getColor());
                        oScores.exit().remove();
                        oScores.attr("cx", function (oQData) {
                            return Math.cos(Math.PI / 2 - oChromosome.radialScale(oQData.binIndex * binSize)) * oRadiusScale(Math.min(fMaxValue, Math.max(fMinValue, oThis.getLogValue(oQData.score))));
                        }).attr("cy", function (oQData) {
                            return -Math.sin(Math.PI / 2 - oChromosome.radialScale(oQData.binIndex * binSize)) * oRadiusScale(Math.min(fMaxValue, Math.max(fMinValue, oThis.getLogValue(oQData.score))));
                        }).attr("r", "2");
                    }
                } else {
                    oChromosomeGroup.selectAll("circle.quantitativeData").remove();
                }
            });
            var aChromosomes = d3.range(0, sap.ui.getCore().byId(this.getBrowser()).mData.list.length - 1);
            for (var i = 0; i < aChromosomes.length; i++) {
                d3.select('#' + oThis.getId() + '-' + aChromosomes[i]).style('opacity', 0).transition().duration(500).style('opacity', 1);
            }
        }
    },
    _clearTrack: function (bAnimation) {
        var aChromosomes = d3.range(0, sap.ui.getCore().byId(this.getBrowser()).mData.list.length - 1);
        var oThis = this;
        if (bAnimation) {
            for (var i = 0; i < aChromosomes.length; i++) {
                d3.select('#' + oThis.getId() + '-' + aChromosomes[i]).transition().duration(250).style('opacity', 0).remove();
            }
        } else {
            for (var i = 0; i < aChromosomes.length; i++) {
                d3.select('#' + oThis.getId() + '-' + aChromosomes[i]).remove();
            }
        }
    },
    getLogValue: function (iNum) {
        var logScale = this.getLogScale();
        var logValue = iNum;
        var minus = "";
        if (iNum && logScale !== "") {
            if (logScale.charAt(0) === '-') {
                logScale = logScale.slice(1);
                minus = "-";
            }
            if (logScale === "log") {
                logValue = Math.log(iNum);
            } else if (logScale === 'log10') {
                logValue = Math.log10(iNum);
            } else if (logScale === 'log2') {
                logValue = Math.log2(iNum);
            }
            return minus + logValue;
        }
    }
});