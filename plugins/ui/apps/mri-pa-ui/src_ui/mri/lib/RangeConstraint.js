sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "./Constraint",
    "./HelpText",
    "./RangeConstraintTokenDefinition",
    "./RangeConstraintPatternDefinition",
    "./ifr/BooleanContainers",
    "./ifr/InternalFilterRepresentation",
    "./utils/InputParser",
    "sap/m/MultiInput",
    "sap/m/Popover",
    "sap/m/Token",
    "sap/ui/core/Icon"
], function (jQuery, Utils, Constraint, HelpText, RangeConstraintTokenDefinition, RangeConstraintPatternDefinition, BooleanContainers, InternalFilterRepresentation, InputParser, MultiInput, Popover, Token, Icon) {
    "use strict";

    /**
     * Constructor for a new RangeConstraint.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * Constraint that allows input of a range in several defined formats.
     * An interval can be defined open to one side, closed to both or as single point.
     * @extends sap.hc.mri.pa.ui.lib.Constraint
     * @alias sap.hc.mri.pa.ui.lib.RangeConstraint
     */
    var RangeConstraint = Constraint.extend("sap.hc.mri.pa.ui.lib.RangeConstraint", {
        renderer: {}
    });

    RangeConstraint.prototype._getIFRExpressions = function () {
        return this._aFilters.map(function (mFilterConstraint) {
            if (mFilterConstraint.and) {
                return new BooleanContainers.And(mFilterConstraint.and.map(function (mFilterAndConstraint) {
                    return new InternalFilterRepresentation.Expression({
                        operator: mFilterAndConstraint.op,
                        value: mFilterAndConstraint.value
                    });
                }));
            } else {
                return new InternalFilterRepresentation.Expression({
                    operator: mFilterConstraint.op,
                    value: mFilterConstraint.value
                });
            }
        });
    };

    /**
     * Add an expression to the RangeConstraint which sets either the lower or the upper input value.
     * @param {string} sOperator Operator as string
     * @param {string} sValue    Number value
     */
    RangeConstraint.prototype.addExpression = function (sOperator, sValue) {
        var mRebuiltFilter = this._rebuildFromSimpleFilter({
            op: sOperator,
            value: sValue
        });
        this._addFilter(mRebuiltFilter.sFilterText, mRebuiltFilter.filter);
    };

    /**
     * Add an expression that consists of an anded combination of expression.
     * @param {object[]} aExpressions List of expression objects
     */
    RangeConstraint.prototype.addBooleanExpression = function (aExpressions) {
        var mRebuiltFilter = this._rebuildFromAndFilter({
            and: aExpressions.map(function (mFilter) {
                return {
                    op: mFilter.operator,
                    value: mFilter.value
                };
            })
        });
        this._addFilter(mRebuiltFilter.sFilterText, mRebuiltFilter.filter);
    };

    /**
     * Resets the Constraint to the initial state.
     */
    RangeConstraint.prototype.clear = function () {
        this._clearTokens();
        this.fireChanged();
    };

    RangeConstraint.prototype._createHelpContent = function () {
        this._oHelpIcon = new Icon({
            src: "sap-icon://sys-help",
            press: [function () {
                // create popover
                if (!this._oPopover) {
                    this._oPopover = this._getPopoverWithContent(this._getHelpContent());
                    this._oPopover.addStyleClass(Utils.getContentDensityClass());
                }

                this._oPopover.openBy(this._oHelpIcon);
            }, this]
        });
        this._oHelpIcon.addStyleClass("sapMriPaHelpIcon");

        return this._oHelpIcon;
    };

    RangeConstraint.prototype._getHelpContent = function () {
        var oHelpText = new HelpText({
            firstline: Utils.getText("MRI_PA_RANGE_CONSTRAINT_HELP_VALUE"),
            list: [
                Utils.getText("MRI_PA_RANGE_CONSTRAINT_HELP_GT_LT", ["&gt;", "&lt;"]),
                Utils.getText("MRI_PA_RANGE_CONSTRAINT_HELP_GEQ_LEQ", ["&gt;=", "&lt;="]),
                Utils.getText("MRI_PA_RANGE_CONSTRAINT_HELP_INTERVAL", ["[x-y]", "]x-y["]),
                Utils.getText("MRI_PA_RANGE_CONSTRAINT_HELP_NEGATIVE", ["(-x)"])
            ],
            stringsToHighlight: ["&gt;=", "&lt;=", "&gt;", "&lt;", "[", "]", "-", "(", ")"]
        });

        return oHelpText;
    };

    RangeConstraint.prototype._getPopoverWithContent = function (oContent) {
        return new Popover({
            placement: sap.m.PlacementType.Top,
            title: Utils.getText("MRI_PA_RANGE_CONSTRAINT_HELP_HEADER"),
            content: [oContent],
            beforeOpen: [this._showHelpIcon, this],
            afterClose: [this._hideHelpIcon, this]
        });
    };

    RangeConstraint.prototype._showHelpIcon = function () {
        this._oHelpIcon.addStyleClass("sapMriPaHelpIconActive");
    };

    RangeConstraint.prototype._hideHelpIcon = function () {
        this._oHelpIcon.removeStyleClass("sapMriPaHelpIconActive");
    };

    RangeConstraint.prototype._createInputContent = function () {
        this._aFilters = [];
        this._oParser = new InputParser(
            RangeConstraintTokenDefinition.tokenDefinitions,
            RangeConstraintPatternDefinition.acceptedPatterns
        );

        this._oTagInput = new MultiInput({
            showValueHelp: false,
            valueLiveUpdate: false,
            change: this._onChange.bind(this),
            width: "100%",
            enableMultiLineMode: true
        }).addStyleClass("sapUiSizeCompact")
        .attachBrowserEvent("focusin", this._onInputFocusin, this);

        return this._oTagInput;
    };

    RangeConstraint.prototype._onInputFocusin = function (oEvent) {
        // workaround for IE11. Control does not accept input on focus. Click needs to triggered
        oEvent.target.click();
    };

    RangeConstraint.prototype._onChange = function (oControlEvent) {
        var sUnvalidatedFilterString = oControlEvent.getParameters().value;
        this._parseInputAndCreateTags(sUnvalidatedFilterString);
    };

    RangeConstraint.prototype._parseInputAndCreateTags = function (sUnvalidatedFilterString) {
        this._oParser.parseInput(sUnvalidatedFilterString, this._addFilter.bind(this), this._addFailToken.bind(this));
        this._oTagInput.setValue("");
    };

    RangeConstraint.prototype._addFilter = function (sSourceString, oFilter) {
        this._aFilters.push(oFilter);
        var newToken = new Token({
            text: sSourceString,
            delete: this._removeChartFilter.bind(this, oFilter)
        }).addStyleClass("sapMriPaValidToken");
        newToken.attachBrowserEvent("focusin", this._onTagFocusin.bind(this, newToken), this);
        this._oTagInput.addToken(newToken);
        this.fireChanged();
    };

    RangeConstraint.prototype._findFocus = function (oEvent) {
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

    RangeConstraint.prototype._removeChartFilter = function (oFilter, oEvent) {
        var iIndex = this._aFilters.indexOf(oFilter);
        if (iIndex > -1) {
            this._aFilters.splice(iIndex, 1);
            this.fireChanged();
        }
        this._findFocus(oEvent);
    };

    RangeConstraint.prototype._addFailToken = function (sSourceString) {
        var newToken = new Token({
            text: sSourceString,
            delete: [this._findFocus, this]
        }).addStyleClass("sapMriPaFailToken");
        newToken.attachBrowserEvent("focusin", this._onTagFocusin.bind(this, newToken), this);
        this._oTagInput.addToken(newToken);
    };

    RangeConstraint.prototype._onTagFocusin = function (obj) {
        obj.setSelected(true);
    };

    /**
     * Removes all tokens (=input values/tags) from this constraint.
     * @private
     */
    RangeConstraint.prototype._clearTokens = function () {
        this._aFilters = [];
        this._oTagInput.removeAllTokens();
        this._oTagInput.setValue("");
    };

    RangeConstraint.prototype._rebuildFromFilter = function (oFilter) {
        if (oFilter.and) {
            return this._rebuildFromAndFilter(oFilter);
        } else if (oFilter.op) {
            return this._rebuildFromSimpleFilter(oFilter);
        } else {
            // TODO: Log error!
        }
    };

    RangeConstraint.prototype._rebuildFromAndFilter = function (oAndFilter) {
        var sFilterText = "";
        switch (oAndFilter.and[0].op) {
            case ">":
                sFilterText += "]";
                break;
            case ">=":
                sFilterText += "[";
                break;
            default:
                break;
        }

        sFilterText += oAndFilter.and[0].value + "-" + oAndFilter.and[1].value;

        switch (oAndFilter.and[1].op) {
            case "<":
                sFilterText += "[";
                break;
            case "<=":
                sFilterText += "]";
                break;
            default:
                break;
        }

        return {
            filter: oAndFilter,
            sFilterText: sFilterText
        };
    };

    RangeConstraint.prototype._rebuildFromSimpleFilter = function (oFilter) {
        var sFilterText = "";

        if (oFilter.op !== "=") {
            sFilterText += oFilter.op;
        }

        sFilterText += oFilter.value;

        return {
            filter: oFilter,
            sFilterText: sFilterText
        };
    };

    RangeConstraint.prototype.onSetConstraintToolTip = function (prefixString) {
        this._oTagInput.setTooltip(prefixString);
    };

    /**
     * Set some values to the constraint.
     * @abstract
     * @param {string[]} values    The values to be added.
     * @param {sap.hc.mri.pa.ui.Utils.valuesMergeMode} [mergeMode] The merge strategy between existing values
     *        and new values. The default strategy is APPEND
     */
    RangeConstraint.prototype.setFilterValues = function (values, mergeMode) {
        if (mergeMode === Utils.valuesMergeMode.OVERRIDE) {
            this._overrideFilterValues(values);
        } else {
            // the default merge mode for this constraint is "append"
            this._appendFilterValues(values);
        }
        this.fireChanged();
    };

    RangeConstraint.prototype._overrideFilterValues = function (values) {
        this._clearTokens();
        this._appendFilterValues(values);
    };

    RangeConstraint.prototype._appendFilterValues = function (values) {
        this._parseInputAndCreateTags(values.join(" "));
    };

    return RangeConstraint;
});
