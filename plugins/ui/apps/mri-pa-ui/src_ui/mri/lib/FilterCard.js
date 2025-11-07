sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "./BoolItem",
    "./Constraint",
    "./AdvancedTimeFilter",
    "./library",
    "./MriFrontendConfig",
    "./ifr/BooleanContainers",
    "./ifr/InternalFilterRepresentation",
    "sap/m/Button",
    "sap/m/Dialog",
    "sap/m/Input",
    "sap/m/Text",
    "sap/m/VBox",
    "sap/ui/commons/Label",
    "sap/ui/commons/layout/MatrixLayout",
    "sap/ui/commons/layout/MatrixLayoutCell",
    "sap/ui/commons/layout/MatrixLayoutRow",
    "sap/ui/core/Control",
    "sap/ui/core/ListItem",
    "sap/ui/core/Item",
    "sap/ui/layout/HorizontalLayout",
    "sap/ui/model/Filter",
    "sap/ui/model/json/JSONModel",
    "sap/ui/unified/Menu",
    "sap/ui/unified/MenuItem"
], function (jQuery, Utils, BoolItem, Constraint, AdvancedTimeFilter, library, MriFrontendConfig, BooleanContainers, InternalFilterRepresentation, Button, Dialog, Input, Text, VBox, Label, MatrixLayout, MatrixLayoutCell, MatrixLayoutRow, Control, ListItem, Item, HorizontalLayout, Filter, JSONModel, Menu, MenuItem) {
    "use strict";

    /**
     * Constructor for a new FilterCard.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * FilterCard Control.
     * @extends sap.hc.mri.pa.ui.lib.BoolItem
     * @alias sap.hc.mri.pa.ui.lib.FilterCard
     */
    var FilterCard = BoolItem.extend("sap.hc.mri.pa.ui.lib.FilterCard", {
        metadata: {
            properties: {
                /**
                 * Config object storing the definitions of the supported attributes on this card.
                 */
                config: {
                    type: "object"
                },
                /**
                 * Key of the entity (interaction / condition / patient) to which this card belongs.
                 */
                key: {
                    type: "string"
                },
                /**
                 * Name / title of the FilterCard.
                 */
                name: {
                    type: "string",
                    defaultValue: ""
                },
                /**
                 * Is this FilterCard currently used as an exclude filter?
                 */
                excludeFilter: {
                    type: "boolean",
                    defaultValue: false
                },
                /**
                 * Is this FilterCard have advanced time filter activated?
                 */
                advancedTimeFilter: {
                    type: "boolean",
                    defaultValue: false
                },
                /**
                 * Card index.
                 */
                index: {
                    type: "int"
                },
                /**
                 * Can this fitercard be excluded?
                 */
                allowExcludeOption: {
                    type: "boolean",
                    defaultValue: true
                },
                /**
                 * Can advanced time filter work in this filtercard?
                 */
                allowAdvancedTimeFilter: {
                    type: "boolean",
                    defaultValue: true
                },
                /**
                 * Does this filtercard provide temporal constraints. If set to false, temporal constraints won't be
                 * available in the more menu of this card.
                 */
                allowTimeConstraint: {
                    type: "boolean",
                    defaultValue: true
                },
                /**
                 * Does this filtercard provide successor constraints. If set to false, successor constraints won't be
                 * available in the more menu of this card and other cards won't be able to chose this card as successor
                 */
                allowSuccessorConstraint: {
                    type: "boolean",
                    defaultValue: true
                },

                allowParentConstraint: {
                    type: "boolean",
                    defaultValue: true
                },
                /**
                 * Set this to true when a user triggered action causes for a new filter card to be created (e.g. add filter card, add filter card via axis selection) 
                 */
                isNew: {
                    type: "boolean",
                    defaultValue: false
                }
            },
            aggregations: {
                /**
                 * Layout for all contained controls.
                 */
                layout: {
                    type: "sap.m.VBox",
                    multiple: false,
                    visibility: "hidden"
                }
            },
            events: {
                /**
                 * Triggered by change events passed through from individual constraint controls.
                 */
                change: {},
                /**
                 * Fired after the FilterCard is removed.
                 */
                remove: {
                    /**
                     * Id of this FilterCard.
                     */
                    cardId: {
                        type: "string"
                    }
                },
                /**
                 * Fired when the name is changed.
                 */
                rename: {},
                successorChanged: {},
                parentChanged: {},
                newDescriptionLabelAddedWithWidth: {}
            }
        },
        renderer: function (oRenderManager, oControl) {
            oRenderManager.write("<div");
            oRenderManager.addClass("sapMriPaFilterCard");
            if (oControl.getProperty("isNew")) {
                oRenderManager.addClass("sapMriPaFilterCardNew");
            }
            if (oControl.getProperty("excludeFilter")) {
                oRenderManager.addClass("sapMriPaFilterCardExclude");
            }
            oRenderManager.writeControlData(oControl);
            oRenderManager.writeClasses();
            oRenderManager.write(">");
            if (oControl.getProperty("excludeFilter")) {
                oRenderManager.write("<div class='sapMriPaFilterCardExcludeText'>");
                oRenderManager.write(Utils.getText("MRI_PA_LABEL_EXCLUDED"));
                oRenderManager.write("</div>");
            }
            oRenderManager.renderControl(oControl.getAggregation("layout"));
            oRenderManager.write("</div>");
        }
    });

    /**
     * Get the currently active Constraints of this FilterCard.
     * Constraints are considered active if they can currently be used to filter the result set.
     * @private
     * @returns {sap.hc.mri.pa.ui.lib.Contstraint[]} List of Constraint controls.
     */
    FilterCard.prototype._getConstraints = function () {
        return this._constraintLayout.getItems();
    };

    FilterCard.prototype.getIFR = function () {
        var mFilterCardSettings = this._getIFRSettings();
        var oIFRFilterCard = new InternalFilterRepresentation.FilterCard(mFilterCardSettings);

        if (this.getExcludeFilter()) {
            return new BooleanContainers.Not([oIFRFilterCard]);
        } else {
            return oIFRFilterCard;
        }
    };

    FilterCard.prototype.getAdvancedTimeFilterModel = function () {
        if (this.getAdvancedTimeFilter()) {
            return this._advancedTimeLayout.getAdvancedTimeFilterModel();
        } else {
            return [];
        }
    };

    FilterCard.prototype.setAdvancedTimeFilterModel = function (timeFilterDataRequest) {
        this._advancedTimeLayout.setAdvancedTimeFilterModel(timeFilterDataRequest);
        this.setProperty("advancedTimeFilter", true);
        this._updateMoreMenuItems();
        this._updateAdvancedTimeFilterDisplay();
    };

    FilterCard.prototype._getIFRSettings = function () {
        var mFilterCardSettings = {
            configPath: this._getOwnConfig().getConfigPath(),
            instanceNumber: this.getIndex() || 0,
            instanceID: this._getInstanceID(),
            name: this.getName(),
            attributes: new BooleanContainers.And(this._getConstraints().filter(function (oConstraint) {
                // TODO: Why is there an inactive pcount constraint?
                return oConstraint.getAttrkey() !== "_succ" && oConstraint.getAttrkey() !== "_relTime" && oConstraint.getAttrkey() !== "_parentInteraction";
            }).map(function (oConstraint) {
                return oConstraint.getIFR();
            }))
        };
        if (this.getSuccessor()) {
            var oConstraint = this.getConstraintForAttribute("_relTime");
            mFilterCardSettings.successor = new InternalFilterRepresentation.Successor(this.getSuccessor(), oConstraint.getLower(), oConstraint.getUpper());
        }

        if (this.getParentInteraction()) {
            mFilterCardSettings.parentInteraction = this.getParentInteraction();
        }

        if (this.getAdvancedTimeFilter()) {
            var oAtfIFR = this._advancedTimeLayout.getIFR();
            if (oAtfIFR && oAtfIFR.filters && oAtfIFR.filters.length > 0) {
                mFilterCardSettings.advanceTimeFilter = oAtfIFR;
            }
        }

        return mFilterCardSettings;
    };

    /**
     * Get the instance id.
     * The id is a combination of the config path and the card index.
     * @private
     * @returns {string} FilterCard instance id
     */
    FilterCard.prototype._getInstanceID = function () {
        return this._getOwnConfig().getConfigPath() + (this.getIndex() ? "." + this.getIndex() : "");
    };

    FilterCard.prototype.setExcludeFilter = function (bExcludeFilter) {
        this.setProperty("excludeFilter", bExcludeFilter);
        this._updateMoreMenuItems();
        this.fireChange();
    };

    FilterCard.prototype._updateAdvancedTimeFilterDisplay = function () {
        var visible = this.getAdvancedTimeFilter();
        this._advancedTimeLayout.setVisible(visible);
        this.getAggregation("layout").getItems()[3].setVisible(visible);
    };

    FilterCard.prototype.setAdvancedTimeFilter = function (value) {
        this.setProperty("advancedTimeFilter", value);

        if (value) {
            this._advancedTimeLayout.addTimeFilter();
        } else {
            this._advancedTimeLayout.clearAllTimeFilter();
        }

        this._updateMoreMenuItems();
        this._updateAdvancedTimeFilterDisplay();
    };

    FilterCard.prototype.getCardId = function () {
        var index = this.getIndex();
        return this.getKey() + (typeof index !== "undefined" ? "." + index : "");
    };

    FilterCard.prototype.setKey = function (key) {
        this.setProperty("key", key);
    };

    FilterCard.prototype._getOwnConfig = function () {
        if (this.getKey()) {
            return MriFrontendConfig.getFrontendConfig().getFilterCardByPath(this.getKey());
        }
        return null;
    };

    FilterCard.prototype.init = function () {
        this._descriptionColumnsWidth = 0;
        // title must always exist because it is used in get-/setName()
        this._title = new Label({
            width: "100%"
        });
        this._title.addStyleClass("sapMriPaFilterCardTitle");
    };

    /**
     * Cleans up the element instance before destruction.
     * Fires the remove event.
     * @protected
     */
    FilterCard.prototype.exit = function () {
        this.setAdvancedTimeFilter(false);
        this.fireRemove({
            cardId: this.getCardId()
        });
    };

    // reinitialize: remove all constraints, rebuild menu etc.
    FilterCard.prototype.reinit = function () {
        this._buildLayout();
        this._constraints = [];
        this._mConstraints = {};
        this._addDefaultConstraints();
    };

    FilterCard.prototype._addDefaultConstraints = function () {
        var that = this;
        this._getOwnConfig().getFilterAttributes().forEach(function (oneAttrConfig) {
            if (oneAttrConfig.isInitialInFilterCard()) {
                that._addConstraint(Constraint.createConstraint(oneAttrConfig.getConfigKey(), {
                    type: oneAttrConfig.getType(),
                    name: oneAttrConfig.getName(),
                    cardID: that._getInstanceID()
                }, that.getKey(), that.getName()), null, true);
            }
        });
    };

    FilterCard.prototype.onAfterRendering = function () {
        if (this._timeConstraintLayout.getItems().length > 0) {
            jQuery(".sapMriPaTimeConstraintLayout", this.getDomRef()).parent().addClass("sapMriPaTimeConstraintCell");
        }
        if (this.getProperty("isNew")) {
            var layout = this.getAggregation("layout");
            document.getElementById(layout.getId()).getElementsByTagName('label')[0].focus();
            layout.attachBrowserEvent("click", function (oEvent) {
                layout.detachBrowserEvent("click");
                this.setProperty("isNew", false);
            }, this);
        }
    };

    FilterCard.prototype._createHelpContent = function () { /* implemented by subclass */ };

    FilterCard.prototype._isAttributeVisible = function (attribute) {
        return !attribute.hasOwnProperty("scope") || this._isVisibleByScope(attribute.scope);
    };

    FilterCard.prototype._isVisibleByScope = function (scope) {
        if (scope && scope.hasOwnProperty("FilterCard") && !scope.FilterCard) {
            return false;
        }
        return true;
    };

    // adds a new constraint control to the card
    FilterCard.prototype._addConstraint = function (constraint, pos, visible) {
        constraint.attachNewDescriptionLabelAddedWithWidth(function (oEvent) {
            var nDescriptionLabelWidth = oEvent.getParameter("width");
            this.fireNewDescriptionLabelAddedWithWidth({
                width: nDescriptionLabelWidth
            });
        }, this);

        constraint.setDescriptionColumnWidth(this._descriptionColumnsWidth);

        this._constraints.push(constraint);

        if (!pos) {
            pos = 0;
        }

        if (visible) {
            switch (pos) {
                case 0: // add as last constraint below the title bar
                default:
                    this._constraintLayout.addItem(constraint);
                    break;
                case 1: // add as first contraint below the title bar
                    this._constraintLayout.insertItem(constraint, 0);
                    break;
                case 2: // add as time layout constraint (Always bottom, special color handling)
                    this._timeConstraintLayout.addItem(constraint);
                    break;
            }
        }

        this._updateMoreMenuItems();
        constraint.attachChanged(this.fireChange, this);
    };

    FilterCard.prototype.setDescriptionColumnsWidth = function (nColumnWidth) {
        this._descriptionColumnsWidth = nColumnWidth;

        this._constraintLayout.getItems().forEach(function (constraint) {
            constraint.setDescriptionColumnWidth(nColumnWidth);
        });

        this._timeConstraintLayout.getItems().forEach(function (constraint) {
            constraint.setDescriptionColumnWidth(nColumnWidth);
        });
    };

    /**
     * Remove a Constraint from the FilterCard.
     * @param {sap.hc.mri.pa.ui.lib.Constraint} oConstraint The Constraint to be removed
     */
    FilterCard.prototype._removeConstraint = function (oConstraint) {
        this._constraints = this._constraints.filter(function (element) {
            return element !== oConstraint;
        });
        oConstraint.destroy();
        this._updateMoreMenuItems();
        this.fireChange();
    };

    /**
     * Remove all Constraints from the FilterCard.
     */
    FilterCard.prototype.removeAllConstraints = function () {
        this._constraints.forEach(function (oConstraint) {
            oConstraint.destroy();
        }, this);
        this._constraints = [];
        this._updateMoreMenuItems();
        this.fireChange();
    };

    /**
     * Removes all values from all attributes (=constraints) of a filter card,
     * i.e., resetting the filter card to its initial state.
     */
    FilterCard.prototype.clearAllConstraints = function () {
        this._constraints.forEach(function (oConstraint) {
            oConstraint.clear();
        });
        this.setAdvancedTimeFilter(false);
        this.fireChange();
    };

    /**
     * Set the name of the FilterCard.
     * @param {string} sName The new name.
     */
    FilterCard.prototype.setName = function (sName) {
        this.setProperty("name", sName, true);
        this._title.setText(sName);
    };

    // construct the basic layout including title bar
    FilterCard.prototype._buildLayout = function () {
        var layout = new VBox();

        this.setAggregation("layout", layout);

        this._timeConstraintLayout = new VBox();

        this._timeConstraintLayout.onAfterRendering = function () {
            this.onAfterRendering();
        }.bind(this);

        this._titleB = this._getTitleBar();
        layout.addItem(this._titleB);

        this._constraintLayout = new VBox();

        // have to apply padding and background to the cells of the vertical layout
        layout.addItem(this._constraintLayout);
        layout.addItem(this._timeConstraintLayout.addStyleClass("sapMriPaTimeConstraintLayout"));

        this._advancedTimeLayout = new AdvancedTimeFilter({ visible: false });

        this._advancedTimeLayout.setFilterCardId(this.getCardId());
        this._advancedTimeLayout.setFilterCardName(this.getName());
        var advancedTimeFilterModel = new JSONModel({ timeFilters: [] });
        this._advancedTimeLayout.setModel(advancedTimeFilterModel, "timeFilterModel");
        this._advancedTimeLayout.attachFilterCleared(function () {
            this.setAdvancedTimeFilter(false);
        }, this);
        this._advancedTimeLayout.attachChangeEvent(function () {
            this.fireChange();
            this.fireParentChanged();
        }, this);
        layout.addItem(this._advancedTimeLayout);
    };

    /**
     * Construct title bar with more and close buttons for the card.
     * @returns {sap.ui.commons.MatrixLayout} Layout for the title bar.
     */
    FilterCard.prototype._getTitleBar = function () {
        // new horizontal layout for title bar
        var layout = new MatrixLayout({
            width: "100%",
            columns: 2,
            widths: ["auto", "35px"]
        });
        // add button to open MORE... menu
        var oMenu = this._createMoreMenu();
        var oMoreButton = new Button({
            icon: "sap-icon://drop-down-list",
            tooltip: Utils.getText("MRI_PA_TOOLTIP_FILTERCARD_MOREMENU_BUTTON"),
            type: sap.m.ButtonType.Transparent,
            press: [function (oEvent) {
                var oButton = oEvent.getSource();
                oMenu.open(true, oButton, sap.ui.core.Popup.Dock.BeginTop, sap.ui.core.Popup.Dock.BeginBottom, oButton);
            }, this]
        });
        oMoreButton.addDependent(oMenu);
        var oHelpContent = this._createHelpContent();
        if (!oHelpContent) {
            layout.addRow(new MatrixLayoutRow({
                cells: [
                    new MatrixLayoutCell({
                        content: [this._title]
                    }),
                    new MatrixLayoutCell({
                        content: [oMoreButton]
                    })
                ]
            }));
        } else {
            oHelpContent.addStyleClass("sapMriPaFilterCardHelpButton");
            layout.addRow(new MatrixLayoutRow({
                cells: [
                    new MatrixLayoutCell({
                        content: new HorizontalLayout({
                            content: [this._title, oHelpContent]
                        })
                    }),
                    new MatrixLayoutCell({
                        content: [oMoreButton]
                    })
                ]
            }));
        }
        layout.addStyleClass("sapMriPaFilterCardTitleLayout");
        return layout;
    };

    // check if this card contains a constraint for a given attribute (key)
    FilterCard.prototype.getConstraintForAttribute = function (attributeKey) {
        // Transform a potential absolute attribute key to a relative one
        attributeKey = attributeKey.substr(attributeKey.lastIndexOf(".") + 1);
        if (!this._constraints) {
            return null;
        } else if (attributeKey === "time") {
            return this.getConstraintForAttribute("_absTime");
        } else if (attributeKey === "relation") {
            return this.getConstraintForAttribute("_succ");
        } else if (attributeKey === "parentInteraction") {
            return this.getConstraintForAttribute("_parentInteraction");
        }

        for (var i = 0; i < this._constraints.length; i++) {
            if (this._constraints[i].getAttrkey() === attributeKey) {
                return this._constraints[i];
            }
        }
        return null;
    };


    FilterCard.prototype._createConstraintForAttribute = function (attributeKey, attributeConfig) {
        var constraint;
        var that = this;
        switch (attributeKey) {
            case "_absTime":
                constraint = Constraint.createConstraint("_absTime", {
                    type: sap.hc.mri.pa.ui.lib.CDMAttrType.Date,
                    name: Utils.getText("MRI_PA_FILTERCARD_CONSTRAINT_ABSTIME"),
                    cardID: this._getInstanceID()
                }, this.getKey(), this.getName());
                break;
            case "_succ":
                constraint = Constraint.createConstraint("_succ", {
                    type: "relation",
                    name: Utils.getText("MRI_PA_FILTERCARD_CONSTRAINT_SUCCESSOR"),
                    cardID: this._getInstanceID()
                }, this.getKey(), this.getName());

                var filter = new Filter("key", sap.ui.model.FilterOperator.NE, this.getCardId());
                filter.fnTest = function (value) {
                    return value.toUpperCase() !== that.getCardId().toUpperCase();
                };
                constraint.bindItems("/items", new ListItem({
                    key: "{key}",
                    text: "{text}"
                }), null, [filter]);

                constraint.attachChanged(this.fireSuccessorChanged, this);
                break;
            case "_parentInteraction":

                var parentInteractionConfiguration = this._getOwnConfig()._oInternalConfigFilterCard.parentInteraction;
                var parentInteractionLabel = parentInteractionConfiguration.parentLabel || Utils.getText("MRI_PA_FILTERCARD_CONSTRAINT_PARENT");
                var allowedParentInteractions = parentInteractionConfiguration.possibleParent;

                constraint = Constraint.createConstraint("_parentInteraction", {
                    type: "parentInteraction",
                    name: parentInteractionLabel,
                    cardID: this._getInstanceID()
                }, this.getKey(), this.getName());


                var parentFilters = allowedParentInteractions.map(function (obj) {
                    var nFilter = new Filter("filter", sap.ui.model.FilterOperator.EQ, obj);
                    return nFilter;
                });
                parentFilters.push(new Filter("key", sap.ui.model.FilterOperator.EQ, ""));

                var orFilter = new sap.ui.model.Filter({
                    filters: parentFilters,
                    and: false
                });

                constraint.bindItems("/parents", new ListItem({
                    key: "{key}",
                    text: "{text}"
                }), null, [orFilter]);

                constraint.attachChanged(this.fireParentChanged, this);
                break;
            case "_relTime":
                constraint = Constraint.createConstraint("_relTime", {
                    type: "legacy-num",
                    name: Utils.getText("MRI_PA_FILTERCARD_CONSTRAINT_RELTIME"),
                    cardID: this._getInstanceID(),
                    lower: 1
                }, this.getKey(), this.getName());
                break;
            default:
                constraint = Constraint.createConstraint(attributeKey, {
                    type: attributeConfig.getType(),
                    name: attributeConfig.getName(),
                    cardID: this._getInstanceID()
                }, this.getKey(), this.getName());
        }

        return constraint;
    };

    // add constraint for a certain attribute (key)
    FilterCard.prototype.addConstraintForAttribute = function (attributeKey) {
        // Transform a potential absolute attribute key to a relative one
        attributeKey = attributeKey.substr(attributeKey.lastIndexOf(".") + 1);
        if (!this.getConstraintForAttribute(attributeKey)) {
            switch (attributeKey) {
                case "time":
                    this._addConstraint(this._createConstraintForAttribute("_absTime"), null, true);
                    break;
                case "relation":
                    this._addConstraint(this._createConstraintForAttribute("_succ"), 2, true);
                    this._addConstraint(this._createConstraintForAttribute("_relTime"), 2, true);
                    break;
                case "parentInteraction":
                    this._addConstraint(this._createConstraintForAttribute("_parentInteraction"), null, true);
                    break;
                case "_absTime":
                    this._addConstraint(this._createConstraintForAttribute("_absTime"), null, true);
                    break;
                default:
                    var attributeConfig = this._getOwnConfig().getAttributeByRelativeKey(attributeKey);
                    this._addConstraint(this._createConstraintForAttribute(attributeKey, attributeConfig), null, attributeConfig.isVisibleInFilterCard());
            }
            return attributeKey;
        }
    };

    /**
     * Remove Constraint for attribute key.
     * @private
     * @param {string} attributeKey Attribute key of the Constraint to be removed
     */
    FilterCard.prototype._removeConstraintForAttributeKey = function (attributeKey) {
        if (attributeKey === "time") {
            this._removeConstraint(this.getConstraintForAttribute("_absTime"));
        } else if (attributeKey === "relation") {
            this._removeConstraint(this.getConstraintForAttribute("_succ"));
            this._removeConstraint(this.getConstraintForAttribute("_relTime"));
            this.fireSuccessorChanged();
        } else if (attributeKey === "parentInteraction") {
            this._removeConstraint(this.getConstraintForAttribute("_parentInteraction"));
            this.fireParentChanged();
        } else {
            this._removeConstraint(this.getConstraintForAttribute(attributeKey));
        }
    };

    // construct more... menu
    FilterCard.prototype._createMoreMenu = function () {
        return new Menu({
            items: this._getMoreMenuItems(),
            itemSelect: [this._onMoreMenuItemSelected, this]
        });
    };

    FilterCard.prototype._getOneItemForMoreMenu = function (attrKey, attributeConfig, firstAttribute) {
        var item = new MenuItem({
            text: attributeConfig.getName(),
            startsSection: firstAttribute
        });
        item.data("key", attributeConfig.getConfigKey());
        return item;
    };

    // generate items for more... menu
    FilterCard.prototype._getMoreMenuItems = function () {
        if (!this._moreMenuItems && this.getKey()) {
            this._moreMenuItems = [];
            // add all attributes from config; those that already have a constraint are disabled
            var item = null;

            // add the generic items for the card

            // close (remove filter card)
            item = new MenuItem({
                text: Utils.getText("MRI_PA_FILTERCARD_CLOSE_BTN_LABEL"),
                icon: "sap-icon://decline",
                enabled: (this.getKey() || "") !== "patient",
                tooltip: Utils.getText("MRI_PA_TOOLTIP_FILTERCARD_CLOSE_BUTTON")
            });
            item.data("key", "close");
            this._moreMenuItems.push(item);

            // clear constraints
            item = new MenuItem({
                text: Utils.getText("MRI_PA_FILTERCARD_CLEAR_CONSTRAINTS_BTN_LABEL"),
                icon: "sap-icon://eraser",
                tooltip: Utils.getText("MRI_PA_TOOLTIP_FILTERCARD_CLEAR_CONSTRAINTS_BUTTON")
            });
            item.data("key", "clear");
            this._moreMenuItems.push(item);

            // rename FilterCard
            item = new MenuItem({
                text: Utils.getText("MRI_PA_FILTERCARD_RENAME"),
                icon: "sap-icon://edit"
            });
            item.data("key", "rename");
            this._moreMenuItems.push(item);

            var firstAttribute = true;

            var that = this;
            this._getOwnConfig().getFilterAttributes().forEach(function (oneConfigAttr) {
                item = that._getOneItemForMoreMenu(oneConfigAttr.getConfigKey(), oneConfigAttr, firstAttribute);
                if (item) {
                    firstAttribute = false;
                    that._moreMenuItems.push(item);
                }
            });

            if (this.getAllowTimeConstraint()) {
                // item for time constraint
                item = new MenuItem({
                    text: Utils.getText("MRI_PA_FILTERCARD_CONSTRAINT_TIME"),
                    startsSection: true
                });
                item.data("key", "time");
                this._moreMenuItems.push(item);
            }

            if (this.getAllowSuccessorConstraint()) {
                // item for successor constraint
                item = new MenuItem({
                    text: Utils.getText("MRI_PA_FILTERCARD_CONSTRAINT_SUCCESSOR"),
                    startsSection: !this.getAllowTimeConstraint()
                });
                item.data("key", "relation");
                this._moreMenuItems.push(item);
            }

            if (this.getAllowParentConstraint()) {
                var parentInteractionConfig = this._getOwnConfig()._oInternalConfigFilterCard.parentInteraction;
                if (parentInteractionConfig && parentInteractionConfig.possibleParent && parentInteractionConfig.possibleParent.length > 0) {
                    var parentInteractionLabel = parentInteractionConfig.parentLabel || Utils.getText("MRI_PA_FILTERCARD_CONSTRAINT_PARENT");
                    item = new MenuItem({
                        text: parentInteractionLabel
                    });
                    item.data("key", "parentInteraction");
                    this._moreMenuItems.push(item);
                }
            }

            if (this.getAllowAdvancedTimeFilter()) {
                // item for Advanced Time Filter
                item = new MenuItem({
                    text: Utils.getText("MRI_PA_TEMPORAL_FILTER_ADVANCED_TIME_FILTER")
                });
                item.data("key", "advancedTime");
                this._moreMenuItems.push(item);
            }

            if (this.getAllowExcludeOption()) {
                // item for exclusion filter
                item = new MenuItem({
                    text: Utils.getText("MRI_PA_MENUITEM_EXCLUDE"),
                    startsSection: true
                });
                item.data("key", "exclude");
                this._moreMenuItems.push(item);
            }
        }

        this._updateMoreMenuItems();
        return this._moreMenuItems;
    };

    // update more... menu items to reflect current constraint state
    FilterCard.prototype._updateMoreMenuItems = function () {
        if (this._moreMenuItems) {
            // hack: don't replace icons for the first 3 items, which are the delete, clear, and rename items
            for (var i = 3; i < this._moreMenuItems.length; i++) {
                // for the items without an icon, set the checkbox icon
                var sImageName;
                if (this.getConstraintForAttribute(this._moreMenuItems[i].data("key")) || this._moreMenuItems[i].data("key") === "exclude" && this.getExcludeFilter()
                    || this._moreMenuItems[i].data("key") === "advancedTime" && this.getAdvancedTimeFilter()) {
                    sImageName = "sap-icon://MRI/checkbox-checked";
                } else {
                    sImageName = "sap-icon://MRI/checkbox-unchecked";
                }
                this._moreMenuItems[i].setIcon(sImageName);
            }
        }
    };

    FilterCard.prototype.setAllowExcludeOption = function (bExclude) {
        this.setProperty("allowExcludeOption", bExclude);

        if (this._moreMenuItems) {
            this._moreMenuItems.forEach(function (oMenuItem) {
                if (oMenuItem.data("key") === "exclude") {
                    oMenuItem.setEnabled(bExclude);
                }
            });
        }
    };

    FilterCard.prototype.setAllowAdvancedTimeFilter = function (bool) {
        this.setProperty("allowAdvancedTimeFilter", bool);

        if (this._moreMenuItems) {
            this._moreMenuItems.forEach(function (oMenuItem) {
                if (oMenuItem.data("key") === "advancedTime") {
                    oMenuItem.setEnabled(bool);
                }
            });
        }
    };

    // handler for ItemSelected event of more... menu button
    FilterCard.prototype._onMoreMenuItemSelected = function (event) {
        var attributeKey = event.getParameter("item").data("key");
        // if there already is a constraint for this attribute, we remove it otherwise we add it
        if (attributeKey === "exclude") {
            this.setExcludeFilter(!this.getExcludeFilter());
        } else if (attributeKey === "advancedTime") {
            this.setAdvancedTimeFilter(!this.getAdvancedTimeFilter());
        } else if (attributeKey === "close") {
            this.destroy();
        } else if (attributeKey === "clear") {
            this.clearAllConstraints();
        } else if (attributeKey === "rename") {
            this._openRenameDialog();
        } else if (this.getConstraintForAttribute(attributeKey)) {
            this._removeConstraintForAttributeKey(attributeKey);
        } else {
            this.addConstraintForAttribute(attributeKey);
        }
    };

    /**
     * Return the successor of this card if one is selected, undefined otherwise
     * @returns {string} Id of the successor
     */
    FilterCard.prototype.getSuccessor = function () {
        var oSuccessorConstraint = this.getConstraintForAttribute("_succ");
        if (oSuccessorConstraint) {
            return oSuccessorConstraint.getSelectedKey();
        }
    };

    FilterCard.prototype.getParentInteraction = function () {
        var oParentConstraint = this.getConstraintForAttribute("_parentInteraction");
        if (oParentConstraint) {
            return oParentConstraint.getSelectedKey();
        }
    };

    FilterCard.prototype.getOrder = function () {
        return this._getOwnConfig() && this._getOwnConfig().getOrder();
    };

    /**
     * Creates/modifies a constraint for the given attribute key. If some values are specified, they will be set to the constraint
     *
     * @param    {string} sAttributeKey         The key of an attribute in the filter card. If the corresponding constraint doesn't exist, it will be created
     * @param    {string[]} aValues    An array of values to be added to the constraint
     * @param    {sap.hc.mri.pa.ui.Utils.valuesMergeMode} mergeMode The merging strategy, specifying the way the new values should be merged with the existing ones
     */
    FilterCard.prototype.setFilterValues = function (sAttributeKey, aValues, mergeMode) {
        // find the relevant constraint
        var oSearchedContraint = this.getConstraintForAttribute(sAttributeKey);
        if (!oSearchedContraint) {
            // create the constraint first
            this.addConstraintForAttribute(sAttributeKey);
            oSearchedContraint = this.getConstraintForAttribute(sAttributeKey);
        }
        // remove duplicated values. This can happen when multiple axes are selected
        var mSeen = {};
        aValues = aValues.filter(function (item) {
            var bSeen = mSeen.hasOwnProperty(item);
            mSeen[item] = true;
            return !bSeen;
        });
        oSearchedContraint.setFilterValues(aValues, mergeMode);
        this.fireChange();
    };

    /**
     * Open the rename dialog to prompt the user for a new FilterCard name.
     * Fires the rename event if the name is changed.
     * @private
     */
    FilterCard.prototype._openRenameDialog = function () {
        if (!this.oRenameDialog) {
            this.oRenameDialog = new Dialog({
                title: Utils.getText("MRI_PA_FILTERCARD_RENAME_DIALOG_TITLE"),
                icon: "sap-icon://question-mark",
                type: sap.m.DialogType.Message,
                content: [
                    new Text({
                        text: Utils.getText("MRI_PA_FILTERCARD_RENAME_DIALOG_TEXT")
                    }),
                    new Input({
                        value: "{rename>/name}",
                        valueLiveUpdate: true
                    })
                ],
                buttons: [
                    new Button({
                        enabled: "{= !!${rename>/name}}",
                        text: Utils.getText("MRI_PA_FILTERCARD_RENAME_DIALOG_BUTTON"),
                        press: [function (oEvent) {
                            this.oRenameDialog.close();
                            this.setName(oEvent.getSource().getModel("rename").getProperty("/name"));
                            this.fireRename();
                        }, this]
                    }),
                    new Button({
                        text: Utils.getText("MRI_PA_BUTTON_CANCEL"),
                        press: [function () {
                            this.oRenameDialog.close();
                        }, this]
                    })
                ]
            });
            this.oRenameDialog.addStyleClass(Utils.getContentDensityClass());
            this.oRenameDialog.addStyleClass("sapMMessageBoxQuestion");
            this.oRenameDialog.setModel(new JSONModel(), "rename");
            this.addDependent(this.oRenameDialog);
        }
        this.oRenameDialog.getModel("rename").setProperty("/name", this.getName());
        this.oRenameDialog.open();
    };

    return FilterCard;
});
