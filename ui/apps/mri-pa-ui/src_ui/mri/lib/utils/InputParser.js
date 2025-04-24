sap.ui.define([
    "./Parser",
    "./Tokenizer"
], function (Parser, Tokenizer) {
    "use strict";

    /**
     * Constructor for a new InputParser.
     * @constructor
     * @param {sap.hc.mri.pa.ui.lib.utils.TokenDefinition[]} aTokenDefinitions List of TokenDefinitions
     * @param {object[]}                                  aAcceptedPatterns List of accepted patterns
     *
     * @classdesc
     * InputParser class
     * @alias sap.hc.mri.pa.ui.lib.utils.InputParser
     */
    function InputParser(aTokenDefinitions, aAcceptedPatterns) {
        this._oTokenizer = new Tokenizer(aTokenDefinitions);
        this._oParser = new Parser(aAcceptedPatterns);
    }

    InputParser.prototype.parseInput = function (sInput, fParseSuccess, fParseFail) {
        if (sInput.length === 0) {
            return;
        }

        var aSplittedInputs = sInput.split(" ");

        while (aSplittedInputs.length > 0) {
            var sInputPart = aSplittedInputs[0].trim();

            if (sInputPart.length > 0) {
                try {
                    var tokenList = this._oTokenizer.tokenize(sInputPart);
                    var oParseResult = this._oParser.parse(tokenList);

                    fParseSuccess(sInputPart, oParseResult);
                } catch (e) {
                    fParseFail(sInputPart, e.message);
                }
            }

            aSplittedInputs.shift();
        }
    };

    return InputParser;
});
