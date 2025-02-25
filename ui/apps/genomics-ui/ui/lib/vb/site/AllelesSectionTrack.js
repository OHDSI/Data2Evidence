sap.ui.define([
    "hc/hph/genomics/ui/lib/vb/site/SectionTrack",
    "hc/hph/genomics/ui/lib/vb/site/Details"
], function (SectionTrack, Details) {
    "use strict";
    var AllelesSectionTrack = SectionTrack.extend("hc.hph.genomics.ui.lib.vb.site.AllelesSectionTrack", {
        metadata: {
            properties: {
                alleles: {
                    type: 'object[]',
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
            SectionTrack.prototype.init.call(this);
            this.mDetails.alleles = new Details({});
            this.addDependent(this.mDetails.alleles);
        },
        clone: function () {
            var oClone = SectionTrack.prototype.clone.call(this);
            this.getTracks().forEach(function (oTrack) {
                oClone.addTrack(oTrack.clone());
            });
            return oClone;
        },
        // redirect tracks into alleles details
        getTracks: function () {
            return this.mDetails.alleles.getTracks();
        },
        addTrack: function (oTrack) {
            this.mDetails.alleles.addTrack(oTrack);
        },
        // implement control functionality
        renderer: {
            render: function (oRenderManager, oControl) {
                oRenderManager.write("<div");
                oRenderManager.addClass('sapMText');
                oRenderManager.addClass("sapUiGen-AllelesTrack-AllelesSection");
                oRenderManager.writeClasses();
                oRenderManager.writeControlData(oControl);
                oRenderManager.addStyle("display", oControl.getVisible() ? null : "none");
                oRenderManager.writeStyles();
                oRenderManager.write(">");
                // allele data
                oControl.getAlleles().forEach(function (oAllele) {
                    oRenderManager.write("<div");
                    oRenderManager.addClass('sapUiGen-AllelesTrack-Allele');
                    oRenderManager.writeClasses();
                    oRenderManager.write(">");
                    oRenderManager.write("<div>");
                    var aAllele = oAllele.sequence.split('');
                    for (var k = 0; k < aAllele.length; k++) {
                        oRenderManager.write("<div");
                        oRenderManager.addClass('sapUiGen-AlleleTrack-AlleleName');
                        oRenderManager.addClass(oAllele.type === "reference" ? "ref" : "alt");
                        oRenderManager.writeClasses();
                        oRenderManager.write(">");
                        oRenderManager.writeEscaped(aAllele[k]);
                        oRenderManager.write("</div>");    // AlleleName
                    }
                    oRenderManager.write("<div");
                    oRenderManager.addClass('sapUiGen-AlleleTrack-VariantType');
                    oRenderManager.writeClasses();
                    oRenderManager.write(">");
                    if (oAllele.type === "reference") {
                        oRenderManager.writeEscaped(oControl.getModel("i18n.vb").getResourceBundle().getText("common.referenceAllele"));
                    } else {
                        // logic to find inDel or others
                        var recommendation = oAllele.type;
                        var text;
                        if (recommendation === "subsVariant")
                            text = oControl.getModel("i18n.vb").getResourceBundle().getText("common.subsVariant");
                        else if (recommendation === "delVariant")
                            text = oControl.getModel("i18n.vb").getResourceBundle().getText("common.delVariant");
                        else if (recommendation === "insVariant")
                            text = oControl.getModel("i18n.vb").getResourceBundle().getText("common.insVariant");
                        else if (recommendation === "dupVariant")
                            text = oControl.getModel("i18n.vb").getResourceBundle().getText("common.dupVariant");
                        else if (recommendation === "indelFull" || recommendation === "MIXED")
                            text = oControl.getModel("i18n.vb").getResourceBundle().getText("common.indelFull");
                        else
                            text = "";
                        oRenderManager.writeEscaped(text);
                    }
                    oRenderManager.write("</div>");
                    // VariantType
                    oRenderManager.write("</div>");
                    // unnamed
                    if (oAllele.type === "reference") {
                        if (oAllele.aminoAcids.length > 0) {
                            oRenderManager.write("<div>");
                            oRenderManager.write("<div");
                            oRenderManager.addClass('sapUiGen-AlleleTrack-AminoName');
                            oRenderManager.addClass('ref');
                            oRenderManager.writeClasses();
                            oRenderManager.write(">");
                            oRenderManager.writeEscaped(oAllele.aminoAcids[0]["sequence3Char"]);
                            oRenderManager.write("</div>");
                            // RefAminoName
                            oRenderManager.write("<div");
                            oRenderManager.addClass('sapUiGen-AlleleTrack-MutationType');
                            oRenderManager.writeClasses();
                            oRenderManager.write(">");
                            oRenderManager.write(oControl.getModel("i18n.vb").getResourceBundle().getText("common.VBConfigRefAminoAcidAttr"));
                            oRenderManager.write("</div>");
                            // MutationType
                            oRenderManager.write("</div>");    // unnamed
                        }    // end reference allele data
                    }    // allele data
                    else {
                        for (var i = 0; i < oAllele.transcriptAnnotations.length; i++) {
                            oRenderManager.write("<div>");
                            oRenderManager.write("<div");
                            oRenderManager.addClass('sapUiGen-AlleleTrack-HGVS');
                            oRenderManager.writeClasses();
                            oRenderManager.write(">");
                            oRenderManager.writeEscaped(oAllele.transcriptAnnotations[i]);
                            oRenderManager.write("</div>");
                            // HGVS
                            oRenderManager.write("</div>");    // unnamed
                        }
                        for (i = 0; i < oAllele.aminoAcids.length; i++) {
                            oRenderManager.write("<div>");
                            oRenderManager.write("<div");
                            oRenderManager.addClass('sapUiGen-AlleleTrack-AminoName');
                            oRenderManager.addClass('alt');
                            oRenderManager.writeClasses();
                            oRenderManager.write(">");
                            oRenderManager.writeEscaped(oAllele.aminoAcids[i].sequence3Char);
                            oRenderManager.write("</div>");
                            oRenderManager.write("<div");
                            oRenderManager.addClass('sapUiGen-AlleleTrack-MutationType');
                            oRenderManager.writeClasses();
                            oRenderManager.write(">");
                            // logic required here//splice_acceptor_variant,nonsense
                            var mutationType = oAllele.aminoAcids[i].type;
                            var text = '';
                            if (mutationType === "splice_acceptor_variant")
                                text = oControl.getModel("i18n.vb").getResourceBundle().getText("common.splice_acceptor_variant");
                            else if (mutationType === "splice_donor_variant")
                                text = oControl.getModel("i18n.vb").getResourceBundle().getText("common.splice_donor_variant");
                            else if (mutationType === "frame_shift_truncation")
                                text = oControl.getModel("i18n.vb").getResourceBundle().getText("common.frame_shift_elongation");
                            else if (mutationType === "inframe_deletion")
                                text = oControl.getModel("i18n.vb").getResourceBundle().getText("common.inframe_deletion");
                            else if (mutationType === "inframe_insertion")
                                text = oControl.getModel("i18n.vb").getResourceBundle().getText("common.inframe_insertion");
                            else if (mutationType === "stop_lost")
                                text = oControl.getModel("i18n.vb").getResourceBundle().getText("common.stop_lost");
                            else if (mutationType === "start_lost")
                                text = oControl.getModel("i18n.vb").getResourceBundle().getText("common.start_lost");
                            else if (mutationType === "stop_retained_variant")
                                text = oControl.getModel("i18n.vb").getResourceBundle().getText("common.stop_retained_variant");
                            else if (mutationType === "synonymous_variant")
                                text = oControl.getModel("i18n.vb").getResourceBundle().getText("common.synonymous_variant");
                            else if (mutationType === "stop_gained")
                                text = oControl.getModel("i18n.vb").getResourceBundle().getText("common.stop_gained");
                            else if (mutationType === "intron_variant")
                                text = oControl.getModel("i18n.vb").getResourceBundle().getText("common.intron_variant");
                            else if (mutationType === "3_prime_UTR_variant")
                                text = oControl.getModel("i18n.vb").getResourceBundle().getText("common.3_prime_UTR_variant");
                            else if (mutationType === "5_prime_UTR_variant")
                                text = oControl.getModel("i18n.vb").getResourceBundle().getText("common.5_prime_UTR_variant");
                            else if (mutationType === "5_prime_UTR_premature_start_codon_variant")
                                text = oControl.getModel("i18n.vb").getResourceBundle().getText("common.5_prime_UTR_premature_start_codon_variant");
                            else if (mutationType === "start_codon")
                                text = oControl.getModel("i18n.vb").getResourceBundle().getText("common.start_codon");
                            else if (mutationType === "stop_codon")
                                text = oControl.getModel("i18n.vb").getResourceBundle().getText("common.stop_codon");
                            else if (mutationType === "five_prime_UTR")
                                text = oControl.getModel("i18n.vb").getResourceBundle().getText("common.five_prime_UTR");
                            else if (mutationType === "missense_variant")
                                text = oControl.getModel("i18n.vb").getResourceBundle().getText("common.missense_variant");
                            else if (mutationType === "nonsense_variant")
                                text = oControl.getModel("i18n.vb").getResourceBundle().getText("common.nonsense_variant");
                            else
                                text = "";
                            oRenderManager.writeEscaped(text);
                            oRenderManager.write("</div>");
                            // MutationType
                            oRenderManager.write("</div>");
                            // unnamed
                            for (var j = 0; j < oAllele.aminoAcids[i].proteinAnnotations.length; j++) {
                                oRenderManager.write("<div>");
                                oRenderManager.write("<div");
                                oRenderManager.addClass('sapUiGen-AlleleTrack-HGVS');
                                oRenderManager.writeClasses();
                                oRenderManager.write(">");
                                oRenderManager.writeEscaped(oAllele.aminoAcids[i].proteinAnnotations[j]);
                                oRenderManager.write("</div>");
                                // HGVS
                                oRenderManager.write("</div>");    // unnamed
                            }
                        }
                    }
                    oRenderManager.write("</div>");    // Allele
                });
                oRenderManager.write("</div>");    // AlleleSection
            }
        },
        onAfterRendering: function () {
            this.updateAlleles();
        },
        updateAlleles: function () {
            // to change the opacity of other div onclick
            $('.sapUiGen-AllelesTrack-Allele').on('click', function () {
                $('.sapUiGen-AllelesTrack-Allele').addClass('selected').removeClass('deselected');
                $('.sapUiGen-AllelesTrack-Allele').not(this).addClass('deselected').removeClass('selected');
            });
            var oThis = this;
            var oControl = d3.select("#" + this.getId());
            oControl.selectAll("div.sapUiGen-AllelesTrack-Allele").data(this.getAlleles()).on("click", function (oAllele, iAlleleIndex) {
                oThis.setDetails("alleles", iAlleleIndex);
            });    /*
			 * var oThis = this; var oControl = d3.select("#" + this.getId()); var oAlleles = oControl.selectAll("div.allele").data(this.getAlleles());
			 * oAlleles.enter().append("div").attr("class", "allele"); oAlleles.exit().remove(); oAlleles.text(function(oAllele) { return oAllele.name;
			 * }).on("click", function(oAllele, iAlleleIndex) { oThis.setDetails("alleles", iAlleleIndex); });
			 */
        }
    });
    return AllelesSectionTrack;
});