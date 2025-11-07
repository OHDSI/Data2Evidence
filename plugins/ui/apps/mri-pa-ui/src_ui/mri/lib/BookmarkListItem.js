sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/lib/bookmarks/BMv2Parser",
    "sap/hc/mri/pa/ui/Utils",
    "./BookmarkUtils",
    "./MriFrontendConfig",
    "sap/m/MessageBox",
    "sap/m/Button",
    "sap/m/Dialog",
    "sap/m/Input",
    "sap/m/Text",
    "sap/ui/commons/Button",
    "sap/ui/commons/FormattedTextView",
    "sap/ui/commons/Label",
    "sap/ui/commons/TextView",
    "sap/ui/commons/layout/MatrixLayout",
    "sap/ui/commons/layout/MatrixLayoutCell",
    "sap/ui/commons/layout/MatrixLayoutRow",
    "sap/ui/core/Control",
    "sap/ui/core/Icon",
    "sap/ui/layout/VerticalLayout",
    "sap/ui/model/json/JSONModel"
], function (jQuery, BMv2Parser, Utils, BookmarkUtils, MriFrontendConfig, MessageBox, Button, Dialog, Input, Text, CommonsButton, FormattedTextView, Label, TextView, MatrixLayout, MatrixLayoutCell, MatrixLayoutRow, Control, Icon, VerticalLayout, JSONModel) {
    "use strict";

    /**
     * Constructor for a new BookmarkListItem.
     * @constructor
     * @param {string} [sId] id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * BookmarkListItem Control.
     * @extends sap.ui.core.Control
     * @alias sap.hc.mri.pa.ui.lib.BookmarkListItem
     */
    var BookmarkListItem = Control.extend("sap.hc.mri.pa.ui.lib.BookmarkListItem", {
        metadata: {
            properties: {
                name: "string",
                bookmark: "any",
                bmkId: "string",
                valid: "boolean"
            },
            aggregations: {
                incompatibleVersionIcon: {
                    type: "sap.ui.core.Icon",
                    multiple: false
                },
                /**
                 * Hidden aggregation for the button layout.
                 * This propagates models to the layout.
                 */
                _buttonLayout: {
                    type: "sap.ui.commons.layout.MatrixLayout",
                    multiple: false,
                    visibility: "hidden"
                }
            },
            events: {
                loadBmk: {},
                deleteBmk: {},
                renameBmk: {}
            }
        },
        renderer: function (oRm, oControl) {
            oRm.write("<div");
            oRm.writeControlData(oControl);
            oRm.addClass("sapMriPaBmkItem");
            oRm.addClass(oControl.getValid() ? "sapMriPaBmkValid" : "sapMriPaBmkInvalid");
            oRm.writeClasses(oControl);
            oRm.write(">");

            oRm.write("<table");
            oRm.addClass("sapMriPaBmkItemTable");
            oRm.writeClasses();
            oRm.write(">");

            oRm.write("<tr>");
            oRm.write("<td>");
            oRm.write("<div");
            oRm.addClass("sapMriPaBmkHdr");
            oRm.writeClasses();
            oRm.write(">");
            oRm.write("<span");
            oRm.addClass("sapMriPaBmkHdrLeft");
            oRm.writeClasses();
            oRm.write(">");
            oRm.writeEscaped(oControl.getName());
            oRm.write("</span>");
            oRm.write("</div>");
            oRm.write("</td>");
            oRm.write("<td>");
            oRm.renderControl(oControl.getAggregation("incompatibleVersionIcon"));
            oRm.write("</td>");
            oRm.write("</tr>");

            oRm.write("<tr>");
            oRm.write("<td>");
            oRm.write("<div");
            oRm.addClass("sapMriPaBmkDetails");
            oRm.writeClasses();
            oRm.write(">");
            oRm.renderControl(oControl.detailsLayout);
            oRm.write("</div>");
            oRm.write("</td>");
            oRm.write("</tr>");

            oRm.write("<tr>");
            oRm.write("<td>");
            oRm.write("<div");
            oRm.addClass("sapMriPaBmkFooter");
            oRm.writeClasses();
            oRm.write(">");
            oRm.write("<div");
            oRm.addClass("sapMriPaBmkFooterBtns");
            oRm.writeClasses();
            oRm.write(">");
            oRm.renderControl(oControl.buttonsLayout);
            oRm.write("</div>");
            oRm.write("</div>");
            oRm.write("</td>");
            oRm.write("</tr>");

            oRm.write("</table>");

            oRm.write("</div>");
        }
    });

    /**
     * Creates all controls and dialogs for a bookmark.
     * @override
     * @protected
     */
    BookmarkListItem.prototype.init = function () {
        this.bindProperty("name", {
            path: "bookmarkname"
        });
        this.bindProperty("bmkId", {
            path: "bmkId"
        });
        this.bindProperty("bookmark", {
            path: "bookmark"
        });
        this.bindProperty("valid", {
            path: "bookmark",
            formatter: function (oBmk) {
                return BookmarkUtils.checkBookmarkConfigCompatible(JSON.parse(oBmk));
            }
        });

        this._warningIcon = new Icon({
            src: "sap-icon://alert",
            tooltip: "{i18n>MRI_PA_BMK_CONFIG_CONFLICT_TEXT}"
        }).addStyleClass("mriPaBmkWarning");

        this.setAggregation("incompatibleVersionIcon", this._warningIcon);

        this._initBookmarkDescriptionControls();
        this._initBookmarkButtons();
    };

    BookmarkListItem.prototype.setValid = function (bValid) {
        this.setProperty("valid", bValid);
        this.getAggregation("incompatibleVersionIcon").setVisible(!bValid);
    };

    /**
     * Creates the controls used to display a description of the applied filters,
     * the type of chart and the axes' dimensions.
     * @private
     */
    BookmarkListItem.prototype._initBookmarkDescriptionControls = function () {
        // TODO add tooltips for the icons
        this.filterAllLabel = new Label({
            icon: "sap-icon://MRI/bool-and"
        });
        this.filterAnyLabel = new Label({
            icon: "sap-icon://MRI/bool-or",
            visible: false
        });
        this.filterAllText = new FormattedTextView();
        this.filterAnyText = new FormattedTextView({
            visible: false
        });

        this.chartLabel = new Label();
        this.chartText = new TextView();

        this.axesLabel = new Label({
            icon: "sap-icon://chart-axis"
        });
        this.axesDescriptionLayout = new VerticalLayout({
            width: "100%"
        });

        this._warningIcon = new Icon({
            src: "sap-icon://message-error",
            color: "red",
            size: "2em"
        });
        this._warningIcon.bindProperty("visible", {
            path: "bookmark",
            formatter: function (oBmk) {
                return BookmarkUtils.checkBookmarkConfigCompatible(oBmk);
            }
        });

        this.detailsLayout = new MatrixLayout({
            columns: 2,
            widths: ["30px", "auto"],
            width: "100%",
            rows: [
                new MatrixLayoutRow({
                    cells: [
                        new MatrixLayoutCell({
                            vAlign: "Top",
                            content: [
                                this.filterAllLabel
                            ]
                        }),
                        new MatrixLayoutCell({
                            vAlign: "Top",
                            content: [
                                this.filterAllText
                            ]
                        })
                    ]
                }),
                new MatrixLayoutRow({
                    cells: [
                        new MatrixLayoutCell({
                            vAlign: "Top",
                            content: [
                                this.filterAnyLabel
                            ]
                        }),
                        new MatrixLayoutCell({
                            vAlign: "Top",
                            content: [
                                this.filterAnyText
                            ]
                        })
                    ]
                }),
                new MatrixLayoutRow({
                    cells: [
                        new MatrixLayoutCell({
                            vAlign: "Top",
                            content: [
                                this.chartLabel
                            ]
                        }),
                        new MatrixLayoutCell({
                            vAlign: "Top",
                            content: [
                                this.chartText
                            ]
                        })
                    ]
                }),
                new MatrixLayoutRow({
                    cells: [
                        new MatrixLayoutCell({
                            vAlign: "Top",
                            content: [
                                this.axesLabel
                            ]
                        }),
                        new MatrixLayoutCell({
                            vAlign: "Top",
                            content: [
                                this.axesDescriptionLayout
                            ]
                        })
                    ]
                })
            ]
        });
    };

    /**
     * Creates the buttons to rename and delete a bookmark.
     * @private
     */
    BookmarkListItem.prototype._initBookmarkButtons = function () {
        // set up bookmark buttons
        var oEditBtn = new CommonsButton({
            width: "100%",
            icon: "sap-icon://edit",
            tooltip: "{i18n>MRI_PA_TOOLTIP_RENAME_BOOKMARK}",
            styled: false
        });

        // use browser event instead of the sapUi5 press event
        // because otherwise the click will be caught on the
        // filter card (which means "load")
        oEditBtn.attachBrowserEvent("click", function (oEvent) {
            oEvent.stopPropagation();
            this._onEditButtonPressed();
        }, this);

        var oDeleteBtn = new CommonsButton({
            width: "100%",
            icon: "sap-icon://delete",
            tooltip: "{i18n>MRI_PA_TOOLTIP_DELETE_BOOKMARK}",
            styled: false
        });

        // use browser event instead of the sapUi5 press event
        // because otherwise the click will be caught on the
        // filter card (which means "load")
        oDeleteBtn.attachBrowserEvent("click", function (oEvent) {
            oEvent.stopPropagation();
            this._onDeleteButtonPressed();
        }, this);

        var oAddToTilesBtn = new CommonsButton({
            width: "100%",
            icon: "sap-icon://add-favorite",
            styled: false,
            tooltip: "{i18n>MRI_PA_BMK_SAVE_AS_TILE}"
        });

        // use browser event instead of the sapUi5 press event
        // because otherwise the click will be caught on the
        // filter card (which means "load")
        oAddToTilesBtn.attachBrowserEvent("click", function (oEvent) {
            oEvent.stopPropagation();
            this._onAddToTilesPressed();
        }, this);

        this.buttonsLayout = new MatrixLayout({
            columns: 3,
            widths: ["auto", "auto"],
            width: "100%",
            rows: [
                new MatrixLayoutRow({
                    cells: [
                        new MatrixLayoutCell({
                            content: [oEditBtn]
                        }),
                        new MatrixLayoutCell({
                            content: [oDeleteBtn]
                        }),
                        new MatrixLayoutCell({
                            content: [oAddToTilesBtn]
                        })
                    ]
                })
            ]
        });
        this.setAggregation("_buttonLayout", this.buttonsLayout);
    };

    /**
     * Opens rename dialog.
     * @private
     */
    BookmarkListItem.prototype._onEditButtonPressed = function () {
        this.addStyleClass("sapMriPaBmkItemActive");
        if (!this.oRenameDialog) {
            var that = this;
            this.oRenameDialog = new Dialog({
                title: "{i18n>MRI_PA_BOOKMARK_RENAME_DIALOG_TITLE}",
                icon: "sap-icon://question-mark",
                type: sap.m.DialogType.Message,
                content: [
                    new Text({
                        text: "{i18n>MRI_PA_BOOKMARK_RENAME_DIALOG_TEXT}"
                    }),
                    new Input({
                        value: "{rename>/name}",
                        valueLiveUpdate: true
                    })
                ],
                buttons: [
                    new Button({
                        enabled: "{= !!${rename>/name}}",
                        text: "{i18n>MRI_PA_BUTTON_SAVE}",
                        press: function (oEvent) {
                            that.oRenameDialog.close();
                            that.fireRenameBmk({
                                bmkId: that.getBmkId(),
                                newName: oEvent.getSource().getModel("rename").getProperty("/name")
                            });
                        }
                    }),
                    new Button({
                        text: "{i18n>MRI_PA_BUTTON_CANCEL}",
                        press: function () {
                            that.oRenameDialog.close();
                        }
                    })
                ],
                afterClose: function () {
                    that.removeStyleClass("sapMriPaBmkItemActive");
                }
            });
            this.oRenameDialog.addStyleClass(Utils.getContentDensityClass());
            this.oRenameDialog.addStyleClass("sapMMessageBoxQuestion");
            this.oRenameDialog.setModel(new JSONModel(), "rename");
            this.addDependent(this.oRenameDialog);
        }
        this.oRenameDialog.getModel("rename").setProperty("/name", this.getName());
        this.oRenameDialog.open();
    };

    // attach click by calling this function. This is a
    // workaround since it has to be called only once because
    // the row repeater duplicates the event attachment
    BookmarkListItem.prototype.attachClick = function () {
        this.attachBrowserEvent("click", this._loadBookmark);
    };

    /**
     * Opens delete confirmation MessageBox.
     * @private
     */
    BookmarkListItem.prototype._onDeleteButtonPressed = function () {
        var that = this;
        this.addStyleClass("sapMriPaBmkItemActive");
        MessageBox.show(Utils.getText("MRI_PA_BOOKMARK_DELETE_DIALOG_TEXT", this.getName()), {
            title: Utils.getText("MRI_PA_BOOKMARK_DELETE_DIALOG_TITLE"),
            actions: [
                MessageBox.Action.DELETE,
                MessageBox.Action.CANCEL
            ],
            icon: MessageBox.Icon.WARNING,
            styleClass: Utils.getContentDensityClass(),
            onClose: function (sAction) {
                if (sAction === MessageBox.Action.DELETE) {
                    that.fireDeleteBmk({
                        bmkId: that.getBmkId()
                    });
                }
                that.removeStyleClass("sapMriPaBmkItemActive");
            }
        });
    };

    BookmarkListItem.prototype._loadBookmark = function () {
        if (this.getValid()) {
            this.fireLoadBmk({
                bmk: this.getBookmark()
            });
        } else {
            MessageBox.show(Utils.getText("MRI_PA_BMK_CONFIG_CONFLICT_TEXT"), {
                title: Utils.getText("MRI_PA_BMK_CONFIG_CONFLICT_TITLE"),
                icon: MessageBox.Icon.WARNING,
                styleClass: Utils.getContentDensityClass()
            });
        }
    };

    /**
     * Adds bookmark to tiles.
     * @private
     */
    BookmarkListItem.prototype._onAddToTilesPressed = function () {
        sap.ushell.Container.getService("Bookmark").addBookmark({
            title: this.getName(),
            subtitle: Utils.getText("MRI_PA_FILTER_BOOKMARK"),
            icon: "sap-icon://favorite",
            url: "#MRIComponent-show?bmkId=" + this.getBmkId()
        }).done(function () {
            Utils.notifyUser(sap.ui.core.MessageType.Success, "MRI_PA_ADDING_BOOKMARK_SUCCESS");
        }).fail(function (sErrorMessage) {
            Utils.notifyUser(sap.ui.core.MessageType.Error, sErrorMessage);
        });
    };

    /**
     * Fills the bookmark description controls with content.
     * @protected
     * @override
     */
    BookmarkListItem.prototype.onBeforeRendering = function () {
        var bookmarkObj = JSON.parse(this.getBookmark());
        var ifr = BMv2Parser.convertBM2IFR(bookmarkObj.filter);

        // ALL section
        this.filterAllText.setHtmlText(BookmarkUtils.getFilterDescription(ifr.cards.content[0]));

        // ANY section
        this.filterAnyText.setHtmlText(BookmarkUtils.getFilterDescription(ifr.cards.content[1]));

        var chartDescription = BookmarkUtils.getChartDescription(bookmarkObj);
        this.chartText.setText(chartDescription.name);
        this.chartLabel.setIcon(chartDescription.icon);

        var axesDescription = BookmarkUtils.getAxesDescriptions(bookmarkObj);
        this.axesDescriptionLayout.destroyContent();
        axesDescription.forEach(function (axis) {
            this.axesDescriptionLayout.addContent(new Label({
                icon: axis.icon,
                text: "= " + axis.name
            }));
        }, this);
    };

    return BookmarkListItem;
});
