sap.ui.define([
	"hc/hph/cdw/config/ui/lib/ConfigUtils",
	"sap/m/Button",
	"sap/m/ButtonType",
	"sap/m/Label",
	"sap/m/Dialog",
	"sap/m/MessageBox",
	"sap/m/Text",
	"sap/m/ToggleButton"
], function (ConfigUtils, Button, ButtonType, Label, Dialog, MessageBox, Text, ToggleButton) {
    "use strict";

var FilterCard = ToggleButton
		.extend(
				"hc.hph.cdw.config.ui.lib.FilterCard",
				{

					metadata : {
						properties : {

							name : "string",
							description : "string",
							disabled : {
								type : "boolean",
								defaultValue : false
							},
							isNew : {
								type : "boolean",
								defaultValue : false
							},
							totals: {
								type: "int",
								defaultValue: 0
							},
							canDelete: {
								type : "boolean",
								defaultValue : true
							},
							canDuplicate: {
								type : "boolean",
								defaultValue : true
							},
							canAccept: {
								type : "boolean",
								defaultValue : false
							},
							cardType: {
								type : "int"
							},
							status: {
								type: "string",
								defaultValue: "valid"
							}
						},

						aggregations : {

						},

						events : {
							"delete" : {}
						}
					},
					renderer : function(rm, ctrl) {
						rm.write("<div");
						rm.writeControlData(ctrl);
						rm.writeClasses(ctrl);
						rm.write(" tabindex = -1");
						rm.write(">");
						rm.renderControl(ctrl.layout);
						rm.write("</div>");
						}
				});

					FilterCard.prototype.init = function() {

						// create the buttons
						this.duplicateBtn = new Button({
							type : ButtonType.Transparent,
							icon : "sap-icon://duplicate",
							text : ConfigUtils.getText("HPH_CDM_CFG_BUTTON_DUPLICATE"),
							tooltip: ConfigUtils.getText("HPH_CDM_CFG_BUTTON_DUPLICATE"), //CONFIG_ADMIN_DUPLICATE_TOOLTIP
							press : [ this.onDuplicatePressed, this ]
						}).addStyleClass("sapMxBtnLite sapMxBtnSuperLite");

						this.deleteBtn = new Button({
							type : ButtonType.Transparent,
							icon : "sap-icon://delete",
							text : ConfigUtils.getText("HPH_CDM_CFG_BUTTON_DELETE"),
							tooltip: ConfigUtils.getText("HPH_CDM_CFG_BUTTON_DELETE"),//CONFIG_ADMIN_DELETE_FILTER_TOOLTIP
							press : [ this.onDeletePressed, this ]
						}).addStyleClass("sapMxBtnLite sapMxBtnSuperLite");

						this.acceptBtn = new Button({
							type : ButtonType.Transparent,
							icon : "sap-icon://accept",
							text : ConfigUtils.getText("HPH_CDM_CFG_BUTTON_ACCEPT"),
							tooltip: ConfigUtils.getText("HPH_CDM_CFG_BUTTON_ACCEPT"),//CONFIG_ADMIN_ACCEPT_FILTER_TOOLTIP
							press : [ this.onAcceptPressed, this ]
						}).addStyleClass("sapMxBtnLite sapMxBtnSuperLite");

						//this.newCardLabel = new sap.m.Label()
						//		.setIcon("sap-icon://favorite-list");
						this.newCardLabel = new sap.ui.core.Icon().setSrc("sap-icon://favorite-list");

						this.nameLabel = new Label()
								.addStyleClass("sapMxConfigCardTitle");

						this.totalsLabel = new Label();

						this.descriptionLabel = new Label({wrapping: true});
						this.disabledLabel = new Label();

						this.mainLayout = new sap.ui.layout.HorizontalLayout(
								{
									content : [ this.newCardLabel,
											this.nameLabel ]
								});
						this.buttonsLayout = new sap.ui.layout.HorizontalLayout(
								{
									content : [ this.duplicateBtn,
											this.acceptBtn, this.deleteBtn ]
								});
						this.disabledLayout = new sap.ui.layout.HorizontalLayout(
								{
									content : [ this.disabledLabel ],
									visible : false
								});
						this.totalsLayout = new sap.ui.layout.HorizontalLayout(
								{
									content : [ this.totalsLabel ],
									visible : true
								});
						this.totalsLabel.addStyleClass("sapMxConfigCardAttributeCount");
						this.descriptionLayout = new sap.ui.layout.HorizontalLayout(
								{
									content : [ this.descriptionLabel ],
									visible : false
								});

						this.layout = new sap.m.FlexBox({
						    alignItems: "Start",
						    justifyContent: "SpaceBetween",
						    width: "100%"
						});

						this.textLayout =  new sap.ui.layout.VerticalLayout();
						this.textLayout.addContent(this.mainLayout);
						this.textLayout.addContent(this.totalsLayout);
						this.textLayout.addContent(this.descriptionLayout);
						this.textLayout.addContent(this.disabledLayout);
						this.layout.addItem(this.textLayout);

						this.layout.addItem(this.buttonsLayout);

						this.addStyleClass("sapMxConfFCItem");
					};

					FilterCard.prototype.setName = function(name) {
						this.setProperty("name", name);
						this.nameLabel.setText(name);
					};

					FilterCard.prototype.setCanDelete = function(canDelete) {
						this.setProperty("canDelete", canDelete);
						this.deleteBtn.setVisible(canDelete);
					};
					FilterCard.prototype.setCanDuplicate = function(canDuplicate) {
						this.setProperty("canDuplicate", canDuplicate);
						this.duplicateBtn.setVisible(canDuplicate);
					};
					FilterCard.prototype.setCanAccept = function(canAccept) {
						this.setProperty("canAccept", canAccept);
						this.acceptBtn.setVisible(canAccept);
					};

					FilterCard.prototype.setDescription = function(descr) {
						this.setProperty("description", descr);
						if (descr) {
							this.descriptionLabel.setText(descr);
							this.descriptionLayout.setVisible(true);
						} else {
							this.descriptionLayout.setVisible(false);
						}
					};

					FilterCard.prototype.setDisabled = function(disabled) {
						this.setProperty("disabled", disabled);
						if (disabled) {
							var text = ConfigUtils.getText("HPH_CDM_CFG_DISABLED");
							this.disabledLabel.setText(text);
							this.disabledLayout.setVisible(true);
						} else {
							this.disabledLayout.setVisible(false);
						}
					};

					FilterCard.prototype.setIsNew = function(isNew) {
						this.setProperty("isNew", isNew);
						if (isNew) {
							this.newCardLabel.setVisible(true);
						} else {
							this.newCardLabel.setVisible(false);
						}
					};
					FilterCard.prototype.setTotals = function(total) {
						this.setProperty("totals", total);
						var attrText = ConfigUtils.getText("HPH_CDM_CFG_ATTRIBUTES");
						this.totalsLabel.setText(attrText + "(" + total.toString() + ")");

					};

					FilterCard.prototype.setCardType = function(cardType) {
						this.setProperty("cardType", cardType);
					};


					FilterCard.prototype.setPressed = function(pressed) {
					    ToggleButton.prototype.setPressed.call(this);

					    if(pressed){
						    this.addStyleClass("btnPressedCls");
						} else  {
							this.removeStyleClass("btnPressedCls");
						}
					};

					FilterCard.prototype.onDuplicatePressed = function () {

						var path = this.oBindingContexts.configEditorModel.sPath;

						sap.ui
								.getCore()
								.getEventBus()
								.publish(
										ConfigUtils.configEvents.EVENT_CONFIG_DUPLICATE_ELEM,
										{
											path : path
										});

					};

					FilterCard.prototype.onDeletePressed = function () {
					    var that = this;
						var cardType = this.getCardType();
						var sText;
						var cardName = this.getName();

						//Not sure whether we want to include ConfigModelManager.prototype.ConfigLevel
						if (cardType === 3) {
							sText = ConfigUtils.getText("HPH_CDM_CFG_CONFIRM_DELETE_ATTRIBUTE", cardName);
						} else {
							sText = ConfigUtils.getText("HPH_CDM_CFG_CONFIRM_DELETE_INTERACTION", cardName);
						}

						var sTitle = ConfigUtils.getText("HPH_CDM_CFG_BUTTON_DELETE");

						MessageBox.show(sText, {
						    icon: MessageBox.Icon.WARNING,
                            title: sTitle,
                            actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
                            onClose: function (oAction) {
                                if (oAction === MessageBox.Action.DELETE) {
                                    that._reallyDoDelete(oAction);
                                }
                            }
                        });

					};

					FilterCard.prototype.onAcceptPressed = function () {

						var path = this.oBindingContexts.configEditorModel.sPath;
						var cardType = this.getCardType();
						var that = this;
						sap.ui
								.getCore()
								.getEventBus()
								.publish(
										ConfigUtils.configEvents.EVENT_CONFIG_ACCEPT_ELEM,
								{

									path : path,
									cardType: cardType,
									callBack: function(oEvent) {
										that._reallyDoDelete(oEvent);
									}
										});
					};

					FilterCard.prototype._reallyDoDelete = function () {
						var path = this.oBindingContexts.configEditorModel.sPath;

						this.fireDelete({
							path : path
						});
					};

					FilterCard.prototype.setStatus = function(newStatus){

						this.setProperty("status", newStatus);
					};


					FilterCard.prototype.onBeforeRendering = function(){

						this.removeStyleClass("sapMxFCValid");
						this.removeStyleClass("sapMxFCWarning");
						this.removeStyleClass("sapMxFCInvalid");
						switch(this.getStatus().toLowerCase()){
						case "valid":
							this.addStyleClass("sapMxFCValid");
						break;
						case "invalid":
							this.addStyleClass("sapMxFCInvalid");
							break;
						case "warning":
							this.addStyleClass("sapMxFCWarning");
							break;
						default:
							break;
						}
					};

					FilterCard.prototype.refreshFocus = function(){
					    if(this.getFocusDomRef()) {
					        this.focus();
					        this.getFocusDomRef().blur();    
					    }
					};

					return FilterCard;

				});
