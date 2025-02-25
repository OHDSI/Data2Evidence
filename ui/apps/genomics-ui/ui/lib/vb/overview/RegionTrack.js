jQuery.sap.require('hc.hph.genomics.ui.lib.vb.overview.Track');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.overview.RegionTrack');
hc.hph.genomics.ui.lib.vb.overview.Track.extend('hc.hph.genomics.ui.lib.vb.overview.RegionTrack', {
    metadata: {
        properties: {
            height: {
                type: 'int',
                defaultValue: 10
            },
            classFilter: {
                type: 'string',
                defaultValue: null
            },
            min: {
                type: 'int',
                defaultValue: -2
            },
            max: {
                type: 'int',
                defaultValue: +2
            },
            minWidth: {
                type: 'int',
                defaultValue: 3
            },
            tickInterval: {
                type: 'int',
                defaultValue: null
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
        params.classFilter = this.getClassFilter();
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
                isInit: true,
                parameters: params,
                merge: false
            };
        }
    },
    draw: function () {
        var oData = this.getModel().getData();
        if (oData & oData.regions) {
            //get the Data from Backend
            var regionData = oData.regions;
            // define the space for regions to draw (inner and outer radius)
            var innerRadius = this.getMin();
            var outerRadius = this.getMax();
            var oBrowser = sap.ui.getCore().byId(this.getBrowser());
            var that = this;
            //get all chromosomes and go through all of them
            var chrGroup = oBrowser.getChromosomeGroups().each(function (chromosomeObject, chromosomeIndex) {
                var oChromosomeGroup = d3.select('#' + that.getId() + '-' + chromosomeIndex);
                if (oChromosomeGroup.empty()) {
                    oChromosomeGroup = d3.select(this).append('g').attr('id', that.getId() + '-' + chromosomeIndex);
                }
                var chromosomeEnd = chromosomeObject.info.size;
                //use the Data from backend
                if (regionData) {
                    var radiusScale = d3.scale.linear().domain([
                        innerRadius,
                        outerRadius
                    ]).range([
                        that.mOuterRadius,
                        that.mInnerRadius
                    ]);
                    var convertScore = function (oRegion) {
                        //calculate the y points and also take the regions that are outside of -2 and 2 area
                        return radiusScale(Math.min(outerRadius, Math.max(innerRadius, oRegion.score)));
                    };
                    var regionLines = oChromosomeGroup.selectAll('path.regionData').data(regionData && regionData.length > chromosomeIndex ? regionData[chromosomeIndex] : []);
                    regionLines.enter().append('path').attr('class', 'regionData').style('stroke', that.getColor());
                    var minAngularDistance = Math.PI / 180;
                    var oArc = d3.svg.arc().innerRadius(convertScore).outerRadius(convertScore).startAngle(function (interval) {
                        var angularDistance = chromosomeObject.radialScale(interval.end) - chromosomeObject.radialScale(interval.begin);
                        return angularDistance >= minAngularDistance ? chromosomeObject.radialScale(interval.begin) : chromosomeObject.radialScale(interval.begin) - 0.5 * (minAngularDistance - angularDistance);
                    }).endAngle(function (interval) {
                        var angularDistance = chromosomeObject.radialScale(interval.end) - chromosomeObject.radialScale(interval.begin);
                        return angularDistance >= minAngularDistance ? chromosomeObject.radialScale(interval.end) : chromosomeObject.radialScale(interval.end) + 0.5 * (minAngularDistance - angularDistance);
                    });
                    regionLines.attr('d', oArc);
                    regionLines.exit().remove();
                } else {
                    oChromosomeGroup.selectAll("path.regionData").remove();
                }
            });
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
            for (var j = 0; j < aChromosomes.length; j++) {
                d3.select('#' + oThis.getId() + '-' + aChromosomes[j]).remove();
            }
        }
    }
});