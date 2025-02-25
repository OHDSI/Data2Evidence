sap.ui.define([
    "hc/hph/genomics/ui/lib/vb/site/DetailsTrack",
    "sap/ui/layout/form/SimpleForm",
    "sap/ui/core/Title",
    "sap/ui/core/TitleLevel",
    "sap/m/Label",
    "sap/m/Text",
    "sap/m/Link",
    "sap/m/Popover",
    "sap/m/Input",
    "sap/m/Button",
    "sap/ui/layout/VerticalLayout",
    "sap/ui/layout/HorizontalLayout",
    "sap/ui/model/json/JSONModel"
], function (DetailsTrack, SimpleForm, Title, TitleLevel, Label, Text, Link, Popover, Input, Button, VerticalLayout, HorizontalLayout, JSONModel) {
    "use strict";
    var AttributesDetailsTrack = DetailsTrack.extend("hc.hph.genomics.ui.lib.vb.site.AttributesDetailsTrack", {
        metadata: {
            properties: {
                attributes: {
                    type: "object[]",
                    defaultValue: null
                },
                sectionField: {
                    type: "string",
                    defaultValue: null
                },
                sectionTitle: {
                    type: "string",
                    defaultValue: null
                },
                attributePrefix: {
                    type: "string",
                    defaultValue: null
                }
            }
        },
        init: function () {
            this.mContent = new SimpleForm({
                editable: false,
                layout: SimpleForm.ResponsiveGridLayout,
                maxContainerCols: 1,
                labelSpanXL: 1,
                labelSpanL: 1,
                labelSpanM: 1,
                labelSpanS: 1,
                adjustLabelSpan: false,
                emptySpanXL: 0,
                emptySpanL: 0,
                emptySpanM: 0,
                emptySpanS: 0,
                columnsXL: 2,
                columnsL: 2,
                columnsM: 1,
                singleContainerFullSize: false
            });
            this.addDependent(this.mContent);
            this.downloadPopover = null;
        },
        exit: function () {
            if (this.downloadPopover)
                this.downloadPopover.destroy();
        },
        // overwrite setters
        setAttributes: function (aAttributes) {
            this.mContent.removeAllContent();
            if (aAttributes) {
                aAttributes.forEach(this._addAttribute, this);
            }
            this.setProperty("attributes", aAttributes);
        },
        _getReadableText: function (sText, sPrefix, bAutoResolve) {
            var oResourceBundle = this.getModel("i18n.vb").getResourceBundle();
            var sTranslationKey = this.getAttributePrefix() + (sPrefix ? sPrefix + '.' : '.') + sText;
            var sTranslatedText = oResourceBundle.getText(sTranslationKey);
            if (this.getAttributePrefix() && sTranslatedText !== sTranslationKey)
                // use hasText once available
                {
                    return sTranslatedText;
                }
            else if (typeof sText !== "string") {
                return sText.toString();
            } else if (bAutoResolve) {
                return sText.replace(/(.)([A-Z])(?=[a-z])/g, "$1 $2").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/(.)_+(.)/g, "$1 $2");
            } else {
                return sText;
            }
        },
        _addAttribute: function (oAttribute) {
            if (!oAttribute) {
                return;
            }
            var oThis = this;
            if (this.getSectionField() && oAttribute.hasOwnProperty(this.getSectionField()) && oAttribute.hasOwnProperty("attributes")) {
                if (oAttribute[this.getSectionField()] && oAttribute.attributes.length > 0) {
                    this.mContent.addContent(new Title({
                        text: this.getSectionTitle() ? this.getModel("i18n.vb").getResourceBundle().getText(this.getSectionTitle(), [oAttribute[this.getSectionField()]]) : oAttribute[this.getSectionField()],
                        level: TitleLevel.H5
                    }));
                }
                oAttribute.attributes.forEach(this._addAttribute, this);
            }
            if (oAttribute.hasOwnProperty("key")) {
                this.mContent.addContent(new Label({ text: this._getReadableText(oAttribute.key, null, true) }));
            }
            if (oAttribute.hasOwnProperty("value")) {
                if (Array.isArray(oAttribute.value)) {
                    if (oAttribute.value.length === 0) {
                        this.mContent.addContent(new Text({ text: "-" }));
                    } else {
                        oAttribute.value.forEach(function (sValue) {
                            if (sValue && sValue.hasOwnProperty("value")) {
                                this.mContent.addContent(new (sValue.link ? Link : Text)({
                                    text: sValue.hasOwnProperty("key") ? sValue.key + ": " + sValue.value : sValue.value,
                                    press: oThis._generateDownloadFunction(sValue.link)
                                }));
                            } else if (sValue || sValue === 0) {
                                this.mContent.addContent(new Text({ text: oThis._getReadableText(sValue, oAttribute.key ? "Value." + oAttribute.key : null, false) }));
                            }
                        }, this);
                    }
                } else if (typeof oAttribute.value === "object") {
                    for (var sAttribute in oAttribute.value) {
                        if (oAttribute.value.hasOwnProperty(sAttribute)) {
                            this.mContent.addContent(new Text({ text: sAttribute + ": " + oAttribute.value[sAttribute] }));
                        }
                    }
                } else if (oAttribute.value !== null && oAttribute.value !== "") {
                    this.mContent.addContent(new (oAttribute.link ? Link : Text)({
                        text: oThis._getReadableText(oAttribute.value, oAttribute.key ? "Value." + oAttribute.key : null, false),
                        press: oThis._generateDownloadFunction(oAttribute.link)
                    }));
                } else {
                    this.mContent.addContent(new Text({ text: "-" }));
                }
            }
        },
        // implement control functionality
        renderer: {
            render: function (oRenderManager, oControl) {
                oRenderManager.write("<div");
                oRenderManager.writeControlData(oControl);
                oRenderManager.addClass("sapUiGen-SiteDetailsTrack-Attributes");
                oRenderManager.addClass("sapUiForm");
                oRenderManager.writeClasses();
                oRenderManager.addStyle("display", oControl.getVisible() ? null : "none");
                oRenderManager.writeStyles();
                oRenderManager.write(">");
                this.renderTitle(oRenderManager, oControl.getTitle());
                if (oControl.getError()) {
                    oRenderManager.write("<div");
                    oRenderManager.addClass("sapMText");
                    oRenderManager.addClass("message");
                    oRenderManager.addClass("error");
                    oRenderManager.writeClasses();
                    oRenderManager.write(">");
                    oRenderManager.writeEscaped(oControl.getErrorMessage());
                    oRenderManager.write("</div>");
                } else {
                    oRenderManager.renderControl(oControl.mContent);
                }
                oRenderManager.write("</div>");
            }
        },
        onAfterRendering: function () {
            this.update();
        },
        update: function () {
        },
        _openDownloadPopover: function (oLink, sLink) {
            if (!this.mDownloadPopover) {
                var download = function (oEvent) {
                    var oData = oEvent.getSource().getModel().getData();
                    window.open(oData.link + "?reason=" + encodeURIComponent(oData.reason));
                };
                this.mDownloadPopover = new Popover({
                    showHeader: false,
                    placement: sap.m.PlacementType.Vertical,
                    content: new VerticalLayout({
                        content: [
                            new Text({
                                text: "{i18n.vb>siteTrack.EnterReasons}",
                                width: "32em"
                            }).addStyleClass("sapUiSmallMarginBottom"),
                            new HorizontalLayout({
                                content: [
                                    new Input({
                                        value: "{/reason}",
                                        valueLiveUpdate: true,
                                        width: "22em",
                                        submit: download
                                    }).addStyleClass("sapUiSmallMarginEnd"),
                                    new Button({
                                        text: "{i18n.vb>siteTrack.Download}",
                                        icon: "sap-icon://download",
                                        type: sap.m.ButtonType.Emphasized,
                                        enabled: {
                                            path: "/reason",
                                            formatter: function (sReason) {
                                                return !!sReason;
                                            }
                                        },
                                        press: download
                                    })
                                ]
                            })
                        ]
                    }).addStyleClass("sapUiSmallMargin")
                });
                this.mDownloadPopover.setModel(new JSONModel({
                    link: null,
                    reason: ""
                }));
                this.addDependent(this.mDownloadPopover);
            }
            this.mDownloadPopover.getModel().setProperty("/link", sLink);
            this.mDownloadPopover.setOffsetX(Math.round(-0.5 * oLink.$().outerWidth() + 20)).openBy(oLink);
        },
        _generateDownloadFunction: function (sLink) {
            var oThis = this;
            return sLink ? function (oEvent) {
                oThis._openDownloadPopover(oEvent.getSource(), sLink);
            } : undefined;
        }
    });
    return AttributesDetailsTrack;
});