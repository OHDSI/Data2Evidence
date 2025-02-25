jQuery.sap.require('hc.hph.genomics.ui.lib.vb.site.Track');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.site.GeneGroupTrack');
hc.hph.genomics.ui.lib.vb.site.Track.extend('hc.hph.genomics.ui.lib.vb.site.GeneGroupTrack', {
    metadata: {
        properties: {
            classes: {
                type: 'string',
                multiple: true
            }
        },
        aggregations: {
            menu: {
                type: "hc.hph.genomics.ui.lib.vb.site.Menu",
                multiple: false
            },
            _menu: {
                type: "hc.hph.genomics.ui.lib.vb.site.Menu",
                multiple: true
            }
        },
        defaultAggregation: "menu"
    },
    init: function () {
        hc.hph.genomics.ui.lib.vb.site.Track.prototype.init.apply(this);
    },
    renderer: {
        _renderContent: function (oRenderManager, oControl) {
            var oData = oControl.getModel().getData();
            if (oData.message) {
                var text = new sap.m.Text({ text: oControl.getModel("i18n.vb").getResourceBundle().getText(oData.message) });
                oRenderManager.renderControl(text);
            } else if ($.isEmptyObject(oData.geneGroup)) {
                oRenderManager.write('<span');
                oRenderManager.writeControlData(oControl);
                oRenderManager.addClass('sapMText');
                oRenderManager.writeClasses();
                oRenderManager.write('>  - </span>');
            } else {
                var oMenu = oControl.getAggregation("_menu");
                var iMenu = 0;
                for (var sKey in oData.geneGroup) {
                    oRenderManager.write('<div>');
                    if (oMenu[iMenu]) {
                        oRenderManager.renderControl(oMenu[iMenu]);
                    }
                    ++iMenu;
                    oRenderManager.write('<div');
                    oRenderManager.addClass('sapUiGen-GeneGroupSiteTrack-Cohorts');
                    oRenderManager.writeClasses();
                    oRenderManager.write('>');
                    var groupdata = oData.geneGroup[sKey].group;
                    if (groupdata.length === 0) {
                        //  if odata has no object
                        oRenderManager.write('<span');
                        oRenderManager.writeControlData(oControl);
                        oRenderManager.addClass('sapMText');
                        oRenderManager.writeClasses();
                        oRenderManager.write('>  - </span>');
                    } else {
                        for (var index = 0; index < groupdata.length; index++) {
                            var cohortname = groupdata[index].name;
                            //cohort
                            oRenderManager.write('<div');
                            oRenderManager.addClass('sapUiGen-GeneGroupSiteTrack-Cohort');
                            oRenderManager.writeClasses();
                            oRenderManager.write('>');
                            //for cohort
                            oRenderManager.write('<span');
                            oRenderManager.addClass('sapMText');
                            oRenderManager.addClass('sapUiGen-GeneGroupSiteTrack-Token');
                            oRenderManager.writeClasses();
                            oRenderManager.write('>');
                            oRenderManager.write(cohortname);
                            oRenderManager.write('</span>');
                            if (groupdata[index].affectedCount) {
                                var affectedCount = groupdata[index].affectedCount;
                                var totalCount = groupdata[index].totalCount;
                                var percentage = (affectedCount / totalCount * 100).toFixed(1);
                                //for count
                                oRenderManager.write('&nbsp;');
                                oRenderManager.write('<span');
                                oRenderManager.addClass('sapMText');
                                oRenderManager.addClass('sapUiGen-GeneGroupSiteTrack-Token');
                                oRenderManager.addClass('right');
                                oRenderManager.writeClasses();
                                oRenderManager.write('>');
                                oRenderManager.write(affectedCount);
                                oRenderManager.write('</span>&thinsp;/&thinsp;<span');
                                oRenderManager.addClass('sapMText');
                                oRenderManager.addClass('sapUiGen-GeneGroupSiteTrack-Token');
                                oRenderManager.addClass('right');
                                oRenderManager.writeClasses();
                                oRenderManager.write('>');
                                oRenderManager.write(totalCount);
                                oRenderManager.write('</span>');
                                //percentage
                                oRenderManager.write('&nbsp;(');
                                oRenderManager.write('<span');
                                oRenderManager.addClass('sapMText');
                                oRenderManager.addClass('sapUiGen-GeneGroupSiteTrack-Token');
                                oRenderManager.addClass('right');
                                oRenderManager.writeClasses();
                                oRenderManager.write('>');
                                oRenderManager.write(percentage);
                                oRenderManager.write('</span>%)');
                                //for icon
                                oRenderManager.write('&nbsp;');
                                oRenderManager.write('<span');
                                oRenderManager.addClass('sapMText');
                                oRenderManager.addClass('sapUiGen-GeneGroupSiteTrack-Token');
                                oRenderManager.writeClasses();
                                oRenderManager.write('>');
                                var icon = new sap.ui.core.Icon({
                                    src: "sap-icon://person-placeholder",
                                    color: "#666666"
                                });
                                icon.addStyleClass("patientIcon");
                                oRenderManager.renderControl(icon);
                                oRenderManager.write('</span>');
                            } else {
                                oRenderManager.write('&thinsp;&thinsp;&thinsp;&thinsp;<span');
                                oRenderManager.addClass('sapMText');
                                oRenderManager.writeClasses();
                                oRenderManager.write('>  - </span>');
                            }
                            oRenderManager.write('</div>');
                        }
                    }
                    oRenderManager.write('</div>');
                    oRenderManager.write('</div>');
                }
            }
        }
    },
    onBeforeRendering: function () {
        hc.hph.genomics.ui.lib.vb.site.Track.prototype.onBeforeRendering.apply(this);
        var oData = this.getModel().getData();
        if (oData.geneGroup) {
            for (var sKey in oData.geneGroup) {
                var oMenu = this.getAggregation("menu");
                if (oMenu) {
                    var menuTrack = oMenu.clone();
                    menuTrack.setModel(new sap.ui.model.json.JSONModel());
                    menuTrack.getModel().setData(oData.geneGroup[sKey]);
                    this.addAggregation("_menu", menuTrack);
                }
            }
        }
    },
    onAfterRendering: function () {
        // determine maximal width of gene button
        var iMaxButtonWidth = 0;
        this.$().find('button').each(function () {
            iMaxButtonWidth = Math.max(iMaxButtonWidth, $(this).width());
        });
        // set all button widths to the maximum value
        this.$().find('button').each(function () {
            $(this).css("width", iMaxButtonWidth + 1);
        });
        // determine maximal width of each token across cohorts
        var aMaxWidths = [];
        this.$().find('.sapUiGen-GeneGroupSiteTrack-Cohort').each(function () {
            $(this).children('.sapUiGen-GeneGroupSiteTrack-Token').each(function (iToken) {
                if (aMaxWidths.length <= iToken) {
                    aMaxWidths.push($(this).width());
                } else {
                    aMaxWidths[iToken] = Math.max(aMaxWidths[iToken], $(this).width());
                }
            });
        });
        // set all token widths to their maximum value
        this.$().find('.sapUiGen-GeneGroupSiteTrack-Cohort').each(function () {
            $(this).children('.sapUiGen-GeneGroupSiteTrack-Token').each(function (iToken) {
                $(this).css("width", aMaxWidths[iToken] + 1 + "px");
            });
        });
    }
});