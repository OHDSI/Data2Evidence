sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils"
], function (jQuery, Utils) {
    "use strict";

    /**
     * Constructor for a new MriConfigPatientList.
     * @constructor
     * @param {object} oInternalConfig Config object
     *
     * @classdesc
     * MriConfigPatientList Class.
     * @alias sap.hc.mri.pa.ui.lib.MriConfigPatientList
     */
    var MriConfigPatientList = function (oInternalConfig) {
        this._oInternalConfig = oInternalConfig;
        this._aAttributes = [];
        this.mInteractions = {};
    };

    MriConfigPatientList.prototype.addInteractionAttributes = function (path, oInteraction, aAttributes) {
        if (aAttributes.length > 0) {
            this.mInteractions[path] = {
                path: path,
                name: path !== "patient" ? oInteraction.name : Utils.getText("MRI_PA_MENUITEM_INTERACTIONS_GENERAL"),
                interaction: oInteraction,
                attributes: aAttributes
            };

            aAttributes.forEach(function (attribute) {
                this._aAttributes.push(attribute);
            }, this);
        }
    };

    MriConfigPatientList.prototype.getInitialTableColumns = function () {
        return this._aAttributes.filter(function (attribute) {
            return attribute.isInitialInPatientList();
        }).sort(function (attr1, attr2) {
            return attr1.getOrderInPatientList() - attr2.getOrderInPatientList();
        });
    };

    /**
     * Get the list of Attributes that can be used in the Patient List.
     * @returns {Object[]} List of Attributeinformation
     */
    MriConfigPatientList.prototype.getAllAttributes = function () {
        return this._aAttributes;
    };

    MriConfigPatientList.prototype.getBasicDataCols = function () {
        var cols = this.getColumnsByInteractions(true, false);
        return cols.length > 0 ? cols[0] : {};
    };

    MriConfigPatientList.prototype.getAllNonBasicDataColumnsByInteractions = function () {
        return this.getColumnsByInteractions(false, true);
    };

    MriConfigPatientList.prototype.getColumnsByInteractions = function (withBasicData, withNonBasicData) {
        var colsByInteraction = [];

        function getNewInteraction(internalInteraction, isBasicData) {
            var interaction = {};
            interaction.name = internalInteraction.name;
            interaction.path = internalInteraction.path;
            interaction.isBasicData = isBasicData;
            interaction.order = internalInteraction.interaction ? internalInteraction.interaction.order : 0;
            interaction.attributes = internalInteraction.attributes.slice(0);

            interaction.attributes.sort(function (a1, a2) {
                return a1.getOrderInFilterCard() - a2.getOrderInFilterCard();
            });

            return interaction;
        }

        jQuery.each(this.mInteractions, function (name, interaction) {
            if (withNonBasicData && name !== "patient" || withBasicData && name === "patient") {
                colsByInteraction.push(getNewInteraction(interaction, name === "patient"));
            }
        });

        colsByInteraction.sort(function (i1, i2) {
            return i1.order - i2.order;
        });

        return colsByInteraction;
    };

    MriConfigPatientList.prototype.getDefaultPageSize = function () {
        var pageSize = this._oInternalConfig.chartOptions.list.pageSize;
        return pageSize > 0 ? pageSize : 20;
    };

    return MriConfigPatientList;
});
