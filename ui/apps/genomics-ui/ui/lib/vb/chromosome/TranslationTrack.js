jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.chromosome.FeatureTrack');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.chromosome.TranslationTrack');
hc.hph.genomics.ui.lib.vb.chromosome.FeatureTrack.extend('hc.hph.genomics.ui.lib.vb.chromosome.TranslationTrack', {
    metadata: {
        properties: {
            type: {
                type: 'string',
                defaultValue: 'translations'
            },
            name: {
                type: 'string',
                defaultValue: 'Translations'
            },
            height: {
                type: 'int',
                defaultValue: 160
            },
            featureHeight: {
                type: 'int',
                defaultValue: 18
            }
        }
    },
    renderer: {},
    triggerRedrawAfterPan: function () {
    },
    redraw: function (oParameters) {
        var oData;
        if (this.getModel().getData().data) {
            oData = this.getModel().getData().data;
        } else {
            oData = this.getModel().getData();
        }
        var oInterval = {
            begin: Math.max(Math.floor(this.mBegin - 2 * this.mWidth), 0),
            end: Math.ceil(this.mBegin + 3 * this.mWidth)
        };
        if (this.mBackgroundContent.select('rect').empty()) {
            this.mBackgroundContent.append('rect').attr('x', 0).attr('y', 0).attr('width', '100%').attr('height', this.getHeight());
        }
        if (!oData.hasOwnProperty('message') && !$.isEmptyObject(oData)) {
            this._alignTranslations(oData);
            oData.interval = oInterval;
            this.getModel().setData(oData);
        }
        this._redraw();
    },
    getInitRequest: function () {
        this.mHasInitialData = false;
        if (this.mPxPerBp > 1e-4) {
            return {
                pluginFunction: this.getDataPlugin(),
                isInit: true,
                parameters: {
                    trans: this.mPxPerBp >= 4 ? "1" : "",
                    begin: Math.max(Math.floor(this.mBegin - 2 * this.mWidth), 0),
                    end: Math.ceil(this.mBegin + 3 * this.mWidth)
                },
                merge: false
            };
        } else {
            return {
                isInit: true,
                defaultData: { message: this.getModel("i18n.vb").getResourceBundle().getText("info.ZoomInForDetails") },
                merge: false
            };
        }
    },
    getUpdateRequest: function () {
        return this.getInitRequest();
    },
    _clear: function () {
        if (this.mDynamicContent) {
            this.mDynamicContent.selectAll('*').remove();
            this.getModel().setData([]);
        }
    },
    _redraw: function () {
        var oThis = this;
        var oData;
        if (this.getModel().getData().data) {
            oData = this.getModel().getData().data;
        } else {
            oData = this.getModel().getData();
        }
        if (oData.hasOwnProperty('message') && oData.message !== null) {
            this.mDynamicContent.selectAll('*').remove();
            var oText = this.mForegroundContent.selectAll('text.message').data([oData.message]);
            oText.enter().append('text').attr('class', 'message').attr('y', this.getHeight() / 2 + 4).attr('text-anchor', 'middle');
            oText.exit().remove();
            oText.attr('x', oThis.mWidth * oThis.mPxPerBp / 2).text(function (data) {
                return data;
            });
        } else if ($.isEmptyObject(oData)) {
            this.mForegroundContent.selectAll('*').remove();
        } else {
            this.mForegroundContent.selectAll('*').remove();
            // group by gene
            var oGeneGroups = this.mDynamicContent.selectAll('g.gene').data(oData.filter(function (oGene) {
                return oGene.translations && oGene.translations.length > 0;
            }));
            oGeneGroups.enter().append('g').attr('class', 'gene');
            oGeneGroups.exit().remove();
            oGeneGroups.attr('transform', function (oGene) {
                return 'translate(0,' + oGene.yIndex * (oThis.getFeatureHeight() + 2) + ')';
            });
            // group by translation
            var oTranslationGroups = oGeneGroups.selectAll('g.trans').data(function (oGene) {
                return oGene.translations;
            });
            oTranslationGroups.enter().append('g').attr('class', 'trans');
            oTranslationGroups.exit().remove();
            oTranslationGroups.attr('transform', function (oTranslation, iIndex) {
                return 'translate(0,' + iIndex * (oThis.getFeatureHeight() + 2) + ')';
            });
            // draw splice lines
            oTranslationGroups.each(function (oTranslation) {
                var aSpliceLines = [];
                for (var iIndex = 1; iIndex < oTranslation.segments.length; ++iIndex) {
                    var oPrevious = oTranslation.segments[iIndex - 1];
                    var oNext = oTranslation.segments[iIndex];
                    if (oPrevious.end < oNext.begin) {
                        aSpliceLines.push({
                            begin: oPrevious.end,
                            end: oNext.begin
                        });
                    }
                }
                var oSpliceLines = d3.select(this).selectAll('path.splice').data(aSpliceLines);
                oSpliceLines.enter().append('path').attr('class', 'splice').style('stroke', '#777777');
                oSpliceLines.exit().remove();
                oSpliceLines.attr('d', function (oSpliceLine) {
                    return 'M' + oThis.mPositionScale(oSpliceLine.begin) + ',' + oThis.getFeatureHeight() / 2 + 'L' + oThis.mPositionScale((oSpliceLine.begin + oSpliceLine.end) / 2) + ',1L' + oThis.mPositionScale(oSpliceLine.end) + ',' + oThis.getFeatureHeight() / 2;
                });
            });
            // draw segments
            var oSegments = oTranslationGroups.selectAll('path.region').data(function (oTranslation) {
                return oTranslation.segments.filter(function (oSegment) {
                    return !oSegment.sequence || oThis.mPxPerBp < 4 || oSegment.phase === undefined;
                });
            });
            oSegments.enter().append('path');
            oSegments.exit().remove();
            oSegments.attr('class', function (oSegment) {
                return oSegment.hasOwnProperty('phase') ? 'region CDS' : 'region UTR';
            }).attr('d', function (oSegment) {
                return oThis._generateFlatShape(oSegment, 0);
            }).attr('cursor', this.isInteractive() ? 'pointer' : null).attr('pointer-events', this.isInteractive() ? 'all' : null).style('fill', function (oSegment) {
                return oSegment.hasOwnProperty('phase') ? oThis.getColor() : '#777777';
            }).on("click", function (oSegment) {
                sap.ui.getCore().byId(oThis.getBrowser()).selectChromosome(null, oSegment.begin, oSegment.end - oSegment.begin);
                d3.event.stopPropagation();
            });
            // draw amino acids
            var oExons = oTranslationGroups.selectAll('g.exon').data(function (oTranslation) {
                return oTranslation.segments.filter(function (oSegment) {
                    return oSegment.sequence && oSegment.phase !== undefined;
                });
            });
            oExons.enter().append('g').attr('class', 'exon');
            oExons.exit().remove();
            oExons.each(function (oExon) {
                var oGroups = d3.select(this).selectAll('g').data(oThis.mPxPerBp >= 4 ? oExon.sequence : '');
                var oGroupsEnter = oGroups.enter().append('g');
                oGroupsEnter.append('rect').attr('y', 1).attr('height', oThis.getFeatureHeight());
                oGroupsEnter.append('text').attr('y', 0.5 * (oThis.getFeatureHeight() + 2) + 1);
                oGroups.exit().remove();
                oGroups.select('rect').attr('x', function (aLabel, iIndex) {
                    if (iIndex === 0 && oExon.phase > 0) {
                        return oThis.mPositionScale(oExon.begin) + 1;
                    } else {
                        return oThis.mPositionScale((oExon.phase ? oExon.begin + oExon.phase - 3 : oExon.begin) + 3 * iIndex) + 1;
                    }
                }).attr('width', function (aLabel, iIndex) {
                    if (iIndex === 0 && oExon.phase > 0) {
                        return oExon.phase * oThis.mPxPerBp > 2 ? oExon.phase * oThis.mPxPerBp - 2 : 0;
                    } else if (iIndex === oExon.sequence.length - 1 && (oExon.end - oExon.begin - oExon.phase) % 3 > 0) {
                        return (oExon.end - oExon.begin - oExon.phase) % 3 * oThis.mPxPerBp > 2 ? (oExon.end - oExon.begin - oExon.phase) % 3 * oThis.mPxPerBp - 2 : 0;
                    } else {
                        return 3 * oThis.mPxPerBp > 2 ? 3 * oThis.mPxPerBp - 2 : 0;
                    }
                }).style('fill', oThis.getColor());
                oGroups.select('text').attr('x', function (aLabel, iIndex) {
                    if (iIndex === 0 && oExon.phase > 0) {
                        return oThis.mPositionScale(oExon.begin + 0.5 * oExon.phase);
                    } else if (iIndex === oExon.sequence.length - 1 && (oExon.end - oExon.begin - oExon.phase) % 3 > 0) {
                        return oThis.mPositionScale(0.5 * (oExon.begin + oExon.phase + 3 * (oExon.phase ? iIndex - 1 : iIndex) + oExon.end));
                    } else {
                        return oThis.mPositionScale(oExon.begin + oExon.phase + 3 * (oExon.phase ? iIndex - 0.5 : iIndex + 0.5));
                    }
                }).text(function (aLabel) {
                    return aLabel === '.' ? '\u25a0' : aLabel;
                });
            });
            // add protein names
            if (this.mPxPerBp > 1e-2) {
                oGeneGroups.each(function (oGene) {
                    var oProteinNames = d3.select(this).selectAll('text.name').data(oGene.translations);
                    oProteinNames.enter().append('text').attr('class', 'name');
                    oProteinNames.exit().remove();
                    oProteinNames.attr('text-anchor', oGene.strand === '-' ? 'start' : 'end').attr('x', function (oTranslation) {
                        return oGene.strand === '-' ? oThis.mPositionScale(oTranslation.segments[oTranslation.segments.length - 1].end) + 5 : oThis.mPositionScale(oTranslation.segments[0].begin) - 5;
                    }).attr('y', function (oTranslation, iIndex) {
                        return (iIndex + 0.5) * (oThis.getFeatureHeight() + 2) + 1;
                    }).text(function (oTranslation) {
                        return oTranslation.name + ' (' + oTranslation.protein + ')';
                    });
                });
            } else {
                oGeneGroups.selectAll('text.name').remove();
            }
        }
    },
    _alignTranslations: function (oData) {
        var aYIndexStack = [];
        var iYIndex;
        var iYIndexMax;
        var iGeneIndex;
        for (iGeneIndex = 0; iGeneIndex < oData.length; ++iGeneIndex) {
            var oGene = oData[iGeneIndex];
            oGene.yIndex = 0;
            iYIndex = -1;
            while (iYIndex < oGene.yIndex) {
                iYIndex = oGene.yIndex;
                iYIndexMax = Math.min(aYIndexStack.length, iYIndex + oGene.translations.length);
                while (iYIndex < iYIndexMax) {
                    if (aYIndexStack[iYIndex] <= oGene.begin) {
                        ++iYIndex;
                    } else {
                        oGene.yIndex = iYIndex + 1;
                        break;
                    }
                }
            }
            iYIndexMax = Math.min(aYIndexStack.length, oGene.yIndex + oGene.translations.length);
            for (iYIndex = oGene.yIndex; iYIndex < iYIndexMax; ++iYIndex) {
                /*
				if ( aYIndexStack[ iYIndex ] > oGene.begin )
				{
					console.error( aYIndexStack[ iYIndex ] + ' > ' + oGene.begin );
				}
				*/
                aYIndexStack[iYIndex] = oGene.end;
            }
            iYIndexMax = oGene.yIndex + oGene.translations.length;
            while (aYIndexStack.length < iYIndexMax) {
                aYIndexStack.push(oGene.end);
            }
        }
    }
});