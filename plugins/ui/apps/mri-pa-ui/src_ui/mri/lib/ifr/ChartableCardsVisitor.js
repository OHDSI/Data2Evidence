sap.ui.define([
    "sap/hc/mri/pa/ui/lib/MriFrontendConfig"
], function (MriFrontendConfig) {
    "use strict";

    /**
     * Create a new ChartableCardsVisitor.
     * @constructor
     *
     * @classdesc
     * Visitor to traverse the IFR and create a list of chartable FilterCard information.
     * @alias sap.hc.mri.pa.ui.lib.ifr.ChartableCardsVisitor
     */
    function ChartableCardsVisitor() {
        this.oConfig = MriFrontendConfig.getFrontendConfig();
        this.aFilterCards = [];
    }

    /**
     * Get the extracted list of FilterCard information.
     * @returns {object[]} List of FilterCard information
     */
    ChartableCardsVisitor.prototype.getChartableCards = function () {
        return this.aFilterCards;
    };

    /**
     * Visit the top level filter.
     * @param {object}                                                      mConfigMetadata Config metadata for the
     *                                                                                      following Controls
     * @param {sap.hc.mri.pa.ui.lib.ifr.BooleanContainers.BooleanContainer} oCard           BooleanContainer with
     *                                                                                      eventually FilterCards
     */
    ChartableCardsVisitor.prototype.visitFilter = function (mConfigMetadata, oCard) {
        oCard.accept(this);
    };

    /**
     * Visit an And BooleanContainer.
     * Continue to visit its content.
     * @param {sap.hc.mri.pa.ui.lib.ifr.BooleanContainers.BooleanContainer[]} aAndContent List of BooleanContainers
     */
    ChartableCardsVisitor.prototype.visitAnd = function (aAndContent) {
        aAndContent.forEach(function (oBooleanContainer) {
            oBooleanContainer.accept(this);
        }, this);
    };

    /**
     * Visit an Or BooleanContainer.
     * FilterCards in the Any-section can not be used on the axes, so the content is ignored.
     */
    ChartableCardsVisitor.prototype.visitOr = function () { /* Ignore or section */ };

    /**
     * Visit an Or BooleanContainer.
     * Excluded FilterCards can not be used on the axes, so the content is ignored.
     */
    ChartableCardsVisitor.prototype.visitNot = function () { /* Ignore excluded cards */ };

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
     * @param {boolean}                                                                 bInactive          Whether the FilterCard is inactive
     */
    ChartableCardsVisitor.prototype.visitFilterCard = function (sConfigPath, iInstanceNumber, sInstanceID, sCardName, oSuccessor, oAdvanceTimeFilter, oParentInteraction, oAttributes, bInactive) {
        if (bInactive) {
            return;
        }
        var aAttributes = this.oConfig.getFilterCardByPath(sConfigPath).getAllAttributes().map(function (oAttributeConfig) {
            return {
                sAttributeInstance: sInstanceID + ".attributes." + oAttributeConfig.getConfigKey(),
                sAttributeName: oAttributeConfig.getName(),
                bAvailable: !oAttributeConfig.isVisibleInFilterCard()
            };
        });
        this.mCurrentFilterCard = {
            aAttributes: aAttributes,
            sFilterCardConfigPath: sConfigPath,
            sFilterCardInstance: sInstanceID,
            sFilterCardName: sCardName
        };
        this.aFilterCards.push(this.mCurrentFilterCard);
        oAttributes.accept(this);
    };

    /**
     * Visit an Attribute.
     * Update the availability of an attribute if it is found in the FilterCard.
     * @param {string} sConfigPath  Constraint config path
     * @param {string} sInstanceID  Constraint instance id
     */
    ChartableCardsVisitor.prototype.visitAttribute = function (sConfigPath, sInstanceID) {
        this.mCurrentFilterCard.aAttributes.some(function (mAttributeInformation) {
            if (mAttributeInformation.sAttributeInstance === sInstanceID) {
                mAttributeInformation.bAvailable = true;
                return true;
            } else {
                return false;
            }
        });
    };

    /**
     * Create a list of FilterCard information from the given IFR.
     * This list can be used to find information for axes selections.
     * @static
     * @param {sap.hc.mri.ui.pa.lib.ifr.InternalFilterRepresentation.Filter} oIFR IFR to visit
     * @returns {Object[]} List of FilterCard information.
     */
    ChartableCardsVisitor.getChartableCards = function (oIFR) {
        var oChartableCardsVisitor = new ChartableCardsVisitor();
        oIFR.accept(oChartableCardsVisitor);
        return oChartableCardsVisitor.getChartableCards();
    };

    return ChartableCardsVisitor;
});
