sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/lib/bookmarks/BMv2Parser",
    "sap/hc/mri/pa/ui/lib/ifr/IFRConfigValidator",
    "sap/hc/mri/pa/ui/lib/ifr/IFR2Text",
    "sap/hc/mri/pa/ui/Utils",
    "./MriFrontendConfig"
], function (jQuery, BMv2Parser, ifrConfigValidator, ifr2Text, Utils, MriFrontendConfig) {
    "use strict";

    var BookmarkUtils = {};

    BookmarkUtils.getFilterDescription = function (ifr) {
        var sDescr;
        try {
            sDescr = ifr2Text(ifr);
        } catch (e) {
            sDescr = Utils.getText("MRI_PA_LOAD_BMK_ERROR");
        }
        return sDescr;
    };

    BookmarkUtils.getAxesDescriptions = function (filterObject) {
        var axesKeys = ["x1", "x2", "x3", "stacked", "y"];
        var axesIcons = ["sap-icon://MRI/x1-axis",
            "sap-icon://MRI/x2-axis",
            "sap-icon://MRI/x3-axis",
            "sap-icon://vertical-stacked-chart",
            "sap-icon://MRI/y-axis"
        ];

        var axes = filterObject.axisSelection.map(function (axisId, i) {
            return {
                key: axesKeys[i],
                icon: axesIcons[i],
                id: axisId
            };
        });

        axes = axes.filter(function (axis) {
            return axis.id === "string" ? axis.id !== sap.hc.mri.pa.ui.lib.Selection.Invalid : axis.id.attributeId !== sap.hc.mri.pa.ui.lib.Selection.Invalid;
        });

        axes = axes.map(function (axis) {
            var axisAttrConfig = typeof axis.id === "string" ?
                                    MriFrontendConfig.getFrontendConfig().getAttributeByPath(axis.id) :
                                    MriFrontendConfig.getFrontendConfig().getAttributeByPath(axis.id.attributeId);

            if (axisAttrConfig) {
                axis.name = axisAttrConfig.getName();
            } else {
                axis.name = Utils.getText("MRI_PA_BOOKMARK_AXIS_NOT_AVAILABLE_UNDER_CURRENT_CONFIG");
            }
            axis.description = axis.key + ": " + axis.name;
            return axis;
        });

        return axes;
    };

    BookmarkUtils.getChartDescription = function (filterObject) {
        var chartTypes = {
            km: {
                name: Utils.getText("MRI_PA_TOOLTIP_CHARTTYPE_KAPLAN"),
                icon: "sap-icon://MRI/km-chart"
            },
            stacked: {
                name: Utils.getText("MRI_PA_TOOLTIP_CHARTTYPE_STACKED"),
                icon: "sap-icon://vertical-bar-chart"
            },
            boxplot: {
                name: Utils.getText("MRI_PA_TOOLTIP_CHARTTYPE_BOXPLOT"),
                icon: "sap-icon://MRI/boxplot-chart"
            },
            list: {
                name: Utils.getText("MRI_PA_TOOLTIP_CHARTTYPE_PATIENT_LIST"),
                icon: "sap-icon://list"
            },
            vb: {
                name: Utils.getText("MRI_PA_TOOLTIP_CHARTTYPE_VB"),
                icon: "sap-icon://FFH/dna"
            }
        };

        return chartTypes[filterObject.chartType];
    };

    BookmarkUtils.createBmkDescription = function () {
        // add the axis selection
    };

    BookmarkUtils.checkBookmarkConfigCompatible = function (oBookmark) {
        var ifr = BMv2Parser.convertBM2IFR(oBookmark.filter);
        var aAxisSelection = oBookmark.axisSelection;
        var sChart = oBookmark.chartType;
        var mriConfig = MriFrontendConfig.getFrontendConfig();
        var bFilterOk;

        try {
            bFilterOk = ifrConfigValidator(ifr);
        } catch (e) {
            // unexpected error on validating the filtercards - invalid
            var sMessage = "Cannot parse a bookmark filter; " + e.message;
            var sComponent = "sap.hc.mri.pa.ui.BookmarkUtil";
            jQuery.sap.log.error(sMessage, null, sComponent);
            return false;
        }
        if (!bFilterOk) {
            return false;
        }

        // check that all the attributes for the axis are valid
        // xaxis
        for (var j = 0; j < 3; j++) {
            var attributePath = typeof aAxisSelection[j] === "string" ? aAxisSelection[j] : aAxisSelection[j].attributeId;
            if (attributePath !== sap.hc.mri.pa.ui.lib.Selection.Invalid) {
                if (!mriConfig.isValidFilterCardAttribute(attributePath)) {
                    //  If path is not a valid filtercard path, check for annotated paths
                    if (!mriConfig.isValidFilterCardAnnotatedAttribute(attributePath)) {
                        return false;
                    }
                }
            }
        }

        // yaxis
        var measure = typeof aAxisSelection[4] === "string" ? aAxisSelection[4] : aAxisSelection[4].attributeId;
        if (measure !== sap.hc.mri.pa.ui.lib.Selection.Invalid) {
            if (!mriConfig.getAttributeByPath(measure)) {
                //  If path is not a valid filtercard path, check for annotated paths
                if (mriConfig.getAttributeByAnnotatedPath(measure).length === 0) {
                    return false;
                }
            }
        }

        // check that the saved chart is enabled
        if (!mriConfig.isChartVisible(sChart)) {
            return false;
        }

        return true;
    };

    return BookmarkUtils;
}, true);
