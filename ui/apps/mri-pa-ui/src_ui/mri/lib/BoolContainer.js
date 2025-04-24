sap.ui.define([
    "jquery.sap.global",
    "./BoolItem",
    "./MriFrontendConfig",
    "./ifr/BooleanContainers",
    "./ifr/InternalFilterRepresentation",
    "./utils/KeyCounter"
], function (jQuery, BoolItem, MriFrontendConfig, BooleanContainers, InternalFilterRepresentation, KeyCounter) {
    "use strict";

    /**
     * Constructor for a new BoolContainer.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * Top level container for FilterCards.
     * @extends sap.hc.mri.pa.ui.lib.BoolItem
     * @alias sap.hc.mri.pa.ui.lib.BoolContainer
     */
    var BoolContainer = BoolItem.extend("sap.hc.mri.pa.ui.lib.BoolContainer", {
        metadata: {
            properties: {
                /**
                 * The maximum width for all Constraint labels.
                 */
                descriptionColumnsMaxWidth: {
                    type: "int",
                    defaultValue: 0
                }
            },
            defaultAggregation: "content",
            aggregations: {
                /**
                 * BoolContainer to represent boolean logic between FilterCards.
                 */
                content: {
                    type: "sap.hc.mri.pa.ui.lib.IBoolItem",
                    multiple: true,
                    singularName: "content"
                }
            },
            events: {
                /**
                 * Fired when any filter has changed.
                 */
                change: {},
                newCardAdded: {
                    /**
                     * Name of the new filter card.
                     */
                    cardName: {
                        type: "string"
                    }
                }
            }
        },
        renderer: function (oRenderManager, oControl) {
            oRenderManager.write("<div");
            oRenderManager.writeControlData(oControl);
            oRenderManager.addClass("sapMriPaFilterBoolContainer");
            oRenderManager.writeClasses();
            oRenderManager.write(">");
            oControl.getContent().forEach(function (oContentItem) {
                oRenderManager.renderControl(oContentItem);
            });
            oRenderManager.write("</div>");
        }
    });

    /**
     * Initializes the BoolContainer instance after creation.
     */
    BoolContainer.prototype.init = function () {
        this._resetFilterCardInstanceCounter();
    };

    BoolContainer.prototype._resetFilterCardInstanceCounter = function () {
        this._filterCardInstancesCounter = KeyCounter.getKeyCountingStrategy("default", 1);
    };

    BoolContainer.prototype.getIFR = function () {
        var id = MriFrontendConfig.getFrontendConfig().getPaConfigId();
        var version = MriFrontendConfig.getFrontendConfig().getPaConfigVersion();
        var aContent = this.getContent().map(function (oBoolFilterContainer) {
            var oIFR = oBoolFilterContainer.getIFR();
            return oBoolFilterContainer.getAllContainer() ? new BooleanContainers.And(oIFR) : new BooleanContainers.Or(oIFR);
        });
        return new InternalFilterRepresentation.Filter({
            configMetadata: new InternalFilterRepresentation.ConfigMetadata(version, id),
            cards: aContent.length ? new BooleanContainers.And(aContent) : new BooleanContainers.Empty()
        });
    };

    /**
     * Increment and return the index number for a FilterCard type.
     * @param   {string} sConfigPath Config path for the FilterCard type
     * @returns {number} New index number.
     */
    BoolContainer.prototype.getNextFilterCardNumber = function (sConfigPath) {
        return this._filterCardInstancesCounter.getNextValueFor(sConfigPath);
    };

    /**
     * Set the index number for a FilterCard type.
     * @param   {string} sConfigPath Config path for the FilterCard type
     * @param   {number} iNumber     New index number
     */
    BoolContainer.prototype.setNextFilterCardNumber = function (sConfigPath, iNumber) {
        this._filterCardInstancesCounter.setNextValueFor(sConfigPath, iNumber);
    };

    /**
     * Release an index number for a FilterCard type.
     * @param   {string} sConfigPath Config path for the FilterCard type
     * @param   {number} iNumber     index number to be released
     */
    BoolContainer.prototype.releaseFilterCardNumber = function (sConfigPath, iNumber) {
        this._filterCardInstancesCounter.releaseIndexFor(sConfigPath, iNumber);
    };

    /**
     * Block an index number for a FilterCard type.
     * @param   {string} sConfigPath Config path for the FilterCard type
     * @param   {number} iNumber     index number to be released
     */
    BoolContainer.prototype.blockFilterCardNumber = function (sConfigPath, iNumber) {
        this._filterCardInstancesCounter.blockIndexFor(sConfigPath, iNumber);
    };

    BoolContainer.prototype.setFilterValues = function (sInteractionInstancePath, sAttributeKey, aValues, mergeMode) {
        if (this.getContent() && this.getContent()[0]) {
            return this.getContent()[0].setFilterValues(sInteractionInstancePath, sAttributeKey, aValues, mergeMode);
        }
    };

    /**
     * Reset the FilterCard numbers and remove all Containers and their FilterCards.
     */
    BoolContainer.prototype.reset = function () {
        this._resetFilterCardInstanceCounter();
        this.removeAllContent();
    };

    /**
     * Set the maximum width for all Constraint labels.
     * @override
     * @param {number} iMaxWidth Max width in pixel
     */
    BoolContainer.prototype.setDescriptionColumnsMaxWidth = function (iMaxWidth) {
        this.setProperty("descriptionColumnsMaxWidth", iMaxWidth, true);
        this.getContent().forEach(function (oBoolFilterContainer) {
            oBoolFilterContainer.setDescriptionColumnsMaxWidth(iMaxWidth);
        });
    };

    /**
     * Adds a BoolFilterContainer into the aggregation content.
     * Attaches listeners to the events fired by the BoolFilterContainer.
     * @override
     * @param {sap.hc.mri.pa.ui.lib.BoolFilterContainer} oBoolFilterContainer The BoolFilterContainer to add
     */
    BoolContainer.prototype.addContent = function (oBoolFilterContainer) {
        this.addAggregation("content", oBoolFilterContainer, true);
        oBoolFilterContainer.setDescriptionColumnsMaxWidth(this.getDescriptionColumnsMaxWidth());
        oBoolFilterContainer.attachChange(this.fireChange, this);
        oBoolFilterContainer.attachCardRemoved(function (oEvent) {
            this.releaseFilterCardNumber(oEvent.getParameter("cardKey"), oEvent.getParameter("cardIndex"));
        }, this);
        oBoolFilterContainer.attachNewCardAdded(this.fireNewCardAdded, this);
    };

    return BoolContainer;
});
