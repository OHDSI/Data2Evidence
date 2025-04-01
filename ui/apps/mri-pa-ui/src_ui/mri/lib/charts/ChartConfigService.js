sap.ui.define([], function () {
    "use strict";

    var _chartIdToRawConfigMap = {
        stacked: {
            className: "sap.hc.mri.pa.ui.lib.StackedBarChart",
            icon: "sap-icon://vertical-bar-chart",
            tooltip: "{i18n>MRI_PA_TOOLTIP_CHARTTYPE_STACKED}",
            urlKey: "stacked",
            keyCode: 119 // F8
        },
        boxplot: {
            className: "sap.hc.mri.pa.ui.lib.BoxplotChart",
            icon: "sap-icon://MRI/boxplot-chart",
            dataURL: "/sap/hc/mri/pa/services/analytics.xsjs?action=boxplot",
            tooltip: "{i18n>MRI_PA_TOOLTIP_CHARTTYPE_BOXPLOT}",
            urlKey: "boxplot",
            keyCode: 120 // F7
        },
        km: {
            className: "sap.hc.mri.pa.ui.lib.KaplanMeierChart",
            icon: "sap-icon://MRI/km-chart",
            dataURL: "/sap/hc/mri/pa/services/analytics.xsjs?action=kmquery",
            tooltip: "{i18n>MRI_PA_TOOLTIP_CHARTTYPE_KAPLAN}",
            urlKey: "kaplanMeier",
            keyCode: 121 // F10
        },
        vb: {
            className: "sap.hc.mri.pa.ui.lib.VbChart",
            icon: "sap-icon://FFH/dna",
            dataURL: null,
            tooltip: "{i18n>MRI_PA_TOOLTIP_CHARTTYPE_VB}",
            urlKey: "variantBrowser",
            keyCode: 122 // F11
        },
        list: {
            className: "sap.hc.mri.pa.ui.lib.PatientListChart",
            icon: "sap-icon://list",
            dataURL: "/sap/hc/mri/pa/services/patientdetail.xsjs",
            tooltip: "{i18n>MRI_PA_TOOLTIP_CHARTTYPE_PATIENT_LIST}",
            urlKey: "patientList",
            keyCode: 123 // F12
        }
    };


    function ChartConfig(mriFrontendConfig, id, chartConfig) {
        this._mriFrontendConfig = mriFrontendConfig;
        this._id = id;
        this._chartConfig = chartConfig;
    }

    ChartConfig.prototype.getChartId = function () {
        return this._id;
    };

    ChartConfig.prototype.getClassName = function () {
        return this._chartConfig.className;
    };

    ChartConfig.prototype.getIcon = function () {
        return this._chartConfig.icon;
    };

    ChartConfig.prototype.getDataURL = function () {
        return this._chartConfig.dataURL;
    };

    ChartConfig.prototype.getTooltip = function () {
        return this._chartConfig.tooltip;
    };

    ChartConfig.prototype.getUrlKey = function () {
        return this._chartConfig.urlKey;
    };

    ChartConfig.prototype.isVisible = function () {
        return this._mriFrontendConfig.isChartVisible(this._id);
    };

    ChartConfig.prototype.isCollectionEnabled = function () {
        return this._mriFrontendConfig.isChartCollectionEnabled(this._id);
    };

    ChartConfig.prototype.isDownloadEnabled = function () {
        return this._mriFrontendConfig.isChartDownloadEnabled(this._id);
    };

    ChartConfig.prototype.getKeyCode = function () {
        return this._chartConfig.keyCode;
    };

    function ChartConfigService(mriFrontendConfig) {
        this._mriFrontendConfig = mriFrontendConfig;

        this._chartIdToConfigWrapperMap = {};

        this._init();
    }

    ChartConfigService.prototype._init = function () {
        for (var id in _chartIdToRawConfigMap) {
            var chartConfig = new ChartConfig(this._mriFrontendConfig, id, _chartIdToRawConfigMap[id]);

            this._chartIdToConfigWrapperMap[id] = chartConfig;
        }
    };

    ChartConfigService.prototype.getAllChartConfigs = function () {
        var chartConfigs = Object.keys(this._chartIdToConfigWrapperMap).map(function (key) {
            return this._chartIdToConfigWrapperMap[key];
        }, this);

        return chartConfigs;
    };

    ChartConfigService.prototype.getChartConfigFor = function (id) {
        return this._chartIdToConfigWrapperMap[id];
    };

    return ChartConfigService;
});
