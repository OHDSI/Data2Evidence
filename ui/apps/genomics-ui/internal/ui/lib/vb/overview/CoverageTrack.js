jQuery.sap.require('hc.hph.genomics.ui.lib.vb.overview.Track');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.overview.CoverageTrack');
var BioInfError = $.import("hc.hph.genomics.services", "error").BioInfError;
hc.hph.genomics.ui.lib.vb.overview.Track.extend('hc.hph.genomics.ui.lib.vb.overview.CoverageTrack', {
    metadata: {
        properties: {
            height: {
                type: 'int',
                defaultValue: 5
            }
        }
    },
    init: function () {
        this.mBrowser = null;
        this.setModel(new sap.ui.model.json.JSONModel());
        this.mHeight = this.getHeight();
    },
    loadAndDraw: function (oChromosomeGroups, oBrowser) {
        this.mBrowser = oBrowser;
        var oThis = this;
        //Load data
        hc.hph.genomics.ui.lib.Utils.ajax({
            url: '/sap/hhp/gen/xs/getCoverageOverview.xsjs?binSize=' + Math.floor(oThis.browser.mArcBinSize),
            dataType: 'json'
        }).done(function (oData) {
            oThis.getModel().setData(oData);
            oThis.draw(oChromosomeGroups);
        }).fail(function (oResponse, sStatus) {
            oThis.mBrowser.setBusy(false);
            throw new BioInfError("error.RetrievingInformation", [
                "coverage",
                oResponse.responseText
            ]);
        });
    },
    draw: function (oChromosomeGroups) {
        var mBrowser = sap.ui.getCore().byId(this.getBrowser());
        // calculate radii
        var gaps = (mBrowser.indexOfOverviewTrack(this.sId) + 1) * mBrowser.getOverviewGapSize();
        this.innerRadius = mBrowser.mOverviewRadius * (mBrowser.mOuterTrackRadius - gaps - this.getHeight() / 100 - mBrowser.getTrackHeightSum(this.sId)) - 20;
        this.outerRadius = mBrowser.mOverviewRadius * (mBrowser.mOuterTrackRadius - gaps - mBrowser.getTrackHeightSum(this.sId)) - 20;
        // list of all chromosomes
        var aLayouts = mBrowser.mOverviewLayouts;
        var oThis = this;
        var oDensityScale = d3.scale.linear().domain([
            -1,
            +1
        ]).range([
            this.outerRadius,
            this.innerRadius
        ]);
        // draw inner grid line
        oChromosomeGroups.append('path').attr('class', 'grid').attr('d', function (item) {
            return sap.ui.getCore().byId(oThis.getBrowser())._generateArc(item.beginAngle, item.endAngle, oThis.innerRadius);
        }).style('opacity', 0).transition().duration(800).style('opacity', 0.6);
        // draw center grid line
        oChromosomeGroups.append('path').attr('class', 'grid').attr('d', function (item) {
            return sap.ui.getCore().byId(oThis.getBrowser())._generateArc(item.beginAngle, item.endAngle, (oThis.innerRadius + oThis.outerRadius) / 2);
        }).style('opacity', 0).transition().duration(800).style('opacity', 0.6);
        // draw outer grid line
        oChromosomeGroups.append('path').attr('class', 'grid').attr('d', function (item) {
            return sap.ui.getCore().byId(oThis.getBrowser())._generateArc(item.beginAngle, item.endAngle, oThis.outerRadius);
        }).style('opacity', 0).transition().duration(800).style('opacity', 0.6);
        // draw area
        oChromosomeGroups.filter(function (oItem) {
            return !$.isEmptyObject(oThis.getModel().getData()[oItem.index]);
        }).append('path').attr('class', 'coverageArea').attr('d', function (item) {
            var oDensityLine = d3.svg.line.radial().interpolate('linear')    //.defined( function ( data ) { return ( data[ 1 ] >= -1 ) && ( data[ 1 ] <= +1 ); } )
.radius(function (data) {
                return oDensityScale(Math.min(+1, Math.max(-1, data[1])));
            }).angle(function (data) {
                return aLayouts[item.index].radialScale(data[0]);
            });
            return oDensityLine(oThis.getModel().getData()[item.index]) + sap.ui.getCore().byId(oThis.getBrowser())._completeWithArc(item.beginAngle, item.endAngle, oThis.outerRadius);
        }).style('opacity', 0).transition().duration(800).style('opacity', 0.6);
        // draw area line
        oChromosomeGroups.filter(function (oItem) {
            return !$.isEmptyObject(oThis.getModel().getData()[oItem.index]);
        }).append('path').attr('class', 'coverage').attr('d', function (item) {
            var oDensityLine = d3.svg.line.radial().interpolate('linear').defined(function (data) {
                return data[1] >= -1 && data[1] <= +1;
            }).radius(function (data) {
                return oDensityScale(Math.min(+1, Math.max(-1, data[1])));
            }).angle(function (data) {
                return aLayouts[item.index].radialScale(data[0]);
            });
            return oDensityLine(oThis.getModel().getData()[item.index]);
        }).style('opacity', 0).transition().duration(800).style('opacity', 0.6);
    }
});