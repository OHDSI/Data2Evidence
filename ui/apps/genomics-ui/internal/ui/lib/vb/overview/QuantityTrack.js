jQuery.sap.require('hc.hph.genomics.ui.lib.vb.overview.Track');
jQuery.sap.declare('hc.hph.genomics.internal.ui.lib.vb.overview.QuantityTrack');
hc.hph.genomics.ui.lib.vb.overview.Track.extend('hc.hph.genomics.internal.ui.lib.vb.overview.QuantityTrack', {
    metadata: {
        properties: {
            height: {
                type: 'int',
                defaultValue: 5
            },
            color: {
                type: 'string',
                defaultValue: null
            },
            fillColor: {
                type: 'string',
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
    draw: function (oChromosomeGroups) {
        var oBrowser = sap.ui.getCore().byId(this.getBrowser());
        // list of all chromosomes
        var aLayouts = oBrowser.mOverviewLayouts;
        var bInitialized = this.mGroup !== undefined;
        if (bInitialized) {
            this.mGroup.remove();    //Remove paths, so the same path doesn't exist several times
        }
        var oThis = this;
        var fMinValue = this.getMinValue() ? this.getMinValue() : d3.min(d3.entries(this.getModel().getData()), function (oChromosomeData) {
            return d3.min(oChromosomeData.value, function (oData) {
                return oData.val;
            });
        });
        var fMaxValue = this.getMaxValue() ? this.getMaxValue() : d3.max(d3.entries(this.getModel().getData()), function (oChromosomeData) {
            return d3.max(oChromosomeData.value, function (oData) {
                return oData.val;
            });
        });
        console.log(fMinValue + " <= " + this.getParameters().quantity + " <= " + fMaxValue);
        var oQuantityScale = d3.scale.linear()    //Get the right array of variant density values by filtering on index for each item
                             // For the domain max value: Either take the maximum of the the data for this track or any given max value
.domain([
            fMinValue,
            fMaxValue
        ]).range([
            oThis.mOuterRadius,
            oThis.mInnerRadius
        ]);
        oBrowser.getChromosomeGroups().filter(function (oChromosome) {
            return !$.isEmptyObject(oThis.getModel().getData()[oChromosome.index]);
        }).each(function (oChromosome) {
            var oChromosomeGroup = d3.select(this);
            var oRadialLineGenerator = d3.svg.line.radial().interpolate('linear').radius(function (oData) {
                return oQuantityScale(Math.min(fMaxValue, Math.max(fMinValue, oData.val)));
            }).angle(function (oData) {
                return aLayouts[oChromosome.index].radialScale(oData.pos);
            });
            var sRadialLine = oRadialLineGenerator(oThis.getModel().getData()[oChromosome.index]);
            if (oThis.getFillColor()) {
                oChromosomeGroup.append("path").attr("class", oThis.getParameters().quantity + " area").attr("id", oThis.getId() + '-' + oChromosome.index + "-area").style("pointer-events", "none").style("stroke", oThis.getFillColor()).style("stroke-width", "0.2pt").style("fill", oThis.getFillColor()).attr("d", sRadialLine + oBrowser._completeWithArc(oChromosome.beginAngle, oChromosome.endAngle, oThis.mOuterRadius));
            }
            if (oThis.getColor()) {
                oChromosomeGroup.append("path").attr("class", oThis.getParameters().quantity + " line").attr("id", oThis.getId() + '-' + oChromosome.index + "-area").style("pointer-events", "none").style("stroke", oThis.getColor()).style("stroke-width", "0.2pt").style("fill", "none").attr("d", sRadialLine);
            }
        });
        var aChromosomes = d3.range(0, sap.ui.getCore().byId(this.getBrowser()).mData.list.length - 1);
        for (var i = 0; i < aChromosomes.length; i++) {
            if (oThis.getFillColor()) {
                d3.select('#' + oThis.getId() + '-' + aChromosomes[i] + "-area").style('opacity', 0).transition().duration(500).style('opacity', 1);
            }
            if (oThis.getColor()) {
                d3.select('#' + oThis.getId() + '-' + aChromosomes[i] + "-line").style('opacity', 0).transition().duration(500).style('opacity', 1);
            }
        }
    },
    _clearTrack: function (bAnimation) {
        var aChromosomes = d3.range(0, sap.ui.getCore().byId(this.getBrowser()).mData.list.length - 1);
        var oThis = this;
        if (bAnimation) {
            for (var i = 0; i < aChromosomes.length; i++) {
                d3.select('#' + oThis.getId() + '-' + aChromosomes[i] + "-area").transition().duration(250).style('opacity', 0).remove();
                d3.select('#' + oThis.getId() + '-' + aChromosomes[i] + "-line").transition().duration(250).style('opacity', 0).remove();
            }
        } else {
            for (var i = 0; i < aChromosomes.length; i++) {
                d3.select('#' + oThis.getId() + '-' + aChromosomes[i] + "-area").remove();
                d3.select('#' + oThis.getId() + '-' + aChromosomes[i] + "-line").remove();
            }
        }
    }
});