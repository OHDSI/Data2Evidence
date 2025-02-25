/**
 * Annotate/deannotate bookmarks for export/import
 */
sap.ui.define([
    "sap/hc/mri/pa/ui/lib/ifr/InternalFilterRepresentation",
    "sap/hc/mri/pa/ui/lib/ifr/IFR2Bookmark",
    "sap/hc/mri/pa/ui/lib/MriFrontendConfig"
], function (IFR, ifr2Bookmark) {
    "use strict";
    /**
     * Retrieves annotation value or attribute name depending on option
     * @param   {string}    opt         Should have a value of "annotate" or "deannotate"
     * @param   {object}    oConfig     MriFrontendConfig
     * @param   {string}    path        attribute path
     * @param   {string}    name        attribute name/ annotation value
     * @returns {string[]}  string array of substitute attribute names/ annotation
     */
    function getSubstitute(opt, oConfig, path, name) {
        switch (opt) {
            case "annotate":
                return oConfig.getAnnotationByPath(path);
            case "deannotate":
                var interPath = oConfig.getInterHavingAttrAnnotation(name);
                if (interPath.length > 0) {
                    var fc = oConfig.getFilterCardByPath(interPath);
                    return fc.getAttributesWithAnnotation(name);
                }
                return [];
            default:
                throw new Error(opt + "is not a valid option");
        }
    }
    /**
     * Traverses IFR, maps attribute names to annotation values or vice versa
     * @param   {object}  oIFR        IFR object
     * @param   {object}  oConfig     MriFrontendConfig
     * @param   {string}  opt         Should have a value of "annotate" or "deannotate"
     * @returns {object}              IFR object with attribute id replaced with annotation value
     */
    function traverseIFR(oIFR, oConfig, opt) {
        if (oIFR instanceof Object) {
            Object.keys(oIFR).forEach(function (e) {
                if (oIFR[e] instanceof IFR.Attribute) {
                    var attributeName = String(oIFR[e]._configPath).split(".").pop();
                    var substitute = getSubstitute(opt, oConfig, oIFR[e]._configPath, attributeName);

                    if (substitute && substitute.length > 0) {
                        oIFR[e]._instanceID = String(oIFR[e]._instanceID).replace(attributeName, substitute[0]);
                        oIFR[e]._configPath = String(oIFR[e]._configPath).replace(attributeName, substitute[0]);
                    }
                } else {
                    traverseIFR(oIFR[e], oConfig, opt);
                }
            });
        } else if (oIFR instanceof Array) {
            oIFR.forEach(function (e) {
                traverseIFR(e, oConfig, opt);
            });
        }
        return oIFR;
    }

    /**
     * Traverses axis selection, maps attribute names to annotation values or vice versa
     * @param   {array}   oAxisSelection      list of axis selections
     * @param   {object}  oConfig             MriFrontendConfig
     * @param   {string}  opt                 Should have a value of "annotate" or "deannotate"
     * @returns {object}                      axis selections with attribute id replaced with annotation value
     */
    function traverseAxisSelection(oAxisSelection, oConfig, opt) {
        oAxisSelection.forEach(function (e) {
            var id = typeof e === "string" ? e : e.attributeId;
            var substitute = getSubstitute(opt, oConfig, id, String(id).split(".").pop());
            var attributePath = String(id).split(".");
            if (substitute && substitute.length > 0) {
                attributePath.pop();
                attributePath.push(substitute[0]);
                if (typeof e === "string") {
                    e = attributePath.join(".");
                } else {
                    e.attributeId = attributePath.join(".");
                }
            }
        });
        return oAxisSelection;
    }
    /**
     * Annotate bookmark
     * @param   {object}    oIFR                IFR object
     * @param   {array}     oAxisSelection      list of axis selections
     * @param   {object}    oConfig             MriFrontendConfig
     * @returns {object}    object with properties filter (IFR with annotated attribute config paths) and annotated axis paths
     */
    function annotate(oIFR, oAxisSelection, oConfig) {
        var filter = traverseIFR(oIFR, oConfig, "annotate");
        var axisSelection = traverseAxisSelection(oAxisSelection, oConfig, "annotate");
        return {
            filter: ifr2Bookmark(filter),
            axisSelection: axisSelection
        };
    }

    /**
     * Deannotate bookmark
     * @param   {object}    oIFR                IFR object
     * @param   {array}     oAxisSelection      list of axis selections
     * @param   {object}    oConfig             MriFrontendConfig
     * @returns {object}   object with properties filter (IFR with deannotated attribute config paths) and annotated axis paths
     */
    function deannotate(oIFR, oAxisSelection, oConfig) {
        var filter = traverseIFR(oIFR, oConfig, "deannotate");
        var axisSelection = traverseAxisSelection(oAxisSelection, oConfig, "deannotate");
        return {
            filter: filter,
            axisSelection: axisSelection
        };
    }

    return {
        annotate: annotate,
        deannotate: deannotate
    };
});
