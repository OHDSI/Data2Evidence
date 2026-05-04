sap.ui.define([
    "jquery.sap.global",
    "hc/hph/core/ui/FioriUtils",
    "hc/hph/core/ui/ScopedUtils",
    "./lib/utils/Enum"
], function (jQuery, FioriUtils, ScopedUtils, Enum) {
    "use strict";

    /**
     * @namespace
     * @classdesc Utility class for MRI PA.
     * @extends hc.hph.core.ui.ScopedUtils
     * @alias hc.mri.pa.ui.Utils
     */
    var Utils = new ScopedUtils("mri.pa", [FioriUtils.DensityClass.Compact]);

    /**
     * Hardcoded Backend Values to be Translated
     */
    Utils.translation = {
        "NoValue": "MRI_PA_NO_VALUE"
    };

    /**
     * Events used by MRI PA.
     * @enum {string}
     */
    Utils.events = {
        CHANNEL: "medexplorer",
        EVENT_ERROR: "ERROR",
        EVENT_ADD_ATTRIBUTE: "ADD_ATTRIBUTE",
        EVENT_FILTER_ON_GENE: "FILTER_ON_GENE"
    };

    /**
     * Models used by MRI PA.
     * @enum {string}
     */
    Utils.models = {
        SELECTIONS: "selections",
        LOCATIONS: "locations",
        RESULTS: "results",
        STATUS: "status",
        FILTERBAR_DATA: "filterbar_data"
    };

    Utils.valuesMergeMode = Enum.build("APPEND", "OVERRIDE");

    /**
     * Transform a number into a (capital) letter.
     * Numbers above 26 are transformed according to Excel column numbering (i.e. AA).
     * @param   {number} iNumber A Number
     * @returns {string} The transformed letters.
     */
    Utils.getLetterForNumber = function (iNumber) {
        iNumber -= 1;
        var iOrdA = "A".charCodeAt(0);
        var iOrdZ = "Z".charCodeAt(0);
        var iLength = iOrdZ - iOrdA + 1;

        var sLetters = "";
        while (iNumber >= 0) {
            sLetters = String.fromCharCode(iNumber % iLength + iOrdA) + sLetters;
            iNumber = Math.floor(iNumber / iLength) - 1;
        }
        return sLetters;
    };

    /**
     * Transform all values within an object according to the translation
     * @param   {Object} Object to be translated
     * @returns {Object} The same object with all values within it translated
     */
    Utils.translate = function (obj) {
        var k;
        for (k in obj) {
            if (obj.hasOwnProperty(k)) {
                switch (typeof obj[k]) {
                    case "object":
                        this.translate(obj[k]);
                        break;
                    case "string":
                        obj[k] = this._translate(obj[k]);
                        break;
                    default:
                        break;
                }
            }
        }
        return obj;
    };

    Utils._translate = function (str) {
        if (this.translation[str]) {
            return this.getText(this.translation[str]);
        } else {
            return str;
        }
    };

    /**
     * Perform a reverse translation within an object according to the translation
     *  @param   {Object} Object to be translated
     *  @returns {Object} The same object with all values within it translated
    */
    Utils.reverseTranslate = function (obj, lib) {
        var k;
        if (!lib) {
            lib = {};
            for (k in this.translation) {
                if (this.translation.hasOwnProperty(k)) {
                    lib[this.getText(this.translation[k])] = k;
                }
            }
        }
        for (k in obj) {
            if (obj.hasOwnProperty(k)) {
                switch (typeof obj[k]) {
                    case "object":
                        this.reverseTranslate(obj[k], lib);
                        break;
                    case "string":
                        obj[k] = this._reverseTranslate(obj[k], lib);
                        break;
                    default:
                        break;
                }
            }
        }
        return obj;
    };

    Utils._reverseTranslate = function (str, lib) {
        if (lib[str]) {
            return lib[str];
        } else {
            return str;
        }
    };


    return Utils;
}, true);
