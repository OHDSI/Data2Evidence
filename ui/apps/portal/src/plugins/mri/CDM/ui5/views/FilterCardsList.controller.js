sap.ui.define([
    "hc/hph/cdw/config/ui/lib/ConfigUtils",
    "hc/hph/cdw/config/ui/lib/ConfigModelsManager",
    "hc/hph/cdw/config/ui/lib/FilterCard",
    "sap/ui/core/mvc/Controller"
], function (ConfigUtils, ConfigModelsManager, FilterCard, Controller) {
    "use strict";

    var FilterCardsListController = Controller.extend("hc.hph.cdw.config.ui.views.FilterCardsList");

    var configLevel = ConfigModelsManager.prototype.ConfigLevel;

    FilterCardsListController.prototype.onInit = function () {
        try {

            this._eventBus = sap.ui.getCore().getEventBus();
            this._eventBus.subscribe(
                ConfigUtils.configEvents.EVENT_CONFIG_HIDE_FC,
                this._unselectFilterCards, this);

            // create a model for the selected button
            this.oBtnModel = new sap.ui.model.json.JSONModel({
                selectedCard: ""
            });
            this.getView().setModel(this.oBtnModel,
                "cardsBtnsModel");

            // Set titles
            this
                .getView()
                .byId("accordion2Sec1")
                .bindProperty(
                    "title",
                    {
                        parts: ["hc.hph.cdw.config.ui.i18n>HPH_CDM_CFG_GEN_SETTINGS_TITLE", "configEditorModel>/generalSettingsFilterCards/length"],
                        formatter: function (title, len) {
                            return title + " (" + len + ")";
                        }
                    });

            this
                .getView()
                .byId("accordion2Sec2")
                .bindProperty(
                    "title",
                    {
                        parts: ["hc.hph.cdw.config.ui.i18n>HPH_CDM_CFG_DEF_FILTER_CARDS_TITLE", "configEditorModel>/filterCards/length"],
                        formatter: function (title, len) {
                            return title + " (" + len + ")";
                        }
                    });

            this
                .getView()
                .byId("accordion2Sec3")
                .bindProperty(
                    "title",
                    {
                        parts: ["hc.hph.cdw.config.ui.i18n>HPH_CDM_CFG_SUGGESTED_FILTER_CARDS_TITLE", "configEditorModel>/suggestedFilterCards/length"],
                        formatter: function (title, len) {
                            return title + " (" + len + ")";
                        }
                    });

            this
                .getView()
                .byId("accordion2Sec4")
                .bindProperty(
                    "title",
                    {
                        parts: ["hc.hph.cdw.config.ui.i18n>HPH_CDM_CFG_CONFIG_ADMIN_TEMPLATE_FILTER_CARDS_TITLE", "configEditorModel>/templateFilterCards/length"],
                        formatter: function (title, len) {
                            return title + " (" + len + ")";
                        }
                    });

            // Generic filter cards
            this._oDragDrop1 = this.getView().byId("dd1");

            // User-defined filter cards
            this._oDragDrop2 = this.getView().byId("dd2");

            // Suggested filter cards
            this._oDragDrop3 = this.getView().byId("dd3");

            // Template filter cards
            this._oDragDrop4 = this.getView().byId("dd4");
            this._oDragDrop5 = this.getView().byId("dd5");

            this._oTemplates = this.getView().byId("accordion2Sec4");

            this._eventBus.subscribe(
                ConfigUtils.configEvents.EVENT_TEMPLATE_LOAD,
                this.onTemplateReload,
                this);

            this._accordion2 = this.getView().byId("accordion2");

        } catch (ex) {
            console.log(ex);
        }

    };

    FilterCardsListController.prototype.onBeforeRendering = function () {
    };

    FilterCardsListController.prototype.onAfterRendering = function () {
        var that = this;

        // Generic filter cards
        this._oDragDrop1.bindAggregation(
            "content",
            {
                path: "configEditorModel>/generalSettingsFilterCards",
                sorter: new sap.ui.model.Sorter(
                    "order", false),
                factory: function () {
                    var temp = new hc.hph.cdw.config.ui.lib.FilterCard(
                        {
                            name: "{configEditorModel>name/value}",
                            press: function (oEvent) { that.onOneFilterCardPressed(oEvent); },
                            disabled: "{configEditorModel>isDisabled}",
                            description: "{configEditorModel>description}",
                            isNew: "{configEditorModel>isNew}",
                            status: "{configEditorModel>validity/status}",
                            canDelete: false,
                            canDuplicate: false,
                            canAccept: false,
                            totals: 0,
                            cardType: configLevel.FILTER_CARD
                        });
                    that._bindNewFilterCard.call(that, temp);
                    return temp;
                }
            });

        this._oDragDrop1
            .attachEvent(
                "contentReorder",
                function () {

                    var path = "/generalSettingsFilterCards";
                    var newOrderArray = [];
                    var pathArray;

                    that._oDragDrop1
                        .getContent()
                        .forEach(
                            function (oneCard) {
                                pathArray = oneCard.oBindingContexts[ConfigUtils.models.CONFIG_EDITOR].sPath
                                    .split("/");
                                newOrderArray
                                    .push(pathArray[pathArray.length - 1]);
                            });

                    sap.ui
                        .getCore()
                        .getEventBus()
                        .publish(
                            ConfigUtils.configEvents.EVENT_CONFIG_REORDER_ARRAY,
                            {
                                path: path,
                                newOrderArray: newOrderArray
                            });
                });

        // User-defined filter cards
        this._oDragDrop2
            .bindAggregation("content",
                {
                    path: "configEditorModel>/filterCards",
                    sorter: new sap.ui.model.Sorter(
                        "order", false),
                    factory: function () {
                        var temp = new hc.hph.cdw.config.ui.lib.FilterCard(
                            {
                                name: "{configEditorModel>name/value}",
                                disabled: "{configEditorModel>isDisabled}",
                                isNew: "{configEditorModel>isNew}",
                                description: "{configEditorModel>description}",
                                status: "{configEditorModel>validity/status}",
                                canDelete: true,
                                canAccept: false,
                                canDuplicate: true,
                                cardType: configLevel.FILTER_CARD,
                                press: function (oEvent) { that.onOneFilterCardPressed(oEvent); }
                            });
                        that._bindNewFilterCard.call(that, temp);
                        return temp;
                    }
                });

        this._oDragDrop2
            .attachEvent("contentReorder", function () {
                var path = "/filterCards";
                var newOrderArray = [];
                var pathArray;

                that._oDragDrop2
                    .getContent()
                    .forEach(
                        function (oneCard) {
                            pathArray = oneCard.oBindingContexts[ConfigUtils.models.CONFIG_EDITOR].sPath
                                .split("/");
                            newOrderArray
                                .push(pathArray[pathArray.length - 1]);
                        });

                sap.ui
                    .getCore()
                    .getEventBus()
                    .publish(
                        ConfigUtils.configEvents.EVENT_CONFIG_REORDER_ARRAY,
                        {
                            path: path,
                            newOrderArray: newOrderArray
                        });
            }
                );

        this._oDragDrop2
            .attachEvent("insertCopy", function (sourcePath) {
                var copySourcePath = sourcePath.getParameter("sourcePath");
                var copyitemOrder = sourcePath.getParameter("itemOrder");

                var copyTargetPath = "filterCards";
                sap.ui
                    .getCore()
                    .getEventBus()
                    .publish(
                        ConfigUtils.configEvents.EVENT_CONFIG_DUPLICATE_ELEM_FROM_OTHER,
                        {
                            sourcePath: copySourcePath,
                            targetPath: copyTargetPath,
                            itemOrder: copyitemOrder
                        });

            }
                );

        this._oDragDrop2.addCardSources(this._oDragDrop4);
        this._oDragDrop2.addCardSources(this._oDragDrop5);

        // Suggested filter cards
        this._oDragDrop3.bindAggregation("content",
            {
                path: "configEditorModel>/suggestedFilterCards",
                sorter: new sap.ui.model.Sorter(
                    "order", false),
                factory: function () {
                    var temp = new hc.hph.cdw.config.ui.lib.FilterCard(
                        {
                            name: "{configEditorModel>name/value}",
                            description: "{configEditorModel>description}",
                            disabled: "{configEditorModel>isDisabled}",
                            isNew: "{configEditorModel>isNew}",
                            status: "{configEditorModel>validity/status}",
                            canDuplicate: false,
                            canDelete: true,
                            canAccept: true,
                            cardType: configLevel.FILTER_CARD,
                            press: function (oEvent) { that.onOneFilterCardPressed(oEvent); }
                        });
                    that._bindNewFilterCard.call(that, temp);
                    return temp;
                }
            }
            );

        this._oDragDrop3
            .attachEvent("contentReorder", function () {
                var path = "/suggestedFilterCards";
                var newOrderArray = [];
                var pathArray;
                that._oDragDrop3
                    .getContent()
                    .forEach(function (oneCard) {
                        pathArray = oneCard.oBindingContexts[ConfigUtils.models.CONFIG_EDITOR].sPath
                            .split("/");
                        newOrderArray
                            .push(pathArray[pathArray.length - 1]);
                    });

                sap.ui
                    .getCore()
                    .getEventBus()
                    .publish(
                        ConfigUtils.configEvents.EVENT_CONFIG_REORDER_ARRAY,
                        {
                            path: path,
                            newOrderArray: newOrderArray
                        });
            });

        // Template filter cards Group
        this._oDragDrop4.bindAggregation("content",
            {
                path: "configEditorModel>/templateFilterCardsGroup",
                sorter: new sap.ui.model.Sorter(
                    "order", false),
                factory: function () {
                    var temp = new hc.hph.cdw.config.ui.lib.FilterCardGroup(
                        {
                            name: "{configEditorModel>name}",
                            filterCards: "{configEditorModel>filterCards}"
                        });
                    //that._bindNewFilterCard.call(that, temp);
                    return temp;
                }
            }
            );
        this._oDragDrop4.setProperty("targetObject", "#" + this._oDragDrop2.sId);

        // Template filter cards Details
        this._oDragDrop5.bindAggregation("content",
            {
                path: "configEditorModel>/templateFilterCards",
                sorter: new sap.ui.model.Sorter(
                    "order", false),
                factory: function () {
                    var temp = new hc.hph.cdw.config.ui.lib.FilterCard(
                        {
                            name: "{configEditorModel>name/value}",
                            description: "{configEditorModel>description}",
                            disabled: "{configEditorModel>isDisabled}",
                            isNew: "{configEditorModel>isNew}",
                            status: "{configEditorModel>validity/status}",
                            canDuplicate: false,
                            canDelete: false,
                            canAccept: false,
                            cardType: configLevel.FILTER_CARD,
                            press: function (oEvent) {
                                that.onOneFilterCardPressed(oEvent);
                            }
                        });
                    that._bindNewFilterCard.call(that, temp);
                    return temp;
                }
            }
            );
        this._oDragDrop5.setProperty("targetObject", "#" + this._oDragDrop2.sId);

    };

    FilterCardsListController.prototype.onExit = function () {
        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_HIDE_FC,
            this._unselectFilterCards,
            this);

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_TEMPLATE_LOAD,
            this.onTemplateReload,
            this);
    };

    FilterCardsListController.prototype._bindNewFilterCard = function (oRowTemplate) {

        var that = this;
        oRowTemplate.bindProperty("pressed", {
            model: "cardsBtnsModel",
            path: "/selectedCard",
            formatter: function (cardPath) {
                if (this.oBindingContexts.configEditorModel.sPath === cardPath) {
                    return true;
                } else {
                    return false;
                }
            }
        });

        oRowTemplate.bindProperty("totals", {
            model: "configEditorModel",
            path: "attributes/length"
        });

        oRowTemplate
            .attachEvent("delete", function (oEvent) {

                var path = oEvent.getParameters().path;
                sap.ui
                    .getCore()
                    .getEventBus()
                    .publish(
                        ConfigUtils.configEvents.EVENT_CONFIG_REMOVE_ELEM,
                        {
                            path: path
                        });
                if (that.oBtnModel.oData.selectedCard) {
                    var pathArray = path.split("/");
                    var pathIndx = parseInt(pathArray[pathArray.length - 1]);
                    var selectedPath = that.oBtnModel.oData.selectedCard;
                    var selectedPathArray = selectedPath.split("/");
                    var selectedPathIndx = parseInt(selectedPathArray[selectedPathArray.length - 1]);
                    var newSelectedPathIndx = selectedPathIndx - 1;

                    if (selectedPathIndx > pathIndx) {
                        selectedPathArray[selectedPathArray.length - 1] = newSelectedPathIndx;
                        var newSelectedPath = selectedPathArray.join("/");
                        that.oBtnModel.setData({
                            selectedCard: newSelectedPath
                        });
                        var currentFc = this.oBindingContexts.configEditorModel
                            .getModel().getData()[selectedPathArray[1]][selectedPathArray[2]];

                        sap.ui
                            .getCore()
                            .getEventBus()
                            .publish(
                                ConfigUtils.configEvents.EVENT_CONFIG_FILTER_CARD_CHANGED,
                                {
                                    Path: newSelectedPath,
                                    PressedObjectIndex: newSelectedPathIndx,
                                    PressedObject: currentFc
                                }
                                );
                    }

                    else if (selectedPathIndx === pathIndx) {
                        that.oBtnModel.setData({
                            selectedCard: ""
                        });

                        sap.ui
                            .getCore()
                            .getEventBus()
                            .publish(
                                ConfigUtils.configEvents.EVENT_CONFIG_HIDE_FC,
                                {}
                                );
                    }
                }

            });
    };

    FilterCardsListController.prototype.onOneFilterCardPressed = function (oEvent) {

        oEvent.getSource().refreshFocus();        
        var path = oEvent.getSource().oBindingContexts.configEditorModel.sPath;
        var array = path.split("/");

        this.oBtnModel.setData({
            selectedCard: path
        });

        var currentFilterCardObj = oEvent.getSource().oBindingContexts.configEditorModel
            .getModel().getData()[array[1]][array[2]];

        sap.ui
            .getCore()
            .getEventBus()
            .publish(
                ConfigUtils.configEvents.EVENT_CONFIG_SWITCH_LAYOUT,
                {
                    defaultLayout: true
                }
                );

        sap.ui
            .getCore()
            .getEventBus()
            .publish(
                ConfigUtils.configEvents.EVENT_CONFIG_FILTER_CARD_CHANGED,
                {
                    PressedObjectIndex: parseInt(
                        array[array.length - 1], 10),
                    Path: path,
                    PressedObject: currentFilterCardObj
                }
                );
    };

    FilterCardsListController.prototype.onDataMappingFilterCardPressed = function (oEvent) {

        var path = oEvent.getSource().oBindingContexts.configEditorModel.sPath;
        var array = path.split("/");

        this.oBtnModel.setData({
            selectedCard: path
        });

        var currentFilterCardObj = oEvent.getSource().oBindingContexts.configEditorModel
            .getModel().getData()[array[1]][array[2]];

        sap.ui
            .getCore()
            .getEventBus()
            .publish(
                ConfigUtils.configEvents.EVENT_CONFIG_SWITCH_LAYOUT,
                {
                    defaultLayout: false
                }
                );
    };

    FilterCardsListController.prototype.onOneFilterCardAdded = function () {
        sap.ui
            .getCore()
            .getEventBus()
            .publish(
                ConfigUtils.configEvents.EVENT_CONFIG_ADD_FILTER_CARD,
                {
                }
                );
    };

    FilterCardsListController.prototype.onTemplateReload = function (sChannelId, sEventId, oEventData) {
        if (oEventData.templateLoad > 0) {
            this._accordion2.addSection(this._oTemplates);

        } else {

            this._accordion2.removeSection(this._oTemplates);

        }
    };

    FilterCardsListController.prototype._unselectFilterCards = function () {

        this.oBtnModel.setData({
            selectedCard: ""
        });
    };

    return FilterCardsListController;
});
