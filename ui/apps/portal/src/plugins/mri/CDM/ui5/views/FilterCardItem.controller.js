sap.ui.define([
    "jquery.sap.global",
    "hc/hph/cdw/config/ui/lib/BackendLinker",
    "hc/hph/cdw/config/ui/lib/ConfigUtils",
    "hc/hph/cdw/config/ui/lib/ConfigModelsManager",
    "hc/hph/cdw/config/ui/lib/ConfigModelsData",
    "hc/hph/cdw/config/ui/lib/FilterCard",
    "sap/ui/core/mvc/Controller",
	"sap/m/MessageBox"
], function (jQuery, BackendLinker, ConfigUtils, ConfigModelsManager, ConfigModelsData, FilterCard, Controller, MessageBox) {
    "use strict";

    var FilterCardItemController = Controller.extend("hc.hph.cdw.config.ui.views.FilterCardItem");

    var configLevel = ConfigModelsManager.prototype.ConfigLevel;

    FilterCardItemController.prototype.onInit = function () {

        var that = this;
        this._eventBus = sap.ui.getCore().getEventBus();
        this._CurrentFilterCard = null;
        this._CurrentFilterCardIndex = null;

        // create a model for the selected button
        this.oBtnModel = new sap.ui.model.json.JSONModel({
            selectedPath: ""
        });
        this.getView().setModel(this.oBtnModel,
            "cardsBtnsModel");

        // create a model for the editablility of controls
        this.editableModel = new sap.ui.model.json.JSONModel({
            editable: true
        });
        this.editableModel.setDefaultBindingMode(sap.ui.model.BindingMode.OneWay);
        this.getView().setModel(this.editableModel,
            "editableModel");

        this.rrFromTable = this.getView().byId("rrFromTable");

        this.rrFromTable.bindAggregation("rows", {
            path: "configEditorModel>from/value",
            factory: function () {
                var rowView = sap.ui.xmlview("hc.hph.cdw.config.ui.views.TableItem");
                // bind the allowed table placeholders
                rowView.byId("tableDD").bindItems(
                    "configGeneralModel>/supportedTablesForInteractions", function (sId, oContext) {
                        return new sap.ui.core.ListItem(sId, {
                            key: "{configGeneralModel>key}",
                            text: "{configGeneralModel>text}"
                        });
                    });

                return rowView;
            }
        });
        this.rrFromTable.setModel(this.editableModel, "editableModel");

        this
            .getView()
            .byId("savedAttrSection")
            .bindProperty(
                "title",
                {
                    parts: ["hc.hph.cdw.config.ui.i18n>HPH_CDM_CFG_SAVED_ATTRIBUTE", "configEditorModel>attributes/length"],
                    formatter: function (title, len) {
                        return title + " (" + len + ")";
                    }
                });

        this
            .getView()
            .byId("suggestedAttrSection")
            .bindProperty(
                "title",
                {
                    parts: ["hc.hph.cdw.config.ui.i18n>HPH_CDM_CFG_SUGGEST_ATTRIBUTE", "configEditorModel>suggestedAttributes/length"],
                    formatter: function (title, len) {
                        return title + " (" + len + ")";
                    }
                });

        // Saved attributes
        this.oDraggableContainer = this.getView().byId("dd1");

        this.oDraggableContainer
            .bindAggregation(
                "content",
                {
                    path: "configEditorModel>attributes",
                    sorter: new sap.ui.model.Sorter(
                        "order", false),
                    factory: function () {
                        var temp = new FilterCard(
                            {
                                name: "{configEditorModel>name/value}",
                                description: "{configEditorModel>description}",
                                press: function (
                                    oEvent) {
                                    that
                                        ._onOneAttributePressed(oEvent);
                                },
                                isNew: "{configEditorModel>isNew}",
                                canDuplicate: that.editableModel.getData().editable,
                                canDelete: that.editableModel.getData().editable,
                                canAccept: false,
                                cardType: configLevel.ATTRIBUTE,
                                status: "{configEditorModel>validity/status}"
                            });
                        that._bindNewAttribute.call(that, temp);
                        return temp;
                    }

                });

        this.oDraggableContainer
            .attachEvent(
                "contentReorder",
                function () {
                    var path = that.getView().getObjectBinding(ConfigUtils.models.CONFIG_EDITOR).getPath() + "/attributes";

                    var newOrderArray = [];
                    var pathArray;

                    that.oDraggableContainer
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


        this.oDraggableContainer1 = this.getView().byId("dd2");

        this.oDraggableContainer1
            .bindAggregation(
                "content",
                {
                    path: "configEditorModel>suggestedAttributes",
                    sorter: new sap.ui.model.Sorter(
                        "order", false),
                    factory: function () {
                        var temp = new hc.hph.cdw.config.ui.lib.FilterCard(
                            {
                                name: "{configEditorModel>name/value}",
                                description: "{configEditorModel>description}",
                                press: function (
                                    oEvent) {
                                    that
                                        ._onOneAttributePressed(oEvent, true);
                                },
                                isNew: "{configEditorModel>isNew}",
                                canDuplicate: false,
                                canDelete: true,
                                canAccept: true,
                                cardType: configLevel.ATTRIBUTE,
                                status: "{configEditorModel>validity/status}"
                            });
                        that._bindNewAttribute.call(that, temp);
                        return temp;
                    }

                });

        this.oDraggableContainer1
            .attachEvent(
                "contentReorder",
                function () {
                    var path = that.getView().getObjectBinding(ConfigUtils.models.CONFIG_EDITOR).getPath() + "/suggestedAttributes";

                    var newOrderArray = [];
                    var pathArray;

                    that.oDraggableContainer1
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

        this.condTypeCombo = this.getView()
            .byId("condTypeDDId");

        this.condTypeCombo.bindItems(
            "configEditorModel>/conditionTypes", function (sId) {

                return new sap.ui.core.ListItem(sId, {
                    key: "{configEditorModel>key}",
                    text: "{configEditorModel>name}"
                });
            });

        var fnOnPress = function (oEvt) {
            that._addConditionTypeDialog();

            that.addConditionDialog.open();

            that.condTypeCombo.close();
        };

        this.condTypeCombo.addButton(
            new sap.m.Button({
                text: "{hc.hph.cdw.config.ui.i18n>HPH_CDM_CFG_ADD_NEW}",
                press: fnOnPress
            })
            );

        // bind visibility of controls
        var itemsArray = ["DefaultFilter",
            "condTypeLabelId", "condTypeDDId", "pInteractionDDId", "pInteractionLabelId", "pInteractionLabelLabelId", "pInteractionLabel",
            "LangListLayout", "tableListLayout"];

        itemsArray
            .forEach(function (e) {

                that
                    .getView()
                    .byId(e)
                    .bindProperty(
                        "visible",
                        {
                            path: "",
                            model: ConfigUtils.models.CONFIG_EDITOR,
                            formatter: function () {

                                var result = true;
                                if (that._CurrentFilterCard) {
                                    result = that._CurrentFilterCard.changeable;
                                }

                                return result;
                            }
                        });
            });

        // event subscription
        sap.ui.getCore().getEventBus().subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_FILTER_CARD_CHANGED,
            this._filterCardChanged,
            this
            );

        sap.ui.getCore().getEventBus().subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_CONFIG_CHANGED,
            this._configChanged,
            this
        );

        this.sAccordian = this.getView().byId("suggestAccordion");
        this._DefaultFilter = this.getView().byId("DefaultFilter");
    };

    FilterCardItemController.prototype._bindNewAttribute = function (oRowTemplate) {

        var that = this;

        oRowTemplate
            .attachEvent(
                "delete",
                function (oEvent) {

                    var path = oEvent.getParameters().path;

                    sap.ui
                        .getCore()
                        .getEventBus()
                        .publish(
                            ConfigUtils.configEvents.EVENT_CONFIG_REMOVE_ELEM,
                            {
                                path: path
                            });

                    if (that.oBtnModel.oData.selectedPath) {

                        var pathArray = path.split("/");
                        var pathIndx = parseInt(pathArray[pathArray.length - 1]);
                        var selectedPath = that.oBtnModel.oData.selectedPath;
                        var selectedPathArray = selectedPath
                            .split("/");
                        var selectedPathIndx = parseInt(selectedPathArray[selectedPathArray.length - 1]);
                        var newSelectedPathIndx = selectedPathIndx - 1;

                        var editable = that.editableModel.getData().editable;

                        if (selectedPathIndx > pathIndx) {
                            selectedPathArray[selectedPathArray.length - 1] = newSelectedPathIndx;
                            var newSelectedPath = selectedPathArray
                                .join("/");

                            that.oBtnModel
                                .setData({
                                    selectedPath: newSelectedPath
                                });

                            var currentAttrObj = that._CurrentFilterCard.attributes[pathArray[4]];

                            sap.ui
                                .getCore()
                                .getEventBus()
                                .publish(
                                    ConfigUtils.configEvents.EVENT_CONFIG_ATTRIBUTE_CHANGED,
                                    {
                                        Editable: editable,
                                        Path: newSelectedPath,
                                        PressedObjectIndex: newSelectedPathIndx,
                                        PressedObject: currentAttrObj,
                                        interactionBindingContext: that.getView().getBindingContext("configEditorModel")
                                    });

                        }

                        else if (selectedPathIndx === pathIndx) {
                            that.oBtnModel.setData({
                                selectedPath: ""
                            });

                            sap.ui
                                .getCore()
                                .getEventBus()
                                .publish(
                                    ConfigUtils.configEvents.EVENT_CONFIG_HIDE_ATTRIBUTE,
                                    {});
                        }
                    }
                });

        oRowTemplate
            .bindProperty(
                "pressed",
                {
                    model: "cardsBtnsModel",
                    path: "/selectedPath",
                    formatter: function (selectedPath) {
                        if (this.oBindingContexts.configEditorModel.sPath === selectedPath) {
                            return true;
                        } else {
                            return false;
                        }
                    }
                });

    };

    FilterCardItemController.prototype.onBeforeRendering = function () {
    };

    FilterCardItemController.prototype.onAfterRendering = function () {
    };

    FilterCardItemController.prototype.onExit = function () {
        sap.ui.getCore().getEventBus().unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_FILTER_CARD_CHANGED,
            this._filterCardChanged,
            this
        );
        sap.ui.getCore().getEventBus().unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_CONFIG_CHANGED,
            this._configChanged,
            this
        );
    };

    FilterCardItemController.prototype._onOneAttributePressed = function (oEvent, isSuggestion) {

        oEvent.getSource().refreshFocus();
        var path = oEvent.getSource().oBindingContexts.configEditorModel.sPath;

        this.oBtnModel.setData({
            selectedPath: path
        });

        var array = path.split("/");

        var currentAttrObj = this._CurrentFilterCard.attributes[array[4]];

        var editable = this.editableModel.getData().editable;

        if (isSuggestion) editable = false;

        sap.ui
            .getCore()
            .getEventBus()
            .publish(
                ConfigUtils.configEvents.EVENT_CONFIG_ATTRIBUTE_CHANGED,
                {
                    Editable: editable,
                    Path: path,
                    PressedObjectIndex: parseInt(
                        array[array.length - 1], 10),
                    PressedObject: currentAttrObj,
                    interactionBindingContext: this.getView().getBindingContext("configEditorModel")
                });
    };

    FilterCardItemController.prototype._deselectAllAttributes = function () {
        this.oBtnModel.setData({
            selectedPath: ""
        });
        sap.ui
            .getCore()
            .getEventBus()
            .publish(
                ConfigUtils.configEvents.EVENT_CONFIG_HIDE_ATTRIBUTE,
                {});

    };

    FilterCardItemController.prototype._addConditionTypeDialog = function () {

        var that = this;

        this.addConditionDialog = new sap.m.Dialog({
            title: ConfigUtils.getText("HPH_CDM_CFG_ADD_NEW_COND_TYPE"),
            resizable: false,
            modal: true,
            endButton: new sap.m.Button({
                text: ConfigUtils.getText("HPH_CDM_CFG_BUTTON_CANCEL"),
                press: function () {
                    that.addConditionDialog.close();
                },
                tooltip: ConfigUtils.getText("HPH_CDM_CFG_BUTTON_CANCEL")
            }),
            beginButton: new sap.m.Button({
                text: ConfigUtils.getText("HPH_CDM_CFG_BUTTON_ADD"),
                press: function () {
                    var val = tField.getValue();
                    if (tField.getValue(val !== "")) {
                        that._addNewCondType(val);
                    }
                },
                tooltip: ConfigUtils.getText("HPH_CDM_CFG_BUTTON_ADD")
            })
        });
        var tField = new sap.m.TextArea({
            width: "100%",
            class: "sapMXTextAreaDialog sapUiSmallMargin"
        });
        this.addConditionDialog.addContent(tField);
        this.addConditionDialog.setInitialFocus(tField);

    };

    FilterCardItemController.prototype._addNewCondType = function (newValue) {
        var that = this;
        var newCondType = ConfigModelsData.prototype
            .getEmptyConditionType(newValue, newValue
                .match(/[a-zA-Z0-9_]+/g).join("_"));

        sap.ui
            .getCore()
            .getEventBus()
            .publish(
                ConfigUtils.configEvents.EVENT_CONFIG_ADD_CONDITION,
                {
                    newElement: newCondType,
                    path: "conditionTypes",
                    callBack: function (result, message) {
                        if (result === "success") {
                            that.condTypeCombo.setSelectedKey(newCondType.key);

                        } else {
                            ConfigUtils.createAlertDialog("HPH_CDM_CFG_ERROR", "NOTIFICATION_ERROR", message ? ": " + message : "");
                        }
                    }
                });

        this.addConditionDialog.close();
        this._updateParentInteraction();
    };

    FilterCardItemController.prototype._filterCardChanged = function (sChannelId, sEventId,
        oEventData) {

        // un-press all the attribute cards
        this.oBtnModel.setData({
            selectedPath: ""
        });
        var path = ConfigUtils.models.CONFIG_EDITOR + ">" + oEventData.Path;

        //Rebind Condition Type
        if (oEventData.Path.indexOf("templateFilterCards") > -1) {
            this.condTypeCombo.bindItems(
                "configEditorModel>/conditionTypesFromTemplate", function (sId) {

                    return new sap.ui.core.ListItem(sId, {
                        key: "{configEditorModel>key}",
                        text: "{configEditorModel>name}"
                    });
                });
        } else {
            this.condTypeCombo.bindItems(
                "configEditorModel>/conditionTypes", function (sId) {

                    return new sap.ui.core.ListItem(sId, {
                        key: "{configEditorModel>key}",
                        text: "{configEditorModel>name}"
                    });
                });
        }

        this._CurrentFilterCard = oEventData.PressedObject;
        this._CurrentFilterCardIndex = oEventData.PressedObjectIndex;


        if (this._CurrentFilterCard.idName === "basicData") {
            this.sAccordian.removeStyleClass("sapForceHide");
            //Temporary fix due to UI5 inability to update control within a non-visible control
            //this.sAccordian.setVisible(true);
        }
        else {
            this.sAccordian.addStyleClass("sapForceHide");
            //this.sAccordian.setVisible(false);
        }

        if (!this._CurrentFilterCard.editable) {
            this.editableModel.setData({ editable: false });
        } else {
            this.editableModel.setData({ editable: true });
        }

        this.getView().bindObject(path);
        
        this._updateParentInteraction();

        this.getView().byId("DefaultFilter").firePlaceholderChange();

        this._oldID = this.getView().byId("interactionIDName").getProperty("value");
    };

    FilterCardItemController.prototype._onAddAttributePressed = function () {

        var path = this.getView().getObjectBinding(
            ConfigUtils.models.CONFIG_EDITOR).getPath();

        sap.ui
            .getCore()
            .getEventBus()
            .publish(
                ConfigUtils.configEvents.EVENT_CONFIG_ADD_ATTRIBUTE,
                {
                    Path: path,
                    CurrentFilterCardIndex: this._CurrentFilterCardIndex
                });

    };

    FilterCardItemController.prototype._addCustomTblElem = function () {

        this.rrFromTable.setNumberOfRows(this.rrFromTable.getNumberOfRows() + 1);

        var path = this.getView().getObjectBinding(ConfigUtils.models.CONFIG_EDITOR).getPath() + "/from/value";

        sap.ui.getCore().getEventBus().publish(
            ConfigUtils.configEvents.EVENT_CONFIG_ADD_ELEM,
            {
                path: path,
                newElement: { "placeholder": "", "table": "" }
            }
            );

    };

    FilterCardItemController.prototype.onBasicAdvancedToggled = function (oEvent) {

        if(oEvent.getParameters().selectedMode === "ADVANCE"){
            this.getView().byId("tableListLayout").setVisible(true);
        } else {
            this.getView().byId("tableListLayout").setVisible(false);
        }

    };

    FilterCardItemController.prototype.onPlaceholderChange = function () {
        var model = this.getView().getModel("configEditorModel");
        var path = this.getView().getBindingContext("configEditorModel").getPath();
        var placeholder = model.getProperty(path).defaultPlaceholder.value;
        var dimTables = model.getData().tableTypePlaceholderMap.dimTables.filter(function (dim) {
            return dim.placeholder === placeholder;
        });
        
        if (dimTables.length === 0) {
            this.getView().byId("DefaultFilter").setMode("BASIC");
            this.getView().byId("parentSection").setVisible(true);
            this.getView().byId("conditionSection").setVisible(true);
            return;
        }

        var dimTable = dimTables[0];
      
        this.getView().byId("parentSection").setVisible(dimTable.hierarchy);
        this.getView().byId("conditionSection").setVisible(dimTable.condition);
        
        if (!dimTable.oneToN) {
            this.getView().byId("DefaultFilter").setMode("NONE");
        } else {
            this.getView().byId("DefaultFilter").setMode("BASIC");
        }

        sap.ui.getCore().getEventBus().publish(
            ConfigUtils.configEvents.EVENT_CONFIG_FILTERCARD_CHANGE_PLACEHOLDER,
            {
                path: path,
                placeholder: placeholder
            }
        );

    };

    FilterCardItemController.prototype._clearIdWarning = function (oEvent) {
        var that = this;
        sap.ui.getCore().getEventBus().publish(
			ConfigUtils.configEvents.EVENT_CONFIG_ID_VALIDATION,
			{
				path: that.getView().getBindingContext("configEditorModel").getPath(),
				idType: "INTERACTION",
				valid: true
			}
		);
    };

    FilterCardItemController.prototype.onIdChange = function (oEvent) {
        var that = this;

		var model = that.getView().getModel("configEditorModel");
		var path = that.getView().getBindingContext("configEditorModel").getPath().split("/");

        var otherInteractions = model.getData()[path[1]];

		var interactionID = parseInt(path[2]);
		var newID = oEvent.getParameter("newValue");
		var validID = new RegExp("^[a-zA-Z0-9_]*$");
		var regexValid = validID.test(newID);
		if(!regexValid) {
		    newID = newID.match(/[a-zA-Z0-9_]+/g).join("_");
		    model.setProperty(that.getView().getBindingContext("configEditorModel").getPath()+"/idName",newID);
		}

		//idName = filterCard.name.value.match(/[a-zA-Z0-9_]+/g)
						//.join("_");
		//match = this.transformationFunctions[j].regex.exec(bePath);
		var idExist = false;

		for(var i=0;i<otherInteractions.length;i++) {
			if(!(i===interactionID)) {
				if(newID === otherInteractions[i].idName) {
					idExist = true;
				}
			}
		}

        if(idExist) {
            ConfigUtils.createAlertDialog("HPH_CDM_CFG_ERROR", "HPH_CDM_CFG_ERROR_ID_DUPLICATE_INTERACTION");
            var count = 0;
            var temporaryName = "";

            while(idExist){
                count = count + 1;
                temporaryName = newID + "_copy_" + count;

                idExist = false;

                for(var ii=0;i<otherInteractions.length;i++) {
        			if(!(ii===interactionID)) {
        				if(temporaryName === otherInteractions[ii].idName) {
        					idExist = true;
        				}
        			}
        		}
            }
            model.setProperty(that.getView().getBindingContext("configEditorModel").getPath()+"/idName",temporaryName);
        } else {


			MessageBox.show(ConfigUtils.getText("HPH_CDM_CFG_ID_CHANGE_MSG"), {
						    icon: MessageBox.Icon.WARNING,
                            title: ConfigUtils.getText("HPH_CDM_CFG_ID_CHANGE_TITLE"),
                            actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
                            onClose: function (oAction) {
                                if (oAction === MessageBox.Action.YES) {
                                    //that._reallyDoDelete(oAction);
									that._oldID = newID;
                                } else {
									model.setProperty(that.getView().getBindingContext("configEditorModel").getPath()+"/idName",that._oldID);
								}
                            }
                        });

        }

        this._clearIdWarning();
    };

    FilterCardItemController.prototype.onIdChangeCheck = function (oEvent) {
		var that = this;
		var model = that.getView().getModel("configEditorModel");
		var path = that.getView().getBindingContext("configEditorModel").getPath().split("/");

        var otherInteractions = model.getData()[path[1]];
		var interactionID = parseInt(path[2]);

		var newID = oEvent.getParameter("newValue");
		var validID = new RegExp("^[a-zA-Z0-9_]*$");
		var regexValid = validID.test(newID);
		if(!regexValid) {
		    sap.ui.getCore().getEventBus().publish(
    				ConfigUtils.configEvents.EVENT_CONFIG_ID_VALIDATION,
    				{
    					path: that.getView().getBindingContext("configEditorModel").getPath(),
    					idType: "INTERACTION",
    					valid: false,
    					errorType: "HPH_CDM_CFG_ERROR_ID_INVALID"
    				}
    			);
		} else {
		    var idExist = false;

    		for(var i=0;i<otherInteractions.length;i++) {
    			if(!(i===interactionID)) {
    				if(newID === otherInteractions[i].idName) {
    					idExist = true;
    				}
    			}
    		}

    		var currentStatus = otherInteractions[interactionID].frontEndID.validity.status;

    		if(idExist) {
    			sap.ui.getCore().getEventBus().publish(
    				ConfigUtils.configEvents.EVENT_CONFIG_ID_VALIDATION,
    				{
    					path: that.getView().getBindingContext("configEditorModel").getPath(),
    					idType: "INTERACTION",
    					valid: false,
    					errorType: "HPH_CDM_CFG_ERROR_ID_DUPLICATE_ATTRIBUTE"
    				}
    			);

    		} else if(!(currentStatus === "valid")) {
    			this._clearIdWarning();
    		}
		}


	};

    FilterCardItemController.prototype._updateParentInteraction = function () {
        sap.ui.getCore().getEventBus().publish(
                ConfigUtils.configEvents.EVENT_CONFIG_UPDATE_PARENT_INTERACTION,
                {
                    CurrentFilterCardIndex: this._CurrentFilterCardIndex
                }
            );
    };

    FilterCardItemController.prototype._configChanged = function () {
        if((this._CurrentFilterCardIndex) || (this._CurrentFilterCardIndex==0)) {
            this._updateParentInteraction();
        }
    };

    FilterCardItemController.prototype.languageFormatter = function (languageKey, supportedLanguage) {
        for(var i=0;i<supportedLanguage.length;i++){
            if(supportedLanguage[i].key===languageKey) return supportedLanguage[i].path;
        }
        return languageKey;
    };


	return FilterCardItemController;

});
