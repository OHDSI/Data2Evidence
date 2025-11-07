sap.ui.define(function () {
    "use strict";

    var TokenizerError = function (message) {
        this.message = message;
        this.stack = (new Error()).stack;
    };

    TokenizerError.prototype = Object.create(Error.prototype);
    TokenizerError.prototype.constructor = TokenizerError;
    TokenizerError.prototype.name = "TokenizerError";

    /**
     * A very simple tokenizer.
     * @constructor
     * @param {sap.hc.mri.pa.ui.lib.utils.TokenDefinition[]} tokenDefinitions List of token definitions used by the
     *                                                                     Tokenizer to tokenize strings.
     *
     * @classdesc
     * Tokenizer class
     * @alias sap.hc.mri.pa.ui.lib.utils.Tokenizer
     */
    function Tokenizer(tokenDefinitions) {
        this._tokenDefinitions = tokenDefinitions;
    }

    /**
     * Tokenizes a string.
     * @throws  {TokenizerError} If no token matched.
     * @param   {string}   sInput The string to be tokenized.
     * @returns {object[]} An array of objects containing classes according to the recognized token definitions.
     */
    Tokenizer.prototype.tokenize = function (sInput) {
        this._input = sInput;
        this._listOfMatchedTokens = [];

        while (this._input.length > 0) {
            var bNoTokenMatched = true;

            bNoTokenMatched = this._tokenDefinitions.every(this._checkIfTokenDefinitionMatches, this);

            if (bNoTokenMatched) {
                throw new TokenizerError("Could not match input.");
            }
        }

        return this._listOfMatchedTokens;
    };

    Tokenizer.prototype._checkIfTokenDefinitionMatches = function (tokenDefinition) {
        var matchResult = tokenDefinition.tokenPattern.exec(this._input);
        if (matchResult !== null) {
            var matchedString = matchResult[0];
            var matchLength = matchedString.length;
            this._input = this._input.substring(matchLength);

            var negativeValue = matchedString.indexOf("(");

            if (negativeValue === 0) {
                matchedString = matchedString.substring(1, matchLength - 1);
            }
            
            this._listOfMatchedTokens.push({
                class: tokenDefinition.tokenClass,
                value: matchedString
            });


            return false;
        }
        return true;
    };

    return Tokenizer;
});
