jQuery.sap.require('hc.hph.genomics.ui.lib.vb.chromosome.Track');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.chromosome.QuantitativeTrack');
hc.hph.genomics.ui.lib.vb.chromosome.Track.extend('hc.hph.genomics.ui.lib.vb.chromosome.QuantitativeTrack', {
    metadata: {
        properties: {
            type: {
                type: 'string',
                defaultValue: 'quantitative'
            },
            height: {
                type: 'int',
                defaultValue: 20
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
        }
    },
    init: function () {
        hc.hph.genomics.ui.lib.vb.chromosome.Track.prototype.init.call(this);
    },
    renderer: {},
    getInitRequest: function () {
        var params = sap.ui.getCore().byId(this.getBrowser()).getAggregation('_chromosomeDetails').getChromosomeRequestParameters();
        $.extend(params, { level: this.getProperty("level") }, { attr: this.getProperty("attribute") }, { aggr: this.getProperty("aggregate") }, this.getParameters(), { binSize: this.getBinSize() === 0 ? Math.max(1, this.mPxPerBp) / this.mPxPerBp : this.getBinSize() / this.mPxPerBp });
        return {
            pluginFunction: this.getInitPlugin(),
            parameters: params,
            merge: false
        };
    },
    getUpdateRequest: function () {
        return this.getInitRequest();
    },
    redraw: function (oParameters) {
        var oData = this.getModel().getData();
        if (!$.isEmptyObject(oData.quantityData)) {
            var oThis = this;
            var aggrScore = this.getLogValue(oData.aggrScore);
            var iRadius = 2;
            var binSize = oData.binSize;
            var begin = oData.begin;
            this.mDynamicContent.selectAll("text.message").remove();
            var oScoreYScale = d3.scale.linear().domain([
                0,
                aggrScore
            ]).range([
                this.getHeight() - iRadius,
                iRadius
            ]);
            //  To adjust the circles within the viewport. As radius is 2 
            var oQuantitativeArea = this.mDynamicContent.selectAll('circle.quantitativeData').data(oData.quantityData);
            var circle = oQuantitativeArea.enter().append('circle').attr('class', 'quantitativeData').style('pointer-events', 'none').style('fill', oThis.getColor()).style('fill-opacity', 0.5);
            oQuantitativeArea.exit().remove();
            circle.attr("cx", function (oQData) {
                return oThis.mPositionScale(begin + oQData.binIndex * binSize) + oThis.mPxPerBp * 0.5;
            }).attr("cy", function (oQData) {
                return oScoreYScale(oThis.getLogValue(oQData.score));
            }).attr("r", iRadius);
        } else {
            this.mDynamicContent.selectAll("circle.quantitativeData").remove();
            this.mDynamicContent.selectAll("g.fg").remove();
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