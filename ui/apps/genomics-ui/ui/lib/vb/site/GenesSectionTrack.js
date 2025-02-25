sap.ui.define([
    "hc/hph/genomics/ui/lib/vb/site/SectionTrack",
    "hc/hph/genomics/ui/lib/vb/site/Details",
    "sap/ui/core/ResizeHandler"
], function (SectionTrack, Details, ResizeHandler) {
    "use strict";
    var GenesSectionTrack = SectionTrack.extend("hc.hph.genomics.ui.lib.vb.site.GenesSectionTrack", {
        metadata: {
            properties: {
                genes: {
                    type: "object[]",
                    defaultValue: []
                }
            },
            aggregations: {
                tracks: {
                    type: "hc.hph.genomics.ui.lib.vb.site.DetailsTrack",
                    multiple: true
                }
            },
            defaultAggregation: "tracks"
        },
        init: function () {
            var oThis = this;
            SectionTrack.prototype.init.call(this);
            this.mDetails.genes = new Details({});
            this.addDependent(this.mDetails.genes);
            this.mResizeTimer = null;
            this.mResizeHandlerID = null;
            sap.ui.getCore().attachInit(function () {
                oThis.mResizeHandlerID = ResizeHandler.register(oThis, function () {
                    if (this.iWidth > 0 && this.iHeight > 0) {
                        clearTimeout(oThis.mResizeTimer);
                        oThis.mResizeTimer = setTimeout(function () {
                            oThis.updateWidth();
                            oThis.mResizeTimer = null;
                        }, 50);
                    }
                });
            });
        },
        exit: function () {
            if (this.mResizeTimer) {
                clearTimeout(this.mResizeTimer);
            }
            if (this.mResizeHandlerID) {
                sap.ui.core.ResizeHandler.deregister(this.mResizeHandlerID);
            }
            if (SectionTrack.prototype.exit) {
                SectionTrack.prototype.exit.call(this);
            }
        },
        clone: function () {
            var oClone = SectionTrack.prototype.clone.call(this);
            this.getTracks().forEach(function (oTrack) {
                oClone.addTrack(oTrack.clone());
            });
            return oClone;
        },
        // redirect tracks into genes details
        getTracks: function () {
            return this.mDetails.genes.getTracks();
        },
        addTrack: function (oTrack) {
            this.mDetails.genes.addTrack(oTrack);
        },
        renderer: {
            render: function (oRenderManager, oControl) {
                oRenderManager.write("<div");
                oRenderManager.addClass('sapMText');
                oRenderManager.addClass("sapUiGen-GenesTrack-GenesSection");
                oRenderManager.writeClasses();
                oRenderManager.writeControlData(oControl);
                oRenderManager.addStyle("display", oControl.getVisible() ? null : "none");
                oRenderManager.writeStyles();
                oRenderManager.write(">");
                //gene data
                oControl.getGenes().forEach(function (oGene) {
                    oRenderManager.write("<div");
                    oRenderManager.addClass('sapUiGen-GenesTrack-Gene');
                    oRenderManager.writeClasses();
                    oRenderManager.write(">");
                    oRenderManager.write("<div><div");
                    oRenderManager.addClass('sapUiGen-GenesTrack-GeneName');
                    oRenderManager.writeClasses();
                    oRenderManager.write(">");
                    oRenderManager.writeEscaped(oGene.name);
                    oRenderManager.write("</div></div>");
                    oRenderManager.write("<div");
                    oRenderManager.addClass('sapUiGen-GenesTrack-GeneContent');
                    oRenderManager.writeClasses();
                    oRenderManager.write(">");
                    if (oGene.description) {
                        oRenderManager.write("<div");
                        oRenderManager.addClass('sapUiGen-GenesTrack-GeneDescription');
                        oRenderManager.writeClasses();
                        oRenderManager.write(">");
                        oRenderManager.writeEscaped(oGene.description);
                        oRenderManager.write("</div>");
                    }
                    if (oGene.aliases && oGene.aliases.length > 0) {
                        oRenderManager.write("<div");
                        oRenderManager.addClass('sapUiGen-GenesTrack-Aliases');
                        oRenderManager.writeClasses();
                        oRenderManager.write(">(");
                        oRenderManager.writeEscaped(oGene.aliases.join(", "));
                        oRenderManager.write(")</div>");
                    }
                    oRenderManager.write("</div>");
                    //end of  gene data
                    oRenderManager.write("</div>");
                });
                //last div
                oRenderManager.write("</div>");
            }
        },
        updateWidth: function () {
            // determine maximal width of genename inside div 
            var iMaxButtonWidth = 0;
            this.$().find('.sapUiGen-GenesTrack-GeneName').each(function () {
                iMaxButtonWidth = Math.max(iMaxButtonWidth, $(this).width());
            });
            // set all genename  widths to the maximum value of div
            this.$().find('.sapUiGen-GenesTrack-GeneName').each(function () {
                $(this).css("width", iMaxButtonWidth + 1);
            });
            //to change the opacity of other div onclick
            $('.sapUiGen-GenesTrack-Gene').on('click', function () {
                $('.sapUiGen-GenesTrack-Gene').addClass('selected').removeClass('deselected');
                $('.sapUiGen-GenesTrack-Gene').not(this).addClass('deselected').removeClass('selected');
            });
            var oThis = this;
            var oControl = d3.select("#" + this.getId());
            var oGenenNameClass = oControl.selectAll("div.sapUiGen-GenesTrack-Gene").data(this.getGenes()).on("click", function (oGene, iGeneIndex) {
                oThis.setDetails("genes", iGeneIndex);
            });
            oGenenNameClass.exit().remove();
        }
    });
    return GenesSectionTrack;
});