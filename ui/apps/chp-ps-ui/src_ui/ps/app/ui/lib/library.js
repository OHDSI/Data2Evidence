/**
 * SAPUI5 library for Patient Summary controls.
 *
 * @namespace
 * @name sap.hc.hph.patient.app.ui.lib
 */
sap.ui.define([
    "jquery.sap.global",
    "sap/m/library",
    "sap/ui/core/library"
], function () {
    "use strict";

    sap.ui.getCore().setThemeRoot("sap_belize", ["sap.hc.hph.patient.app.ui.lib"], "");
    sap.ui.getCore().setThemeRoot("sap_bluecrystal", ["sap.hc.hph.patient.app.ui.lib"], "");
    sap.ui.getCore().setThemeRoot("sap_hcb", ["sap.hc.hph.patient.app.ui.lib"], "");

    sap.ui.getCore().initLibrary({
        name: "sap.hc.hph.patient.app.ui.lib",
        version: "1.0.0",
        dependencies: [
            "sap.m",
            "sap.ui.core"
        ],
        types: [
            "sap.hc.hph.patient.app.ui.lib.LaneColor",
            "sap.hc.hph.patient.app.ui.lib.CDMAttrType",
            "sap.hc.hph.patient.app.ui.lib.timeline.ChartMode"
        ],
        interfaces: [],
        controls: [
            "sap.hc.hph.patient.app.ui.lib.table.ChronoRows",
            "sap.hc.hph.patient.app.ui.lib.table.GroupRows",
            "sap.hc.hph.patient.app.ui.lib.table.Table",
            "sap.hc.hph.patient.app.ui.lib.timeline.Chart",
            "sap.hc.hph.patient.app.ui.lib.timeline.ChartBase",
            "sap.hc.hph.patient.app.ui.lib.timeline.CircleStencil",
            "sap.hc.hph.patient.app.ui.lib.timeline.Lane",
            "sap.hc.hph.patient.app.ui.lib.timeline.LaneBase",
            "sap.hc.hph.patient.app.ui.lib.timeline.Minimap",
            "sap.hc.hph.patient.app.ui.lib.timeline.MiniTileArea",
            "sap.hc.hph.patient.app.ui.lib.timeline.TileArea",
            "sap.hc.hph.patient.app.ui.lib.timeline.Timeline",
            "sap.hc.hph.patient.app.ui.lib.OverviewButton",
            "sap.hc.hph.patient.app.ui.lib.Tile",
            "sap.hc.hph.patient.app.ui.lib.TilePopoverContent"
        ],
        elements: [
            "sap.hc.hph.patient.app.ui.lib.table.Cell",
            "sap.hc.hph.patient.app.ui.lib.table.ChronoCell",
            "sap.hc.hph.patient.app.ui.lib.table.ChronoRow",
            "sap.hc.hph.patient.app.ui.lib.table.Column",
            "sap.hc.hph.patient.app.ui.lib.table.GroupedCell",
            "sap.hc.hph.patient.app.ui.lib.table.GroupedRow",
            "sap.hc.hph.patient.app.ui.lib.table.Row",
            "sap.hc.hph.patient.app.ui.lib.TileAnnotation",
            "sap.hc.hph.patient.app.ui.lib.timeline.MinimapLane"
        ]
    });

    /**
     * Possible color for Timeline and Overview.
     * @enum {string}
     */
    sap.hc.hph.patient.app.ui.lib.LaneColor = {
        LightOrange: "LightOrange",
        LightGreen: "LightGreen",
        LightGold: "LightGold",
        LightPurple: "LightPurple",
        LightPink: "LightPink",
        MediumOrange: "MediumOrange",
        MediumGreen: "MediumGreen",
        MediumGold: "MediumGold",
        MediumPurple: "MediumPurple",
        MediumPink: "MediumPink",
        DarkOrange: "DarkOrange",
        DarkGreen: "DarkGreen",
        DarkGold: "DarkGold",
        DarkPurple: "DarkPurple",
        DarkPink: "DarkPink"
    };

    /**
     * Supported CDM attribute types
     * @enum {String}
     */
    sap.hc.hph.patient.app.ui.lib.CDMAttrType = {
        Text: "text",
        Number: "num",
        Freetext: "freetext",
        Date: "time", // legacy type "time" means date in fact
        Datetime: "datetime"
    };

    /**
     * Defines the mode of the chart.
     * @enum {string}
     */
    sap.hc.hph.patient.app.ui.lib.timeline.ChartMode = {
        Dot: "Dot",
        Line: "Line"
    };

    return sap.hc.hph.patient.app.ui.lib;
});
