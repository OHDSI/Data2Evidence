sap.ui.define([
    "jquery.sap.global",
    "sap/m/ScrollContainer"
], function (jQuery, ScrollContainer) {
    "use strict";

    /**
     * Constructor for a new ScrollContainerStretchable.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * This subclass of the ScrollContainer has a stretchContent property to dynamically disable the scroll container and consume all of the available vertical space.
     *
     * @extends sap.m.ScrollContainer
     * @alias sap.hc.hph.patient.app.ui.lib.tab.ScrollContainer
     */
    var ScrollContainerStretchable = ScrollContainer.extend("hc.hph.patient.app.ui.lib.tab.ScrollContainer", {
        metadata: {
            library: "hc.hph.patient.app.ui.lib",
            properties: {
                /**
                 * Disable scrolling and use the whole vertical space available.
                 */
                stretchContent: {
                    type: "boolean",
                    group: "Appearance",
                    defaultValue: false
                }
            }
        }
    });

    /**
     * Change stretch behaviour.
     * @param {any} bStretchContent Stretch the content to the full remaining height.
     */
    ScrollContainerStretchable.prototype.setStretchContent = function (bStretchContent) {
        this.setProperty("stretchContent", bStretchContent, true);
        if (bStretchContent) {
            this.addStyleClass("sapPSScrollContainerDisabled", false);
        } else {
            this.removeStyleClass("sapPSScrollContainerDisabled", false);
        }
    };

    return ScrollContainerStretchable;
});
