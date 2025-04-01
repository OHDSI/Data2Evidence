sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "./MriFrontendConfig",
    "./VariantConstraintPatternDefinition",
    "./VariantConstraintTokenDefinition",
    "./utils/Parser",
    "./utils/Tokenizer"
], function (jQuery, Utils, MriFrontendConfig, VariantConstraintPatternDefinition, VariantConstraintTokenDefinition, Parser, Tokenizer) {
    "use strict";

    /**
     * VariantValidator.
     * @namespace
     * @alias sap.hc.mri.pa.ui.lib.VariantValidator
     */
    var VariantValidator = {};

    var mLocationCache = {};
    var sServicesURL = "/sap/hc/mri/pa/services/analytics.xsjs?action=genomics_values_service";
    var oTokenizer = new Tokenizer(VariantConstraintTokenDefinition.tokenDefinitions);
    var oParser = new Parser(VariantConstraintPatternDefinition.acceptedPatterns);

    /**
     * Validate a VariantConstraint Token.
     * @param   {string}          sTokenText Variant Constraint Token name.
     * @returns {jQuery.Deferred} jQuery Promise to be resolved when the Token is validated.
     */
    VariantValidator.validate = function (sTokenText) {
        return new jQuery.Deferred(function ($deferred) {
            if (mLocationCache[sTokenText]) {
                $deferred.resolve(mLocationCache[sTokenText]);
            } else {
                var mRequest;
                try {
                    var aTokenList = oTokenizer.tokenize(sTokenText);
                    var mParseResult = oParser.parse(aTokenList);
                    mRequest = {
                        sChromName: mParseResult.chromosomeId,
                        iStartPos: mParseResult.positionStart,
                        iEndPos: mParseResult.positionEnd,
                        sProcess: "validateChrom"
                    };
                } catch (e) {
                    // the parse failed => we will consider this token a gene
                    mRequest = {
                        sGeneName: sTokenText,
                        sProcess: "validateGene"
                    };
                }
                return Utils.ajax({
                    type: "POST",
                    url: sServicesURL,
                    contentType: "application/json;charset=utf-8",
                    data: MriFrontendConfig.getFrontendConfig().addConfigMetadata(mRequest)
                }).done(function (mData) {
                    mLocationCache[sTokenText] = mData;
                    mData.sProcess = mRequest.sProcess;
                    $deferred.resolve(mData);
                }).fail($deferred.reject);
            }
        });
    };

    /**
     * Synchronously validate a VariantConstraint Token.
     * @param   {string} sTokenText sTokenText Variant Constraint Token name.
     * @returns {object} Validation result.
     */
    VariantValidator.validateFromCache = function (sTokenText) {
        if (mLocationCache[sTokenText]) {
            return mLocationCache[sTokenText];
        }
    };

    return VariantValidator;
});
