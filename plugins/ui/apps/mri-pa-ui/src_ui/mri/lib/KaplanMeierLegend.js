sap.ui.define([
    "jquery.sap.global",
    "sap/ui/core/Control"
], function (jQuery, Control) {
    "use strict";

    /**
     * Constructor for a new KaplanMeierLegend.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * Displays the Legend for the values in the Kaplan-Meier-Chart.
     * @extends sap.ui.core.Control
     * @alias sap.hc.mri.pa.ui.lib.KaplanMeierLegend
     */
    var KaplanMeierLegend = Control.extend("sap.hc.mri.pa.ui.lib.KaplanMeierLegend", {
        metadata: {
            properties: {
                /**
                 * Title of the Legend.
                 */
                title: {
                    type: "string",
                    group: "Data",
                    defaultValue: ""
                }
            },
            defaultAggregation: "entries",
            aggregations: {
                /**
                 * Legend entries. Should have CustomData with 'color'-key set.
                 */
                entries: {
                    type: "sap.m.Text",
                    bindable: "bindable",
                    multiple: true,
                    singleName: "entry"
                }
            }
        },
        renderer: function (oRenderManager, oKaplanMeierLegend) {
            oRenderManager.write("<div");
            oRenderManager.writeControlData(oKaplanMeierLegend);
            oRenderManager.addClass("sapMriPaKMLegend");
            oRenderManager.writeClasses(oKaplanMeierLegend);
            oRenderManager.write(">");

            oRenderManager.write("<span");
            oRenderManager.addClass("sapMriPaKMLegendTitle");
            oRenderManager.writeClasses();
            oRenderManager.write(">");
            oRenderManager.writeEscaped(oKaplanMeierLegend.getTitle());
            oRenderManager.write("</span>");

            oRenderManager.write("<ul");
            oRenderManager.addClass("sapMriPaKMLegendEntries");
            oRenderManager.writeClasses();
            oRenderManager.write(">");
            oKaplanMeierLegend.getEntries().forEach(function (oText) {
                oRenderManager.write("<li");
                oRenderManager.addClass("sapMriPaKMLegendEntry");
                oRenderManager.writeClasses();
                oRenderManager.write(">");

                oRenderManager.write("<span");
                oRenderManager.addClass("sapMriPaKMLegendEntryBox");
                oRenderManager.writeClasses();
                oRenderManager.addStyle("background-color", oText.data("color"));
                oRenderManager.writeStyles();
                oRenderManager.write("></span>");

                oRenderManager.renderControl(oText);

                oRenderManager.write("</li>");
            });
            oRenderManager.write("</ul>");

            oRenderManager.write("</div>");
        }
    });

    return KaplanMeierLegend;
});
