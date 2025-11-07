sap.ui.define([
    "jquery.sap.global"
], function () {
    "use strict";

    /**
     * Create a new KMVisitor.
     * @constructor
     *
     * @classdesc
     * Visitor to traverse the IFR and create a list of Filtercard names.
     * @alias sap.hc.mri.pa.ui.lib.ifr.KMVisitor
     */
    function KMVisitor() {
        this.sNames = [];
    }

    /**
     * Visit the top level filter and create a BooolContainer as root Control.
     * @param {object}                                                      mConfigMetadata Config metadata for the following Controls
     * @param {sap.hc.mri.pa.ui.lib.ifr.BooleanContainers.BooleanContainer} oCards          BooleanContainer with eventually FilterCards
     */
    KMVisitor.prototype.visitFilter = function (mConfigMetadata, oCards) {
        this.sNames = [];
        oCards.accept(this);
    };

    /**
     * Visit an And BooleanContainer.
     * As there are exactly two Ands before reaching the FilterCards, create a BoolFilterContainer on the second
     * and visit each content.
     * @param {sap.hc.mri.pa.ui.lib.ifr.BooleanContainers.BooleanContainer[]} aAndContent List of BooleanContainers
     */
    KMVisitor.prototype.visitAnd = function (aAndContent) {
        aAndContent.forEach(function (oBooleanContainer) {
            oBooleanContainer.accept(this);
        }, this);
    };

    /**
     * Visit an Or BooleanContainer.
     * Stop visiting further children.
     */
    KMVisitor.prototype.visitOr = function () { /* pass */ };

    /**
     * Visit a Not BooleanContainer.
     * Stop visiting further children.
     */
    KMVisitor.prototype.visitNot = function () { /* pass */ };

    /**
     * Visit a FilterCard.
     * Create an AttributeVisitor to visit each Attribute.
     * @param {string} sConfigPath     Config path of the FilterCard
     * @param {number} iInstanceNumber Instance number of the FilterCard
     * @param {string} sInstanceID     Instance Id, currently a combination of config path and instance number
     * @param {string} sName           FilterCard name
     */
    KMVisitor.prototype.visitFilterCard = function (sConfigPath, iInstanceNumber, sInstanceID, sName) {
        if (sConfigPath !== "patient") {
            this.sNames.push({
                key: sInstanceID,
                name: sName
            });
        }
    };

    /**
     * Static shorthand method for creating a Visitor, visiting the IFR and returning the list of Filtercard names from the All-section.
     * @static
     * @param   {sap.hc.mri.ui.pa.lib.ifr.InternalFilterRepresentation.Filter} oIFR IFR to visit
     * @returns {string[]}                                                     List of Filtercard names
     */
    KMVisitor.getFilterCardNames = function (oIFR) {
        var oKMVisitor = new KMVisitor();
        oIFR.accept(oKMVisitor);
        return oKMVisitor.sNames;
    };

    return KMVisitor;
});
