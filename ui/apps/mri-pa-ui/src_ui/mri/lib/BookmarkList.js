sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "sap/hc/mri/pa/ui/lib/backend/BookmarkBackendService",
    "sap/hc/mri/pa/ui/lib/bookmarks/oldBMParser",
    "sap/hc/mri/pa/ui/lib/ifr/IFR2Bookmark",
    "./BookmarkListItem",
    "./BookmarkUtils",
    "sap/m/MessageBox",
    "sap/ui/commons/FormattedTextView",
    "sap/ui/commons/RowRepeater",
    "sap/ui/core/Control",
    "sap/ui/model/json/JSONModel",
    "sap/ui/layout/VerticalLayout"
], function (jQuery, Utils, BookmarkBackendService, oldBMParser, ifr2bookmark, BookmarkListItem, BookmarkUtils, MessageBox, FormattedTextView, RowRepeater, Control, JSONModel, VerticalLayout) {
    "use strict";

    /**
     * Constructor for a fresh new BookmarkList.
     * @constructor
     * @param {string} [sId] id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * BookmarkList Control.
     * @extends sap.ui.core.Control
     * @alias sap.hc.mri.pa.ui.lib.BookmarkList
     */
    var BookmarkList = Control.extend("sap.hc.mri.pa.ui.lib.BookmarkList", {
        metadata: {
            aggregations: {
                layout: {
                    type: "sap.ui.layout.VerticalLayout",
                    multiple: false,
                    visibility: "hidden"
                }
            },
            events: {
                restoreBmk: {}
            }
        },
        renderer: function (renderManager, control) {
            renderManager.write("<div");
            renderManager.writeControlData(control);
            renderManager.writeClasses(control);
            renderManager.write(">");
            renderManager.renderControl(control.getAggregation("layout"));
            renderManager.write("</div>");
        }
    });

    BookmarkList.prototype.reinit = function () {
        var that = this;

        this.bmbs = BookmarkBackendService.getInstance();

        var layout = new VerticalLayout({
            width: "100%"
        });

        this.bmkRowRepeater = new RowRepeater("bmkRowRepeater", {
            design: sap.ui.commons.RowRepeaterDesign.BareShell,
            numberOfRows: Number.MAX_VALUE,
            noData: new FormattedTextView({
                htmlText: "<div class=\"sapMriPaBmkRrNoData\">{i18n>MRI_PA_NO_BOOKMARKS_TEXT}</div>"
            })
        });

        var bookmarksData = {
            bookmarks: []
        };

        this.oBmkModel = new JSONModel(bookmarksData);
        this.oBookmarkItemTemplate = new BookmarkListItem({
            loadBmk: function (evt) {
                that.restoreBookmark(evt);
            },
            deleteBmk: function (evt) {
                that.deleteBookmark(evt);
            },
            renameBmk: function (evt) {
                that.renameBookmark(evt);
            }
        });
        this.oBookmarkItemTemplate.attachClick();
        this.setModel(this.oBmkModel);
        this.bmkRowRepeater.bindRows("/bookmarks", this.oBookmarkItemTemplate);
        layout.addContent(this.bmkRowRepeater);
        this.setAggregation("layout", layout);

        this.loadRemoteBookmarks();
    };

    BookmarkList.prototype.deleteBookmark = function (oEvent) {
        var bookmarkId = oEvent.getParameters().bmkId;
        this.deleteBookmarkRemote(bookmarkId);
    };

    BookmarkList.prototype.renameBookmark = function (oEvent) {
        var id = oEvent.getParameters().bmkId;
        var newName = oEvent.getParameters().newName;
        this._renameBookmarkRemote(id, newName);
    };

    BookmarkList.prototype._renameBookmarkRemote = function (bookmarkId, newBookmarkName) {
        var promise = this.bmbs.renameBookmark(bookmarkId, newBookmarkName);

        promise.done(function (data) {
            // set the data in the model
            this.oBmkModel.setData(this.getSafeData(data));
            this._showSuccessMessage("MRI_PA_RENAME_BMK_SUCCESS");
        }.bind(this)).fail(function () {
            this._showErrorMessage("MRI_PA_RENAME_BMK_ERROR");
        }.bind(this));
    };

    BookmarkList.prototype.deleteBookmarkRemote = function (bookmarkId) {
        var promise = this.bmbs.deleteBookmark(bookmarkId);

        promise
            .done(function (data) {
                // set the data in the model
                this.oBmkModel.setData(this.getSafeData(data));
                this._showSuccessMessage("MRI_PA_DELETE_BMK_SUCCESS");
            }.bind(this))
            .fail(function () {
                this._showErrorMessage("MRI_PA_DELETE_BMK_ERROR");
            }.bind(this));
    };

    BookmarkList.prototype.restoreBookmark = function (oEvent) {
        this.fireRestoreBmk(oEvent.getParameters());
    };

    /**
     * Load a single bookmark
     * @param {string}   sBmkId           the id of the requested bookmark
     * @param {function} fRestoreBookmark callback
     */
    BookmarkList.prototype.loadRemoteSingleBookmark = function (sBmkId, fRestoreBookmark) {
        var promise = this.bmbs.getBookmark(sBmkId);

        promise
            .done(function (oData) {
                var oBookmarkContent = this.getSafeData(oData);

                var oController = this.getParent().getParent().getParent().getParent().getParent().getController();

                if (oBookmarkContent.bookmarks.length === 0) {
                    oController.openBookmarkErrorDialog(null, Utils.getText("MRI_PA_BMK_NOT_FOUND"), true);
                } else if (oBookmarkContent.bookmarks.length === 1 && oBookmarkContent.bookmarks[0].bookmark) {
                    var sBookmark = oBookmarkContent.bookmarks[0].bookmark;
                    var oBookmark = JSON.parse(sBookmark);
                    // if the bookmark is compatible with the current configuration
                    if (BookmarkUtils.checkBookmarkConfigCompatible(oBookmark)) {
                        // restore bookmark
                        fRestoreBookmark(oBookmark, oController);
                    } else {
                        oController.openBookmarkErrorDialog(Utils.getText("MRI_PA_BMK_CONFIG_CONFLICT_TITLE"), Utils.getText("MRI_PA_BMK_CONFIG_READ_ERROR"), true);
                    }
                } else {
                    oController.openBookmarkErrorDialog(null, Utils.getText("MRI_PA_BMK_CONFIG_CONFLICT_TEXT"), true);
                }
            }.bind(this)).fail(function () {
                this._showErrorMessage("MRI_PA_LOAD_BMK_ERROR");
            });
    };

    /**
     * Loads all bookmarks.
     */
    BookmarkList.prototype.loadRemoteBookmarks = function () {
        this.bmbs.getBookmarks().done(function (data) {
            this.oBmkModel.setData(this.getSafeData(data));
            this.bmkRowRepeater.bindRows("/bookmarks", this.oBookmarkItemTemplate);
        }.bind(this)).fail(function () {
            this._showErrorMessage("MRI_PA_LOAD_BMK_ERROR");
        }.bind(this));
    };

    /**
     * Checks if the loaded bookmarks are well formatted, i.e. the filter and
     * the id are not null and not empty strings. It only returns the objects
     * that satisfy these conditions
     * @param   {object} rawData Raw bookmark object
     * @returns {object} Bookmark object, if it is well formed
     */
    BookmarkList.prototype.getSafeData = function (rawData) {
        var bookmarks = rawData.bookmarks;

        function isRealValue(obj) {
            return obj && obj !== "null" && obj !== "";
        }

        bookmarks = bookmarks.filter(function (bookmark) {
            return isRealValue(bookmark.bookmark) && isRealValue(bookmark.bmkId);
        });

        var newBookmarks = [];
        bookmarks.forEach(function (bookmark) {
            var bookmarkString = bookmark.bookmark;
            var bookmarkJson = JSON.parse(bookmarkString);

            switch (bookmarkJson.metadata.version) {
                case 1:
                    try {
                        var ifr = oldBMParser.convertBM2IFR(bookmarkJson.filter);
                        var filterJson = ifr2bookmark(ifr);
                        bookmarkJson.filter = filterJson;
                        bookmark.bookmark = JSON.stringify(bookmarkJson);
                        newBookmarks.push(bookmark);

                        // TODO: Writing back modifies the data that we already have, so we can't do it with the current api. Fix that.
                        // this._updateBmkRemote(bookmark);
                    } catch (e) {
                        // means, we cannot handle the bookmark and there is nothing that can be done
                    }
                    break;
                case 2:
                case 3:
                default:
                    newBookmarks.push(bookmark);
                    break;
            }
        }, this);

        return {
            bookmarks: newBookmarks
        };
    };

    /**
     * Saves a Bookmark.
     * Checks if a Bookmark with this name already exists and if so opens an Overwrite confirmation dialog.
     * After saving the list of bookmarks is refreshed with the latest data from the backend.
     * @param {object} mBookmark Bookmark object, must have properties name, filterdata, chartType and axisSelection.
     */
    BookmarkList.prototype.saveBookmark = function (mBookmark) {
        mBookmark.bmkId = this._getBookmarkIdByName(mBookmark.name);
        if (mBookmark.bmkId) {
            var that = this;
            MessageBox.confirm(Utils.getText("MRI_PA_BOOKMARK_OVERWRITE_DIALOG_TEXT"), {
                title: Utils.getText("MRI_PA_BOOKMARK_OVERWRITE_DIALOG_TITLE"),
                actions: [
                    Utils.getText("MRI_PA_BUTTON_OVERWRITE"),
                    MessageBox.Action.CANCEL
                ],
                styleClass: Utils.getContentDensityClass(),
                onClose: function (sAction) {
                    if (sAction === Utils.getText("MRI_PA_BUTTON_OVERWRITE")) {
                        that._updateBmkRemote(mBookmark);
                    }
                }
            });
        } else {
            this._saveBmkRemote(mBookmark);
        }
    };

    /**
     * Returns bookmark in exportable format
     * @param   {object} mBookmark Bookmark object, must have properties name, filterdata, chartType and axisSelection.
     * @returns  {object} Exportable bookmark with versioning
     */
    BookmarkList.prototype.exportBookmark = function (mBookmark) {
        return this.bmbs.exportBookmark(mBookmark.name, mBookmark.filter, mBookmark.chartType, mBookmark.axisSelection);
    };

    BookmarkList.prototype._saveBmkRemote = function (bmk) {
        var bookmarkName = bmk.name;
        var bookmarkFilter = bmk.filterdata;
        var chartType = bmk.chartType;
        var axisSelection = bmk.axisSelection;

        var promise = this.bmbs.createBookmark(bookmarkName, bookmarkFilter, chartType, axisSelection);

        promise.done(function (data) {
            this.oBmkModel.setData(this.getSafeData(data));
            this._showSuccessMessage("MRI_PA_SAVE_BMK_SUCCESS");
        }.bind(this)).fail(function () {
            this._showErrorMessage("MRI_PA_SAVE_BMK_ERROR");
        }.bind(this));
    };

    /**
     * Updates an existing bookmark.
     * Keeping id and name the same, only updates the bookmark data.
     * After update the list of bookmarks is refreshed with the latest data from the backend.
     * @param {object} bmk Bookmark object, must have properties bmkId, filterdata, chartType and axisSelection.
     * @private
     */
    BookmarkList.prototype._updateBmkRemote = function (bmk) {
        var bookmarkId = bmk.bmkId;
        var bookmarkName = bmk.name;
        var bookmarkFilter = bmk.filterdata;
        var chartType = bmk.chartType;
        var axisSelection = bmk.axisSelection;

        var promise = this.bmbs.updateBookmark(bookmarkId, bookmarkName, bookmarkFilter, chartType, axisSelection);

        promise.done(function (oData) {
            this.oBmkModel.setData(this.getSafeData(oData));
            this._showSuccessMessage("MRI_PA_UPDATE_BMK_SUCCESS");
        }.bind(this)).fail(function () {
            this._showErrorMessage("MRI_PA_UPDATE_BMK_ERROR");
        }.bind(this));
    };

    /**
     * Checks if a bookmark name already exists in the list.
     * If so, the bookmark id is returned.
     * @param   {string}         sBookmarkName Bookmark Name.
     * @returns {number|boolean} BookmarkId if name exists, false otherwise.
     * @private
     */
    BookmarkList.prototype._getBookmarkIdByName = function (sBookmarkName) {
        var aBookmarks = this.oBmkModel.getData().bookmarks;
        for (var i = 0; i < aBookmarks.length; i++) {
            if (aBookmarks[i].bookmarkname === sBookmarkName) {
                return aBookmarks[i].bmkId;
            }
        }
        return false;
    };

    BookmarkList.prototype._showSuccessMessage = function (successMessageId) {
        this._showMessage(sap.ui.core.MessageType.Success, successMessageId);
    };

    BookmarkList.prototype._showErrorMessage = function (errorMessageId) {
        this._showMessage(sap.ui.core.MessageType.Error, errorMessageId);
    };

    BookmarkList.prototype._showMessage = function (messageType, messageId) {
        Utils.notifyUser(messageType, Utils.getText(messageId));
    };

    return BookmarkList;
});
