sap.ui.define([
    "jquery.sap.global",
    "sap/ui/core/Element"
], function (jQuery, Element) {
    "use strict";

    /**
     * Constructor for a new TileAnnotation.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * The TileAnnotation element holds annotations for an interaction and a list of Controls from extensions.
     * @extends sap.ui.core.Element
     * @alias sap.hc.hph.patient.app.ui.lib.TileAnnotation
     */
    var TileAnnotation = Element.extend("sap.hc.hph.patient.app.ui.lib.TileAnnotation", {
        metadata: {
            library: "sap.hc.hph.patient.app.ui.lib",
            properties: {
                /**
                 * Name of the annotation.
                 */
                name: {
                    type: "string",
                    group: "Data",
                    defaultValue: ""
                },
                /**
                 * Value of the annotation.
                 */
                values: {
                    type: "string[]",
                    group: "Data",
                    defaultValue: []
                }
            },
            aggregations: {
                /**
                 * Controls from Extensions.
                 */
                controls: {
                    type: "sap.ui.core.Control",
                    multiple: true,
                    singleName: "control"
                }
            }
        }
    });

    return TileAnnotation;
});
