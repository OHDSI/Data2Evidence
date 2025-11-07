sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils"
], function (jQuery, Utils) {
    "use strict";

    /**
     * Constructor for a new MriConfigFilterCard.
     * @constructor
     * @param {string}                                 sConfigPath               Path to the attribute
     * @param {object}                                 oInternalConfigFilterCard FilterCard object
     * @param {sap.hc.mri.pa.ui.lib.MriConfigAttribute[]} aFilterCardAttributes     List of MriConfigAttribute
     *
     * @classdesc
     * MriConfigFilterCard Class.
     * @alias sap.hc.mri.pa.ui.lib.MriConfigFilterCard
     */
    var MriConfigFilterCard = function (sConfigPath, oInternalConfigFilterCard, aFilterCardAttributes) {
        this._sConfigPath = sConfigPath;
        this._oInternalConfigFilterCard = oInternalConfigFilterCard;

        this._aFilterAttributes = [];
        this._aMeasureAttributes = [];
        this._aCategoryAttributes = [];
        this._aAllAttributes = [];
        this._mAllAttributes = {};

        for (var i = 0; i < aFilterCardAttributes.length; i++) {
            if (aFilterCardAttributes[i].isVisibleInFilterCard()) {
                this._aFilterAttributes.push(aFilterCardAttributes[i]);
                this._aAllAttributes.push(aFilterCardAttributes[i]);
                this._mAllAttributes[aFilterCardAttributes[i].getConfigPath()] = aFilterCardAttributes[i];
            } else if (aFilterCardAttributes[i].isMeasure() || aFilterCardAttributes[i].isCategory()) {
                this._aAllAttributes.push(aFilterCardAttributes[i]);
                this._mAllAttributes[aFilterCardAttributes[i].getConfigPath()] = aFilterCardAttributes[i];
            }
            aFilterCardAttributes[i].setParentFilterCard(this);
        }

        // sort the attributes by the order
        this._aFilterAttributes.sort(function (a1, a2) {
            return a1.getOrderInFilterCard() - a2.getOrderInFilterCard();
        });

        this._aAllAttributes.sort(function (a1, a2) {
            return a1.getOrderInFilterCard() - a2.getOrderInFilterCard();
        });
    };

    MriConfigFilterCard.prototype.getName = function () {
        if (this._sConfigPath === "patient") {
            return Utils.getText("MRI_PA_MENUITEM_INTERACTIONS_GENERAL");
        }
        return this._oInternalConfigFilterCard.name;
    };

    MriConfigFilterCard.prototype.getOrder = function () {
        if (this._sConfigPath === "patient") {
            return -1;
        }
        return this._oInternalConfigFilterCard.order;
    };

    MriConfigFilterCard.prototype.getConfigPath = function () {
        return this._sConfigPath;
    };

    MriConfigFilterCard.prototype.getFilterAttributes = function () {
        return this._aFilterAttributes;
    };

    MriConfigFilterCard.prototype.getMeasureAttributes = function () {
        return this._aMeasureAttributes;
    };

    MriConfigFilterCard.prototype.getCategoryAttributes = function () {
        return this._aCategoryAttributes;
    };

    MriConfigFilterCard.prototype.getAllAttributes = function () {
        return this._aAllAttributes;
    };

    MriConfigFilterCard.prototype.getAttributeByRelativeKey = function (key) {
        return this._mAllAttributes[this._sConfigPath + ".attributes." + key];
    };

    MriConfigFilterCard.prototype.isBasicData = function () {
        return this._sConfigPath === "patient";
    };

    /**
     * Checks if any of the contained attributes have the specified annotation.
     * Checks all the attributes, not only the enabled ones
     * @param   {string}  sAnnotation Annotation name
     * @returns {boolean} True, if annotation is found
     */
    MriConfigFilterCard.prototype.hasAnnotation = function (sAnnotation) {
        for (var attr in this._oInternalConfigFilterCard.attributes) {
            if (this._oInternalConfigFilterCard.attributes.hasOwnProperty(attr) &&
                this._oInternalConfigFilterCard.attributes[attr].annotations &&
                this._oInternalConfigFilterCard.attributes[attr].annotations.indexOf(sAnnotation) !== -1) {
                return true;
            }
        }
        return false;
    };

    /**
     * Returns the paths of the attributes having a specific annotation
     * @param   {string}   sAnnotation Annotation name
     * @returns {object[]} List of attributes with annotation
     */
    MriConfigFilterCard.prototype.getAttributesWithAnnotation = function (sAnnotation) {
        var aAttrs = [];
        for (var attr in this._oInternalConfigFilterCard.attributes) {
            if (this._oInternalConfigFilterCard.attributes.hasOwnProperty(attr) &&
                this._oInternalConfigFilterCard.attributes[attr].annotations &&
                this._oInternalConfigFilterCard.attributes[attr].annotations.indexOf(sAnnotation) !== -1) {
                aAttrs.push(attr);
            }
        }
        return aAttrs;
    };

    MriConfigFilterCard.prototype.isInitial = function () {
        return this._sConfigPath === "patient" || this._oInternalConfigFilterCard.filtercard && this._oInternalConfigFilterCard.filtercard.initial;
    };

    return MriConfigFilterCard;
});
