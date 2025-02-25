sap.ui.define([
	"hc/hph/cdw/config/ui/lib/ConfigUtils",
	"hc/hph/cdw/config/ui/lib/BackendLinker",
	"sap/ui/core/mvc/Controller",
	"sap/m/MessageBox",
	"hc/hph/cdw/config/ui/lib/ConfigModelsData",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
], function (ConfigUtils, BackendLinker, Controller, MessageBox, ConfigModelsData, Filter, FilterOperator) {
	"use strict";

	var AttributeController = Controller.extend("hc.hph.cdw.config.ui.views.Attribute");

	AttributeController.prototype.onInit = function () {
		var that = this;
		sap.ui.getCore().getEventBus().subscribe(
			ConfigUtils.configEvents.EVENT_CONFIG_ATTRIBUTE_CHANGED,
			this._updateConfigBindings,
			this
		);

		sap.ui.getCore().getEventBus().subscribe(
			ConfigUtils.configEvents.EVENT_CONFIG_FILTERCARD_CHANGE_PLACEHOLDER,
			this.onUpdateInteractionPlaceholder,
			this
		);

		this.annotationsInput = this.getView().byId("annotationsInput");

		this.annotationsInput.addValidator(function (args) {
			var tokenText = args.text;
			that.onAddToken(tokenText);
			that.annotationsInput.setValue("");
		});


		this.editableModel = new sap.ui.model.json.JSONModel({
			editable: true
		});
		this.editableModel.setDefaultBindingMode(sap.ui.model.BindingMode.OneWay);
		this.getView().setModel(this.editableModel,
			"editableModel");

		this.referenceExpression = this.getView().byId("AttributeReferenceExpression");

		this.rrFromTable = this.getView().byId("rrFromTable");

		this.rrFromTable.bindAggregation("rows", {
			path: "configEditorModel>from/value",
			factory: function () {
				var rowView = sap.ui.xmlview("hc.hph.cdw.config.ui.views.TableItem");

				// bind the allowed table placeholders
				rowView.byId("tableDD").bindItems(
					"configGeneralModel>/supportedTablesForAttributes", function (sId, oContext) {
						return new sap.ui.core.ListItem(sId, {
							key: "{configGeneralModel>key}",
							text: "{configGeneralModel>text}"
						});
					});

				return rowView;
			}
		});
		this.rrFromTable.setModel(this.editableModel, "editableModel");

		var attrType = this.getView().byId("AttributeType");

		attrType.bindItems("configEditorModel>/attributeTypes", function (sId) {

			return new sap.ui.core.ListItem(sId, {
				key: "{configEditorModel>key}",
				text: {
					path: "configEditorModel>text_key",
					formatter: function (sKey) {
						return !sKey ? "" : ConfigUtils.getText(sKey);
					}
				}
			});
		});

		this.getView()
			.byId("AttributeDefaultFilterBasic")
			.bindItems(
			'configEditorModel>/preloadedSuggestions/attributeEAV', function (sId, oContext) {

				var listItem = new sap.ui.core.ListItem(sId, {
					key: '{configEditorModel>value}',
					text: '{configEditorModel>value}'
				});

				listItem.addCustomData(new sap.ui.core.CustomData({
					key: 'source',
					value: '{configEditorModel>pholder/dataSource}'
				})).addCustomData(new sap.ui.core.CustomData({
					key: 'filter',
					value: '{configEditorModel>pholder/filterOn}'
				})).addCustomData(new sap.ui.core.CustomData({
					key: 'table',
					value: '{configEditorModel>pholder/table}'
				}));

				return listItem;
			});

		this.getView()
			.byId("AttributeDataSourceBasic")
			.bindItems(
			'configEditorModel>/preloadedSuggestions/attributeRelational', function (sId, oContext) {

				var listItem = new sap.ui.core.ListItem(sId, {
					key: '{configEditorModel>value}',
					text: '{configEditorModel>value}'
				});

				listItem.addCustomData(new sap.ui.core.CustomData({
					key: 'table',
					value: '{configEditorModel>pholder/table}'
				})).addCustomData(new sap.ui.core.CustomData({
					key: 'computedpholder',
					value: '{configEditorModel>pholder/computedPholder}'
				}));

				return listItem;
			});

		this.getView()
			.byId("AttributeDataSourceBasicPatient")
			.bindItems(
			'configEditorModel>/preloadedSuggestions/attributeRelationalPatient', function (sId, oContext) {

				var listItem = new sap.ui.core.ListItem(sId, {
					key: '{configEditorModel>value}',
					text: '{configEditorModel>value}'
				});

				listItem.addCustomData(new sap.ui.core.CustomData({
					key: 'table',
					value: '{configEditorModel>pholder/table}'
				})).addCustomData(new sap.ui.core.CustomData({
					key: 'computedpholder',
					value: '{configEditorModel>pholder/computedPholder}'
				}));

				return listItem;
			});
	};

	AttributeController.prototype.onBeforeRendering = function () {
	};

	AttributeController.prototype.onAfterRendering = function () {
	};

	AttributeController.prototype.onExit = function () {
		sap.ui.getCore().getEventBus().unsubscribe(
			ConfigUtils.configEvents.EVENT_CONFIG_ATTRIBUTE_CHANGED,
			this._updateConfigBindings,
			this
		);

		sap.ui.getCore().getEventBus().unsubscribe(
			ConfigUtils.configEvents.EVENT_CONFIG_FILTERCARD_CHANGE_PLACEHOLDER,
			this.onUpdateInteractionPlaceholder,
			this
		);
	};

	AttributeController.prototype.onCatalogAttributeSwitched = function () {
	};

	AttributeController.prototype.onOTSAttributeSwitched = function (oEventData) {
		var path = this.getView().getObjectBinding(ConfigUtils.models.CONFIG_EDITOR).getPath();
		var binding = "";
		if (oEventData.getParameters().state) {
			binding = "configGeneralModel>/supportedTablesForAttributesOTS";

			sap.ui.getCore().getEventBus().publish(
				ConfigUtils.configEvents.EVENT_CONFIG_OTS_ACTIVATION,
				{
					path: path
				}
			);
		}
		else {
			binding = "configGeneralModel>/supportedTablesForAttributes";
		}


		this.rrFromTable.bindAggregation("rows", {
			path: "configEditorModel>from/value",
			factory: function () {
				var rowView = sap.ui.xmlview("hc.hph.cdw.config.ui.views.TableItem");

				// bind the allowed table placeholders
				rowView.byId("tableDD").bindItems(
					binding, function (sId, oContext) {

						return new sap.ui.core.ListItem(sId, {
							key: "{configGeneralModel>key}",
							text: "{configGeneralModel>text}"
						});
					});

				return rowView;
			}
		});

		if (oEventData.getParameter("state")) {
			var otsTermTextBox = this.getView().byId("AttributeOTSTermContext");
			if (otsTermTextBox.getValue() === "") {
				otsTermTextBox.setValue("default");
			}
		}

	};

	AttributeController.prototype.onAttributePlaceholderChange = function () {
		var path = this.getView().getBindingContext(ConfigUtils.models.CONFIG_EDITOR).getPath();
		var model = this.getView().getModel(ConfigUtils.models.CONFIG_EDITOR);
		var placeholder = model.getProperty(path).defaultPlaceholder.value;
		this.filterEAVValues(placeholder);
	};

	AttributeController.prototype.filterEAVValues = function (placeholder) {
		this.getView()
			.byId("AttributeDefaultFilterBasic")
			.getBinding("items")
			.filter(new Filter({
				path: 'pholder/table',
				operator: FilterOperator.EQ,
				value1: placeholder
			}));
	};

	AttributeController.prototype.onUpdateInteractionPlaceholder = function (sChannelId, sEventId, oEventData) {
		this._updateAttributePlaceholderList(oEventData.placeholder);
	};

	AttributeController.prototype._updateAttributePlaceholderList = function (placeholder) {

		var model = this.getView().getModel(ConfigUtils.models.CONFIG_EDITOR);
		var dimTables = model.getData().tableTypePlaceholderMap.dimTables;
		var index = -1;

		for (var i = 0; i < dimTables.length; i++) {
			if (dimTables[i].placeholder === placeholder) {
				index = i;
			}
		}

		var control = this.getView().byId("attributePlaceholder");
		control.bindItems(
				'configEditorModel>/tableTypePlaceholderMap/dimTables/' + index + "/attributeTables", function (sId, oContext) {
					var listItem = new sap.ui.core.ListItem(sId, {
						key: '{configEditorModel>placeholder}',
						text: '{configEditorModel>placeholder}'
					});
					return listItem;
			});
			
		//EAV
		var selectedItem = control.getSelectedItem();
		if (!selectedItem) {
			var items = control.getItems();
			selectedItem = items[0];
			if (items.length > 0) {
				control.setSelectedIndex(0);
				control.setValue(control.getSelectedItem().getText());
			}
		}

		if (selectedItem && typeof selectedItem === "object") {
			var selectedPlaceholder = control
				.getSelectedItem()
				.getKey();
			this.filterEAVValues(selectedPlaceholder);
		} else {
			this.filterEAVValues("");
		}

		// Update the items for relational
		this.getView().byId("AttributeDataSourceBasic")
			.getBinding("items")
			.filter(new Filter({
				path: 'pholder/table',
				operator: FilterOperator.EQ,
				value1: placeholder
			}));
		
	};

	// do this before binding so  old values from a previos selection will be removed
	AttributeController.prototype.reset = function() {
		var that = this;
		function clearCombobox(id) {
			var control = that.getView().byId(id);
			control.clearSelection();
			control.setValue("");
			//control.removeAllItems();
		}
		clearCombobox("attributePlaceholder");
		clearCombobox("AttributeDataSourceBasicPatient");
		clearCombobox("AttributeDataSourceBasic");
	};

	AttributeController.prototype._updateConfigBindings = function (sChannelId, sEventId, oEventData) {
		var path = ConfigUtils.models.CONFIG_EDITOR + ">" + oEventData.Path;
		var interactionPath = oEventData.Path.split("/").slice(0, 3).join("/");

		this.reset();

		var interactionPlaceholder = this.getView().getModel(ConfigUtils.models.CONFIG_EDITOR).getProperty(interactionPath + "/defaultPlaceholder/value");
		
		this.getView().bindObject(path);

		var state = this.getView().getObjectBinding(ConfigUtils.models.CONFIG_EDITOR).getModel().getProperty(oEventData.Path + "/isOTSAttribute");

		var binding = "";
		if (state) {
			binding = "configGeneralModel>/supportedTablesForAttributesOTS";
		}
		else {
			binding = "configGeneralModel>/supportedTablesForAttributes";
		}

		this.rrFromTable.bindAggregation("rows", {
			path: "configEditorModel>from/value",
			factory: function () {
				var rowView = sap.ui.xmlview("hc.hph.cdw.config.ui.views.TableItem");

				// bind the allowed table placeholders
				rowView.byId("tableDD").bindItems(
					binding, function (sId, oContext) {

						return new sap.ui.core.ListItem(sId, {
							key: "{configGeneralModel>key}",
							text: "{configGeneralModel>text}"
						});
					});

				return rowView;
			}
		});

		if (path.indexOf("generalSettingsFilterCards") > -1) {
			this.getView().byId("otsSection").setVisible(false);
		}
		else {
			this.getView().byId("otsSection").setVisible(true);
		}

		var isPatientAttribute = (path.indexOf("generalSettingsFilterCards/0") > 0);

		if (isPatientAttribute) {
			this.getView().byId("AttributeExpressionTypeEAV").setEnabled(false);
		} else {
			this.getView().byId("AttributeExpressionTypeEAV").setEnabled(true);
		}

		if (!oEventData.Editable) {
			this.editableModel.setData({ editable: false });
		} else {
			this.editableModel.setData({ editable: true });
		}

		var model = this.getView().getModel("configEditorModel");
		var eavBasicKey = model.getProperty(oEventData.Path + "/eavExpressionKey/value");
		var relationBasicKey = model.getProperty(oEventData.Path + "/relationExpressionKey/value");
		var relationBasicPatientKey = model.getProperty(oEventData.Path + "/relationExpressionPatientKey/value");
		var measureExpression = model.getProperty(oEventData.Path + "/measureExpression/value");
		var expression = model.getProperty(oEventData.Path + "/expression/value");
		
		if (eavBasicKey) {
			this._attributeExpressionTypeDisplay("EAV");
			this.getView().byId("AttributeExpressionType").setSelectedKey("EAV");
		} else if (relationBasicKey || relationBasicPatientKey) {
			this._attributeExpressionTypeDisplay("RELATIONAL");
			this.getView().byId("AttributeExpressionType").setSelectedKey("RELATIONAL");
		} else if (measureExpression || expression) {
			this._attributeExpressionTypeDisplay("ADVANCE");
			this.getView().byId("AttributeExpressionType").setSelectedKey("ADVANCE");
		} else {
			this._attributeExpressionTypeDisplay("EAV");
			this.getView().byId("AttributeExpressionType").setSelectedKey("EAV");
		}
		
		this._updateAttributePlaceholderList(interactionPlaceholder);
		this._oldID = this.getView().byId("attrIDName").getProperty("value");
		this._clearIdWarning();
	};

	AttributeController.prototype.onTestCatalogAttribute = function () {
		var path = this.getView().getObjectBinding(ConfigUtils.models.CONFIG_EDITOR).getPath();

		sap.ui.getCore().getEventBus().publish(
			ConfigUtils.configEvents.EVENT_TEST_ATTR,
			{
				path: path,
				exprToUse: 'referenceExpression',
				useRefText: true,
				attributeName: this.getView().byId("attrName").getValue()
			}
		);
	};

	AttributeController.prototype.onTestNormalAttribute = function () {
		var path = this.getView().getObjectBinding(ConfigUtils.models.CONFIG_EDITOR).getPath();

		sap.ui.getCore().getEventBus().publish(
			ConfigUtils.configEvents.EVENT_TEST_ATTR,
			{
				path: path,
				exprToUse: 'expression',
				useRefText: false,
				attributeName: this.getView().byId("attrName").getValue()
			}
		);
	};

	AttributeController.prototype._addCustomTblElem = function () {

		var path = this.getView().getObjectBinding(ConfigUtils.models.CONFIG_EDITOR).getPath() + "/from/value";

		sap.ui.getCore().getEventBus().publish(
			ConfigUtils.configEvents.EVENT_CONFIG_ADD_ELEM,
			{
				path: path,
				newElement: { "placeholder": "", "table": "" }
			}
		);
	};

	AttributeController.prototype.onAttributeExpressionTypeSelected = function (oEvent) {
		var selectedKey = oEvent.getParameter("key");
		this._attributeExpressionTypeDisplay(selectedKey);
	};

	AttributeController.prototype._attributeExpressionTypeDisplay = function (expressionType) {
		var thisView = this.getView();
		var isPatientAttribute = (this.getView().getBindingContext("configEditorModel").getPath().indexOf("generalSettingsFilterCards/0") > 0);

		function dataSourceBasicGroup(isVisible) {
			thisView.byId("AttributeRelationalSection").setVisible(isVisible);
		}

		function dataSourceBasicPatient(isVisible) {
			thisView.byId("AttributeRelationalPatientSection").setVisible(isVisible);
		}

		function defaultFilterBasic(isVisible) {
			thisView.byId("AttributeEAVSection").setVisible(isVisible);
		}

		function advanceView(isVisible) {
			thisView.byId("AttributeCustomTable").setVisible(isVisible);
			thisView.byId("AttributeAdvanceFilter").setVisible(isVisible);
		}

		if (expressionType === "EAV") {
			dataSourceBasicGroup(false);
			dataSourceBasicPatient(false);

			if (!isPatientAttribute) {
				defaultFilterBasic(true);
			}
			advanceView(false);
		} else if (expressionType === "RELATIONAL") {
			if (!isPatientAttribute) {
				dataSourceBasicGroup(true);
			} else {
				dataSourceBasicPatient(true);
			}
			defaultFilterBasic(false);
			advanceView(false);
		} else {
			dataSourceBasicGroup(false);
			dataSourceBasicPatient(false);
			defaultFilterBasic(false);
			advanceView(true);
		}
	};

	AttributeController.prototype.onBasicDataSourceChange = function () {
		var advanceViewValues = {
			defaultFilter: "",
			expression: ""
		};
		var path = this.getView().getBindingContext("configEditorModel").getPath();
		var model = this.getView().getModel("configEditorModel");
		var listItem = this.getView().byId("AttributeDataSourceBasic").getSelectedItem();
		var tableMapping = ConfigModelsData.prototype.getFETableMapping(model.getData());

		if (listItem) {
			var table = listItem.data().table;
			var computedPholder = listItem.data().computedpholder;
			var value = computedPholder || listItem.getKey();
			var sExtraFilter = model.getProperty(path + "/relationExpressionFilter/value");
			advanceViewValues = BackendLinker.feConfigBuildAttributeRelationalAdvanceView(
				table,
				value,
				sExtraFilter,
				tableMapping
			);
		} else {
			this._resetRelationalDefaultFilter(path, model);
		}

		//Set the values in Advance View
		model.setProperty(path + "/defaultFilter/value", advanceViewValues.defaultFilter);
		model.setProperty(path + "/expression/value", advanceViewValues.expression);

		this._resetEAVDefaultFilter(path, model);
		this._setAdvanceViewToNormalAttribute(path, model);
	};

	AttributeController.prototype.onBasicDataSourcePatientChange = function () {
		var advanceViewValues = {
			defaultFilter: "",
			expression: ""
		};
		var path = this.getView().getBindingContext("configEditorModel").getPath();
		var model = this.getView().getModel("configEditorModel");
		var listItem = this.getView().byId("AttributeDataSourceBasicPatient").getSelectedItem();
		var tableMapping = ConfigModelsData.prototype.getFETableMapping(model.getData());

		if (listItem) {
			var table = listItem.data().table;
			var computedPholder = listItem.data().computedpholder;
			var value = computedPholder || listItem.getKey();
			var sExtraFilter = model.getProperty(path + "/relationExpressionPatientFilter/value");
			advanceViewValues = BackendLinker.feConfigBuildAttributeRelationalAdvanceView(
				table,
				value,
				sExtraFilter,
				tableMapping
			);
		} else {
			this._resetRelationalPatientDefaultFilter(path, model);
		}

		//Set the values in Advance View
		model.setProperty(path + "/defaultFilter/value", advanceViewValues.defaultFilter);
		model.setProperty(path + "/expression/value", advanceViewValues.expression);

		this._resetEAVDefaultFilter(path, model);
		this._setAdvanceViewToNormalAttribute(path, model);
	};

	AttributeController.prototype.onBasicDefaultFilterChange = function () {
		var advanceViewValues = {
			defaultFilter: "",
			expression: ""
		};
		var path = this.getView().getBindingContext("configEditorModel").getPath();
		var model = this.getView().getModel("configEditorModel");
		var listItem = this.getView().byId("AttributeDefaultFilterBasic").getSelectedItem();
		var tableMapping = ConfigModelsData.prototype.getFETableMapping(model.getData());

		if (listItem) {
			var source = listItem.data().source;
			var filter = listItem.data().filter;
			var table = listItem.data().table;
			var value = listItem.getKey();
			var sEAVFilter = model.getProperty(path + "/eavExpressionFilter/value");
			advanceViewValues = BackendLinker.feConfigBuildAttributeAdvanceView(
				table,
				source,
				filter,
				value,
				sEAVFilter,
				tableMapping
			);
		} else {
			this._resetEAVDefaultFilter(path, model);
		}

		//Set the values in Advance View
		model.setProperty(path + "/defaultFilter/value", advanceViewValues.defaultFilter);
		model.setProperty(path + "/expression/value", advanceViewValues.expression);

		this._resetRelationalDefaultFilter(path, model);
		this._setAdvanceViewToNormalAttribute(path, model);
	};

	AttributeController.prototype._resetEAVDefaultFilter = function (sPath, oModel) {
		oModel.setProperty(sPath + "/eavExpressionKey/value", "");
		oModel.setProperty(sPath + "/eavExpressionFilter/value", "");
	};

	AttributeController.prototype._resetRelationalDefaultFilter = function (sPath, oModel) {
		oModel.setProperty(sPath + "/relationExpressionKey/value", "");
		oModel.setProperty(sPath + "/relationExpressionFilter/value", "");
	};

	AttributeController.prototype._resetConceptFilter = function (sPath, oModel) {
		oModel.setProperty(sPath + "/domainFilter/value", "");
		oModel.setProperty(sPath + "/standardConceptCodeFilter/value", "");
	};

	AttributeController.prototype._resetRelationalPatientDefaultFilter = function (sPath, oModel) {
		oModel.setProperty(sPath + "/relationExpressionPatientKey/value", "");
		oModel.setProperty(sPath + "/relationExpressionPatientFilter/value", "");
	};

	AttributeController.prototype._setAdvanceViewToNormalAttribute = function (sPath, oModel) {
		oModel.setProperty(sPath + "/isNormalAttribute", true);
		oModel.setProperty(sPath + "/measureExpression/value", "");
	};

	AttributeController.prototype.onAdvancedExpressionChange = function (oEvent) {
		var path = this.getView().getBindingContext("configEditorModel").getPath();
		var model = this.getView().getModel("configEditorModel");
		//Clear Relation and EAV Selections
		this._resetEAVDefaultFilter(path, model);
		this._resetRelationalDefaultFilter(path, model);
		this._resetRelationalPatientDefaultFilter(path, model);
	};

	AttributeController.prototype._clearIdWarning = function (oEvent) {
		var that = this;
		sap.ui.getCore().getEventBus().publish(
			ConfigUtils.configEvents.EVENT_CONFIG_ID_VALIDATION,
			{
				path: that.getView().getBindingContext("configEditorModel").getPath(),
				idType: "ATTRIBUTE",
				valid: true
			}
		);
	};

	AttributeController.prototype.onIdChange = function (oEvent) {
		var that = this;

		var model = that.getView().getModel("configEditorModel");
		var path = that.getView().getBindingContext("configEditorModel").getPath().split("/");

		var attributeParent = model.getData()[path[1]][path[2]];
		var otherAttributes = attributeParent.attributes;

		var attributeId = parseInt(path[4]);
		var newID = oEvent.getParameter("newValue");
		var validID = new RegExp("^[a-zA-Z0-9_]*$");
		var regexValid = validID.test(newID);
		if (!regexValid) {
			newID = newID.match(/[a-zA-Z0-9_]+/g).join("_");
			model.setProperty(that.getView().getBindingContext("configEditorModel").getPath() + "/idName", newID);
		}

		//idName = filterCard.name.value.match(/[a-zA-Z0-9_]+/g)
		//.join("_");
		//match = this.transformationFunctions[j].regex.exec(bePath);
		var idExist = false;

		for (var i = 0; i < otherAttributes.length; i++) {
			if (!(i === attributeId)) {
				if (newID === otherAttributes[i].idName) {
					idExist = true;
				}
			}
		}

		if (idExist) {
			ConfigUtils.createAlertDialog("HPH_CDM_CFG_ERROR", "HPH_CDM_CFG_ERROR_ID_DUPLICATE_ATTRIBUTE");
			var count = 0;
			var temporaryName = "";

			while (idExist) {
				count = count + 1;
				temporaryName = newID + "_copy_" + count;

				idExist = false;

				for (var ii = 0; i < otherAttributes.length; i++) {
					if (!(ii === attributeId)) {
						if (temporaryName === otherAttributes[ii].idName) {
							idExist = true;
						}
					}
				}
			}
			model.setProperty(that.getView().getBindingContext("configEditorModel").getPath() + "/idName", temporaryName);
		} else {


			var _oldID = that._oldID;
			var _path = that.getView().getBindingContext("configEditorModel").getPath() + "/idName";

			MessageBox.show(ConfigUtils.getText("HPH_CDM_CFG_ID_CHANGE_MSG"), {
				icon: MessageBox.Icon.WARNING,
				title: ConfigUtils.getText("HPH_CDM_CFG_ID_CHANGE_TITLE"),
				actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
				onClose: function (oAction) {
					if (oAction === MessageBox.Action.YES) {
						//that._reallyDoDelete(oAction);
						if(that._oldID === _oldID){
							that._oldID = newID;
						}						
					} else {
						model.setProperty(_path, _oldID);
					}
				}
			});

		}

		this._clearIdWarning();
	};

	AttributeController.prototype.onIdChangeCheck = function (oEvent) {
		var that = this;
		var model = that.getView().getModel("configEditorModel");
		var path = that.getView().getBindingContext("configEditorModel").getPath().split("/");

		var attributeParent = model.getData()[path[1]][path[2]];
		var otherAttributes = attributeParent.attributes;

		var attributeId = parseInt(path[4]);

		var newID = oEvent.getParameter("newValue");
		var validID = new RegExp("^[a-zA-Z0-9_]*$");
		var regexValid = validID.test(newID);
		if (!regexValid) {
			sap.ui.getCore().getEventBus().publish(
				ConfigUtils.configEvents.EVENT_CONFIG_ID_VALIDATION,
				{
					path: that.getView().getBindingContext("configEditorModel").getPath(),
					idType: "ATTRIBUTE",
					valid: false,
					errorType: "HPH_CDM_CFG_ERROR_ID_INVALID"
				}
			);
		} else {
			var idExist = false;

			for (var i = 0; i < otherAttributes.length; i++) {
				if (!(i === attributeId)) {
					if (newID === otherAttributes[i].idName) {
						idExist = true;
					}
				}
			}

			var currentStatus = otherAttributes[attributeId].frontEndID.validity.status;

			if (idExist) {
				sap.ui.getCore().getEventBus().publish(
					ConfigUtils.configEvents.EVENT_CONFIG_ID_VALIDATION,
					{
						path: that.getView().getBindingContext("configEditorModel").getPath(),
						idType: "ATTRIBUTE",
						valid: false,
						errorType: "HPH_CDM_CFG_ERROR_ID_DUPLICATE_ATTRIBUTE"
					}
				);

			} else if (!(currentStatus === "valid")) {
				this._clearIdWarning();
			}
		}
	};

	AttributeController.prototype.onDeleteToken = function (oEvent) {
		var path = this.getView().getObjectBinding(ConfigUtils.models.CONFIG_EDITOR).getPath();
		sap.ui
			.getCore()
			.getEventBus()
			.publish(
			ConfigUtils.configEvents.EVENT_CONFIG_DELETE_ANNOTATION_ATTRIBUTE,
			{
				Path: path,
				Token: oEvent.getParameter("token").getText()
			});
	};

	AttributeController.prototype.onAddToken = function (tokenText) {
		var path = this.getView().getObjectBinding(ConfigUtils.models.CONFIG_EDITOR).getPath();
		sap.ui
			.getCore()
			.getEventBus()
			.publish(
			ConfigUtils.configEvents.EVENT_CONFIG_ADD_ANNOTATION_ATTRIBUTE,
			{
				Path: path,
				Token: tokenText
			});
	};

	AttributeController.prototype.languageFormatter = function (languageKey, supportedLanguage) {
		for (var i = 0; i < supportedLanguage.length; i++) {
			if (supportedLanguage[i].key === languageKey) return supportedLanguage[i].path;
		}
		return languageKey;
	};

	return AttributeController;
});
