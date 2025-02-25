jQuery.sap.require('hc.hph.genomics.ui.lib.vb.chromosome.Track');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.chromosome.QualitativeTrack');
hc.hph.genomics.ui.lib.vb.chromosome.Track.extend('hc.hph.genomics.ui.lib.vb.chromosome.QualitativeTrack', {
    metadata: {
        properties: {
            type: {
                type: 'string',
                defaultValue: 'qualitative'
            },
            height: {
                type: 'int',
                defaultValue: 50
            }
        }
    },
    init: function () {
        hc.hph.genomics.ui.lib.vb.chromosome.Track.prototype.init.call(this);
    },
    renderer: {},
    getInitRequest: function () {
        var params = sap.ui.getCore().byId(this.getBrowser()).getAggregation('_chromosomeDetails').getChromosomeRequestParameters();
        $.extend(params, this.getParameters(), { binSize: this.getBinSize() === 0 ? Math.max(1, this.mPxPerBp) / this.mPxPerBp : this.getBinSize() / this.mPxPerBp });
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
            oMutationAreaPath.enter().append('g').attr('class', 'mutationData').attr('transform', function (data) {
                var x = oThis.mPositionScale(0.5 * (data.begin + data.end)) + oThis.mPxPerBp * 0.5;
                var y = oSampleYScale(data.fraction) - maxHeight * 0.5;
                return 'translate(' + x + ',' + y + ')';
            });
            oMutationAreaPath.exit().remove();
            oMutationAreaPath.attr('cursor', this.isInteractive() ? function (oGene) {
                return oGene.begin === oGene.end ? 'cell' : 'pointer';
            } : null).attr('pointer-events', this.isInteractive() ? 'all' : null).on("click", function (oGroup) {
                if (oGroup.begin === oGroup.end) {
                    sap.ui.getCore().byId(oThis.getBrowser()).showPositionInformation(oGroup.begin);
                } else {
                    sap.ui.getCore().byId(oThis.getBrowser()).selectChromosome(null, oGroup.begin - (oGroup.end - oGroup.begin) * 0.05, (oGroup.end - oGroup.begin) * 1.1);
                }
                d3.event.stopPropagation();
            });
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
            this.mDynamicContent.selectAll("path.qualitativeData").remove();
            this.mDynamicContent.selectAll("g.mutationData").remove();
            this.mDynamicContent.selectAll("g.fg").remove();
        }
    }
});