jQuery.sap.require('hc.hph.genomics.ui.lib.vb.overview.Center');
jQuery.sap.require('hc.hph.genomics.ui.lib.vb.GradientScaleLegend');
jQuery.sap.declare('hc.hph.genomics.internal.ui.lib.vb.overview.LDCenter');
hc.hph.genomics.ui.lib.vb.overview.Center.extend('hc.hph.genomics.internal.ui.lib.vb.overview.LDCenter', {
    init: function () {
        this.mBrowser = null;
        this.setModel(new sap.ui.model.json.JSONModel());
        this.mOverviewLeftSpace = 0.0;    //var oLegend = new hc.hph.genomics.ui.lib.vb.GradientScaleLegend();
                                          //this.addAggregation( 'legends',  oLegend, true );
    },
    getInitRequest: function () {
        var oData = this.getModel().getData();
        if (!$.isEmptyObject(oData)) {
            return { defaultData: oData };
        } else {
            return {
                pluginFunction: this.getInitPlugin(),
                parameters: this.getParameters(true),
                merge: false
            };
        }
    },
    triggerRedraw: function (overview) {
        //Draw linkage disequilibrium overview
        this.mLdChords = [];
        //Define colors and gradient
        this.mGradientColors = [
            '#007833',
            '#009DE0',
            '#ab218e'
        ];
        var oData = this.getModel().getData();
        var mBrowser = sap.ui.getCore().byId(this.getBrowser());
        this.mOverviewLeftSpace = mBrowser.mOverviewLeftSpace;
        this._clear();
        var values = oData.map(function (d) {
            return d.rvalue;
        });
        values.sort(function (a, b) {
            return a - b;
        });
        var aLdScaleValues = [
            d3.min(values),
            d3.median(values),
            d3.max(values)
        ];
        //Create color scale for LD-Values
        this.mLdColorScale = d3.scale.linear().domain(aLdScaleValues).range(this.mGradientColors);
        //Calculate begin und end angles for LD lines between chromosomes
        var aLayouts = mBrowser.mOverviewLayouts;
        for (var ldIndex = 0; ldIndex < oData.length; ++ldIndex) {
            var fnTargetScale = aLayouts[oData[ldIndex].index].radialScale;
            var fnSourceScale = aLayouts[oData[ldIndex].source.index].radialScale;
            if (fnSourceScale && fnTargetScale) {
                this.mLdChords.push({
                    value: oData[ldIndex].rvalue,
                    source: {
                        index: oData[ldIndex].source.index,
                        startAngle: fnSourceScale(oData[ldIndex].source.begin),
                        endAngle: fnSourceScale(oData[ldIndex].source.end)
                    },
                    target: {
                        index: oData[ldIndex].index,
                        startAngle: fnTargetScale(oData[ldIndex].begin),
                        endAngle: fnTargetScale(oData[ldIndex].end)
                    }
                });
            }
        }
        var oThis = this;
        //Draw lines betwen chromosomes
        this.mLines = d3.select(overview[0][0]).insert('g', 'g.fg').attr('class', 'sapUiGen-Center').classed('loading', mBrowser.mLoadingDataSets > 0).selectAll('path').data(this.mLdChords).enter().append('path').attr('d', d3.svg.chord().radius(mBrowser.mOverviewLeftSpace * mBrowser.mOverviewRadius - 20)).style('stroke', function (d) {
            return oThis.mLdColorScale(d.value);
        });
        this.mLines.style('opacity', 0).transition().duration(250).style('opacity', 0.8);
        //Draw update legend
        // aLegend = this.getLegends();
        var aScaleValues = [];
        aScaleValues.push(d3.min(values));
        aScaleValues.push(d3.median(values));
        aScaleValues.push(d3.max(values));    /*
        aLegend[0].setName( this.getName() );
        aLegend[0].setValues( aScaleValues );
        aLegend[0].setColors( this.mGradientColors );
        */
    },
    _clear: function () {
        d3.selectAll('g.sapUiGen-Center').remove();
    }
});