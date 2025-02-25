sap.ui.define(["hc/hph/genomics/ui/lib/vb/site/DetailsTrack"], function (DetailsTrack) {
    "use strict";
    var CohortStatsDetailsTrack = DetailsTrack.extend("hc.hph.genomics.ui.lib.vb.site.CohortStatsDetailsTrack", {
        metadata: {
            properties: {
                statistics: {
                    type: "object[]",
                    defaultValue: []
                }
            },
            aggregations: {
                content: {
                    type: "sap.ui.core.Control",
                    multiple: true
                }
            },
            defaultAggregation: "content"
        },
        renderer: {
            render: function (oRenderManager, oControl) {
                oRenderManager.write("<div");
                oRenderManager.writeControlData(oControl);
                oRenderManager.addClass("sapUiGen-SiteDetailsTrack-CohortStats");
                oRenderManager.addClass("sapUiForm");
                oRenderManager.writeClasses();
                oRenderManager.write(">");
                this.renderTitle(oRenderManager, oControl.getTitle());
                oControl.getStatistics().forEach(function (oStatistics) {
                    var percentage = (oStatistics.affectedCount / oStatistics.totalCount * 100).toFixed(1);
                    oRenderManager.write("<div");
                    oRenderManager.addClass('sapMText');
                    oRenderManager.writeClasses();
                    oRenderManager.write(">");
                    oRenderManager.writeEscaped(oStatistics.name.toString());
                    oRenderManager.write("</div>");
                    //for count
                    oRenderManager.write("<div");
                    oRenderManager.addClass('sapMText');
                    oRenderManager.addClass("sapUiGen-SiteDetailsTrack-CohortStatsData");
                    oRenderManager.writeClasses();
                    oRenderManager.write(">");
                    //for bar chart 
                    oRenderManager.write("<span");
                    oRenderManager.addClass("sapUiGen-SiteDetailsTrack-BarChart");
                    oRenderManager.writeClasses();
                    oRenderManager.write(">");
                    if (oStatistics.totalCount !== 0 || oStatistics.affectedCount !== 0) {
                        oRenderManager.write("<div");
                        oRenderManager.addClass("sapUiGen-SiteDetailsTrack-Bar");
                        oRenderManager.writeClasses();
                        oRenderManager.addStyle("width", percentage + "%");
                        oRenderManager.writeStyles();
                        oRenderManager.write("></div>");
                    }
                    oRenderManager.write("</span>");
                    oRenderManager.write('<span');
                    oRenderManager.addClass('sapUiGen-SiteDetailsTrack-CohortStatsToken');
                    oRenderManager.addClass('right');
                    oRenderManager.writeClasses();
                    oRenderManager.write('>');
                    oRenderManager.writeEscaped(oStatistics.affectedCount.toString());
                    oRenderManager.write('</span>&thinsp;/&thinsp;<span');
                    oRenderManager.addClass('sapUiGen-SiteDetailsTrack-CohortStatsToken');
                    oRenderManager.addClass('right');
                    oRenderManager.writeClasses();
                    oRenderManager.write('>');
                    oRenderManager.writeEscaped(oStatistics.totalCount.toString());
                    oRenderManager.write('</span>');
                    //percentage
                    if (oStatistics.totalCount !== 0 || oStatistics.affectedCount !== 0) {
                        oRenderManager.write('&nbsp;(');
                        oRenderManager.write('<span');
                        oRenderManager.addClass('sapUiGen-SiteDetailsTrack-CohortStatsToken');
                        oRenderManager.addClass('right');
                        oRenderManager.writeClasses();
                        oRenderManager.write('>');
                        oRenderManager.writeEscaped(percentage);
                        oRenderManager.write('%');
                        oRenderManager.write('</span>)');
                    } else {
                        oRenderManager.write('&nbsp;(');
                        oRenderManager.write('<span');
                        oRenderManager.addClass('sapUiGen-SiteDetailsTrack-CohortStatsToken');
                        oRenderManager.addClass('center');
                        oRenderManager.writeClasses();
                        oRenderManager.write('>');
                        oRenderManager.write('-');
                        oRenderManager.write('</span>)');
                    }
                    //for icon
                    oRenderManager.write('&nbsp;');
                    oRenderManager.write('<span');
                    oRenderManager.addClass('sapUiGen-SiteDetailsTrack-CohortStatsToken');
                    oRenderManager.writeClasses();
                    oRenderManager.write('>');
                    var icon = new sap.ui.core.Icon({
                        src: "sap-icon://person-placeholder",
                        color: "#666666"
                    });
                    icon.addStyleClass("patientIcon");
                    oRenderManager.renderControl(icon);
                    oRenderManager.write('</span>');
                    oRenderManager.write("</div>");
                });
                //last div 
                oRenderManager.write("</div>");
            }
        },
        onAfterRendering: function () {
            this.update();
        },
        update: function () {
            // determine the maximum width
            var aMaxWidths = [];
            this.$().find('.sapUiGen-SiteDetailsTrack-CohortStatsData').each(function () {
                $(this).children('.sapUiGen-SiteDetailsTrack-CohortStatsToken').each(function (iToken) {
                    if (aMaxWidths.length <= iToken) {
                        aMaxWidths.push($(this).width());
                    } else {
                        aMaxWidths[iToken] = Math.max(aMaxWidths[iToken], $(this).width());
                    }
                });
            });
            // attatch the maximum width to the class
            this.$().find('.sapUiGen-SiteDetailsTrack-CohortStatsData').each(function () {
                $(this).children('.sapUiGen-SiteDetailsTrack-CohortStatsToken').each(function (iToken) {
                    $(this).css("width", aMaxWidths[iToken] + 1 + "px");
                });
            });
        },
        getParameters: function () {
            return { dataPlugin: this.getDataPlugin() };
        }
    });
    return CohortStatsDetailsTrack;
});