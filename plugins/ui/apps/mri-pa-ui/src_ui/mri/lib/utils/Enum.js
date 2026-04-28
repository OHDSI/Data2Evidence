sap.ui.define(function () {
    "use strict";

    /**
     * Enum builder.
     * @namespace
     * @alias sap.hc.mri.pa.ui.lib.utils.Enum
     */
    var Enum = {};

    Enum.build = function () {
        var aListOfStates = arguments;
        var mEnum = {};

        for (var i = 0; i < aListOfStates.length; i++) {
            var sNewStateName = aListOfStates[i];
            if (typeof mEnum[sNewStateName] !== "undefined") {
                throw new Error("An identifier must not occur more than once in an enum!");
            }
            mEnum[sNewStateName] = i;
        }

        return Object.freeze(mEnum);
    };

    return Enum;
}, true);
