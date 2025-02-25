jQuery.sap.require('hc.hph.genomics.ui.lib.vb.chromosome.Track');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.chromosome.RegionTrack');
hc.hph.genomics.ui.lib.vb.chromosome.Track.extend('hc.hph.genomics.ui.lib.vb.chromosome.RegionTrack', {
    metadata: {
        properties: {
            type: {
                type: 'string',
                defaultValue: 'regions'
            },
            name: {
                type: 'string',
                defaultValue: 'Regions'
            },
            height: {
                type: 'int',
                defaultValue: 60
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
            },
            sampleSpecific: {
                type: 'boolean',
                defaultValue: true
            }
        }
    },
    init: function () {
        hc.hph.genomics.ui.lib.vb.chromosome.Track.prototype.init.call(this);
    },
    renderer: {},
    redraw: function () {
        var oData = this.getModel().getData();
        var oThis = this;
        // use these variables from properties above
        var min = this.getMin();
        var max = this.getMax();
        var tickInterval = this.getTickInterval();
        var minWidth = this.getMinWidth();
        var linearScale = d3.scale.linear().domain([
            min,
            max
        ])    // to make the space for line on the borders in case its position is exatly in the middle
.range([
            oThis.getHeight() - 1,
            1
        ]);
        var convertScore = function (oRegion) {
            //calculate the y points and also take the regions that are outside of -2 and 2 area
            return linearScale(Math.min(max, Math.max(min, oRegion.score)));
        };
        var tickLines = oThis.mBackgroundContent.selectAll("line.tick").data(tickInterval ? d3.range(Math.ceil(min / tickInterval) * tickInterval, (Math.floor(max / tickInterval) + 1) * tickInterval, tickInterval) : [0]);
        tickLines.enter().append("line").attr("class", "tick");
        tickLines.classed("zero", function (fTick) {
            return tickInterval ? Math.abs(fTick) < tickInterval / 2 : true;
        }).attr("x1", "0").attr("x2", "100%").attr("y1", function (fTick) {
            return linearScale(fTick);
        }).attr("y2", function (fTick) {
            return linearScale(fTick);
        });
        tickLines.exit().remove();
        var regionLines = oThis.mDynamicContent.selectAll('line.regionData')    // expression in the begining helps to avoid loading the UI before the data. Data comes first
.data($.isEmptyObject(oData) ? [] : oData.regions);
        regionLines.enter().append('line').attr('class', 'regionData')    // color defined in regionTrack in xml file of variantBrowser
.style('stroke', this.getColor());
        //define the coordinates for line (region)
        regionLines.attr("x1", function (oRegion) {
            return (oRegion.end - oRegion.begin) * oThis.mPxPerBp < minWidth ? oThis.mPositionScale((oRegion.begin + oRegion.end) / 2) - minWidth / 2 : oThis.mPositionScale(oRegion.begin);
        }).attr("x2", function (oRegion) {
            return (oRegion.end - oRegion.begin) * oThis.mPxPerBp < minWidth ? oThis.mPositionScale((oRegion.begin + oRegion.end) / 2) + minWidth / 2 : oThis.mPositionScale(oRegion.end);
        }).attr("y1", convertScore).attr("y2", convertScore);
        regionLines.exit().remove();
        //select the data for regions outside of the region area (in order to draw triangles on them)
        var regionMinMaxIndicators = oThis.mDynamicContent.selectAll('path.indicator').data($.isEmptyObject(oData) ? [] : oData.regions.filter(function (oRegion) {
            return oRegion.score > max || oRegion.score < min;
        }));
        regionMinMaxIndicators.enter().append('path').attr('class', 'indicator').style('fill', this.getColor());
        regionMinMaxIndicators.attr('d', function (oRegion) {
            var begin = (oRegion.end - oRegion.begin) * oThis.mPxPerBp < minWidth ? oThis.mPositionScale((oRegion.begin + oRegion.end) / 2) - minWidth / 2 : oThis.mPositionScale(oRegion.begin);
            var end = (oRegion.end - oRegion.begin) * oThis.mPxPerBp < minWidth ? oThis.mPositionScale((oRegion.begin + oRegion.end) / 2) + minWidth / 2 : oThis.mPositionScale(oRegion.end);
            if (oRegion.score > max) {
                //define coordinates (the path to draw the line) for upper triangles with sides 4px
                return 'M' + begin + ',' + linearScale(max) + 'l-3,5.2h6Z' + 'M' + end + ',' + linearScale(max) + 'l-3,5.2h6Z';
            } else {
                //define coordinates (the path to draw the line) for lower triangles with sides 4px
                return 'M' + begin + ',' + linearScale(min) + 'l-3,-5.2h6Z' + 'M' + end + ',' + linearScale(min) + 'l-3,-5.2h6Z';
            }
        });
        regionMinMaxIndicators.exit().remove();
    },
    getInitRequest: function () {
        this.mHasInitialData = false;
        var params = sap.ui.getCore().byId(this.getBrowser()).getAggregation('_chromosomeDetails').getChromosomeRequestParameters();
        params.begin = Math.max(Math.floor(this.mBegin - 2 * this.mWidth), 0);
        params.end = Math.ceil(this.mBegin + 3 * this.mWidth);
        params.classFilter = this.getClassFilter();
        params.sampleSpecific = this.getSampleSpecific();
        return {
            pluginFunction: this.getInitPlugin(),
            isInit: true,
            parameters: params,
            merge: false
        };
    },
    getUpdateRequest: function () {
        return this.getInitRequest();
    }
});