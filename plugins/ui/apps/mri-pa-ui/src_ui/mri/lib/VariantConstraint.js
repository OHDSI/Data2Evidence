sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "./Constraint",
    "./HelpText",
    "./MriFrontendConfig",
    "./VariantTagManager",
    "./ifr/InternalFilterRepresentation",
    "sap/m/MultiInput",
    "sap/m/Popover",
    "sap/m/Token",
    "sap/ui/core/Icon"
], function (jQuery, Utils, Constraint, HelpText, MriFrontendConfig, VariantTagManager, InternalFilterRepresentation, MultiInput, Popover, Token, Icon) {
    "use strict";

    /**
     * Constructor for a new VariantConstraint.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * Constraint that allows input of genomics values
     * @extends sap.hc.mri.pa.ui.lib.Constraint
     * @alias sap.hc.mri.pa.ui.lib.VariantConstraint
     */
    var VariantConstraint = Constraint.extend("sap.hc.mri.pa.ui.lib.VariantConstraint", {
        metadata: {},
        renderer: {}
    });

    VariantConstraint.prototype.init = function () {
        if (Constraint.prototype.init) {
            Constraint.prototype.init.call(this);
        }
        this._servicesURL = "/sap/hc/mri/pa/services/analytics.xsjs?action=genomics_values_service";
        this._currentStatus = "Invalid";
    };

    VariantConstraint.prototype._splitInput = function (sInput) {
        if (sInput.length === 0) {
            return;
        }

        var aSplittedInputs = sInput.split(" ");

        while (aSplittedInputs.length > 0) {
            var sInputPart = aSplittedInputs[0].trim();

            if (sInputPart.length > 0) {
                this._addToken(sInputPart);
            }

            aSplittedInputs.shift();
        }
    };

    VariantConstraint.prototype._sendRequest = function (oRequest) {
        return Utils.ajax({
            type: "POST",
            url: this._servicesURL,
            contentType: "application/json;charset=utf-8",
            data: MriFrontendConfig.getFrontendConfig().addConfigMetadata(oRequest),
            complexResult: false
        });
    };

    VariantConstraint.prototype._createHelpContent = function () {
        this._oHelpIcon = new Icon({
            src: "sap-icon://sys-help",
            press: [function () {
                // create popover
                if (!this._oPopover) {
                    this._oPopover = new Popover({
                        placement: sap.m.PlacementType.Bottom,
                        title: Utils.getText("MRI_PA_RANGE_CONSTRAINT_HELP_HEADER"),
                        content: [new HelpText({
                            firstline: Utils.getText("MRI_PA_VARIANT_CONSTRAINT_HELP_TEXT"),
                            list: [
                                Utils.getText("MRI_PA_VARIANT_CONSTRAINT_HELP_CHROM", ["chr3:1822-1938"]),
                                Utils.getText("MRI_PA_VARIANT_CONSTRAINT_HELP_GENE", ["TP53"])
                            ],
                            stringsToHighlight: ["chr3:1822-1938", "TP53"]
                        })],
                        afterClose: [this._hideHelpIcon, this],
                        beforeOpen: [this._showHelpIcon, this]
                    });
                    this._oPopover.addStyleClass(Utils.getContentDensityClass());
                }
                this._oPopover.openBy(this._oHelpIcon);
            }, this]
        });
        this._oHelpIcon.addStyleClass("sapMriPaHelpIcon");
        return this._oHelpIcon;
    };

    VariantConstraint.prototype._showHelpIcon = function () {
        this._oHelpIcon.addStyleClass("sapMriPaHelpIconActive");
    };

    VariantConstraint.prototype._hideHelpIcon = function () {
        this._oHelpIcon.removeStyleClass("sapMriPaHelpIconActive");
    };

    VariantConstraint.prototype._createInputContent = function () {
        this._aFilters = [];

        this._aTagManagers = [];

        this._oTagInput = new MultiInput({
            showValueHelp: false,
            valueLiveUpdate: false,
            change: this._splitInputAndCreateTags.bind(this),
            width: "100%",
            enableMultiLineMode: true,
            showSuggestion: true,
            suggest: this._onShowSuggest.bind(this),
            tokenChange: this._onTokenChange.bind(this)
        }).addStyleClass("sapUiSizeCompact").addStyleClass("sapMriPaConstraint")
        .attachBrowserEvent("focusin", this._onInputFocusin, this);

        return this._oTagInput;
    };

    VariantConstraint.prototype._onInputFocusin = function (oEvent) {
        // workaround for IE11. Control does not accept input on focus. Click needs to triggered
        oEvent.target.click();
    };

    VariantConstraint.prototype._onShowSuggest = function (oEvent) {
        if (this._previousSuggestionRequest) {
            this._previousSuggestionRequest.reject(null, "abort");
        }
        var oRequestData = {
            sSearchValue: oEvent.getParameters().suggestValue,
            sProcess: "suggest"
        };
        this._previousSuggestionRequest = this._sendRequest(oRequestData).done(this._onSuggestionResponse.bind(this));
    };

    VariantConstraint.prototype._onTokenChange = function (oEvent) {
        if (oEvent.getParameters().type && oEvent.getParameters().type === "added") {
            var oToken = oEvent.getParameters().token;

            this._createTokenManager(oToken, "Unknown");
        }
    };

    VariantConstraint.prototype._createTokenManager = function (oToken, sStatus, oFilters) {
        // create a tag manager for this token.
        // done here to also cover the case when the token is added by selecting a suggestion
        if (!this._tokenManagerExists(oToken)) {
            var oTokenManager = new VariantTagManager({
                token: oToken,
                delete: [this._removeTagManager, this],
                statusChanged: [this._onTagStatusChanged, this],
                filter: oFilters
            });
            this._aTagManagers.push(oTokenManager);
            oTokenManager.reinit();
        }
    };

    VariantConstraint.prototype._tokenManagerExists = function (oToken) {
        var bExists = this._aTagManagers.reduce(function (bPrevVal, oCurrent) {
            return bPrevVal || oCurrent.getToken() === oToken;
        }, false);
        return bExists;
    };

    VariantConstraint.prototype._onSuggestionResponse = function (aData) {
        var that = this;
        this._oTagInput.removeAllSuggestionItems();
        aData.data.forEach(function (oOneVal) {
            that._oTagInput.addSuggestionItem(new sap.ui.core.Item({
                key: oOneVal.value,
                text: oOneVal.text
            }));
        });
    };

    VariantConstraint.prototype._splitInputAndCreateTags = function (oControlEvent) {
        var sUnvalidatedFilterString = oControlEvent.getParameters().value;
        this._splitInput(sUnvalidatedFilterString);
        this._oTagInput.setValue("");
    };

    VariantConstraint.prototype._addToken = function (sSourceString) {
        var oToken = new Token({
            text: sSourceString,
            delete: [this._findFocus, this]
        }).addStyleClass("sapMriPaUnknownToken");
        oToken.attachBrowserEvent("focusin", this._onTagFocusin.bind(this, oToken), this);
        this._oTagInput.addToken(oToken);
    };

    VariantConstraint.prototype._removeTagManager = function (oEvent) {
        var oTagManager = oEvent.getSource();
        var iIndex = this._aTagManagers.indexOf(oTagManager);
        if (iIndex > -1) {
            this._aTagManagers.splice(iIndex, 1);
        }
        // check the status. Depending on what tag was removed, the status can change
        this._checkStatusFromTags();
        this.fireChanged();
    };

    VariantConstraint.prototype._onTagStatusChanged = function () {
        this._checkStatusFromTags();
        this.fireChanged();
    };

    VariantConstraint.prototype._checkStatusFromTags = function () {
        var sNewStatus = this._aTagManagers.reduce(function (sPrevValue, oTagManager) {
            return oTagManager.getStatus() === "Valid" ? "Valid" : sPrevValue;
        }, "Invalid");

        if (sNewStatus !== this._currentStatus) {
            this._currentStatus = sNewStatus;
            this.fireChanged();
        }
    };

    VariantConstraint.prototype._findFocus = function (oEvent) {
        var deletedToken = oEvent.oSource;
        var tokenList = oEvent.oSource.oParent.getAggregation("tokens");
        var tokenIndex = tokenList.indexOf(deletedToken) - 1;
        if(tokenIndex >= 0){
            setTimeout(function(){
                tokenList[tokenIndex].setSelected(true);
            }, 50 );
        } else if(tokenList.length > 1){
            setTimeout(function(){
                tokenList[0].setSelected(true);
            }, 50 );
        }
        oEvent.preventDefault();
    };

    VariantConstraint.prototype._addFailToken = function (sSourceString) {
        var newToken = new Token({
            text: sSourceString,
            delete: [this._findFocus, this]
        }).addStyleClass("sapMriPaFailToken");
        newToken.attachBrowserEvent("focusin", this._onTagFocusin.bind(this, newToken), this);
        this._oTagInput.addToken(newToken);
    };

     VariantConstraint.prototype._onTagFocusin = function (obj) {
        obj.setSelected(true);
    };

    VariantConstraint.prototype._getIFRExpressions = function () {
        return this._aTagManagers.map(function (oTagManager) {
            return new InternalFilterRepresentation.Expression({
                operator: "=",
                value: oTagManager.getToken().getText()
            });
        });
    };

    /**
     * Add an expression to the VariantConstraint which adds a new Tag.
     * @throws {Error} When an operator other than = is given.
     * @param {string} sOperator Operator as string
     * @param {string} sValue    Tag text
     */
    VariantConstraint.prototype.addExpression = function (sOperator, sValue) {
        if (sOperator === "=") {
            this._addTokenFromAndFilter({
                tagText: sValue
            });
        } else {
            throw new Error("VariantConstraint does not support operator " + sOperator);
        }
    };

    /**
     * Resets the Constraint to the initial state.
     */
    VariantConstraint.prototype.clear = function () {
        this._oTagInput.removeAllTokens();
        this._aTagManagers.length = 0;
        this._currentStatus = "Invalid";
        this.fireChanged();
    };

    VariantConstraint.prototype._addTokenFromAndFilter = function (oAndFilter) {
        var sText;
        var oFilterConstr;

        sText = oAndFilter.tagText || "";
        oFilterConstr = oAndFilter.and;

        // create and add token using the tag text
        var oToken = new Token({
            text: sText
        });
        this._createTokenManager(oToken, "Valid", oFilterConstr);

        this._oTagInput.addToken(oToken);
    };

    VariantConstraint.prototype.onSetConstraintToolTip = function (prefixString) {
        this._oTagInput.setTooltip(prefixString);
    };

    VariantConstraint.prototype.getStatus = function () {
        return this._currentStatus;
    };

    VariantConstraint.prototype.isValid = function () {
        return this._currentStatus === "Valid";
    };

    /**
     * Set some values to the constraint.
     * @abstract
     * @param {string[]} values    The values to be added.
     * @param {sap.hc.mri.pa.ui.Utils.valuesMergeMode} [mergeMode] The merge strategy between existing values
     *        and new values. The default strategy is APPEND
     */
    VariantConstraint.prototype.setFilterValues = function (values, mergeMode) {
        if (mergeMode === Utils.valuesMergeMode.OVERRIDE) {
            this._overrideFilterValues(values);
        } else {
            // the default merge mode for this constraint is "append"
            this._appendFilterValues(values);
        }
        this.fireChanged();
    };

    VariantConstraint.prototype._overrideFilterValues = function (values) {
        this._oTagInput.removeAllTokens();
        this._appendFilterValues(values);
    };

    VariantConstraint.prototype._appendFilterValues = function (values) {
        var that = this;
        values.forEach(function (sValue) {
            that._addToken(sValue);
        });
    };

    return VariantConstraint;
});
