sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "./VariantValidator",
    "sap/m/Popover",
    "sap/m/Text",
    "sap/ui/core/Element"
], function (jQuery, Utils, VariantValidator, Popover, Text, Element) {
    "use strict";

    /**
     * Constructor for a new VariantTagManager.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * VariantTagManager Control.
     * @extends sap.ui.core.Element
     * @alias sap.hc.mri.pa.ui.lib.VariantTagManager
     */
    var VariantTagManager = Element.extend("sap.hc.mri.pa.ui.lib.VariantTagManager", {
        metadata: {
            properties: {
                type: {
                    type: "string"
                },
                filter: {
                    type: "object"
                }
            },
            associations: {
                token: {
                    type: "sap.m.Token",
                    multiple: false
                }
            },
            events: {
                delete: {},
                statusChanged: {}
            }
        }
    });

    VariantTagManager.prototype.init = function () {
        this._status = "Unknown";
        this.oHelpText = new Text({
            text: "Validating"
        });

        this._createPopover();
        this._aStyleClasses = [
            "sapMriPaValidToken", "sapMriPaFailToken", "sapMriPaUnknownToken"
        ];
    };

    VariantTagManager.prototype.setToken = function (oToken) {
        this.setAssociation("token", oToken);
        // TODO remove this comment if we have a way to make the popup work with the multi input
        // oToken.attachPress(this._openPopover, this);

        oToken.attachDelete(this._onTokenDelete, this);
    };

    VariantTagManager.prototype.reinit = function () {
        // if the status and the filter object are set, then no validation is needed
        if (this.getStatus() === "Unknown" || !this.getFilter()) {
            // first parse the tag input to see what kind of tag this is
            this._parseToken(this.getToken().getText());
        }
    };

    VariantTagManager.prototype._parseToken = function (sTokenText) {
        if (sTokenText.length > 0) {
            VariantValidator.validate(sTokenText).done(jQuery.proxy(this._onValidationResponse, this));
        }
    };

    VariantTagManager.prototype._onValidationResponse = function (oData) {
        this._setStatus(oData.status || "Unknown");
        this.oHelpText.setText(oData.message || "");
        if (oData.status === "Valid" && oData.positionStart && oData.positionEnd) {
            this.setFilter(this._createConstraint(oData.positionStart, oData.positionEnd));
        }
    };

    VariantTagManager.prototype._removeAllStyleClasses = function (oToken) {
        this._aStyleClasses.forEach(function (sStyleClass) {
            oToken.removeStyleClass(sStyleClass);
        });
    };

    VariantTagManager.prototype._createConstraint = function (iPositionStart, iPositionEnd) {
        return {
            and: [
                {
                    op: ">=",
                    value: iPositionStart
                }, {
                    op: "<=",
                    value: iPositionEnd
                }
            ],
            tagText: this.getToken().getText()
        };
    };

    VariantTagManager.prototype._setStatus = function (sNewStatus) {
        this._status = sNewStatus;

        this._removeAllStyleClasses(this.getToken());
        switch (sNewStatus) {
            case "Valid":
                this.getToken().addStyleClass("sapMriPaValidToken");
                break;
            case "Invalid":
                this.getToken().addStyleClass("sapMriPaFailToken");
                break;
            case "Unknown":
                this.getToken().addStyleClass("sapMriPaUnknownToken");
                break;
            default:
                break;
        }

        this.fireStatusChanged();
    };

    VariantTagManager.prototype.getStatus = function () {
        return this._status;
    };

    VariantTagManager.prototype._createPopover = function () {
        if (!this._oPopover) {
            this._oPopover = new Popover({
                showHeader: false,
                placement: sap.m.PlacementType.Bottom,
                contentHeight: "3rem",
                contentWidth: "4rem",
                content: [
                    this.oHelpText
                ]
            });
        }
    };

    VariantTagManager.prototype._openPopover = function () {
        this._oPopover.openBy(this.getToken());
    };

    VariantTagManager.prototype.isValid = function () {
        return this._status === "Valid";
    };

    VariantTagManager.prototype._onTokenDelete = function () {
        this.fireDelete();
    };

    VariantTagManager.prototype.getToken = function () {
        return this.getAssociation("token") ? sap.ui.getCore().byId(this.getAssociation("token")) : null;
    };

    return VariantTagManager;
});
