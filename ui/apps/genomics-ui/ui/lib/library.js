sap.ui.define([
    "jquery.sap.global",
    "sap/m/library",
    "sap/ui/core/library",
    "hc/hph/core/ui/library",
    "hc/hph/genomics/ui/icons/library",
    "sap/ui/layout/library",
    "sap/ui/commons/library"
], function () {
    "use strict";
    //sap.ui.getCore().setThemeRoot( "sap_bluecrystal", [ "hc.hph.genomics.ui.lib" ], "" );
    /**
         * SAPUI5 library for FfH genomics UI controls.
         *
         * @namespace
         * @name hc.hph.genomics.ui.lib
         */
    sap.ui.getCore().initLibrary({
        name: "hc.hph.genomics.ui.lib",
        version: "1.0.0",
        dependencies: [
            "sap.m",
            "sap.ui.core",
            "hc.hph.core.ui",
            "hc.hph.genomics.ui.icons",
            "sap.ui.layout",
            "sap.ui.commons"
        ],
        types: [],
        interfaces: [],
        controls: [
            "hc.hph.genomics.ui.lib.VariantBrowser",
            "hc.hph.genomics.ui.lib.ChromosomeDetails",
            "hc.hph.genomics.ui.lib.vb.GradientScaleLegend",
            "hc.hph.genomics.ui.lib.vb.StandardLegend",
            "hc.hph.genomics.ui.lib.vb.TrackGroupLegend",
            "hc.hph.genomics.ui.lib.vb.VariantDensityLegend",
            "hc.hph.genomics.ui.lib.vb.overview.Track",
            "hc.hph.genomics.ui.lib.vb.overview.TrackGroup",
            "hc.hph.genomics.ui.lib.vb.overview.Center",
            "hc.hph.genomics.ui.lib.vb.overview.GeneVariantTrack",
            "hc.hph.genomics.ui.lib.vb.overview.VariantDensityTrack",
            "hc.hph.genomics.ui.lib.vb.chromosome.Track",
            "hc.hph.genomics.ui.lib.vb.chromosome.TrackGroup",
            "hc.hph.genomics.ui.lib.vb.chromosome.FeatureTrack",
            "hc.hph.genomics.ui.lib.vb.chromosome.GeneVariantTrack",
            "hc.hph.genomics.ui.lib.vb.chromosome.ReferenceTrack",
            "hc.hph.genomics.ui.lib.vb.chromosome.TranslationTrack",
            "hc.hph.genomics.ui.lib.vb.chromosome.VariantTrack",
            "hc.hph.genomics.ui.lib.vb.site.Track",
            "hc.hph.genomics.ui.lib.vb.site.TrackGroup",
            "hc.hph.genomics.ui.lib.vb.site.ContainerTrack",
            "hc.hph.genomics.ui.lib.vb.site.AlleleTrack",
            "hc.hph.genomics.ui.lib.vb.site.BarChartTrack",
            "hc.hph.genomics.ui.lib.vb.site.FeatureListTrack",
            "hc.hph.genomics.ui.lib.vb.site.GeneVariantTrack",
            "hc.hph.genomics.ui.lib.vb.site.Menu",
            "hc.hph.genomics.ui.lib.vb.site.SiteOptions"
        ],
        elements: []
    });
    return hc.hph.genomics.ui.lib;
});