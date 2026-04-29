sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "./DomainConstraint",
    "./FreetextTagInput",
    "./MriFrontendConfig",
    "./ifr/InternalFilterRepresentation",
    "sap/ui/core/ListItem",
    "sap/ui/model/json/JSONModel"
], function (jQuery, Utils, DomainConstraint, FreetextTagInput, MriFrontendConfig, InternalFilterRepresentation, ListItem, JSONModel) {
    "use strict";

    /**
     * Constructor for a new FreetextConstraint.
     * @constructor
     * @param {string} [sId] id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * Constraint that allows free text input.
     * @extends sap.hc.mri.pa.ui.lib.DomainConstraint
     * @alias sap.hc.mri.pa.ui.lib.FreetextConstraint
     */
    var FreetextConstraint = DomainConstraint.extend("sap.hc.mri.pa.ui.lib.FreetextConstraint", {
        renderer: {}
    });

    /**
     * Creates an instance of the TagInput control and binds it to a model for domain values.
     * @private
     * @returns {sap.hc.mri.pa.ui.lib.FreetextTagInput} A new FreetextTagInput.
     */
    FreetextConstraint.prototype._createInputContent = function () {
        // set up tag input control and corresponding model
        this._tagInput = new FreetextTagInput({
            displaySecondaryValues: true,
            width: "100%",
            placeholder: "{i18n>MRI_PA_INPUT_PLACEHOLDER_SEARCH}"
        });
        this._tagInput.setModel(new JSONModel());
        this._tagInput.attachSuggest(this._tagInputSuggestTimerWrap, this);
        this._tagInput.bindItems("/data", function (sId, oContext) {
            var value = oContext.getProperty("value");
            var text = oContext.getProperty("text");

            return new ListItem(sId, {
                key: value,
                text: value,
                additionalText: text === value ? null : text
            });
        });

        this._tagInput.attachChanged(this._fireChanged, this);
        this._tagInput.setSelectableSuggestions(false);
        this.isFreeText = true;

        return this._tagInput;
    };

    FreetextConstraint.prototype._sendFreetextServiceRequest = function (searchString) {
        return Utils.ajax({
            type: "POST",
            url: "/sap/hc/mri/pa/services/analytics.xsjs?action=freetext_search_service",
            contentType: "application/json;charset=utf-8",
            data: MriFrontendConfig.getFrontendConfig().addConfigMetadata({
                attributePath: this.getAttributePath(),
                searchString: searchString
            }),
            complexResult: false
        });
    };

    FreetextConstraint.prototype._tagInputSuggestTimerWrap = function (event) {
        if (this._changedTimeout) {
            jQuery.sap.clearDelayedCall(this._changedTimeout);
        }

        var suggestValue = event.getParameters().suggestValue;
        var fuzzyValue = event.getParameters().fuzzyValue;

        this._changedTimeout = jQuery.sap.delayedCall(100, this, function () {
            this._onTagInputSuggest(suggestValue, fuzzyValue);
        });
    };

    FreetextConstraint.prototype._onTagInputSuggest = function (suggestValue, fuzzyValue) {
        if (!suggestValue) {
            suggestValue = "";
        }

        var that = this;

        // send async request if we get a different result than last time
        if (!this._lastSuggestValue || this._lastSuggestValue !== suggestValue || this._lastSuggestFuzzy !== fuzzyValue) {
            this._lastSuggestRequest = this._sendFreetextServiceRequest(suggestValue, fuzzyValue).done(function (data) {
                if (typeof data.data[0] !== "object") {
                    for (var i = 0; i < data.data.length; ++i) {
                        data.data[i] = {
                            value: data.data[i]
                        };
                    }
                }
                that._tagInput.getModel().setData(data);
                that._lastSuggestValue = suggestValue;
                that._lastSuggestFuzzy = fuzzyValue;

                that._tagInput._openBox();
            });
        } else {
            that._tagInput._openBox();
        }
    };

    FreetextConstraint.prototype._getIFRExpressions = function () {
        return this._tagInput.getTagsAsText().map(function (sTagText) {
            return new InternalFilterRepresentation.Expression({
                operator: "contains",
                value: sTagText
            });
        });
    };

    /**
     * Add an expression to the FreetextConstraint which adds a Tag.
     * @throws {Error} When an operator other than = is given.
     * @param {string} sOperator Operator as string
     * @param {string} sValue    Tag text
     */
    FreetextConstraint.prototype.addExpression = function (sOperator, sValue) {
        if (sOperator === "contains") {
            this._tagInput.addMultipleTags([sValue]);
        } else {
            throw new Error("FreetextConstraint does not support operator " + sOperator);
        }
    };

    /**
     * Resets the Constraint to the initial state.
     */
    FreetextConstraint.prototype.clear = function () {
        this._tagInput.removeAllMyTags();
        this.fireChanged();
    };

    return FreetextConstraint;
});
