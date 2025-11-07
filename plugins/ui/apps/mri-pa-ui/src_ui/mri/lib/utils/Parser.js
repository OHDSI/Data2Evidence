sap.ui.define(function () {
    "use strict";

    var ParserError = function (message) {
        this.message = message;
        this.stack = (new Error()).stack;
    };

    ParserError.prototype = Object.create(Error.prototype);
    ParserError.prototype.constructor = ParserError;
    ParserError.prototype.name = "ParserError";

    /**
     * Constructor for a new Parser.
     * @constructor
     * @param {object[]} aAcceptedPatterns List of accepted patterns
     *
     * @classdesc
     * Parser Class.
     * @alias sap.hc.mri.pa.ui.lib.utils.Parser
     */
    function Parser(aAcceptedPatterns) {
        this._acceptedPatterns = aAcceptedPatterns;
    }

    Parser.prototype.parse = function (tokenList) {
        this._tokenList = tokenList;

        for (var i = 0; i < this._acceptedPatterns.length; i++) {
            if (this._tokenListMatchesSequence(this._acceptedPatterns[i].sequence)) {
                return this._acceptedPatterns[i].action(this._tokenList);
            }
        }

        throw new ParserError("Input did not match any of the accepted patterns.");
    };

    Parser.prototype._tokenListMatchesSequence = function (sequence) {
        if (sequence.length !== this._tokenList.length) {
            return false;
        }

        for (var i = 0; i < sequence.length; i++) {
            if (sequence[i] !== this._tokenList[i].class) {
                return false;
            }
        }

        return true;
    };

    return Parser;
});
