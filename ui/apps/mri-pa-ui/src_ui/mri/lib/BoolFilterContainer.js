sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "./BoolItem",
    "./FilterCard",
    "./MriFrontendConfig",
    "./VariantFilterCard",
    "./ifr/BooleanContainers",
    "sap/m/Button",
    "sap/m/VBox",
    "sap/ui/unified/Menu",
    "sap/ui/unified/MenuItem",
    "sap/ui/model/json/JSONModel"
], function (jQuery, Utils, BoolItem, FilterCard, MriFrontendConfig, VariantFilterCard, BooleanContainers, Button, VBox, Menu, MenuItem, JSONModel) {
    "use strict";

    /**
     * Constructor for a new BoolFilterContainer.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * Filter Control.
     * @extends sap.hc.mri.pa.ui.lib.BoolItem
     * @alias sap.hc.mri.pa.ui.lib.BoolFilterContainer
     */
    var BoolFilterContainer = BoolItem.extend("sap.hc.mri.pa.ui.lib.BoolFilterContainer", {
        metadata: {
            properties: {
                /**
                 * When set to true, this BoolFilterContainer will include the Basic Data FilterCard and provide
                 * FilterCards to be used on the Axes.
                 */
                allContainer: {
                    type: "boolean",
                    group: "Behavior",
                    defaultValue: false
                },
                /**
                 * Text for the header above the Add FilterCard Button. Can contain HTML markup for emphasis.
                 */
                headerText: {
                    type: "string",
                    group: "Appearance",
                    defaultValue: ""
                },
                /**
                * Optional header element to be placed above the header text
                */
                separatorText: {
                    type: "string",
                    group: "Appearance",
                    defaultValue: ""
                }
            },
            aggregations: {
                layout: {
                    type: "sap.m.VBox",
                    multiple: false,
                    visibility: "hidden"
                },
                _menuButton: {
                    type: "sap.m.Button",
                    multiple: false,
                    visibility: "hidden"
                }
            },
            events: {
                /**
                 * Fired when any filter has changed.
                 */
                change: {},
                /**
                 * Fired after a filter card was removed.
                 */
                cardRemoved: {
                    /**
                     * Key of the removed filter card.
                     */
                    cardKey: {
                        type: "string"
                    },
                    /**
                     * Index of the removed filter card.
                     */
                    cardIndex: {
                        type: "number"
                    }
                },
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
            oRenderManager.writeClasses();
            oRenderManager.write(">");

            oRenderManager.write("<div");
            oRenderManager.addClass("sapMriPaBoolFilterContainerSeparator");
            oRenderManager.writeClasses();
            oRenderManager.write(">");
            oRenderManager.writeEscaped(oControl.getSeparatorText());
            oRenderManager.write("</div>");

            oRenderManager.write("<div>");
            oRenderManager.write("<span");
            oRenderManager.addClass("sapMriPaBoolFilterContainerHeader");
            oRenderManager.writeClasses();
            oRenderManager.write(">");
            oRenderManager.write(oControl.getHeaderText());
            oRenderManager.write("</span>");
            oRenderManager.write("</div>");

            oRenderManager.renderControl(oControl.getAggregation("_menuButton"));

            if (oControl._filterCards().length > 0) {
                oRenderManager.write("<div>");
                oRenderManager.write("<span");
                oRenderManager.addClass("sapMriPaBoolFilterContainerHeaderFiltercardCount");
                oRenderManager.writeClasses();
                oRenderManager.write(">");
                oRenderManager.write(Utils.getText("MRI_PA_DOWNLOAD_PDF_TEXT_FILTER_CARDS") + " (" + oControl._filterCards().length + ")");
                oRenderManager.write("</span>");
                oRenderManager.write("</div>");
            }

            oRenderManager.renderControl(oControl.getAggregation("layout"));
            oRenderManager.write("</div>");
        }
    });

    BoolFilterContainer.prototype.init = function () {
        this._widthOfLargestDescriptionColumn = 0;
        this._maxWidthOfDescriptionColumns = 0;
        this._filterCardItemModel = new JSONModel();
        for (var i = 0; i < this._filterCards().length; i++) {
            var fCard = this._filterCards()[i];
            fCard.detachChange(this.fireChange, this);
        }
        this.setAggregation("layout", new VBox());
        this._oAddFilterCardButton = new Button({
            icon: "sap-icon://add-filter",
            text: Utils.getText("MRI_PA_TEXT_ADDFILTER_BUTTON"),
            tooltip: Utils.getText("MRI_PA_TOOLTIP_ADDFILTER_BUTTON"),
            width: "100%",
            press: [this.openFilterMenu, this]
        }).addStyleClass("sapMriPaBoolFilterContainerButton");
        this.setAggregation("_menuButton", this._oAddFilterCardButton, false);
    };

    BoolFilterContainer.prototype.getIFR = function () {
        return this._filterCards().map(function (oFilterCard) {
            return oFilterCard.getIFR();
        });
    };

    /**
     * Get the Add FilterCard Menu.
     * Creates the Menu if it does not exist.
     * @returns {sap.ui.unified.Menu} Add FilterCard Menu.
     */
    BoolFilterContainer.prototype.getFilterMenu = function () {
        if (!this._oAddFilterCardMenu) {
            this._createAddFilterCardMenu();
        }
        return this._oAddFilterCardMenu;
    };

    BoolFilterContainer.prototype.openFilterMenu = function () {
        var eDock = sap.ui.core.Popup.Dock;
        this.getFilterMenu().open(true, this._oAddFilterCardButton, eDock.BeginTop, eDock.BeginBottom, this._oAddFilterCardButton);
    };

    BoolFilterContainer.prototype._getFilterCardById = function (cardId) {
        for (var i = 0; i < this._filterCards().length; ++i) {
            var fCard = this._filterCards()[i];
            if (cardId === fCard.getCardId()) {
                return fCard;
            }
        }
        return null;
    };

    /**
     * This method enforces the contraints that every card can be a successor for at most one other card and
     * that the successsor chains should not create cycles
     *
     * The method is called after the successor pointer in any filter card has been modified
     *
     * First, the method checks if the successor pointer that was just changed creates a cycle. If this the case,
     * the successor pointer value is set back to None
     *
     * Then, the method goes through all other cards and make sure the none of them has the same successor pointer,
     * turning it into "None" if this is the case
     * @private
     * @param {sap.hc.mri.pa.ui.lib.FilterCard} filterCard the filter card whose successor pointer has just been updated
     */
    BoolFilterContainer.prototype._checkSuccessorPointers = function (filterCard) {
        var parrId = filterCard.getParentInteraction();
        var cons;
        if (parrId) {
            if (this._checkParentNextCycle(this._getFilterCardByCardId(parrId), filterCard.getCardId())) {
                cons = filterCard.getConstraintForAttribute("_parentInteraction");
                cons.setValueState(sap.ui.core.ValueState.Error);
                cons.setSelectedKey("");
                jQuery.sap.delayedCall(600, cons, cons.setValueState, [sap.ui.core.ValueState.None]);
                return;
            }
        }

        var currId = filterCard.getSuccessor();
        if (currId) {
            if (this._checkParentNextCycle(this._getFilterCardByCardId(currId), filterCard.getCardId())) {
                cons = filterCard.getConstraintForAttribute("_succ");
                cons.setValueState(sap.ui.core.ValueState.Error);
                cons.setSelectedKey("");
                jQuery.sap.delayedCall(600, cons, cons.setValueState, [sap.ui.core.ValueState.None]);
                return;
            }
        }

        var disallowExclude = [];

        this._filterCards().forEach(function (fCard) {
            // if it is a successor or a parent, mark it to disallow exclude
            var fCardSuc = fCard.getSuccessor();
            if (fCardSuc) {
                disallowExclude.push(this._getFilterCardByCardId(fCardSuc));
            }

            var fCardPar = fCard.getParentInteraction();
            if (fCardPar) {
                disallowExclude.push(this._getFilterCardByCardId(fCardPar));
            }

            var fCardTime = fCard._advancedTimeLayout.getModel("timeFilterModel").getData().timeFilters;
            if (fCardTime && fCardTime.length > 0) {
                for (var i = 0; i < fCardTime.length; i++) {
                    if (fCard._advancedTimeLayout.getModel("timeFilterModel").getData().timeFilters[i].targetInteraction) {
                        disallowExclude.push(this._getFilterCardByCardId(fCard._advancedTimeLayout.getModel("timeFilterModel").getData().timeFilters[i].targetInteraction));
                    }
                }
            }
        }, this);


        this._filterCards().forEach(function (fCard) {
            if (disallowExclude.indexOf(fCard) < 0) {
                if (!fCard.getAllowExcludeOption()) {
                    fCard.setAllowExcludeOption(true);
                }
            } else {
                if (fCard.getExcludeFilter()) {
                    fCard.setExcludeFilter(false);
                }
                if (fCard.getAllowExcludeOption()) {
                    fCard.setAllowExcludeOption(false);
                }
            }
        }, this);

        // consistency check. Check if any other card has the same succesor pointer

        if (!currId) {
            return;
        }

        this._filterCards().forEach(function (fCard) {
            if (fCard !== filterCard) {
                if (fCard.getSuccessor() === filterCard.getSuccessor()) {
                    var succConst = fCard.getConstraintForAttribute("_succ");
                    if (succConst) {
                        succConst.setValueState(sap.ui.core.ValueState.Error);
                        succConst.setSelectedKey("");
                        jQuery.sap.delayedCall(600, succConst, succConst.setValueState, [sap.ui.core.ValueState.None]);
                    }
                }
            }
        });
    };

    BoolFilterContainer.prototype._checkParentNextCycle = function (filterCard, referenceID) {
        if (filterCard.getCardId() === referenceID) {
            return true;
        }

        var nextInteraction = filterCard.getSuccessor();
        if (nextInteraction && this._checkParentNextCycle(this._getFilterCardByCardId(nextInteraction), referenceID)) {
            return true;
        }

        var parentInteraction = filterCard.getParentInteraction();
        if (parentInteraction && this._checkParentNextCycle(this._getFilterCardByCardId(parentInteraction), referenceID)) {
            return true;
        }

        return false;
    };

    /**
     * Update the list of possible successors and set the enabled state of the BasicData MenuItem.
     */
    BoolFilterContainer.prototype._updateFilterCards = function () {
        // we need to disable / enable the basic data item as
        // needed since the basic data card must be a singleton
        var aMenuItems = this.getFilterMenu().getItems();
        var oBasicDataItem = aMenuItems.filter(function (oMenuItem) {
            return oMenuItem.data("key") === "patient";
        })[0];

        var aPossibleSuccessors = [{
            key: "",
            text: Utils.getText("MRI_PA_FILTERCARD_SELECTION_NONE")
        }];

        var aPossibleParents = [{
            key: "",
            text: Utils.getText("MRI_PA_FILTERCARD_SELECTION_NONE")
        }];

        var bBasicDataItemEnabled = true;

        this._filterCards().forEach(function (oFilterCard) {
            if (oFilterCard.getKey() === "patient") {
                bBasicDataItemEnabled = false;
            } else {
                if (oFilterCard.getAllowSuccessorConstraint() || oFilterCard.getAllowAdvancedTimeFilter()) {
                    // only put this card in the list if it allows successors
                    aPossibleSuccessors.push({
                        key: oFilterCard.getCardId(),
                        text: oFilterCard.getName()
                    });
                }

                if (oFilterCard.getAllowParentConstraint()) {
                    aPossibleParents.push({
                        key: oFilterCard.getCardId(),
                        text: oFilterCard.getName(),
                        filter: oFilterCard.getKey()
                    });
                }
            }
        });

        if (oBasicDataItem) {
            oBasicDataItem.setEnabled(bBasicDataItemEnabled);
        }

        this._filterCardItemModel.setProperty("/items", aPossibleSuccessors);
        this._filterCardItemModel.setProperty("/parents", aPossibleParents);
    };

    /**
     * Create the Add FilterCard Menu.
     * If the Container is an all-container, the Menu includes an entry for the Basic Data FilterCard.
     * @private
     */
    BoolFilterContainer.prototype._createAddFilterCardMenu = function () {
        var aMenuItems = [];
        var oMenuItem;

        // first add patient attributes a.k.a. basic data
        if (this.getAllContainer()) {
            oMenuItem = new MenuItem({
                text: Utils.getText("MRI_PA_FILTERCARD_TITLE_BASIC_DATA")
            });
            oMenuItem.data("key", "patient");
            aMenuItems.push(oMenuItem);
        }

        MriFrontendConfig.getFrontendConfig().getFilterCards().forEach(function (oFilterCardConfig) {
            if (!oFilterCardConfig.isBasicData()) {
                oMenuItem = new MenuItem({
                    text: oFilterCardConfig.getName()
                });
                oMenuItem.data("key", oFilterCardConfig.getConfigPath());
                aMenuItems.push(oMenuItem);
            }
        });

        this._oAddFilterCardMenu = new Menu({
            items: aMenuItems,
            itemSelect: [this._onAddFilterCardMenuItemSelected, this]
        });
        this._oAddFilterCardButton.addDependent(this._oAddFilterCardMenu);
    };

    /**
     * Create a FilterCard in the context of this Container.
     * @param   {string}                          sConfigPath      Path for the FilterCard configuration
     * @param   {number}                          [iExternalIndex] Optional index of the FilterCard
     * @param   {string}                          [sName]          Optional FilterCard name
     * @returns {sap.hc.mri.pa.ui.lib.FilterCard} New FilterCard.
     */
    BoolFilterContainer.prototype.createFilterCard = function (sConfigPath, iExternalIndex, sName) {
        var oFilterCard;
        if (sConfigPath === "patient") {
            oFilterCard = new FilterCard({
                key: sConfigPath,
                name: sName || Utils.getText("MRI_PA_FILTERCARD_TITLE_BASIC_DATA"),
                allowExcludeOption: false,
                allowTimeConstraint: false,
                allowSuccessorConstraint: false,
                allowParentConstraint: false,
                allowAdvancedTimeFilter: false
            });
        } else {
            var iIndex;
            if (typeof iExternalIndex === "undefined" || iExternalIndex === null) {
                iIndex = this.getParent().getNextFilterCardNumber(sConfigPath);
            } else {
                // Block external index in counter to ensure correct counting
                this.getParent().blockFilterCardNumber(sConfigPath, iExternalIndex);
                iIndex = iExternalIndex;
            }

            var oFilterCardConfig = MriFrontendConfig.getFrontendConfig().getFilterCardByPath(sConfigPath);
            sName = sName || oFilterCardConfig.getName() + " " + Utils.getLetterForNumber(iIndex);

            var useNextInteraction = MriFrontendConfig.getFrontendConfig().isAdvancedTimeFilteringEnabled();

            var allowTimeConstraint = MriFrontendConfig.getFrontendConfig().isAbsoluteTimeFilteringEnabled();

            if (oFilterCardConfig.hasAnnotation("genomics_variant_location")) {
                // special case for mutation filter cards
                oFilterCard = new VariantFilterCard({
                    key: sConfigPath,
                    name: sName,
                    index: iIndex,
                    allowTimeConstraint: false,
                    allowSuccessorConstraint: false,
                    allowParentConstraint: false,
                    allowAdvancedTimeFilter: false
                });
            } else {
                oFilterCard = new FilterCard({
                    key: sConfigPath,
                    name: sName,
                    index: iIndex,
                    allowTimeConstraint: allowTimeConstraint,
                    allowSuccessorConstraint: this.getAllContainer() && useNextInteraction,
                    allowParentConstraint: this.getAllContainer(),
                    allowAdvancedTimeFilter: this.getAllContainer() && !useNextInteraction
                });
            }
        }

        oFilterCard.reinit();
        return oFilterCard;
    };

    /**
     * Handler for Add FilterCard Menu selection.
     * Create a new FilterCard based on the selection.
     * @param {sap.ui.base.Event} oEvent Menu itemSelected Event
     */
    BoolFilterContainer.prototype._onAddFilterCardMenuItemSelected = function (oEvent) {
        var sConfigKey = oEvent.getParameter("item").data("key");
        var newFilterCard = this.createFilterCard(sConfigKey);
        newFilterCard.setProperty("isNew", true);
        this.addFilterCard(newFilterCard);
        this.rerender();
    };

    BoolFilterContainer.prototype._layout = function () {
        return this.getAggregation("layout");
    };

    // convenience method, return array of filtercards
    BoolFilterContainer.prototype._filterCards = function () {
        return this._layout() ? this._layout().getItems() : [];
    };

    BoolFilterContainer.prototype._getWidthOfDescriptionColumns = function () {
        return Math.min(this._widthOfLargestDescriptionColumn, this._maxWidthOfDescriptionColumns);
    };

    BoolFilterContainer.prototype.setDescriptionColumnsMaxWidth = function (nDescriptionColumnsMaxWidth) {
        this._maxWidthOfDescriptionColumns = nDescriptionColumnsMaxWidth;
        this._resizeFiltercards();
    };

    BoolFilterContainer.prototype._resizeFiltercards = function () {
        var nDescriptionColumnWidth = this._getWidthOfDescriptionColumns();

        this._layout().getItems().forEach(function (oFilterCard) {
            oFilterCard.setDescriptionColumnsWidth(nDescriptionColumnWidth);
        });
    };

    /**
     * Add a FilterCard to this Container.
     * @param {sap.hc.mri.pa.ui.lib.FilterCard} oFilterCard A FilterCard that is not in any Container.
     */
    BoolFilterContainer.prototype.addFilterCard = function (oFilterCard) {
        this._layout().addItem(oFilterCard);
        oFilterCard.setDescriptionColumnsWidth(this._getWidthOfDescriptionColumns());

        oFilterCard.attachChange(this.fireChange, this);

        oFilterCard.attachSuccessorChanged(function (oControlEvent) {
            this._checkSuccessorPointers(oControlEvent.getSource());
            this._updateFilterCardsOrder();
        }, this);

        oFilterCard.attachParentChanged(function (oControlEvent) {
            this._checkSuccessorPointers(oControlEvent.getSource());
        }, this);

        oFilterCard.attachRemove(function (oEvent) {
            // Add delay to wait until the FilterCard was destroyed
            jQuery.sap.delayedCall(0, this, this._onRemoveFilterCard, [oEvent.getParameter("cardId"), oEvent.getSource().getKey(), oEvent.getSource().getIndex()]);
        }, this);

        oFilterCard.attachRename(function () {
            this._updateFilterCards();
            this.fireChange();
        }, this);

        oFilterCard.attachNewDescriptionLabelAddedWithWidth(function (oEvent) {
            var nLabelWidth = oEvent.getParameter("width");

            if (nLabelWidth > this._widthOfLargestDescriptionColumn) {
                this._widthOfLargestDescriptionColumn = nLabelWidth;
                this._resizeFiltercards();
            }
        }, this);

        this._updateFilterCards();
        oFilterCard.setModel(this._filterCardItemModel);

        if (oFilterCard.getProperty("isNew")) {
            this.fireNewCardAdded({ cardName: oFilterCard.getName() });
        }

        this._updateFilterCardsOrder();
        this.fireChange();
    };

    /**
     * Handler for the FilterCard remove envent.
     * Update the successors and parents and reorder the remaining FilterCards.
     * @private
     * @param {string} sRemovedFilterCardId The id of the removed FilterCard.
     * @param {string} sRemovedFilterCardKey The key of the removed FilterCard.
     * @param {integer} iRemovedFilterCardIndex The index of the removed FilterCard.
     */
    BoolFilterContainer.prototype._onRemoveFilterCard = function (sRemovedFilterCardId, sRemovedFilterCardKey, iRemovedFilterCardIndex) {
        this._updateFilterCards();

        // Fire event to inform BoolContainer which card was removed (for index tracking)
        this.fireCardRemoved({
            cardKey: sRemovedFilterCardKey,
            cardIndex: iRemovedFilterCardIndex
        });

        this._filterCards().forEach(function (oFilterCard) {
            var oSuccessorConstraint = oFilterCard.getConstraintForAttribute("_succ");
            if (oFilterCard.getSuccessor() === sRemovedFilterCardId) {
                if (oSuccessorConstraint) {
                    oSuccessorConstraint.setSelectedKey("");
                }
            }

            var oParentConstraint = oFilterCard.getConstraintForAttribute("_parentInteraction");
            if (oFilterCard.getParentInteraction() === sRemovedFilterCardId) {
                if (oParentConstraint) {
                    oParentConstraint.setSelectedKey("");
                }
            }
        });


        this._updateFilterCardsOrder();
        this.fireChange();
        this.rerender();
    };

    BoolFilterContainer.prototype._getFilterCardByCardId = function (cardId) {
        var filterCards = this._filterCards();
        var retval = null;
        filterCards.some(function (element) {
            if (element.getCardId() === cardId) {
                retval = element;
                return true;
            }
            return false;
        });
        return retval;
    };

    /**
     * Given a path, the filter card and attribute from the path will be created if doesn't exist.
     * Optionally, some values can be set for the attribute constraint.
     * @param {string}                                 sInteractionInstancePath The path of the interaction. This can be either a generic path or an instance. If the path is generic or the instance doesn't exist, a new instance will be created
     * @param {string}                                 sAttributeKey            The key of the attribute to be created/modified. This is relative to the interaction path
     * @param {string[]}                               aValues                  An array of values to be added to the contraint corresponding to the attribute
     * @param {sap.hc.mri.pa.ui.Utils.valuesMergeMode} mergeMode                The merging strategy, specifying the way the new values should be merged with the existing ones
     * @returns {string} The path of the attribute that was created/modified
     */
    BoolFilterContainer.prototype.setFilterValues = function (sInteractionInstancePath, sAttributeKey, aValues, mergeMode) {
        var oFilterCard = this._getFilterCardById(sInteractionInstancePath);
        if (!oFilterCard) {
            // the filter card doesn't exists, we need to create it first
            oFilterCard = this.createFilterCard(MriFrontendConfig.getFrontendConfig().getGenericPath(sInteractionInstancePath));
            oFilterCard.setProperty("isNew", true);
            this.addFilterCard(oFilterCard);
        }
        oFilterCard.setFilterValues(sAttributeKey, aValues, mergeMode);
        return oFilterCard.getCardId() + ".attributes." + sAttributeKey;
    };

    /**
     * This method changes the order of the cards so that a card always follows its predecessor (if one exists)
     */
    BoolFilterContainer.prototype._updateFilterCardsOrder = function () {
        // This will contain the graph induced on the cards by the successor relationship
        // each node in the graph is keyed with the card id and contains pointers to its successor and predecessor
        var fCardMap = {};

        this._filterCards().forEach(function (fCard) {
            var id = fCard.getCardId();
            var succ = fCard.getSuccessor();

            if (!fCardMap[id]) {
                fCardMap[id] = {};
            }

            if (succ) {
                if (!fCardMap[succ]) {
                    fCardMap[succ] = {};
                }
                fCardMap[succ].pred = id;
                fCardMap[id].succ = succ;
            }
        });

        // this array will contain the final ordering of card Ids
        var finalOrder = [];

        var nodes = this._filterCards().map(function (fCard) {
            fCard.removeStyleClass("sapMriPaFilterCardWithPredecessor");
            fCard.removeStyleClass("sapMriPaFilterCardWithSuccessor");
            return fCard.getCardId();
        });


        // algorithm: we find a card with no predecessors and build a chain following the successor pointers, placing
        // the card we thus find in the "final_order" array
        var currNode;
        do {
            // pick as curr_node a card with no predecessor and remove it from the "nodes" array
            currNode = null;
            // eslint-disable-next-line no-loop-func
            nodes.some(function (id, i) {
                if (!fCardMap[id].pred) {
                    currNode = id;
                    nodes.splice(i, 1);
                    return true;
                }
                return false;
            });

            if (currNode) {
                // curr_node is a node with no predecessor. We follow the successor chain and add
                // the cards to the final order

                var headNode = currNode;
                while (headNode) {
                    finalOrder.push(headNode);
                    headNode = fCardMap[headNode].succ;
                }
            }
        } while (currNode); // terminate when there are no cards without predecessors left

        // finally: remove the cards from the layout (if present) and reinsert them according to the order in the "final_order" array
        if (this._layout()) {
            var fCards = this._layout().removeAllItems();
            var that = this;
            finalOrder.forEach(function (id) {
                fCards.some(function (card) {
                    if (card.getCardId() === id) {
                        if (fCardMap[id].pred) {
                            card.addStyleClass("sapMriPaFilterCardWithPredecessor");
                        }
                        if (fCardMap[id].succ) {
                            card.addStyleClass("sapMriPaFilterCardWithSuccessor");
                        }
                        that._layout().addItem(card);
                        return true;
                    }
                    return false;
                });
            });
        }
    };

    return BoolFilterContainer;
});
