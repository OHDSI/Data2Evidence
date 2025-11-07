sap.ui.define([
    "jquery.sap.global",
    "./VariantConstraintTokenDefinition"
], function (jQuery, VariantConstraintTokenDefinition) {
    "use strict";

    function _returnVariantFilterBuilder(iIndexOfChromId, iIndexOfPosStart, iIndexOfPosEnd) {
        return function (aTokenList) {
            return {
                chromosomeId: aTokenList[iIndexOfChromId].value.toLowerCase().replace("chr", ""),
                positionStart: parseInt(aTokenList[iIndexOfPosStart].value, 10),
                positionEnd: parseInt(aTokenList[iIndexOfPosEnd].value, 10)
            };
        };
    }

    var tokens = VariantConstraintTokenDefinition.tokens;

    /**
     * List of pattern definitions for the VariantConstraint.
     * @namespace
     * @alias sap.hc.mri.pa.ui.lib.VariantConstraintPatternDefinition
     */
    var VariantConstraintPatternDefinition = {};

    VariantConstraintPatternDefinition.acceptedPatterns = [
        {
            sequence: [tokens.CHR, tokens.COLON, tokens.NUMBER, tokens.DASH, tokens.NUMBER],
            action: _returnVariantFilterBuilder(0, 2, 4)
        }
    ];

    return VariantConstraintPatternDefinition;
}, true);
