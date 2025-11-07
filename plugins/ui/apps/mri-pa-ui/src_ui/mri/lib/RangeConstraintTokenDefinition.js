sap.ui.define([
    "jquery.sap.global",
    "./utils/Enum",
    "./utils/TokenDefinition"
], function (jQuery, Enum, TokenDefinition) {
    "use strict";

    /**
     * List of TokenDefinitions for the RangeConstraint.
     * @namespace
     * @alias sap.hc.mri.pa.ui.lib.RangeConstraintTokenDefinition
     */
    var RangeConstraintTokenDefinition = {};

    RangeConstraintTokenDefinition.tokens = Enum.build("GEQ", "LEQ", "GT", "LT", "OPENING_BRACKET", "CLOSING_BRACKET", "Dash", "Number", "NOVALUE");

    RangeConstraintTokenDefinition.tokenDefinitions = [
        new TokenDefinition(/^>=/, RangeConstraintTokenDefinition.tokens.GEQ),
        new TokenDefinition(/^<=/, RangeConstraintTokenDefinition.tokens.LEQ),
        new TokenDefinition(/^>/, RangeConstraintTokenDefinition.tokens.GT),
        new TokenDefinition(/^</, RangeConstraintTokenDefinition.tokens.LT),
        new TokenDefinition(/^\[/, RangeConstraintTokenDefinition.tokens.OPENING_BRACKET),
        new TokenDefinition(/^]/, RangeConstraintTokenDefinition.tokens.CLOSING_BRACKET),
        new TokenDefinition(/^-/, RangeConstraintTokenDefinition.tokens.DASH),
        new TokenDefinition(/^(?:\d*\.)?\d+/, RangeConstraintTokenDefinition.tokens.NUMBER),
        new TokenDefinition(/^\(?-[0-9]?\d*\.?\d+\)?/, RangeConstraintTokenDefinition.tokens.NUMBER),
        new TokenDefinition(/^NoValue/, RangeConstraintTokenDefinition.tokens.NOVALUE)
    ];

    return RangeConstraintTokenDefinition;
}, true);
