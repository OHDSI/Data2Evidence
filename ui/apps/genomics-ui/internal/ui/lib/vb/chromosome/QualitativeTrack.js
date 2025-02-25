jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.chromosome.QualitativeTrack');
hc.hph.genomics.ui.lib.vb.chromosome.Track.extend('hc.hph.genomics.ui.lib.vb.chromosome.QualitativeTrack', {
    metadata: {
        properties: {
            type: {
                type: 'string',
                defaultValue: 'qualitativeFeatures'
            },
            name: {
                type: 'string',
                defaultValue: 'Qualitative Features'
            },
            height: {
                type: 'int',
                defaultValue: 32
            }
        },
        aggregations: {
            qualitativeFeatures: {
                type: 'hc.hph.genomics.ui.lib.vb.chromosome.QualitativeFeature',
                multiple: true
            }
        },
        associations: {
            browser: {
                type: 'hc.hph.genomics.ui.lib.VariantBrowser',
                multiple: false
            }
        },
        defaultAggregation: 'qualitativeFeatures'
    },
    init: function () {
        this.setModel(new sap.ui.model.json.JSONModel());
        this.mShowIcons = false;
        this.mFeatureDictionary = {};
        this.mIconCollectionName = 'sap-hc-hph-genomics';
        this.mIconHeight = 1;
    },
    renderer: {},
    onAfterRendering: function () {
        //Build up dictionary after sorting the list
        var features = this.getQualitativeFeatures().sort(function (a, b) {
            return a.getFeatureClass().localeCompare(b.getFeatureClass());
        });
        for (var i = 0; i < features.length; i++) {
            var oThis = this;
            var lastClassName = '';
            var featureList = [];
            var result = [];
            for (var i = 0; i < features.length; i++) {
                var className = features[i].getFeatureClass();
                var classValue = features[i].getFeatureValue();
                var icon = sap.ui.core.IconPool.getIconInfo(features[i].getIcon(), this.mIconCollectionName);
                var color = features[i].getColor();
                if (className == lastClassName) {
                    featureList.push({
                        featureValue: classValue,
                        icon: icon,
                        color: color
                    });
                    lastClassName = className;
                    continue;
                } else if (lastClassName == '') {
                    featureList.push({
                        featureValue: classValue,
                        icon: icon,
                        color: color
                    });
                    lastClassName = className;
                    continue;
                } else {
                    result.push({
                        className: lastClassName,
                        values: featureList
                    });
                    featureList = [];
                    featureList.push({
                        featureValue: classValue,
                        icon: icon,
                        color: color
                    });
                    lastClassName = className;
                }
            }
        }
        if (featureList.length > 0) {
            result.push({
                className: lastClassName,
                values: featureList
            });
        }
        var values = [];
        for (var i = 0; i < result.length; i++) {
            var iDict = {};
            for (var y = 0; y < result[i].values.length; y++) {
                var featureValue = result[i].values[y].featureValue;
                iDict[featureValue] = {
                    color: result[i].values[y].color,
                    icon: result[i].values[y].icon
                };
            }
            this.mFeatureDictionary[result[i].className] = iDict;
        }
    },
    pan: function (oParameters) {
        if (this.mBegin < this.mFirstBPLoaded + 0.5 * this.mWidth || this.mBegin > this.mFirstBPLoaded + 1.5 * this.mWidth) {
            this._fullReload();
        }
    },
    rescale: function (oParameters) {
        this._fullReload();
    },
    _fullReload: function () {
        this.mFirstBPLoaded = Math.floor(this.mBegin - this.mWidth);
        this.mIconHeight = this.getHeight() / this.getQualitativeFeatures().length - 1 > 30 ? 30 : this.getHeight() / this.getQualitativeFeatures().length - 1;
        var binSize = this.mIconHeight / this.mPxPerBp < 1 ? 1 : this.mIconHeight / this.mPxPerBp;
        //Check if track has sampleId. If this is not the case take the browsers' sampleId
        var id = this.getParameters();
        this.sampleId = id.type == 'sample' ? this.sampleId = id.id : this.sampleId = sap.ui.getCore().byId(this.getBrowser()).getParameters().id;
        this.request('/sap/hhp/gen/xs/getQualitativeFeatures.xsjs?chrom=' + this.mChromosomeIndex + '&sampleId=' + encodeURIComponent(this.sampleId) + '&begin=' + Math.floor(this.mBegin - this.mWidth) + '&end=' + Math.ceil(this.mBegin + 2 * this.mWidth) + '&classes=' + encodeURIComponent(this._getQualitativeClasses()) + '&binSize=' + binSize);
    },
    _redraw: function () {
        var oThis = this;
        var oData = this.getModel().getData();
        var outerSelection = this.mDynamicContent.selectAll('g').data(oData, function (d) {
            return d.position;
        });
        outerSelection.enter().append('g').attr('value', function (feature) {
            return feature.position;
        }).attr('transform', function (feature) {
            return 'translate(' + (oThis.mPositionScale(feature.position) + (oThis.mPxPerBp - oThis.mIconHeight) / 2) + ', ' + oThis.mIconHeight + ')';
        });
        outerSelection.exit().remove();
        outerSelection.transition().attr('transform', function (feature) {
            return 'translate(' + (oThis.mPositionScale(feature.position) + (oThis.mPxPerBp - oThis.mIconHeight) / 2) + ', ' + oThis.mIconHeight + ')';
        }).duration(100);
        var innerSelection = outerSelection.selectAll('g text').data(function (feature) {
            return feature.values;
        }, function (d) {
            return '' + d.featureClass + d.featureValue;
        });
        innerSelection.enter().append('text').text(function (value) {
            var fClass = oThis.mFeatureDictionary[value.featureClass];
            return fClass[value.featureValue].icon.content;
        }).style('font-family', function (value) {
            var fClass = oThis.mFeatureDictionary[value.featureClass];
            return fClass[value.featureValue].icon.fontFamily;
        }).attr('transform', function (d, i) {
            return 'translate(0,' + i * oThis.mIconHeight + ')';
        }).style('font-size', oThis.mIconHeight + 'px').style('fill', function (value) {
            var fClass = oThis.mFeatureDictionary[value.featureClass];
            return fClass[value.featureValue].color;
        });
        innerSelection.exit().remove();
        innerSelection.transition().attr('transform', function (d, i) {
            return 'translate(0,' + i * oThis.mIconHeight + ')';
        }).duration(100);
    },
    _getQualitativeClasses: function () {
        var classes = '';
        for (var key in this.mFeatureDictionary) {
            classes += key + ' (' + Object.keys(this.mFeatureDictionary[key]) + ');';
        }
        return classes.substring(0, classes.length - 1);
    }
});