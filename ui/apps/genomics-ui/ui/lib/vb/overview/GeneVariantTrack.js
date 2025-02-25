jQuery.sap.require('hc.hph.genomics.ui.lib.vb.overview.Track');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.overview.GeneVariantTrack');
hc.hph.genomics.ui.lib.vb.overview.Track.extend('hc.hph.genomics.ui.lib.vb.overview.GeneVariantTrack', {
    metadata: {
        properties: {
            height: {
                type: 'int',
                defaultValue: 5
            },
            color: {
                type: 'string[]',
                defaultValue: ['#aaaaaa']
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
    draw: function () {
        var oThis = this;
        var oData = this.getModel().getData();
        if (oData && oData.genes) {
            var oBrowser = sap.ui.getCore().byId(this.getBrowser());
            var fMinValue = this.getMinValue() ? this.getMinValue() : 0;
            var fMaxValue = this.getMaxValue() ? this.getMaxValue() : 1;
            var binSize = sap.ui.getCore().byId(this.getBrowser()).mArcBinSize;
            var oRadiusScale = d3.scale.linear().domain([
                fMinValue,
                fMaxValue
            ]).range([
                this.mOuterRadius,
                this.mInnerRadius
            ]);
            var iTotalGeneNumber = 0;
            if (oBrowser.isConfigured()) {
                this.setProperty('color', oBrowser.getConfigColors(), true);
            }
            for (var i = 0; i < Object.keys(oData.genes).length; i++) {
                iTotalGeneNumber += oData.genes[Object.keys(oData.genes)[i]].length;
            }
            //Binning for every chromsome when there are more than 100 genes per chromosome in average
            if (iTotalGeneNumber / Object.keys(oData.genes).length > 100) {
                oBrowser.getChromosomeGroups().each(function (oChromosome, iChromosome) {
                    var oChromosomeGroup = d3.select('#' + oThis.getId() + '-' + iChromosome);
                    var chromosomeEnd = oChromosome.info.size;
                    var binCount = Math.ceil(chromosomeEnd / binSize);
                    var genes = oData.genes[oChromosome.index];
                    if (genes) {
                        //Do binning
                        var aBin = new Array(binCount);
                        for (var k = 0; k < aBin.length; k++) {
                            aBin[k] = [];
                        }
                        for (var i = 0; i < genes.length; i++) {
                            var center = Math.floor((genes[i].end + genes[i].begin) / 2);
                            var binNumber = Math.floor(center / binSize);
                            //Gets all objects which are in the current bin and belong to the same category
                            var aCurrentCategoryEntries = aBin[binNumber].filter(function (d) {
                                return d.category === genes[i].category;
                            });
                            var iCurrentFraction = 0;
                            //If there is an entry for the same group/category in the same bin, take tha max
                            if (!$.isEmptyObject(aCurrentCategoryEntries)) {
                                iCurrentFraction = Math.max(aCurrentCategoryEntries[0].fraction, genes[i].fraction);
                                aCurrentCategoryEntries[0].fraction = iCurrentFraction;
                            } else {
                                aBin[binNumber].push({
                                    category: genes[i].category,
                                    fraction: genes[i].fraction,
                                    y1: 0,
                                    bin: binNumber
                                });
                            }
                        }
                        //Fill array with plain objects instead of nested arrays and set y1 values
                        var aGenes = [];
                        for (var n = 0; n < aBin.length; n++) {
                            if (aBin[n] && aBin[n].length > 1) {
                                var aSortedCategory = aBin[n].sort(function (a, b) {
                                    return a.category - b.category;
                                });
                                for (var i = 0; i < aSortedCategory.length; i++) {
                                    if (i === 0) {
                                        aSortedCategory[i].y1 = 0;
                                    } else {
                                        aSortedCategory[i].y1 = aSortedCategory[i - 1].y1 + aSortedCategory[i - 1].fraction;
                                    }
                                }
                                for (var m = 0; m < aSortedCategory.length; m++) {
                                    aGenes.push(aBin[n][m]);
                                }
                            } else if (aBin[n][0]) {
                                aGenes.push(aBin[n][0]);
                            }
                        }
                        if (oChromosomeGroup.empty()) {
                            oChromosomeGroup = d3.select(this).append('g').attr('id', oThis.getId() + '-' + iChromosome);
                        }
                        var oArc = d3.svg.arc().outerRadius(function (oGene) {
                            return oRadiusScale(oGene.y1);
                        }).innerRadius(function (oGene) {
                            return oRadiusScale(oGene.y1 + oGene.fraction);
                        }).startAngle(function (oBin) {
                            return oChromosome.radialScale(oBin.bin * binSize);
                        }).endAngle(function (oBin) {
                            var binEnd = oBin.bin * binSize + binSize;
                            if (binEnd > chromosomeEnd) {
                                binEnd = chromosomeEnd;
                            }
                            return oChromosome.radialScale(binEnd);
                        });
                        oThis.appendPath(aGenes, oChromosomeGroup).attr("d", function (oBin) {
                            return oArc(oBin, oBin.bin);
                        });
                    } else {
                        //If there is not data, remove plot
                        oChromosomeGroup.selectAll("path.geneVariantDensity").remove();
                    }
                });
            } else {
                //No binning
                oBrowser.getChromosomeGroups().each(function (oChromosome, iChromosome) {
                    var genes = oData.genes[oChromosome.index];
                    var oChromosomeGroup = d3.select('#' + oThis.getId() + '-' + iChromosome);
                    if (genes) {
                        if (oChromosomeGroup.empty()) {
                            oChromosomeGroup = d3.select(this).append('g').attr('id', oThis.getId() + '-' + iChromosome);
                        }
                        if (oBrowser.isConfigured()) {
                            var aGroupedGenes = {};
                            for (var i = 0; i < genes.length; i++) {
                                if (aGroupedGenes[genes[i].gene]) {
                                    var iCategoryCount = aGroupedGenes[genes[i].gene].length;
                                    aGroupedGenes[genes[i].gene].push($.extend(genes[i], { y1: aGroupedGenes[genes[i].gene][iCategoryCount - 1].y1 + aGroupedGenes[genes[i].gene][iCategoryCount - 1].fraction }));
                                } else {
                                    aGroupedGenes[genes[i].gene] = [];
                                    aGroupedGenes[genes[i].gene].push($.extend(genes[i], { y1: 0 }));
                                }
                            }
                            var oArc = d3.svg.arc().outerRadius(function (oGene) {
                                return oRadiusScale(oGene.y1);
                            }).innerRadius(function (oGene) {
                                return oRadiusScale(oGene.y1 + oGene.fraction);
                            }).startAngle(function (oGene) {
                                return oChromosome.radialScale(oGene.begin);
                            }).endAngle(function (oGene) {
                                return oChromosome.radialScale(oGene.end);
                            });
                            oThis.appendPath(oData.genes[oChromosome.index], oChromosomeGroup).attr("d", function (oGene) {
                                return oArc(oGene);
                            });
                        } else {
                            var oArc = d3.svg.arc().outerRadius(oThis.mOuterRadius).innerRadius(function (oGene) {
                                return oRadiusScale(Math.min(fMaxValue, Math.max(fMinValue, oGene.fraction)));
                            }).startAngle(function (oGene) {
                                return oChromosome.radialScale(oGene.begin);
                            }).endAngle(function (oGene) {
                                return oChromosome.radialScale(oGene.end);
                            });
                            oThis.appendPath(oData.genes[oChromosome.index], oChromosomeGroup).attr("d", function (oGene) {
                                return oArc(oGene);
                            });
                        }
                    } else {
                        //If there is not data, remove plot
                        oChromosomeGroup.selectAll("path.geneVariantDensity").remove();
                    }    /*if (genes && Object.keys(genes).length < 100) {
        					if (oChromosomeGroup.empty()) {
        						oChromosomeGroup = d3.select(this)
        							.append('g')
        							.attr('id', oThis.getId() + '-' + iChromosome);
        					}
        					var oArc = d3.svg.arc()
        						.outerRadius(function(oGene) {
        							return oRadiusScale(oGene.y1 - oGene.fraction);
        						})
        						.innerRadius(function(oGene) {
        							return oRadiusScale(oGene.y1);
        						})
        						.startAngle(function(oGene) {
        							return oChromosome.radialScale(oGene.begin);
        						})
        						.endAngle(function(oGene) {
        							return oChromosome.radialScale(oGene.end);
        						});
        					oThis.appendPath(genes, oChromosomeGroup)
        						.attr("d", function(oGene) {
        						   // console.log(oGene);
        							return oArc(oGene);
        						})
        						.attr('value', function(oGene) {
        							return 'fraction: ' + oGene.fraction;
        						});
        				} else */
                });
            }
            //if( (iTotalGeneNumber / Object.keys( oData.genes ).length) >= 0  )
            /*if (oData.hasOwnProperty('genes')) {
    			if (oData.genes) {
    				var oGroup = oBrowser.getChromosomeGroups()
    					.each(
    						function(oChromosome, iChromosome) {
    							var oChromosomeGroup = d3.select('#' + oThis.getId() + '-' + iChromosome);
    							var chromosomeEnd = oChromosome.info.size;
    							var binCount = Math.ceil(chromosomeEnd / binSize);
    							var genes = oData.genes[iChromosome];
    							if (genes && genes.length < 100) {
    								if (oChromosomeGroup.empty()) {
    									oChromosomeGroup = d3.select(this)
    										.append('g')
    										.attr('id', oThis.getId() + '-' + iChromosome);
    								}
    								var oArc = d3.svg.arc()
    									.outerRadius(oThis.mOuterRadius)
    									.innerRadius(function(oGene) {
    										return oRadiusScale(Math.min(fMaxValue, Math.max(fMinValue, oGene.fraction)));
    									})
    									.startAngle(function(oGene) {
    										return oChromosome.radialScale(oGene.begin);
    									})
    									.endAngle(function(oGene) {
    										return oChromosome.radialScale(oGene.end);
    									});
    								oThis.appendPath(oData.genes[iChromosome], oChromosomeGroup)
    									.attr("d", function(oGene) {
    										return oArc(oGene);
    									});
    							} else if (genes && genes.length >= 100) {
    								var aBin = new Array(binCount);
    								if (Array.prototype.fill) {
    									aBin.fill(0);
    								} else {
    									for (var k = 0; k < aBin.length; k++) {
    										aBin[k] = 0;
    									}
    								}
    								for (var i = 0; i < genes.length; i++) {
    									var center = Math.floor((genes[i].end + genes[i].begin) / 2);
    									var binNumber = Math.floor(center / binSize);
    									aBin[binNumber] = Math.max(genes[i].fraction, aBin[binNumber]);
    								}
    								if (oChromosomeGroup.empty()) {
    									oChromosomeGroup = d3.select(this)
    										.append('g')
    										.attr('id', oThis.getId() + '-' + iChromosome);
    								}
    								var oArc = d3.svg.arc()
    									.outerRadius(oThis.mOuterRadius)
    									.innerRadius(function(oBin) {
    										return oRadiusScale(Math.min(fMaxValue, Math.max(fMinValue, oBin)));
    									})
    									.startAngle(function(oBin, iBin) {
    										return oChromosome.radialScale(iBin * binSize);
    									})
    									.endAngle(function(oBin, iBin) {
    										var binEnd = (iBin * binSize) + binSize;
    										if (binEnd > chromosomeEnd) {
    											binEnd = chromosomeEnd;
    										}
    										return oChromosome.radialScale(binEnd);
    									});
    								oThis.appendPath(aBin, oChromosomeGroup)
    									.attr("d", function(oBin, iBin) {
    										return oArc(oBin, iBin);
    									});
    							} else {
    								oChromosomeGroup.selectAll("path.geneVariantDensity")
    									.remove();
    							}
    						});
    				var aChromosomes = d3.range(0, sap.ui.getCore().byId(this.getBrowser()).mData.list.length - 1);
    				for (var i = 0; i < aChromosomes.length; i++) {
    					d3.select('#' + oThis.getId() + '-' + aChromosomes[i])
    						.style('opacity', 0)
    						.transition()
    						.duration(500)
    						.style('opacity', 1);
    				}
    
    			}
    		}*/
            var aChromosomes = d3.range(0, sap.ui.getCore().byId(this.getBrowser()).mData.list.length - 1);
            for (var i = 0; i < aChromosomes.length; i++) {
                d3.select('#' + oThis.getId() + '-' + aChromosomes[i]).style('opacity', 0).transition().duration(500).style('opacity', 1);
            }
        }
    },
    _clearTrack: function (bAnimation) {
        var aChromosomes = d3.range(0, sap.ui.getCore().byId(this.getBrowser()).mData.list.length);
        var oThis = this;
        if (bAnimation) {
            for (var i = 0; i < aChromosomes.length; i++) {
                d3.select('#' + oThis.getId() + '-' + aChromosomes[i]).transition().duration(250).style('opacity', 0).remove();
            }
        } else {
            for (var i = 0; i < aChromosomes.length; i++) {
                d3.select('#' + oThis.getId() + '-' + aChromosomes[i]).remove();
            }
        }
    },
    appendPath: function (oData, oChromosomeGroup) {
        var oThis = this;
        var oBrowser = sap.ui.getCore().byId(this.getBrowser());
        if (oData instanceof Array) {
            var oGenes = oChromosomeGroup.selectAll("path.geneVariantDensity").data(oData);
            oGenes.enter().append("path").attr('class', 'geneVariantDensity').style('pointer-events', 'none').style("fill", function (gene) {
                return gene.category !== undefined ? oBrowser.getCategoryColor(gene.category) : oThis.getColor();
            }).style("stroke", function (gene) {
                return gene.category !== undefined ? oBrowser.getCategoryColor(gene.category) : oThis.getColor();
            });
            oGenes.exit().remove();
            return oGenes;
        } else {
            var oGeneGroup = oChromosomeGroup.selectAll("g.geneVariantDensityGroup").data(Object.keys(oData), function (d) {
                return d;
            });
            oGeneGroup.enter().append('g').attr('class', 'geneVariantDensityGroup');
            oGeneGroup.exit().remove();
            var oGenes = oGeneGroup.selectAll('path.geneVariantDensity').data(function (geneName) {
                return oData[geneName];
            });
            oGenes.enter().append("path").attr('class', 'geneVariantDensity').style('pointer-events', 'none').style("fill", function (gene) {
                return gene.category !== undefined ? oBrowser.getCategoryColor(gene.category) : oThis.getColor();
            }).style("stroke", function (gene) {
                return gene.category !== undefined ? oBrowser.getCategoryColor(gene.category) : oThis.getColor();
            });
            return oGenes;
        }
    }
});