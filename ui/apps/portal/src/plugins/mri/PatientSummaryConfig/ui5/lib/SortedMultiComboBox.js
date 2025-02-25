sap.ui.define([
    "jquery.sap.global",
    "sap/m/MultiComboBox"
], function (jQuery, MultiComboBox) {
    "use strict";

    /**
     * Constructor for a new SortedMultiComboBox.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * Modified multi combo box control that preserves the order of the tags
     * (by also modifying the order in the available items in the dropdown to match the desired order).
     * @extends sap.m.MultiComboBox
     * @alias hc.hph.patient.config.ui.lib.SortedMultiComboBox
     */
    var SortedMultiComboBox = MultiComboBox.extend("hc.hph.patient.config.ui.lib.SortedMultiComboBox", {
        renderer: {}
    });

    SortedMultiComboBox.prototype.addSelectedItem = function (oItem) {
        this.removeItem(oItem);
        this.insertItem(oItem, this.getItems().length);
        MultiComboBox.prototype.addSelectedItem.call(this, oItem);
    };

    return SortedMultiComboBox;
});
