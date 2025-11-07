sap.ui.define([
], function () {
    "use strict";

    /**
     * Create a new PatientListVisitor.
     * @constructor
     *
     * @classdesc
     * Visitor to traverse the IFR and create a list of Filtercard names.
     * @alias sap.hc.mri.pa.ui.lib.ifr.PatientListVisitor
     */
    function PatientListVisitor() {
        this.filterAttributeConstraints = [];
        this.filtercardConstraints = [];
    }

    /**
     * Visit the top level filter and create a BooolContainer as root Control.
     * @param {object}                                                      mConfigMetadata Config metadata for the following Controls
     * @param {sap.hc.mri.pa.ui.lib.ifr.BooleanContainers.BooleanContainer} oCards          BooleanContainer with eventually FilterCards
     */
    PatientListVisitor.prototype.visitFilter = function (mConfigMetadata, oCards) {
        oCards.accept(this);
    };

    /**
     * Visit an And BooleanContainer.
     * As there are exactly two Ands before reaching the FilterCards, create a BoolFilterContainer on the second
     * and visit each content.
     * @param {sap.hc.mri.pa.ui.lib.ifr.BooleanContainers.BooleanContainer[]} aAndContent List of BooleanContainers
     */
    PatientListVisitor.prototype.visitAnd = function (aAndContent) {
        aAndContent.forEach(function (oBooleanContainer) {
            oBooleanContainer.accept(this);
        }, this);
    };

    /**
     * Visit an Or BooleanContainer.
     * Stop visiting further children.
     */
    PatientListVisitor.prototype.visitOr = function () {
        return;
    };

    /**
     * Visit a Not BooleanContainer.
     * Stop visiting further children.
     */
    PatientListVisitor.prototype.visitNot = function () {
        return;
    };

    /**
     * Visit a FilterCard.
     * Create an entry in the list with config path, instance id, and name.
     * Add all attributes from the config. Attributes are considered available if they cannot be added to a FilterCard,
     * or can and are currently visible on a FilterCard.
     * @param {string}                                                                  sConfigPath        Config path of the FilterCard
     * @param {number}                                                                  iInstanceNumber    Instance number of the FilterCard
     * @param {string}                                                                  sInstanceID        Instance Id, currently a combination of config path and instance number
     * @param {string}                                                                  sCardName          FilterCard name
     * @param {sap.hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.Successor}         oSuccessor         Successor object
     * @param {Object}                                                                  oAdvanceTimeFilter Advanced time filter information
     * @param {sap.hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.ParentInteraction} oParentInteraction ParentInteraction object
     * @param {sap.hc.mri.pa.ui.lib.ifr.BooleanContainers.BooleanContainer}             oAttributes        FilterCard attributes.
     */
    PatientListVisitor.prototype.visitFilterCard = function (sConfigPath, iInstanceNumber, sInstanceID, sCardName, oSuccessor, oAdvanceTimeFilter, oParentInteraction, oAttributes) {
        this.filtercardConstraints.push({
            sConfigPath: sConfigPath,
            iInstanceNumber: iInstanceNumber,
            sInstanceID: sInstanceID
        });
        oAttributes.accept(this);
    };

    /**
     * Visit an Attribute.
     * Update the availability of an attribute if it is found in the FilterCard.
     * @param {string} sConfigPath  Constraint config path
     * @param {string} sInstanceID  Constraint instance id
     */
    PatientListVisitor.prototype.visitAttribute = function (sConfigPath, sInstanceID) {
        this.filterAttributeConstraints.push({
            sConfigPath: sConfigPath,
            sInstanceID: sInstanceID
        });
    };

    /**
     * Static shorthand method for creating a Visitor, visiting the IFR and returning the list of filtercard constraints.
     * @static
     * @param   {sap.hc.mri.ui.pa.lib.ifr.InternalFilterRepresentation.Filter} oIFR IFR to visit
     * @returns {string[]}                                                     List of Filtercard names
     */
    PatientListVisitor.getFilterConstraints = function (oIFR) {
        var oPatientListVisitor = new PatientListVisitor();
        oIFR.accept(oPatientListVisitor);
        return {
            filtercardConstraints: oPatientListVisitor.filtercardConstraints,
            filterAttributeConstraints: oPatientListVisitor.filterAttributeConstraints
        };
    };

    return PatientListVisitor;
});
