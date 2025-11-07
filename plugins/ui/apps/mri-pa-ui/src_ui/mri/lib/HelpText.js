sap.ui.define([
    "jquery.sap.global",
    "sap/ui/core/Control"
], function (jQuery, Control) {
    "use strict";

    /**
     * Constructor for a new HelpText.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * HelpText Control.
     * @extends sap.ui.core.Control
     * @alias sap.hc.mri.pa.ui.lib.HelpText
     */
    var HelpText = Control.extend("sap.hc.mri.pa.ui.lib.HelpText", {
        metadata: {
            properties: {
                title: {
                    type: "string",
                    defaultValue: ""
                },
                firstline: {
                    type: "string",
                    defaultValue: ""
                },
                list: {
                    type: "string[]",
                    defaultValue: []
                },
                stringsToHighlight: {
                    type: "string[]",
                    defaultValue: []
                }
            }
        },
        renderer: function (oRenderManager, oControl) {
            oRenderManager.write("<div");
            oRenderManager.writeControlData(oControl);
            oRenderManager.addClass("sapMriPaHelpText");
            oRenderManager.writeClasses();
            oRenderManager.write(">");

            oRenderManager.write("<div>");
            oRenderManager.write(oControl.getFirstline());
            oRenderManager.write("</div>");

            oRenderManager.write("<ul>");
            oControl.getList().forEach(function (sListItem) {
                oRenderManager.write("<li>");
                oControl.getStringsToHighlight().forEach(function (sHighlightItem) {
                    var sReplacement = '<span class="sapMriPaHelpTextHighlight">' + sHighlightItem + "</span>";
                    sListItem = oControl._replaceAll(sListItem, sHighlightItem, sReplacement);
                });
                oRenderManager.write(sListItem);
                oRenderManager.write("</li>");
            });
            oRenderManager.write("</ul>");

            oRenderManager.write("</div>");
        }
    });

    HelpText.prototype._replaceAll = function (sText, sSearchString, sReplacement) {
        return sText.split(sSearchString).join(sReplacement);
    };

    return HelpText;
});
