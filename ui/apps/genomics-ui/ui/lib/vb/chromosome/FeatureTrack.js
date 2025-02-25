jQuery.sap.require('hc.hph.genomics.ui.lib.vb.chromosome.Track');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.chromosome.FeatureTrack');
hc.hph.genomics.ui.lib.vb.chromosome.Track.extend('hc.hph.genomics.ui.lib.vb.chromosome.FeatureTrack', {
    metadata: {
        properties: {
            type: {
                type: 'string',
                defaultValue: 'features'
            },
            name: {
                type: 'string',
                defaultValue: 'Features'
            },
            height: {
                type: 'int',
                defaultValue: 60
            },
            featureHeight: {
                type: 'int',
                defaultValue: 18
            },
            classes: {
                type: 'string',
                multiple: true
            }
        }
    },
    init: function () {
        hc.hph.genomics.ui.lib.vb.chromosome.Track.prototype.init.call(this);
    },
    renderer: {},
    redraw: function (oParameters) {
        if (this.mBackgroundContent.select('rect').empty()) {
            this.mBackgroundContent.append('rect').attr('x', 0).attr('y', 0).attr('width', '100%').style('fill', 'white').attr('height', this.getHeight());
        }
        if (!$.isEmptyObject(this.getModel().getData())) {
            this._alignFeatures(this.getModel().getData());
        }
        this._redraw();
    },
    _clear: function () {
        if (this.mDynamicContent) {
            this.mDynamicContent.selectAll('*').remove();
        }
    },
    getInitRequest: function () {
        this.mHasInitialData = false;
        return {
            pluginFunction: this.getInitPlugin(),
            isInit: true,
            parameters: {
                feat: this.getClasses(),
                begin: 0,
                end: sap.ui.getCore().byId(this.getBrowser()).mSelectedChromosome.size
            },
            //Always load all genes
            merge: false
        };
    },
    getUpdateRequest: function () {
        if (!$.isEmptyObject(this.getModel().getData()) && this.mHasInitialData) {
            return {};
        } else {
            return this.getInitRequest();
        }
    },
    triggerRedrawAfterPan: function () {
        //Trigger redraw after pan to align the gene names on the genes
        this.redraw();
    },
    _redraw: function () {
        var oThis = this;
        var oData = this.getModel().getData();
        if (oData.hasOwnProperty('message') && oData.message !== null) {
            this.mDynamicContent.selectAll('*').remove();
            var oText = this.mForegroundContent.selectAll('text.message').data([oData.message]);
            oText.enter().append('text').attr('class', 'message').attr('y', this.getHeight() / 2 + 4).attr('text-anchor', 'middle');
            oText.exit().remove();
            oText.attr('x', oThis.mWidth * oThis.mPxPerBp / 2).text(function (data) {
                return data;
            });
        } else if ($.isEmptyObject(oData)) {
            this.mDynamicContent.selectAll('*').remove();
        } else {
            this.mForegroundContent.selectAll('*').remove();
            var oShapesGroup = this.mDynamicContent.select('g.bg');
            if (oShapesGroup.empty()) {
                oShapesGroup = this.mDynamicContent.append('g').attr('class', 'bg');
            }
            var oShapes = oShapesGroup.selectAll('path').data(oData.features.filter(function (data) {
                return data.end > oThis.mBegin - oThis.mWidth && data.begin < oThis.mBegin + 2 * oThis.mWidth;
            }));
            oShapes.enter().append('path');
            oShapes.exit().remove();
            oShapes.attr('class', function (data) {
                return data.class;
            }).attr('d', function (data) {
                return oThis._generateFlatShape(data);
            }).attr('cursor', this.isInteractive() ? 'pointer' : null).attr('pointer-events', this.isInteractive() ? 'all' : null).style('fill', oThis.getColor()).on("click", function (oGene) {
                sap.ui.getCore().byId(oThis.getBrowser()).selectChromosome(null, oGene.begin, oGene.end - oGene.begin);
                d3.event.stopPropagation();
            });
            var oTextGroup = this.mDynamicContent.select('g.fg');
            if (oTextGroup.empty()) {
                oTextGroup = this.mDynamicContent.append('g').attr('class', 'fg');
            }
            var oText = oTextGroup.selectAll('text').data(oData.features.filter(function (data) {
                return data.name && (data.end - data.begin) * oThis.mPxPerBp > 100 && data.end > oThis.mBegin && data.begin < oThis.mBegin + oThis.mWidth;
            }));
            oText.enter().append('text');
            oText.exit().remove();
            oText.attr('text-anchor', function (data) {
                if (data.strand === '+') {
                    return 'begin';
                } else if (data.strand === '-') {
                    return 'end';
                } else {
                    return 'middle';
                }
            }).attr('x', function (data) {
                if (data.strand === '+') {
                    return oThis.mPositionScale(Math.max(data.begin, oThis.mBegin)) + 4;
                } else if (data.strand === '-') {
                    return oThis.mPositionScale(Math.min(data.end, oThis.mBegin + oThis.mWidth)) - 4;
                } else {
                    return oThis.mPositionScale(0.5 * (data.begin + data.end));
                }
            }).attr('y', function (data) {
                return (data.yIndex + 0.5) * (oThis.getFeatureHeight() + 2) + 1;
            }).text(function (data) {
                return data.name;
            });
        }
    },
    _generateRoundShape: function (oData, yIndex) {
        var fHeight = this.getFeatureHeight();
        var vBegin = (yIndex !== undefined ? yIndex : oData.yIndex) * (fHeight + 2) + 1;
        var vEnd = vBegin + fHeight;
        var hBegin = this.mPositionScale(oData.begin);
        var hEnd = this.mPositionScale(oData.end);
        var fCornerRadius = 0.5 * fHeight;
        if (hEnd - hBegin < 1) {
            return 'M' + hBegin + ',' + vBegin + 'V' + (vBegin + fHeight) + 'H' + (hBegin + 1) + 'V' + vBegin + 'Z';
        } else if (hEnd - hBegin < 2 * fCornerRadius) {
            return 'M' + hBegin + ',' + vBegin + 'V' + (vBegin + fHeight) + 'H' + hEnd + 'V' + vBegin + 'Z';
        } else {
            if (oData.strand === '+') {
                var fArrowPosition = hEnd - 0.75 * fHeight;
                return 'M' + hBegin + ',' + (vBegin + fCornerRadius) + 'C' + hBegin + ',' + vBegin + ',' + hBegin + ',' + vBegin + ',' + (hBegin + fCornerRadius) + ',' + vBegin + 'H' + (fArrowPosition - fCornerRadius) + 'C' + fArrowPosition + ',' + vBegin + ',' + fArrowPosition + ',' + vBegin + ',' + (fArrowPosition + 0.5 * (hEnd - fArrowPosition)) + ',' + (vBegin + 0.25 * fHeight) + 'C' + hEnd + ',' + (vBegin + 0.5 * fHeight) + ',' + hEnd + ',' + (vBegin + 0.5 * fHeight) + ',' + (fArrowPosition + 0.5 * (hEnd - fArrowPosition)) + ',' + (vBegin + 0.75 * fHeight) + 'C' + fArrowPosition + ',' + vEnd + ',' + fArrowPosition + ',' + vEnd + ',' + (fArrowPosition - fCornerRadius) + ',' + vEnd + 'H' + (hBegin + fCornerRadius) + 'C' + hBegin + ',' + vEnd + ',' + hBegin + ',' + vEnd + ',' + hBegin + ',' + (vEnd - fCornerRadius) + 'Z';
            } else if (oData.strand === '-') {
                fArrowPosition = hBegin + 0.75 * fHeight;
                return 'M' + (fArrowPosition + fCornerRadius) + ',' + vBegin + 'H' + (hEnd - fCornerRadius) + 'C' + hEnd + ',' + vBegin + ',' + hEnd + ',' + vBegin + ',' + hEnd + ',' + (vBegin + fCornerRadius) + 'V' + (vBegin + fHeight - fCornerRadius) + 'C' + hEnd + ',' + (vBegin + fHeight) + ',' + hEnd + ',' + (vBegin + fHeight) + ',' + (hEnd - fCornerRadius) + ',' + (vBegin + fHeight) + 'H' + (fArrowPosition + fCornerRadius) + 'C' + fArrowPosition + ',' + (vBegin + fHeight) + ',' + fArrowPosition + ',' + (vBegin + fHeight) + ',' + (fArrowPosition + 0.5 * (hBegin - fArrowPosition)) + ',' + (vBegin + 0.75 * fHeight) + 'C' + hBegin + ',' + (vBegin + 0.5 * fHeight) + ',' + hBegin + ',' + (vBegin + 0.5 * fHeight) + ',' + (fArrowPosition + 0.5 * (hBegin - fArrowPosition)) + ',' + (vBegin + 0.25 * fHeight) + 'C' + fArrowPosition + ',' + vBegin + ',' + fArrowPosition + ',' + vBegin + ',' + (fArrowPosition + fCornerRadius) + ',' + vBegin + 'Z';
            } else {
                return 'M' + hBegin + ',' + fCornerRadius + 'C' + hBegin + ',' + vBegin + ',' + hBegin + ',' + vBegin + ',' + (hBegin + fCornerRadius) + ',' + vBegin + 'H' + (hEnd - fCornerRadius) + 'C' + hEnd + ',' + vBegin + ',' + hEnd + ',' + vBegin + ',' + hEnd + ',' + (vBegin + fCornerRadius) + 'V' + (fHeight - fCornerRadius) + 'C' + hEnd + ',' + (vBegin + fHeight) + ',' + hEnd + ',' + (vBegin + fHeight) + ',' + (hEnd - fCornerRadius) + ',' + (vBegin + fHeight) + 'H' + (hBegin + fCornerRadius) + 'C' + hBegin + ',' + (vBegin + fHeight) + ',' + hBegin + ',' + (vBegin + fHeight) + ',' + hBegin + ',' + (vBegin + fHeight - fCornerRadius) + 'Z';
            }
        }
    },
    _generateFlatShape: function (oData, yIndex) {
        var iHeight = this.getFeatureHeight();
        var vBegin = (yIndex !== undefined ? yIndex : oData.yIndex) * (iHeight + 2) + 1;
        var vEnd = vBegin + iHeight;
        var hBegin = this.mPositionScale(oData.begin);
        var hEnd = this.mPositionScale(oData.end);
        var fArrowLength = 0.5 * iHeight;
        if (hEnd - hBegin < fArrowLength) {
            fArrowLength = hEnd - hBegin;
        }
        if (hEnd - hBegin < 1) {
            return 'M' + hBegin + ',' + vBegin + 'V' + vEnd + 'H' + (hBegin + 1) + 'V' + vBegin + 'Z';
        } else if (hEnd - hBegin <= fArrowLength) {
            if (oData.strand === '+') {
                var vMiddle = 0.5 * (vBegin + vEnd);
                return 'M' + hBegin + ',' + vBegin + 'L' + hEnd + ',' + vMiddle + 'L' + hBegin + ',' + vEnd + 'Z';
            } else if (oData.strand === '-') {
                var vMiddle = 0.5 * (vBegin + vEnd);
                return 'M' + hEnd + ',' + vBegin + 'L' + hBegin + ',' + vMiddle + 'L' + hEnd + ',' + vEnd + 'Z';
            } else {
                return 'M' + hBegin + ',' + vBegin + 'V' + vEnd + 'H' + hEnd + 'V' + vBegin + 'Z';
            }
        } else {
            if (oData.strand === '+') {
                var hArrow = hEnd - fArrowLength;
                var vMiddle = 0.5 * (vBegin + vEnd);
                return 'M' + hBegin + ',' + vBegin + 'H' + hArrow + 'L' + hEnd + ',' + vMiddle + 'L' + hArrow + ',' + vEnd + 'H' + hBegin + 'Z';
            } else if (oData.strand === '-') {
                var hArrow = hBegin + fArrowLength;
                var vMiddle = 0.5 * (vBegin + vEnd);
                return 'M' + hEnd + ',' + vBegin + 'H' + hArrow + 'L' + hBegin + ',' + vMiddle + 'L' + hArrow + ',' + vEnd + 'H' + hEnd + 'Z';
            } else {
                return 'M' + hBegin + ',' + vBegin + 'V' + vEnd + 'H' + hEnd + 'V' + vBegin + 'Z';
            }
        }
    },
    _alignFeatures: function (oData) {
        var yIndexStack = [];
        for (var featureIndex = 0; featureIndex < oData.features.length; ++featureIndex) {
            var oFeature = oData.features[featureIndex];
            for (oFeature.yIndex = 0; oFeature.yIndex < yIndexStack.length; ++oFeature.yIndex) {
                if (yIndexStack[oFeature.yIndex] <= oFeature.begin) {
                    yIndexStack[oFeature.yIndex] = oFeature.end;
                    break;
                }
            }
            if (oFeature.yIndex >= yIndexStack.length) {
                yIndexStack.push(oFeature.end);
            }
        }
    }
});