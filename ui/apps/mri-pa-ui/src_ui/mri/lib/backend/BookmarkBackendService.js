sap.ui.define([
    "sap/hc/mri/pa/ui/Utils"
], function (Utils) {
    "use strict";


    function BookmarkBackendService() {
        this._bookmarkServiceURL = "/sap/hc/mri/pa/services/analytics.xsjs?action=bookmarkservice";
    }

    BookmarkBackendService.prototype.getBookmarks = function () {
        var promise = Utils.ajax({
            url: this._bookmarkServiceURL,
            type: "POST",
            contentType: "application/json;charset=utf-8",
            data: JSON.stringify({cmd: "loadAll"})
        });

        return promise;
    };

    BookmarkBackendService.prototype.getBookmark = function (bookmarkId) {
        var promise = Utils.ajax({
            url: this._bookmarkServiceURL,
            type: "POST",
            contentType: "application/json;charset=utf-8",
            data: JSON.stringify({
                cmd: "loadSingle",
                bmkId: bookmarkId
            })
        });

        return promise;
    };

    BookmarkBackendService.prototype.createBookmark = function (bookmarkName, bookmarkFilter, chartType, axisSelection) {
        var request = {
            cmd: "insert",
            bookmarkname: bookmarkName,
            bookmark: this._getBookmarkJson(bookmarkFilter, chartType, axisSelection)
        };

        var promise = Utils.ajax({
            url: this._bookmarkServiceURL,
            type: "POST",
            contentType: "application/json;charset=utf-8",
            data: JSON.stringify(request)
        });

        return promise;
    };

    BookmarkBackendService.prototype.exportBookmark = function (bookmarkName, bookmarkFilter, chartType, axisSelection) {
        return this._getBookmark(bookmarkFilter, chartType, axisSelection);
    };

    BookmarkBackendService.prototype.updateBookmark = function (bookmarkId, bookmarkName, bookmarkFilter, chartType, axisSelection) {
        var request = {
            cmd: "update",
            bmkId: bookmarkId,
            bookmark: this._getBookmarkJson(bookmarkFilter, chartType, axisSelection)
        };

        var promise = Utils.ajax({
            url: this._bookmarkServiceURL,
            type: "POST",
            contentType: "application/json;charset=utf-8",
            data: JSON.stringify(request)
        });

        return promise;
    };

    BookmarkBackendService.prototype._getBookmarkJson = function (bookmarkFilter, chartType, axisSelection) {
        return JSON.stringify({
            filter: bookmarkFilter,
            chartType: chartType,
            axisSelection: axisSelection,
            metadata: {
                version: 3
            }
        });
    };

    BookmarkBackendService.prototype._getBookmark = function (bookmarkFilter, chartType, axisSelection) {
        return {
            filter: bookmarkFilter,
            chartType: chartType,
            axisSelection: axisSelection,
            metadata: {
                version: 3
            }
        };
    };

    BookmarkBackendService.prototype.renameBookmark = function (bookmarkId, newBookmarkName) {
        var promise = Utils.ajax({
            url: this._bookmarkServiceURL,
            type: "POST",
            contentType: "application/json;charset=utf-8",
            data: JSON.stringify({
                cmd: "rename",
                newName: newBookmarkName,
                bmkId: bookmarkId
            })
        });

        return promise;
    };

    BookmarkBackendService.prototype.deleteBookmark = function (bookmarkId) {
        var promise = Utils.ajax({
            url: this._bookmarkServiceURL,
            type: "POST",
            contentType: "application/json;charset=utf-8",
            data: JSON.stringify({
                cmd: "delete",
                bmkId: bookmarkId
            })
        });

        return promise;
    };

    var bookmarkBackendServiceInstance = new BookmarkBackendService();

    function getInstance() {
        return bookmarkBackendServiceInstance;
    }

    return {
        getInstance: getInstance
    };
});
