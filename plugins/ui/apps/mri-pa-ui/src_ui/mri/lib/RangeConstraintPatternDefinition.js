sap.ui.define([
    "jquery.sap.global",
    "./RangeConstraintTokenDefinition"
], function (jQuery, RangeConstraintTokenDefinition) {
    "use strict";

    function _buildFilterObject(sOperation, value) {
        return {
            op: sOperation,
            value: value
        };
    }

    function _returnRangeFilterBuilder(sLowerBoundOperation, iIndexOfLowerToken, sUpperBoundOperation, iIndexOfUpperToken) {
        return function (aTokenList) {
            return {
                and: [
                    _buildFilterObject(sLowerBoundOperation, parseFloat(aTokenList[iIndexOfLowerToken].value)),
                    _buildFilterObject(sUpperBoundOperation, parseFloat(aTokenList[iIndexOfUpperToken].value))
                ]
            };
        };
    }

    function _returnSingleFilterBuilder(sOperation, iIndexOfValueToken) {
        return function (aTokenList) {
            return _buildFilterObject(sOperation, parseFloat(aTokenList[iIndexOfValueToken].value));
        };
    }

    function _returnSingleFilterNoValueBuilder(sOperation, iIndexOfValueToken) {
        return function (aTokenList) {
            return _buildFilterObject(sOperation, aTokenList[iIndexOfValueToken].value);
        };
    }

    var tokens = RangeConstraintTokenDefinition.tokens;

    /**
     * List of pattern definitions for the RangeConstraint.
     * @namespace
     * @alias sap.hc.mri.pa.ui.lib.RangeConstraintPatternDefinition
     */
    var RangeConstraintPatternDefinition = {};

    RangeConstraintPatternDefinition.acceptedPatterns = [
        {
            sequence: [tokens.OPENING_BRACKET, tokens.NUMBER, tokens.DASH, tokens.NUMBER, tokens.OPENING_BRACKET],
            action: _returnRangeFilterBuilder(">=", 1, "<", 3)
        }, {
            sequence: [tokens.OPENING_BRACKET, tokens.NUMBER, tokens.DASH, tokens.NUMBER, tokens.CLOSING_BRACKET],
            action: _returnRangeFilterBuilder(">=", 1, "<=", 3)
        }, {
            sequence: [tokens.CLOSING_BRACKET, tokens.NUMBER, tokens.DASH, tokens.NUMBER, tokens.OPENING_BRACKET],
            action: _returnRangeFilterBuilder(">", 1, "<", 3)
        }, {
            sequence: [tokens.CLOSING_BRACKET, tokens.NUMBER, tokens.DASH, tokens.NUMBER, tokens.CLOSING_BRACKET],
            action: _returnRangeFilterBuilder(">", 1, "<=", 3)
        }, {
            sequence: [tokens.GEQ, tokens.NUMBER],
            action: _returnSingleFilterBuilder(">=", 1)
        }, {
            sequence: [tokens.GT, tokens.NUMBER],
            action: _returnSingleFilterBuilder(">", 1)
        }, {
            sequence: [tokens.LEQ, tokens.NUMBER],
            action: _returnSingleFilterBuilder("<=", 1)
        }, {
            sequence: [tokens.LT, tokens.NUMBER],
            action: _returnSingleFilterBuilder("<", 1)
        }, {
            sequence: [tokens.NUMBER],
            action: _returnSingleFilterBuilder("=", 0)
        }, {
            sequence: [tokens.NOVALUE],
            action: _returnSingleFilterNoValueBuilder("=", 0)
        }
    ];

    return RangeConstraintPatternDefinition;
}, true);
