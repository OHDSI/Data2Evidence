sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "./MriFrontendConfig",
    "sap/m/Popover",
    "sap/ui/commons/Button",
    "sap/ui/commons/ListBox",
    "sap/ui/commons/TextView",
    "sap/ui/commons/layout/MatrixLayout",
    "sap/ui/commons/layout/MatrixLayoutCell",
    "sap/ui/commons/layout/MatrixLayoutRow",
    "sap/ui/core/Control",
    "sap/ui/core/ListItem"
], function (jQuery, Utils, MriFrontendConfig, Popover, Button, ListBox, TextView, MatrixLayout, MatrixLayoutCell, MatrixLayoutRow, Control, ListItem) {
    "use strict";

    /**
     * Constructor for a new TagElement.
     * @constructor
     * @param {string} [sId] id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * TagElement Control.
     * @extends sap.ui.core.Control
     * @alias sap.hc.mri.pa.ui.lib.TagElement
     */
    var TagElement = Control.extend("sap.hc.mri.pa.ui.lib.TagElement", {
        metadata: {
            properties: {
                text: {
                    type: "string",
                    defaultValue: ""
                },
                popupText: {
                    type: "string",
                    defaultValue: ""
                },
                /**
                 * A valid status can be one of the following (case sensitive):
                 * ValidWithData, Valid, Invalid, BeingValidated, ValidNoData
                 */
                status: {
                    type: "string",
                    defaultValue: "Valid"
                },
                attributePath: {
                    type: "string",
                    defaultValue: ""
                },
                selected: {
                    type: "boolean",
                    defaultValue: false
                }
            },
            events: {
                remove: {},
                changed: {},
                tagFocus: {}
            }
        },
        renderer: function (oRenderManager, oControl) {
            oRenderManager.write("<div");
            oRenderManager.writeAttribute("class", "tagElement sapMriPaTagElement" + oControl.getStatus() + (oControl.getSelected() ? " sapTagSelected" : ""));
            oRenderManager.writeControlData(oControl);
            oRenderManager.writeClasses(oControl);
            oRenderManager.write(">");
            oRenderManager.renderControl(oControl.oButtonsLayout);
            oRenderManager.write("</div>");
        }
    });

    TagElement.prototype.init = function () {
        var that = this;

        this.oNoSuggestionsPlaceholder = new TextView({
            enabled: false,
            text: "{i18n>MRI_PA_TAG_NO_SUGGESTIONS}",
            width: "200px"
        });
        this.oNoSuggestionsPlaceholder.addStyleClass("sapMriPaDYMNoSuggestionsPlhr");

        this.oSuggestionsList = new ListBox({
            visibleItems: 7,
            minWidth: "200px",
            displaySecondaryValues: true,
            select: [this._suggestionSelected, this]
        });
        this.oSuggestionsList.onAfterRendering = function () {
            ListBox.prototype.onAfterRendering.apply(that.oSuggestionsList, arguments);
            jQuery(".sapUiLbxISec, .sapUiLbxITxt", that.oSuggestionsList.getDomRef()).html(function (index, oldhtml) {
                // Remove id to fix ListBox selection
                this.id = "";
                return oldhtml.replace(/&lt;b&gt;/g, "<strong>").replace(/&lt;\/b&gt;/g, "</strong>");
            });
        };

        this.oPopover = new Popover({
            placement: sap.m.PlacementType.Bottom, // FUTURE: 1.36, use sap.m.PlacementType.VerticalPreferedBottom
            title: this.getPopupText(),
            content: [
                this.oNoSuggestionsPlaceholder,
                this.oSuggestionsList
            ]
        });
        this.oPopover.addStyleClass(Utils.getContentDensityClass());
        this.oPopover.onsapbackspace = function (oEvent) {
            this.close();
            oEvent.originalEvent.preventDefault();
        };
        this.addDependent(this.oPopover);

        this.primaryButton = new Button({
            lite: true,
            press: [this._onPrimaryButtonPressed, this]
        });
        this.primaryButton.attachBrowserEvent("focusin", this._onButtonFocusin, this);
        this.primaryButton.attachBrowserEvent("focusout", this._onButtonFocusout, this);
        this.closeButton = new Button({
            icon: "sap-icon://decline",
            lite: true,
            press: [this._onCloseButtonPressed, this]
        }).addStyleClass("sapMriPaTagCloseBtn");
        this.closeButton.attachBrowserEvent("mousedown", this._onCloseButtonMousedown, this);

        this.oButtonsLayout = new MatrixLayout({
            columns: 2,
            widths: ["auto", "12px"],
            width: "auto",
            rows: [
                new MatrixLayoutRow({
                    cells: [
                        new MatrixLayoutCell({
                            content: [this.primaryButton]
                        }),
                        new MatrixLayoutCell({
                            content: [this.closeButton]
                        })
                    ]
                })
            ]
        });
    };

    TagElement.prototype.setPopupText = function (sPopoverTitle) {
        this.setProperty("popupText", sPopoverTitle);
        this.oPopover.setTitle(sPopoverTitle);
    };

    TagElement.prototype.setText = function (newText) {
        this.setProperty("text", newText);
        this.primaryButton.setText(newText);
    };

    TagElement.prototype.setStatus = function (sStatus) {
        this.setProperty("status", sStatus);
        switch (sStatus.toLowerCase()) {
            case "invalid":
                this.primaryButton.setText(this.getText() + " !");
                break;
            case "beingvalidated":
                this.primaryButton.setText(this.getText() + " ?");
                break;
            default:
                this.primaryButton.setText(this.getText());
                break;
        }
    };

    /**
     * Opens a popup for suggestions.
     * As this is called after the suggestions have been retrieved from the backend,
     * it is possible that the tag has been deleted in the meantime.
     * Therefore we must check if the DomRef still exists and only open the popup if it does.
     */
    TagElement.prototype.openPopup = function () {
        if (this.getDomRef()) {
            this.oPopover.openBy(this);
        }
    };

    TagElement.prototype.closePopup = function () {
        this.oPopover.close();
    };

    TagElement.prototype._suggestionSelected = function (oEvent) {
        var itemKey = this._unBoldText(oEvent.getParameters().selectedItem.getKey());
        var itemText = this._unBoldText(oEvent.getParameters().selectedItem.getText());
        this.closePopup();
        this.setText(itemKey);
        this.setPopupText(itemText);
        this.oSuggestionsList.destroyItems();
        this.setStatus("BeingValidated");
        this.selfValidate();
        this.fireChanged();
    };

    TagElement.prototype._unBoldText = function (sText) {
        return sText.replace("<b>", "").replace("</b>", "");
    };

    TagElement.prototype._onButtonFocusin = function (oEvent) {
        this.setSelected(true);
    };

    TagElement.prototype._onButtonFocusout = function () {
        this.setSelected(false);
    };

    TagElement.prototype._onCloseButtonMousedown = function (oEvent) {
        this.closeButton.firePress();
        this.fireTagFocus(oEvent);
    };

    TagElement.prototype._onPrimaryButtonPressed = function () {
        if (this.oPopover.isOpen()) {
            this.oPopover.close();
        } else {
            this.oPopover.openBy(this);
        }
    };

    TagElement.prototype._onCloseButtonPressed = function () {
        this.fireRemove();
    };

    TagElement.prototype.highlight = function () {
        jQuery(this.getDomRef()).fadeTo(300, 0.4, function () {
            jQuery(this).fadeTo(300, 1.0);
        });
    };

    TagElement.prototype.onBeforeRendering = function () {
        // for the moment valid tags are not clickable
        if (this.getStatus() === "Invalid") {
            this.primaryButton.setEnabled(true);
        } else {
            this.primaryButton.setEnabled(false);
        }

        // set the visibility of the suggestion list to true
        // only if it contains items
        if (this.oSuggestionsList.getItems().length > 0) {
            this.oSuggestionsList.setVisible(true);
            this.oNoSuggestionsPlaceholder.setVisible(false);
        } else {
            this.oSuggestionsList.setVisible(false);
            this.oNoSuggestionsPlaceholder.setVisible(true);
        }
    };

    TagElement.prototype.selfValidate = function () {
        if (this.getText() === "NoValue" || this.getText() === Utils.getText("MRI_PA_NO_VALUE")) {
            this.setStatus("Valid");
            return;
        }

        // set the current state to being validated
        this.setStatus("BeingValidated", false);

        // send a request to the validation service
        this._sendValidationRequest();
    };

    TagElement.prototype._sendValidationRequest = function () {
        var that = this;
        var input = this.getText();

        this.getParent().getParent().loadValues(function () {
            var allValues = that.getParent().getModel().getData();

            var obj = {
                value: input,
                dataMatch: null,
                catalogMatch: null
            };

            allValues.data.forEach(function (valu) {
                if (valu.value.toUpperCase() === obj.value.toUpperCase()) {
                    obj.dataMatch = valu.value;
                    obj.catalogMatch = valu.value;
                }
            });

            var response = [obj];
            response.forEach(function (mDatum) {
                if (that.getParent()._isCatalogAttribute()) {
                    if (mDatum.catalogMatch === null && mDatum.dataMatch === null) {
                        that.setStatus("Invalid");
                        that._getAlternativeSuggestions(true);
                    } else {
                        that.setStatus("Valid");
                        that.setText(mDatum.catalogMatch);
                    }
                } else {
                    if (mDatum.dataMatch === null) {
                        that.setStatus("ValidNoData");
                    } else {
                        that.setStatus("ValidWithData");
                        that.setText(mDatum.dataMatch);
                    }
                }
            });
        });
    };

    TagElement.prototype._getAlternativeSuggestions = function (bOpenPopover) {
        var that = this;
        var searchString = this.getText();
        var parentConstraint = that.getParent().getParent();
        if (parentConstraint.getAvailableValues) {
            parentConstraint.getAvailableValues(function (availableValues) {
                availableValues.data.forEach(function (oneData){
                    if (oneData.value.indexOf(searchString) > -1 || oneData.text.indexOf(searchString) > -1) {
                        var boldValue = oneData.value.replace(searchString, "<b>"+searchString+"</b>");
                        var boldText = oneData.text.replace(searchString, "<b>"+searchString+"</b>");
                        that.oSuggestionsList.addItem(new ListItem({
                            key: boldValue,
                            text: boldValue,
                            additionalText: boldText,
                            tooltip: oneData.value + " - " + oneData.text
                        }));
                    }
                });
                that.setPopupText(Utils.getText("MRI_PA_TAG_SUGGEST_TITLE"));
                that.oSuggestionsList.setVisible(true);
                if (bOpenPopover) {
                    that.openPopup();
                }
            });
        }
    };

    TagElement.prototype.onsapbackspace = function (oEvent) {
        // if backspace is pressed and the popup is open, close
        // the popup. Otherwise the event is caught by the
        // browser and the page goes back
        if(this.oPopover && !this.oPopover.isOpen()) {
            var myIndex = this.getParent().mAggregations.myTags.indexOf(this) - 1;
            var obj;
            if(myIndex >= 0) {
                obj = this.getParent().mAggregations.myTags[myIndex];
                obj.setSelected(true);
                setTimeout(function(){
                    obj.primaryButton.focus();
                }, 50);
            } else if (this.getParent().mAggregations.myTags.length > 1) {
                obj = this.getParent().mAggregations.myTags[1];
                obj.setSelected(true);
                setTimeout(function(){
                    obj.primaryButton.focus();
                }, 50);
            } else {
                this.fireTagFocus();
            }
            this.closeButton.firePress();
        }
        this.closePopup();
        oEvent.preventDefault();
    };

    TagElement.prototype.onsapdelete = function (oEvent) {
        if(this.oPopover && !this.oPopover.isOpen()) {
            var myIndex = this.getParent().mAggregations.myTags.indexOf(this) - 1;
            var obj;
            if(myIndex >= 0) {
                obj = this.getParent().mAggregations.myTags[myIndex];
                obj.setSelected(true);
                setTimeout(function(){
                    obj.primaryButton.focus();
                }, 50);
            } else if (this.getParent().mAggregations.myTags.length > 1) {
                obj = this.getParent().mAggregations.myTags[1];
                obj.setSelected(true);
                setTimeout(function(){
                    obj.primaryButton.focus();
                }, 50);
            } else {
                this.fireTagFocus();
            }
            this.closeButton.firePress();
        }
        this.closePopup();
        oEvent.preventDefault();
    };

    TagElement.prototype.onsapleft = function (oEvent) {
        if(this.oPopover && !this.oPopover.isOpen()) {
            var myIndex = this.getParent().mAggregations.myTags.indexOf(this);
            if(myIndex > 0) {
                this.getParent().mAggregations.myTags[myIndex].setSelected(false);
                var obj = this.getParent().mAggregations.myTags[myIndex - 1];
                setTimeout(function(){
                    obj.primaryButton.focus();
                }, 50);
            }
        }
        oEvent.preventDefault();
    };

    TagElement.prototype.onsapright = function (oEvent) {
        if(this.oPopover && !this.oPopover.isOpen()) {
            var myIndex = this.getParent().mAggregations.myTags.indexOf(this);
            var obj;
            if(myIndex > -1 && myIndex < this.getParent().mAggregations.myTags.length - 1) {
                this.getParent().mAggregations.myTags[myIndex].setSelected(false);
                obj = this.getParent().mAggregations.myTags[myIndex + 1];
                setTimeout(function(){
                    obj.primaryButton.focus();
                }, 50);
                
            } else if(myIndex > -1) {
                this.getParent().mAggregations.myTags[myIndex].setSelected(false);
                var that = this;
                setTimeout(function(){
                    that.fireTagFocus();
                }, 50);                
            }            
        }
        oEvent.preventDefault();
    };

    TagElement.prototype.onsapdown = function (oEvent) {
        this.setSelected(false);
        this.fireTagFocus(oEvent);
    };

    TagElement.prototype.setSelected = function(selected) {
        this.setProperty("selected", selected);
    };

    return TagElement;
});
