sap.ui.define(function () {
    "use strict";

    /**
     * Constructor for a new MriConfigAttribute.
     * @constructor
     * @param {string} sConfigPath              Path to the attribute
     * @param {object} oInternalConfigAttribute Attribute object
     * @param {string} sParentPath              Path to the parent
     *
     * @classdesc
     * MriConfigAttribute Class.
     * @alias sap.hc.mri.pa.ui.lib.MriConfigAttribute
     */
    var MriConfigAttribute = function (sConfigPath, oInternalConfigAttribute, sParentPath) {
        this._sConfigPath = sConfigPath;
        this._oInternalConfigAttribute = oInternalConfigAttribute;
        this._oParentFilterCard = null; // this will be set from outside if the attribute is part of a filter card
        this._sParentPath = sParentPath;
    };

    MriConfigAttribute.prototype.getName = function () {
        return this._oInternalConfigAttribute.name;
    };

    MriConfigAttribute.prototype.getOrderInFilterCard = function () {
        return this._oInternalConfigAttribute.filtercard ? this._oInternalConfigAttribute.filtercard.order : null;
    };

    MriConfigAttribute.prototype.getType = function () {
        return this._oInternalConfigAttribute.type;
    };

    MriConfigAttribute.prototype.getSuggestionsCached = function () {
        return this._oInternalConfigAttribute.cached;
    };

    MriConfigAttribute.prototype.getConfigPath = function () {
        return this._sConfigPath;
    };

    MriConfigAttribute.prototype.getParentConfigPath = function () {
        return this._sParentPath;
    };

    MriConfigAttribute.prototype.isVisibleInFilterCard = function () {
        return this._oInternalConfigAttribute.filtercard && this._oInternalConfigAttribute.filtercard.visible;
    };

    MriConfigAttribute.prototype.isBasicDataAttribute = function () {
        return this._sConfigPath.indexOf("patient.attributes") === 0;
    };

    MriConfigAttribute.prototype.isInitialInFilterCard = function () {
        return this._oInternalConfigAttribute.hasOwnProperty("filtercard") && this._oInternalConfigAttribute.filtercard.initial === true;
    };

    MriConfigAttribute.prototype.getConfigKey = function () {
        return this._sConfigPath.split(".").pop();
    };

    MriConfigAttribute.prototype.isInitialInPatientList = function () {
        if (this.isVisibleInPatientList() === true) {
            return this._oInternalConfigAttribute.hasOwnProperty("patientlist") && this._oInternalConfigAttribute.patientlist.initial === true;
        }
        return false;
    };

    MriConfigAttribute.prototype.isVisibleInPatientList = function () {
        return this._oInternalConfigAttribute.hasOwnProperty("patientlist") && this._oInternalConfigAttribute.patientlist.visible === true;
    };

    MriConfigAttribute.prototype.isLinkColumn = function () {
        return this._oInternalConfigAttribute.hasOwnProperty("patientlist") && this._oInternalConfigAttribute.patientlist.linkColumn === true;
    };

    MriConfigAttribute.prototype.getOrderInPatientList = function () {
        var order = null;

        if (this._oInternalConfigAttribute.hasOwnProperty("patientlist")) {
            order = this._oInternalConfigAttribute.patientlist.order;
        }
        return order;
    };

    MriConfigAttribute.prototype.setParentFilterCard = function (oParent) {
        this._oParentFilterCard = oParent;
    };

    MriConfigAttribute.prototype.getParentFilterCard = function () {
        return this._oParentFilterCard;
    };

    MriConfigAttribute.prototype.isMeasure = function () {
        return this._oInternalConfigAttribute.measure;
    };

    MriConfigAttribute.prototype.isCategory = function () {
        return this._oInternalConfigAttribute.category;
    };

    MriConfigAttribute.prototype.getDefaultBinSize = function () {
        return this._oInternalConfigAttribute.defaultBinSize;
    };

    MriConfigAttribute.prototype.isBinnable = function () {
        return this._oInternalConfigAttribute.ordered && this.getType() === "num";
    };

    MriConfigAttribute.prototype.hasAnnotation = function (sAnnotation) {
        return this._oInternalConfigAttribute.annotations && this._oInternalConfigAttribute.annotations.indexOf(sAnnotation) !== -1;
    };

    MriConfigAttribute.prototype.getAnnotations = function () {
        return this._oInternalConfigAttribute.annotations;
    };

    /**
     * Returns true if the attribute is configured to be used as catalog attribute in MRI
     * @returns {boolean} True if cataloge attribute
     */
    MriConfigAttribute.prototype.isCatalogAttribute = function () {
        return this._oInternalConfigAttribute.useRefValue;
    };

    return MriConfigAttribute;
});
