sap.ui.define([], function () {
    "use strict";

    /**
     * Constructor for a new UrlFilterParser.
     * @constructor
     * @param {object[]} urlFilterObjects List of URL filters
     *
     * @classdesc
     * UrlFilterParser class
     * @alias sap.hc.mri.pa.ui.lib.utils.UrlFilterParser
     */
    function UrlFilterParser(urlFilterObjects) {
        this._attributeValuePairs = [];

        this._readPathAttributeValuePairs(urlFilterObjects);
    }

    UrlFilterParser.prototype._readPathAttributeValuePairs = function (urlFilterObjects) {
        urlFilterObjects.forEach(function (filter) {
            for (var interactionPath in filter) {
                for (var attributeId in filter[interactionPath]) {
                    this._attributeValuePairs.push({
                        interactionPath: interactionPath,
                        attributeId: attributeId,
                        value: filter[interactionPath][attributeId]
                    });
                }
            }
        }, this);
    };

    UrlFilterParser.prototype.getPathAttributeValuePairs = function () {
        return this._attributeValuePairs;
    };

    return UrlFilterParser;
});
