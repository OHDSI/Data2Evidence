sap.ui.define([
    "hc/hph/genomics/ui/lib/vb/site/SectionTrack",
    "hc/hph/genomics/ui/lib/vb/site/Details",
    "sap/ui/core/ComponentContainer"
], function (SectionTrack, Details, ComponentContainer) {
    "use strict";
    var SamplesSectionTrack = SectionTrack.extend("hc.hph.genomics.ui.lib.vb.site.SamplesSectionTrack", {
        metadata: {
            properties: {
                splitPlugin: {
                    type: "string",
                    defaultValue: null
                },
                sampleGroups: {
                    type: "object[]",
                    defaultValue: []
                },
                showEmptySections: {
                    type: "boolean",
                    defaultValue: false
                },
                alwaysShowSections: {
                    type: "boolean",
                    defaultValue: false
                },
                warning: {
                    type: "any",
                    defaultValue: null
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
            this.mDetails.sampleGroups = new Details({});
            this.addDependent(this.mDetails.sampleGroups);
            this.mGenderIcon = {
                "m": "\u2642",
                "h": "\u2642",
                "f": "\u2640",
                "w": "\u2640"
            };
            this.mPatientSummary = null;
        },
        clone: function () {
            var oClone = SectionTrack.prototype.clone.call(this);
            this.getTracks().forEach(function (oTrack) {
                oClone.addTrack(oTrack.clone());
            });
            return oClone;
        },
        // redirect tracks into samples details
        getTracks: function () {
            return this.mDetails.sampleGroups.getTracks();
        },
        addTrack: function (oTrack) {
            this.mDetails.sampleGroups.addTrack(oTrack);
        },
        // accessor for info message
        getWarningMessage: function () {
            var oWarning = this.getWarning();
            if (oWarning) {
                var sText = null;
                if (oWarning.key) {
                    sText = this.getModel("i18n.vb").getResourceBundle().getText(oWarning.key, oWarning.parameters);
                    if (sText === oWarning.key) {
                        sText = null;
                    }
                }
                return sText ? sText : this.getModel("i18n.vb").getResourceBundle().getText("error.Unknown");
            } else {
                return null;
            }
        },
        // implement control functionality
        renderer: {
            render: function (oRenderManager, oControl) {
                oRenderManager.write("<div");
                oRenderManager.addClass("sapUiGen-SamplesSectionTrack-Patients");
                oRenderManager.addClass("sapUiForm");
                oRenderManager.addClass("sapUiRLContainer");
                oRenderManager.addClass("sapMText");
                oRenderManager.writeClasses();
                oRenderManager.writeControlData(oControl);
                oRenderManager.addStyle("display", oControl.getVisible() ? null : "none");
                oRenderManager.writeStyles();
                oRenderManager.write(">");
                this.renderTitle(oRenderManager, oControl.getTitle());
                if (oControl.getError()) {
                    oRenderManager.write("<div");
                    oRenderManager.addClass("sapMText");
                    oRenderManager.addClass("message");
                    oRenderManager.addClass("error");
                    oRenderManager.writeClasses();
                    oRenderManager.write(">");
                    oRenderManager.writeEscaped(oControl.getErrorMessage());
                    oRenderManager.write("</div>");
                } else {
                    if (oControl.getWarning()) {
                        oRenderManager.write("<div");
                        oRenderManager.addClass("sapMText");
                        oRenderManager.addClass("message");
                        oRenderManager.addClass("info");
                        oRenderManager.writeClasses();
                        oRenderManager.write(">");
                        oRenderManager.writeEscaped(oControl.getWarningMessage());
                        oRenderManager.write("</div>");
                    }
                    oControl.getSampleGroups().forEach(function (oSampleGroup) {
                        if ((oControl.getSampleGroups().length > 1 || oControl.getAlwaysShowSections()) && (oSampleGroup.patients.length > 0 || oControl.getShowEmptySections())) {
                            this.renderSection(oRenderManager, oSampleGroup.name);
                        }
                        if (oSampleGroup.patients && oSampleGroup.patients.length > 0) {
                            oSampleGroup.patients.forEach(function (oPatient) {
                                oRenderManager.write("<div");
                                oRenderManager.addClass("sapUiGen-SamplesSectionTrack-Patient");
                                oRenderManager.addClass("sapMText");
                                oRenderManager.writeClasses();
                                oRenderManager.write(">");
                                // write name
                                oRenderManager.write("<a");
                                oRenderManager.addClass("sapMLnk");
                                oRenderManager.addClass("sapMLnkSubtle");
                                oRenderManager.writeClasses();
                                oRenderManager.write(">");
                                if (oPatient.lastName && oPatient.firstName) {
                                    oRenderManager.writeEscaped(oPatient.lastName);
                                    oRenderManager.write(",&nbsp;");
                                    oRenderManager.writeEscaped(oPatient.firstName);
                                } else if (oPatient.lastName) {
                                    oRenderManager.writeEscaped(oPatient.lastName);
                                } else if (oPatient.firstName) {
                                    oRenderManager.writeEscaped(oPatient.firstName);
                                } else {
                                    oRenderManager.write("?");
                                }
                                oRenderManager.write("</a>");
                                // write birth date
                                if (oPatient.birthDate) {
                                    oRenderManager.write(" (\u2217&thinsp;");
                                    oRenderManager.writeEscaped(new Date(oPatient.birthDate).toLocaleDateString());
                                }
                                // write gender icon
                                if (oPatient.gender) {
                                    oRenderManager.write(oPatient.birthDate ? ", " : " (");
                                    oRenderManager.writeEscaped(oControl.mGenderIcon[oPatient.gender[0].toLowerCase()] ? oControl.mGenderIcon[oPatient.gender[0].toLowerCase()] : oPatient.gender);
                                }
                                if (oPatient.birthDate || oPatient.gender) {
                                    oRenderManager.write(")");
                                }
                                // write sample information
                                oPatient.samples.forEach(function (oSample) {
                                    oRenderManager.write("<div");
                                    oRenderManager.addClass("sapUiGen-SamplesSectionTrack-Sample");
                                    oRenderManager.addClass("sapMText");
                                    oRenderManager.writeClasses();
                                    oRenderManager.write(">");
                                    // write sample class
                                    oRenderManager.writeEscaped(oSample.sampleClass ? oSample.sampleClass : "?");
                                    // write sample date
                                    if (oSample.date) {
                                        oRenderManager.write(" (");
                                        oRenderManager.writeEscaped(new Date(oSample.date).toLocaleString());
                                        oRenderManager.write(")");
                                    }
                                    // write genotype
                                    if (oSample.alleles) {
                                        oRenderManager.write("<br/>");
                                        // write reference genotype
                                        if (oSample.reference) {
                                            oSample.alleles.forEach(function (oAllele, iAllele) {
                                                if (iAllele > 0) {
                                                    oRenderManager.write("&thinsp;/&thinsp;");
                                                }
                                                oRenderManager.write("<span");
                                                oRenderManager.addClass("allele");
                                                oRenderManager.writeClasses();
                                                oRenderManager.write(">");
                                                oSample.reference.split("").forEach(function (oBase) {
                                                    oRenderManager.write("<span>");
                                                    oRenderManager.writeEscaped(oBase);
                                                    oRenderManager.write("</span>");
                                                });
                                                oRenderManager.write("</span>");
                                            });
                                        }
                                        // write alternative allele
                                        if (oSample.alleles.filter(function (oAllele) {
                                                return oAllele !== oSample.reference;
                                            }).length > 0) {
                                            if (oSample.reference) {
                                                oRenderManager.write("&thinsp;&rarr;&thinsp;");
                                            }
                                            oSample.alleles.forEach(function (sAllele, iAlleleIndex) {
                                                if (iAlleleIndex > 0) {
                                                    oRenderManager.write("&thinsp;/&thinsp;");
                                                }
                                                oRenderManager.write("<span");
                                                oRenderManager.addClass("allele");
                                                oRenderManager.writeClasses();
                                                oRenderManager.write(">");
                                                sAllele.split("").forEach(function (sBase, iBaseIndex) {
                                                    oRenderManager.write("<span");
                                                    if (iBaseIndex >= oSample.reference.length || sBase !== oSample.reference[iBaseIndex]) {
                                                        oRenderManager.addClass("alt");
                                                    }
                                                    oRenderManager.writeClasses();
                                                    oRenderManager.write(">");
                                                    oRenderManager.writeEscaped(sBase);
                                                    oRenderManager.write("</span>");
                                                });
                                                oSample.reference.substring(sAllele.length).split("").forEach(function () {
                                                    oRenderManager.write("<span");
                                                    oRenderManager.addClass("alt");
                                                    oRenderManager.writeClasses();
                                                    oRenderManager.write(">-</span>");
                                                });
                                                oRenderManager.write("</span>");
                                            });
                                        }
                                    }
                                    oRenderManager.write("</div>");    // Sample
                                });
                                oRenderManager.write("</div>");    // Patient
                            });
                        } else if ((oControl.getSampleGroups().length > 1 || oControl.getAlwaysShowSections()) && (oSampleGroup.patients.length > 0 || oControl.getShowEmptySections())) {
                            oRenderManager.write("<div");
                            oRenderManager.addClass("sapMText");
                            oRenderManager.addClass("message");
                            oRenderManager.addClass("info");
                            oRenderManager.writeClasses();
                            oRenderManager.write(">");
                            oRenderManager.writeEscaped(oControl.getModel("i18n.vb").getResourceBundle().getText("siteTrack.NoSamplesFound"));
                            oRenderManager.write("</div>");
                        }
                    }, this);
                }
                oRenderManager.write("</div>");    // Patients
            }
        },
        onAfterRendering: function () {
            this.updateSamples();
        },
        updateSamples: function () {
            // to change the opacity of other div onclick
            var oControls = this.$().find(".sapUiGen-SamplesSectionTrack-Sample");
            oControls.on("click", function () {
                oControls.addClass("selected").removeClass("deselected");
                oControls.not(this).addClass("deselected").removeClass("selected");
            });
            var oThis = this;
            d3.select("#" + this.getId()).selectAll("div.sapUiGen-SamplesSectionTrack-Sample").on("click", function (oSample, iSampleIndex) {
                oThis.setDetails("sampleGroups", iSampleIndex);
            });
            d3.select("#" + this.getId()).selectAll(".sapUiGen-SamplesSectionTrack-Patient > a").data(this.getSampleGroups().reduce(function (aPatients, oSampleGroup) {
                return aPatients.concat(oSampleGroup.patients);
            }, [])).on("click", function (oPatient) {
                var oComponentContainer = oThis.getPatientSummary().getContent()[0].getContent()[0];
                if (oComponentContainer.getComponentInstance()) {
                    oComponentContainer.getComponentInstance().setPatientId(oPatient.patientDWID);
                } else {
                    oThis.getPatientSummary().getModel().setProperty("/settings/patientId", oPatient.patientDWID);
                }
                oThis.getPatientSummary().getContent()[0].open();
            });
        },
        getParameters: function () {
            return { splitPlugin: this.getSplitPlugin() };
        },
        getPatientSummary: function () {
            if (!this.mPatientSummary) {
                this.mPatientSummary = sap.ui.xmlview({
                    viewName: "hc.hph.genomics.ui.lib.vb.site.PatientSummary",
                    viewData: this
                });
                this.addDependent(this.mPatientSummary);
            }
            return this.mPatientSummary;
        }
    });
    return SamplesSectionTrack;
});