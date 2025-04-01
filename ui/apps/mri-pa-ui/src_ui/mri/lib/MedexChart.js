sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "./MriFrontendConfig",
    "./ifr/ChartableCardsVisitor",
    "./ifr/IFR2Request",
    "sap/ui/core/Control"
], function (jQuery, Utils, MriFrontendConfig, ChartableCardsVisitor, ifr2request, Control) {
    "use strict";

    /**
     * Constructor for a new MedexChart. Only subclasses should be instantiated.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * Abstract Chart Control, that defines methods that MRI charts have to implement.
     * @abstract
     * @extends sap.ui.core.Control
     * @alias sap.hc.mri.pa.ui.lib.MedexChart
     */
    var MedexChart = Control.extend("sap.hc.mri.pa.ui.lib.MedexChart", {
        metadata: {
            properties: {
                colorPalette: {
                    type: "string[]",
                    defaultValue: [
                        "#EB7300", "#93C939", "#F0AB00", "#960981", "#EB7396",
                        "#E35500", "#4FB81C", "#D29600", "#760A85", "#C87396",
                        "#BC3618", "#247230", "#BE8200", "#45157E", "#A07396"
                    ]
                }
            },
            associations: {
                mriToolbar: {
                    type: "sap.m.Toolbar",
                    multiple: false
                }
            }
        },
        renderer: {}
    });

    MedexChart.prototype.init = function () {
        this.addStyleClass("sapMriPaChart");
    };

    MedexChart.prototype.getSelectedData = function () {
        throw new Error("getSelectedData must be implemented by every chart subclass");
    };

    MedexChart.prototype.clearChart = function () {
        throw new Error("clearChart must be implemented by every chart subclass");
    };

    MedexChart.prototype.getResponseData = function () {
        throw new Error("getResponseData must be implemented by every chart subclass");
    };

    /**
     * Should be overwritten by chart subclasses to populate chart specific settings
     */
    MedexChart.prototype.setChartOptions = function (/* oOptions */) {
        throw new Error("setChartOptions must be implemented by every chart subclass");
    };

    /**
     * Generate the FilterObject from the IFR.
     * Should be overwritten by chart subclasses to add further preprocessing.
     * @param   {sap.hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.Filter} oIFR IFR object
     * @returns {object[]}                                                     Classic FilterObject
     */
    MedexChart.prototype.preprocessFilterQuery = function (oIFR) {
        this.aFilterCardNames = ChartableCardsVisitor.getChartableCards(oIFR);
        return ifr2request(oIFR);
    };

    /**
     * Returns axes data from charts.
     * Should be overwritten by chart subclasses to add further preprocessing.
     * @returns {object[]}  Array of axes data
     */
    MedexChart.prototype.getAxesData = function () {
        throw new Error("getAxesData must be implemented by every chart subclass");
    };

    /**
     * Get the controller for this Control.
     * Goes up the parent chain until it finds a view or the root control.
     * If the latter happens, an Error is thrown.
     * @returns {sap.ui.core.mvc.Controller} Controller for this Control
     */
    MedexChart.prototype.getController = function () {
        var oControl = this.getParent();
        while (typeof oControl.getParent === "function") {
            if (typeof oControl.getController === "function") {
                return oControl.getController();
            }
            oControl = oControl.getParent();
        }
        throw new Error("Couldn't find controller for " + this.getMetadata().getName());
    };

    MedexChart.prototype.setDrillDownBtnEnabled = function (newStatus) {
        var oModel = this.getModel(Utils.models.RESULTS);
        if (oModel) {
            oModel.setProperty("/drilldown/enabled", newStatus);
        }
    };

    /**
     * Will be called by Patient analytics every time the chart is selected, before the chart is added to the container.
     */
    MedexChart.prototype.onBeforeShow = function () { /* implemented by subclass */ };

    /**
     * Will be called by Patient analytics every time the chart is selected, after the chart is added to the container.
     */
    MedexChart.prototype.onAfterShow = function () { /* implemented by subclass */ };

    /**
     * Will be called by Patient analytics every another chart is selected to be shown,
     * before the chart is removed from the container.
     */
    MedexChart.prototype.onBeforeHide = function () {
        // cancel the current request in order to avoid an inactive chart updating any model
        if (this._currentRequest) {
            this._currentRequest.reject(null, "abort");
        }
    };

    /**
     * Will be called by Patient analytics every another chart is selected to be shown,
     * ather the chart is removed from the container.
     */
    MedexChart.prototype.onAfterHide = function () { /* implemented by subclass */ };

    /**
     * Checks if a given selection is valid. A selection is considered valid if it is not empty and not
     * {@link sap.hc.mri.pa.ui.lib.Selection.Invalid "n/a"}.
     * @param   {string}  sSelection Selection to be tested.
     * @returns {boolean} True, if valid. False if empty or invalid.
     */
    MedexChart.prototype.isValidSelection = function (sSelection) {
        if (!sSelection) {
            return false;
        }
        return sSelection !== sap.hc.mri.pa.ui.lib.Selection.Invalid;
    };

    /**
     * Offers Chart data as CSV file.
     * This function only handles the pure download mechanics.
     * The way of download (from frontend or backend) is decided in _prepareDownloadLink.
     */
    MedexChart.prototype.saveAsCsv = function () {
        var csvUrl = this._getDownloadLink();
        var downloadData = this._getDownloadData();
        var additionalParameter = this._getDownloadParameter();
        if(additionalParameter) {
            for(var key in additionalParameter){
                if(additionalParameter.hasOwnProperty(key)) {
                    downloadData[key] = additionalParameter[key];
                }                
            }            
        }

        var request = {
            type: "POST",
            url: csvUrl,
            data: JSON.stringify(MriFrontendConfig.getFrontendConfig().reverseTranslate(downloadData)),
            contentType: "application/json;charset=utf-8"
        };

        Utils.ajax(request).done(function (aData, textStatus, req) {
            var csvFile = new Blob(["\ufeff", aData], { type: "text/csv" });
            var header = req.getResponseHeader("content-disposition");
            var parsed = header ? header.match(/filename=(.*?)(?:$|\s)/) : [];
            var fileName;
                if (parsed && parsed.length === 2) {
                    fileName = parsed[1].replace(/['"]+/g, "");
                }
            window.saveAs(csvFile, fileName || "download.csv");
        });
    };

    /**
     * Return the downloadlink for the chart.
     */
    MedexChart.prototype._getDownloadLink = function () {
        throw new Error("_getDownloadLink must be implemented by every chart subclass");
    };

    /**
     * Return the downloadData for the chart.
     */
    MedexChart.prototype._getDownloadData = function () {
        throw new Error("_getDownloadData must be implemented by every chart subclass");
    };

    /**
     * Return the download Parameter for the chart.
     */
    MedexChart.prototype._getDownloadParameter = function () {
        return null;
    };

    /**
     * Returns the URL to be called by the default implementation of chartUpdate to get the back-end data.
     */
    MedexChart.prototype.getDataURL = function () {
        throw new Error("getDataURL must be implemented by every chart subclass");
    };

    /**
     * Get the full name for a category defined by the instance id.
     * @param {string} sCategoryId Attribute instance id
     * @returns {string} Category name
     */
    MedexChart.prototype.getCategoryName = function (sCategoryId) {
        return this.aFilterCardNames.reduce(function (sFullName, mFilterCard) {
            var sName = mFilterCard.aAttributes.reduce(function (sAttributeName, mAttribute) {
                return mAttribute.sAttributeInstance === sCategoryId ? mAttribute.sAttributeName : sAttributeName;
            }, "");
            return sName ? mFilterCard.sFilterCardName + " - " + sName : sFullName;
        }, "");
    };

    /**
     * Returns true if an attribute is on chosen for the y axis.
     * @param   {Object}  config Configuration object
     * @returns {boolean} True, if the y-axis selection is valid.
     */
    MedexChart.prototype.checkYAttributeAvailable = function (config) {
        var valid = false;

        if (config instanceof Array){
            var attributes = Object.keys(config[0].patient.attributes);
            for (var i = 0; i < attributes.length; i++) {
                if (Object.keys(config[0].patient.attributes[attributes[i]][0]).indexOf("yaxis") > -1) {
                    valid = true;
                }
            }
        } else {
            valid = config.axes.some(function (element) {
                return element.axis === "y";
            });
        }

        return valid;
    };

    MedexChart.prototype.updateChart = function (aFilterObjects) {
        if (this._currentRequest) {
            this._currentRequest.reject(null, "abort");
        }

        this.setBusy(true);
        // Check if there is something to request, if not then we don't send the request
        // if (aFilterObjects.length === 0) {
        if ((aFilterObjects instanceof Array && aFilterObjects.length === 0) ||
            !(aFilterObjects.configData && aFilterObjects.axes && aFilterObjects.cards)) {
            this.setBusy(false);
            this.clearChart();
        } else {
            // Check if the current chart type is OK with the given constraints
            var that = this;
            var oResultModel = this.getModel(Utils.models.RESULTS);
            this._currentRequest = Utils.ajax({
                type: "POST",
                url: this.getDataURL(),
                data: JSON.stringify(MriFrontendConfig.getFrontendConfig().reverseTranslate(aFilterObjects)),
                contentType: "application/json;charset=utf-8"
            }).done(function (oResponse) {
                var sNoDataReason = "";
                if (oResponse.data.length === 0) {
                    if (oResponse.noDataReason) {
                        sNoDataReason = Utils.getText(oResponse.noDataReason);
                    } else {
                        sNoDataReason = Utils.getText("MRI_PA_CHART_NO_DATA_DEFAULT_MESSAGE");
                    }
                }
                if (!that.checkYAttributeAvailable(aFilterObjects)) {
                    sNoDataReason = Utils.getText("MRI_PA_CONFIG_ADMIN_VALIDITY_ERROR");
                }
                oResultModel.setProperty("/noDataReason", sNoDataReason);

                if (that._chartKey === "stacked" || that._chartKey === "list" || that._chartKey === "boxplot" || that._chartKey === "km") {
                    oResultModel.setProperty("/total/size", oResponse.totalPatientCount);
                }

                that.updateValues(oResponse);
            }).fail(function (xhr, textStatus) {
                if (textStatus !== "abort") {
                    that.clearChart();
                    oResultModel.setProperty("/noDataReason", Utils.getText("MRI_PA_CHART_NO_DATA_DEFAULT_MESSAGE"));
                }
                if (!that.checkYAttributeAvailable(aFilterObjects)) {
                    oResultModel.setProperty("/noDataReason", Utils.getText("MRI_PA_CONFIG_ADMIN_VALIDITY_ERROR"));
                }
                if (xhr && xhr.responseJSON && xhr.responseJSON.logId) {
                    oResultModel.setProperty("/noDataReason", Utils.getText("MRI_DB_LOGGED_MESSAGE", [xhr.responseJSON.logId]));
                }
            }).always(function () {
                that.setBusy(false);
                that._currentRequest = null;
            });
        }
    };

    return MedexChart;
});
