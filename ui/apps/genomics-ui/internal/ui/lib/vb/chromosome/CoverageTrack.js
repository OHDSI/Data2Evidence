jQuery.sap.require('hc.hph.genomics.ui.lib.vb.chromosome.Track');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.chromosome.CoverageTrack');
hc.hph.genomics.ui.lib.vb.chromosome.Track.extend('hc.hph.genomics.ui.lib.vb.chromosome.CoverageTrack', {
    metadata: {
        properties: {
            type: {
                type: 'string',
                defaultValue: 'coverage'
            },
            name: {
                type: 'string',
                defaultValue: 'Coverage'
            },
            height: {
                type: 'int',
                defaultValue: 32
            }
        }
    },
    init: function () {
    },
    renderer: {},
    _redraw: function (oParameters) {
        var oThis = this;
        var oPositionScale = this.mPositionScale;
        var oDensityScale = d3.scale.linear().domain(d3.extent(this.oData, function (data) {
            return data[1];
        })).range([
            this.getHeight(),
            0
        ]);
        var oDensityArea = d3.svg.area().interpolate('step-after').defined(function (data) {
            return data[1] > 0;
        }).x(function (data) {
            return oPositionScale(data[0]);
        }).y0(this.getHeight() / 2).y1(function (data) {
            return oDensityScale(data[1]);
        });
        var oDensityLine = d3.svg.line().interpolate('step-after').defined(function (data) {
            return data[1] > 0;
        }).x(function (data) {
            return oPositionScale(data[0]);
        }).y(function (data) {
            return oDensityScale(data[1]);
        });
        var oDensityAreaPath = this.mDynamicContent.selectAll('path.densityArea').data([this.oData]);
        oDensityAreaPath.enter().append('path').attr('class', 'densityArea').attr('d', oDensityArea).style('fill', oThis.getColor()).style('stroke', d3.rgb(oThis.getColor()).darker(2));
        oDensityAreaPath.exit().remove();
        oDensityAreaPath.attr('d', oDensityArea);
    },
    pan: function (oParameters) {
        this.redrawContent();
    },
    rescale: function (oParameters) {
        this.redrawContent();
    },
    _fullReload: function () {
        this.oData = this.mChromosome.density;
        this.redrawContent();
    }
});