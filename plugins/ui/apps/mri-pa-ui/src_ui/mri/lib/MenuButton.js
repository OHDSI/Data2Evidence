sap.ui.define([
    "sap/m/Button"
], function (Button) {
    "use strict";

    /**
     * Constructor for a new MenuButton.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * MenuButton design for a sap.m.Button.
     * @extends sap.m.Button
     * @alias sap.hc.mri.pa.ui.lib.MenuButton
     */
    var MenuButton = Button.extend("sap.hc.mri.pa.ui.lib.MenuButton", {
        renderer: {}
    });

    MenuButton.prototype.init = function () {
        this.setIcon("sap-icon://dropdown");
        this.setIconFirst(false);
        this.addStyleClass("sapMriPaMenuButton");
    };

    return MenuButton;
});
