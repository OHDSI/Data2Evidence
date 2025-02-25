sap.ui.define([
    "jquery.sap.global",
    "sap/ui/commons/library",
    "sap/ui/core/library",
    "sap/ui/layout/library",
    "sap/ui/unified/library",
    "sap/ui/table/library"
], function () {
    "use strict";

    sap.ui.getCore().setThemeRoot("sap_bluecrystal", ["sap.hc.mri.pa.ui.lib"], "");
    sap.ui.getCore().setThemeRoot("sap_hcb", ["sap.hc.mri.pa.ui.lib"], "");

    /**
     * SAPUI5 library for MRI PA Controls.
     *
     * @namespace
     * @name sap.hc.mri.pa.ui.lib
     * @author SAP SE
     * @version 1.0.0
     */
    sap.ui.getCore().initLibrary({
        name: "sap.hc.mri.pa.ui.lib",
        version: "1.0.0",
        dependencies: [
            "sap.m",
            "sap.ui.commons",
            "sap.ui.core",
            "sap.ui.layout",
            "sap.ui.unified",
            "sap.ui.table"
        ],
        types: [
            "sap.hc.mri.pa.ui.lib.Dimensions",
            "sap.hc.mri.pa.ui.lib.Selection",
            "sap.hc.mri.pa.ui.lib.CDMAttrType"
        ],
        interfaces: [
            "sap.hc.mri.pa.ui.lib.IBoolItem"
        ],
        controls: [
            "sap.hc.mri.pa.ui.lib.AdvancedTimeFilter",
            "sap.hc.mri.pa.ui.lib.AttributeMenuButton",
            "sap.hc.mri.pa.ui.lib.BinningHelper",
            "sap.hc.mri.pa.ui.lib.BookmarkList",
            "sap.hc.mri.pa.ui.lib.BookmarkListItem",
            "sap.hc.mri.pa.ui.lib.BoolContainer",
            "sap.hc.mri.pa.ui.lib.BoolFilterContainer",
            "sap.hc.mri.pa.ui.lib.BoolItem",
            "sap.hc.mri.pa.ui.lib.Boxplot",
            "sap.hc.mri.pa.ui.lib.BoxplotChart",
            "sap.hc.mri.pa.ui.lib.ChartPopoverContent",
            "sap.hc.mri.pa.ui.lib.Constraint",
            "sap.hc.mri.pa.ui.lib.ConstraintLayout",
            "sap.hc.mri.pa.ui.lib.DateConstraint",
            "sap.hc.mri.pa.ui.lib.DateTimeConstraint",
            "sap.hc.mri.pa.ui.lib.datetimepicker.DatePicker",
            "sap.hc.mri.pa.ui.lib.datetimepicker.DateTimePicker",
            "sap.hc.mri.pa.ui.lib.datetimepicker.TimePickerSlider",
            "sap.hc.mri.pa.ui.lib.datetimepicker.TimePickerSliders",
            "sap.hc.mri.pa.ui.lib.DomainConstraint",
            "sap.hc.mri.pa.ui.lib.FilterCard",
            "sap.hc.mri.pa.ui.lib.FreetextConstraint",
            "sap.hc.mri.pa.ui.lib.FreetextTagInput",
            "sap.hc.mri.pa.ui.lib.HelpText",
            "sap.hc.mri.pa.ui.lib.KaplanMeierChart",
            "sap.hc.mri.pa.ui.lib.KaplanMeierChartControl",
            "sap.hc.mri.pa.ui.lib.KaplanMeierLegend",
            "sap.hc.mri.pa.ui.lib.LazyMenu",
            "sap.hc.mri.pa.ui.lib.LegacyRangeConstraint",
            "sap.hc.mri.pa.ui.lib.MedexChart",
            "sap.hc.mri.pa.ui.lib.PatientListChart",
            "sap.hc.mri.pa.ui.lib.RangeConstraint",
            "sap.hc.mri.pa.ui.lib.SingleSelectionConstraint",
            "sap.hc.mri.pa.ui.lib.StackedBarChart",
            "sap.hc.mri.pa.ui.lib.TagElement",
            "sap.hc.mri.pa.ui.lib.TagInput",
            "sap.hc.mri.pa.ui.lib.VariantConstraint",
            "sap.hc.mri.pa.ui.lib.VariantFilterCard",
            "sap.hc.mri.pa.ui.lib.VbChart"
        ],
        elements: [
            "sap.hc.mri.pa.ui.lib.BookmarkUtils",
            "sap.hc.mri.pa.ui.lib.MriConfigAttribute",
            "sap.hc.mri.pa.ui.lib.MriConfigFilterCard",
            "sap.hc.mri.pa.ui.lib.MriConfigPatientList",
            "sap.hc.mri.pa.ui.lib.MriFrontendConfig",
            "sap.hc.mri.pa.ui.lib.RangeConstraintPatternDefinition",
            "sap.hc.mri.pa.ui.lib.RangeConstraintTokenDefinition",
            "sap.hc.mri.pa.ui.lib.VariantConstraintPatternDefinition",
            "sap.hc.mri.pa.ui.lib.VariantConstraintTokenDefinition",
            "sap.hc.mri.pa.ui.lib.VariantTagManager",
            "sap.hc.mri.pa.ui.lib.VariantValidator",
            "sap.hc.mri.pa.ui.lib.backend.BookmarkBackendService",
            "sap.hc.mri.pa.ui.lib.bookmarks.BMv2Parser",
            "sap.hc.mri.pa.ui.lib.bookmarks.oldBMParser",
            "sap.hc.mri.pa.ui.lib.ifr.BooleanContainers",
            "sap.hc.mri.pa.ui.lib.ifr.ControlGenerator",
            "sap.hc.mri.pa.ui.lib.ifr.IFR2Bookmark",
            "sap.hc.mri.pa.ui.lib.ifr.IFR2Request",
            "sap.hc.mri.pa.ui.lib.ifr.IFR2Text",
            "sap.hc.mri.pa.ui.lib.ifr.IFRBuilder",
            "sap.hc.mri.pa.ui.lib.ifr.IFRConfigValidator",
            "sap.hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation",
            "sap.hc.mri.pa.ui.lib.ifr.InvalidArgumentException",
            "sap.hc.mri.pa.ui.lib.ifr.ParameterObjectValidator"
        ]
    });

    /**
     * Available dimension in all charts.
     * @enum {Number}
     */
    sap.hc.mri.pa.ui.lib.Dimensions = {
        Count: 6,
        Sort: 5, 

        X1: 0,
        X2: 1,
        X3: 2,
        StackAttribute: 3,
        Y: 4
    };

    /**
     * Status of selection.
     * @enum {String}
     */
    sap.hc.mri.pa.ui.lib.Selection = {
        Invalid: "n/a",
        NoBinning: ""
    };

    /**
     * Supported CDM attribute types
     * @enum {String}
     */
    sap.hc.mri.pa.ui.lib.CDMAttrType = {
        Text: "text",
        Number: "num",
        Freetext: "freetext",
        Date: "time", // legacy type "time" means date in fact
        Datetime: "datetime"
    };

    return sap.hc.mri.pa.ui.lib;
});
