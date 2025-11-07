sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "./Constraint",
    "./MriFrontendConfig",
    "./TagInput",
    "./ifr/InternalFilterRepresentation",
    "sap/ui/core/ListItem",
    "sap/ui/model/json/JSONModel",
    "./utils/DelayedExecutor",
    "./utils/SerializingExecutor"
], function (jQuery, Utils, Constraint, MriFrontendConfig, TagInput, InternalFilterRepresentation, ListItem, JSONModel, DelayedExecutor, SerializingExecutor) {
    "use strict";

    /**
     * Constructor for a new DomainConstraint.
     * @constructor
     * @param {string} [sId] id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * Constraint that gets value suggestions from a domain.
     * @extends sap.hc.mri.pa.ui.lib.Constraint
     * @alias sap.hc.mri.pa.ui.lib.DomainConstraint
     */
    var DomainConstraint = Constraint.extend("sap.hc.mri.pa.ui.lib.DomainConstraint", {
        renderer: {}
    });

    /**
     * Creates an instance of the TagInput control and binds it to a model for domain values.
     * @private
     * @returns {sap.hc.mri.pa.ui.lib.TagInput} A new TagInput.
     */
    DomainConstraint.prototype._createInputContent = function () {
        // set up tag input control and corresponding model
        this._tagInput = new TagInput({
            displaySecondaryValues: true,
            width: "100%",
            placeholder: "{i18n>MRI_PA_INPUT_PLACEHOLDER_ALL}"
        });
        this._tagInput.setModel(new JSONModel());
        this._tagInput.attachSuggest(this._tagInputSuggestTimerWrap, this);

        var templateItem = new ListItem({
            key: "{value}",
            text: "{value}",
            additionalText: "{text}"
        });

        templateItem.bindProperty("tooltip", {
            path: "",
            formatter: function (oData) {
                if (typeof oData.value === "string") {
                    return oData.value.replace("<b>", "")
                        .replace("</b>", "") + (oData.text ? " - " + oData.text.replace("<b>", "")
                            .replace("</b>", "") : "");
                } else {
                    return oData.value.toString();
                }
            }
        });
        this._tagInput.bindItems("/data", templateItem);

        this._tagInput.attachChanged(this._fireChanged, this);
        return this._tagInput;
    };

    DomainConstraint.prototype.init = function () {
        if (Constraint.prototype.init) {
            Constraint.prototype.init.call(this);
        }

        this._delayedExecutor = new DelayedExecutor();
        this._serializingExecutor = new SerializingExecutor();
    };


    DomainConstraint.prototype._fireChanged = function () {
        this.onSetConstraintToolTip(this.preparePrefixToolTipString());
        this.fireChanged();
    };

    DomainConstraint.prototype._getIFRExpressions = function () {
        return this._tagInput.getTagsAsText().map(function (sTagText) {
            return new InternalFilterRepresentation.Expression({
                operator: "=",
                value: sTagText
            });
        });
    };

    /**
     * Add an expression to the DomainConstraint which adds a new Tag.
     * @throws {Error} When an operator other than = is given.
     * @param {string} sOperator Operator as string
     * @param {string} sValue    Tag text
     */
    DomainConstraint.prototype.addExpression = function (sOperator, sValue) {
        if (sOperator === "=") {
            this._tagInput.addMultipleTags([sValue]);
        } else {
            throw new Error("DomainConstraint does not support operator " + sOperator);
        }
    };

    /**
     * Resets the Constraint to the initial state.
     */
    DomainConstraint.prototype.clear = function () {
        this._tagInput.removeAllMyTags();
        this.fireChanged();
    };

    DomainConstraint.prototype.setAttributePath = function (attr) {
        this.setProperty("attributePath", attr);
        this._tagInput.setProperty("attributePath", attr);
    };

    DomainConstraint.prototype._getAttributeConfig = function () {
        return MriFrontendConfig.getFrontendConfig().getAttributeByPath(this.getAttributePath());
    };

    DomainConstraint.prototype._sendDomainServiceRequest = function (searchString) {
        var serviceUrl = "/sap/hc/mri/api/services/values";

        return Utils.ajax({
            type: "POST",
            url: serviceUrl,
            contentType: "application/json;charset=utf-8",
            data: MriFrontendConfig.getFrontendConfig().addConfigMetadata({
                attributePath: this.getAttributePath(),
                searchString: searchString
            }),
            complexResult: false
        });
    };

    DomainConstraint.prototype._tagInputSuggestTimerWrap = function (event) {
        this._serializingExecutor.rejectCurrentRequestPromise();
        var suggestValue = event.getParameters().suggestValue;
        this._delayedExecutor.executeAfterTimeout(this._onTagInputSuggest.bind(this, suggestValue));
    };

    // event handler for suggest event of tag input: send request to backend for domain values matching filter
    DomainConstraint.prototype._onTagInputSuggest = function (suggestValue) {
        if (!suggestValue) {
            suggestValue = "";
        }

        var that = this;
        var tagInputSession = that._tagInput.checkSession();
        var refresh = !this._getAttributeConfig().getSuggestionsCached() && !tagInputSession;
        this.loadValues(function () {
            var aFilters = [];

            if (suggestValue !== "") {
                var filters = [];
                filters.push(new sap.ui.model.Filter("value", sap.ui.model.FilterOperator.Contains, suggestValue));
                filters.push(new sap.ui.model.Filter("text", sap.ui.model.FilterOperator.Contains, suggestValue));
                aFilters.push(new sap.ui.model.Filter(filters, false));
            }

            that._tagInput.getBindingInfo("items").binding.filter(aFilters);
            that._tagInput._openBox();
        }, refresh);
    };

    DomainConstraint.prototype.getAvailableValues = function (callback) {
        var that = this;
        this.loadValues(function() {
            callback(that._internalData);
        });
    };

    DomainConstraint.prototype._loadValues = function (callback) {
    };

    DomainConstraint.prototype.loadValues = function (callback, refresh) {
        if (this._internalData && !refresh) {
            callback();
        } else if (!this._internalDataRequested) {
            this._queuedCallbacks = [callback];
            this._internalDataRequested = true;
            this._sendDomainServiceRequest().done(function (data) {
                if (typeof data.data[0] !== "object") {
                    for (var i = 0; i < data.data.length; ++i) {
                        data.data[i] = {
                            value: data.data[i]
                        };
                    }
                }
                this._internalData = data;
                this._tagInput.getModel().setData(data);
                for (var ii = 0; ii < this._queuedCallbacks.length; ii++) {
                    this._queuedCallbacks[ii]();
                }
                this._queuedCallbacks = [];
                this._internalDataRequested = false;
            }.bind(this));
        } else {
            this._queuedCallbacks.push(callback);
        }
    };

    // set values / tags for tag input control
    DomainConstraint.prototype.setValues = function (values) {
        this._tagInput.removeAllMyTags();
        if (values && Array.isArray(values)) {
            this._tagInput.addMultipleTags(values);
        }
        this.fireChanged();
    };

    DomainConstraint.prototype.onSetConstraintToolTip = function (prefixString) {
        var str = prefixString;
        if (this._tagInput.getTags().length > 0) {
            str += ": ";
            var tags = this._tagInput.getTagsAsText(false);
            str += tags.toString();
        }
        this._tagInput.setTooltip(str);
    };

    /**
     * Set some values to the constraint.
     * @abstract
     * @param {string[]} values    The values to be added.
     * @param {sap.hc.mri.pa.ui.Utils.valuesMergeMode} [mergeMode] The merge strategy between existing values
     *        and new values. The default strategy is APPEND
     */
    DomainConstraint.prototype.setFilterValues = function (values, mergeMode) {
        if (mergeMode === Utils.valuesMergeMode.OVERRIDE) {
            this._overrideFilterValues(values);
        } else {
            // the default merge mode for this constraint is "append"
            this._appendFilterValues(values);
        }
        this.fireChanged();
    };

    DomainConstraint.prototype._overrideFilterValues = function (values) {
        this._tagInput.removeAllMyTags();
        this._appendFilterValues(values);
    };

    DomainConstraint.prototype._appendFilterValues = function (values) {
        if (values && Array.isArray(values)) {
            this._tagInput.addMultipleTags(values);
        }
    };

    return DomainConstraint;
});
