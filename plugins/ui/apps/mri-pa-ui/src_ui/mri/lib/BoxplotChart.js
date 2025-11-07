sap.ui.define([
    "jquery.sap.global",
    "./Boxplot",
    "./library",
    "./MedexChart",
    "./MriFrontendConfig",
    "sap/hc/mri/pa/ui/lib/utils/Sorter",
    "sap/hc/mri/pa/ui/Utils",        
    "sap/m/FlexBox",
    "sap/ui/commons/Label"
], function (jQuery, Boxplot, library, MedexChart, MriFrontendConfig, Sorter, Utils, FlexBox, Label) {
    "use strict";

    /**
     * Constructor for a new BoxplotChart.
     * @constructor
     * @param {string} [sId] id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * Wraps the sap.hc.mri.pa.ui.lib.Boxplot with the necessary functionality for MRI.
     * @extends sap.hc.mri.pa.ui.lib.MedexChart
     * @alias sap.hc.mri.pa.ui.lib.BoxplotChart
     */
    var BoxplotChart = MedexChart.extend("sap.hc.mri.pa.ui.lib.BoxplotChart", {
        metadata: {
            aggregations: {
                chart: {
                    type: "sap.hc.mri.pa.ui.lib.Boxplot",
                    multiple: false
                }
            }
        },
        renderer: function (oRm, oControl) {
            oRm.write("<div");
            oRm.writeControlData(oControl);
            oRm.writeClasses(oControl);
            oRm.write(">");
            oRm.renderControl(oControl.getChart());
            oRm.write("<div>");
        }
    });

    BoxplotChart.prototype.init = function () {
        MedexChart.prototype.init.call(this);

        this._chartKey = "boxplot";

        this._settings = {
            downloadEnabled: MriFrontendConfig.getFrontendConfig().isChartDownloadEnabled(this._chartKey),
            collectionEnabled: MriFrontendConfig.getFrontendConfig().isChartCollectionEnabled(this._chartKey),
            pdfDownloadEnabled: MriFrontendConfig.getFrontendConfig().isChartPDFDownloadEnabled(this._chartKey)
        };

        this.setAggregation("chart", new Boxplot({
            height: "100%",
            width: "100%",
            noData: new FlexBox({
                height: "100%",
                alignItems: "Center",
                justifyContent: "Center",
                items: [
                    new Label({
                        text: "{" + Utils.models.RESULTS + ">/noDataReason}",
                        icon: "sap-icon://message-information"
                    })
                ]
            }).addStyleClass("sapMriChartNoDataPholder"),
            drillDown: [function () {
                this.getController().setSelectedDataToFilter(this.getSelectedData());
            }, this],
            selectionChange: [function () {
                this.setDrillDownBtnEnabled(this.getChart().getSelection().length > 0);
            }, this]
        }));

        sap.ui.core.ResizeHandler.register(this, function (oEvent) {
            oEvent.control._updateLocationsModel();
        });
    };

    BoxplotChart.prototype.onAfterShow = function () {
        var oStatusData = this.getModel(Utils.models.RESULTS).getData();
        oStatusData.drilldown.enabled = false;
        oStatusData.download.enabled = this._settings.downloadEnabled;
        oStatusData.collection.enabled = this._settings.collectionEnabled;
        oStatusData.pdfDownload.enabled = this._settings.pdfDownloadEnabled;
        this.getModel(Utils.models.RESULTS).setData(oStatusData);

        this.getModel(Utils.models.STATUS).setProperty("/beginVisible", true);

        this._updateLocationsModel();
    };

    BoxplotChart.prototype.getAxesData = function () {
        var oItemsModel = this.getModel(Utils.models.SELECTIONS);
        var mItemsData = oItemsModel.getData();
        var axes = [];

        // populates IFR with axes data
        for (var k = 0; k < mItemsData.attr.length; k++) {
            var sSelection = mItemsData.attr[k].selection;
            if (this.isValidSelection(sSelection)) {
                var instanceID = MriFrontendConfig.getFrontendConfig().getInteractionInstancePath(sSelection);
                var axis = {
                    id: sSelection,
                    configPath: MriFrontendConfig.getFrontendConfig().getGenericPath(instanceID),
                    instanceID: instanceID,
                    axis: "x",
                    seq: k + 1
                };
                if (k === sap.hc.mri.pa.ui.lib.Dimensions.Y) {
                    axis.axis = "y";
                    axis.seq = 1;
                }
                if (this._aCurrentSelections && this._aCurrentSelections[k] === sSelection) {
                    if (parseFloat(mItemsData.attr[k].binsize)) {
                        axis.binsize = parseFloat(mItemsData.attr[k].binsize);
                    }
                } else {
                    var oCurrentAttribute = MriFrontendConfig.getFrontendConfig().getAttributeByPath(sSelection);
                    axis.binsize = oCurrentAttribute.getDefaultBinSize();
                }
                axes.push(axis);
            }
        }

        return axes;
    };

    /**
     * Modify the response and set the data to the chart.
     * Replace the names of the categories and measures with a full name composed of
     * filter card name, filter card number and attribute name.
     * @param {Object} mResponse Response from the boxplot service
     */
    BoxplotChart.prototype.updateValues = function (mResponse) {
        var bHasDummyCategory = false;

        mResponse.categories = mResponse.categories.map(function (mCategory) {
            if (mCategory.id === "dummy_category") {
                mCategory.name = Utils.getText("MRI_PA_DUMMY_CATEGORY");
                bHasDummyCategory = true;
            } else {
                mCategory.name = this.getCategoryName(mCategory.id);

                // format date cateories
                var oAttributeConfig = MriFrontendConfig.getFrontendConfig().getAttributeByPath(mCategory.id);
                if (oAttributeConfig.getType() === sap.hc.mri.pa.ui.lib.CDMAttrType.Date || oAttributeConfig.getType() === sap.hc.mri.pa.ui.lib.CDMAttrType.Datetime) {
                    mResponse.data.forEach(function (mDatum) {
                        var dDate = Utils.parseISODate(mDatum[mCategory.id]);
                        if (dDate) {
                            if (oAttributeConfig.getType() === sap.hc.mri.pa.ui.lib.CDMAttrType.Date) {
                                mDatum[mCategory.id] = Utils.formatDate(dDate, true);
                            } else {
                                mDatum[mCategory.id] = Utils.formatDateTime(dDate);
                            }
                        }
                    });
                }
            }
            return mCategory;
        }, this);

        if (bHasDummyCategory) {
            mResponse.data.forEach(function (mData) {
                mData.dummy_category = Utils.getText("MRI_PA_CURRENT_COHORT");
            });
        }

        this._aCurrentSelections = this.getModel(Utils.models.SELECTIONS).getProperty("/attr").map(function (mAttribute) {
            return mAttribute.selection;
        });

        var internalData = mResponse.data;
        var sortableCategories = Sorter.buildSortableCategories(mResponse);
        var sortedOriginalData = Sorter.sortCategory(sortableCategories, internalData, "MRI_PA_CHART_SORT_ASCENDING", 0);
        mResponse.data = MriFrontendConfig.getFrontendConfig().translate(mResponse.data);

        this.getChart().setData(mResponse.data);
        this.getChart().setDimensions(mResponse.categories);
        this.getChart().setMeasures(mResponse.measures);

        this.setDrillDownBtnEnabled(false);
    };

    BoxplotChart.prototype.clearChart = function () {
        this.getChart().setData([]);
        this.getChart().setDimensions([]);
    };

    BoxplotChart.prototype.setChartOptions = function (oOptions) {
        this._aCurrentSelections = oOptions.axisSelection.map(function (axis) {
            return axis.attributeId;
        });
    };

    /**
     * Add the Axis selections to the filter query object.
     * @param   {sap.hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.Filter} oIFR IFR object
     * @returns {object[]}                                                     Filter object enriched with axis selections
     */
    BoxplotChart.prototype.preprocessFilterQuery = function (oIFR) {
        var aFilters = MedexChart.prototype.preprocessFilterQuery.call(this, oIFR);

        oIFR.axes = this.getAxesData();

        var aRequests = aFilters.map(function (oFilter) {
            return this._preprocessOneFilterObject(oFilter);
        }, this);
        return aRequests;
    };

    BoxplotChart.prototype._preprocessOneFilterObject = function (mFilter) {
        // clone filter object
        var mNewFilter = jQuery.extend({}, mFilter);

        // get current attribute buttons' selections
        var oItemsModel = this.getModel(Utils.models.SELECTIONS);
        var mItemsData = oItemsModel.getData();
        var mQueryObject;

        // annotate filter object w.r.t. the three X axes attributes
        for (var i = sap.hc.mri.pa.ui.lib.Dimensions.X1; i <= sap.hc.mri.pa.ui.lib.Dimensions.X3; i++) {
            var sSelection = mItemsData.attr[i].selection;
            if (this.isValidSelection(sSelection)) {
                mQueryObject = Utils.getPropertyByPath(mNewFilter, sSelection);
                if (!mQueryObject) {
                    // filter object does not contain current selection: add it to the object
                    mQueryObject = [{}];
                    Utils.createPathInObject(mNewFilter, sSelection, mQueryObject);
                }
                mQueryObject[0].xaxis = i + 1; // annotate category attribute (with position i+1)
                // Add Binsize annotation
                if (this._aCurrentSelections && this._aCurrentSelections[i] === sSelection) {
                    if (parseFloat(mItemsData.attr[i].binsize)) {
                        mQueryObject[0].binsize = parseFloat(mItemsData.attr[i].binsize);
                    }
                } else {
                    var oCurrentAttribute = MriFrontendConfig.getFrontendConfig().getAttributeByPath(sSelection);
                    mQueryObject[0].binsize = oCurrentAttribute.getDefaultBinSize();
                }
            }
        }

        // annotate filter object w.r.t. the Y axis attribute
        if (this.isValidSelection(mItemsData.attr[sap.hc.mri.pa.ui.lib.Dimensions.Y].selection)) {
            var sYSelection = mItemsData.attr[sap.hc.mri.pa.ui.lib.Dimensions.Y].selection;
            mQueryObject = Utils.getPropertyByPath(mNewFilter, sYSelection);
            if (!mQueryObject) {
                // filter object does not contain current selection: add it to the object
                mQueryObject = [{}];
                Utils.createPathInObject(mNewFilter, sYSelection, mQueryObject);
            }
            mQueryObject[0].yaxis = 1; // annotate measure attribute
        }

        return mNewFilter;
    };

    /**
     * Format the selection.
     * Flatten the selection to contain only one category per entry.
     * @returns {Array} List of selected category values, each with id and value.
     */
    BoxplotChart.prototype.getSelectedData = function () {
        var aSelectedData = [];
        this.getChart().getSelection().forEach(function (mDatapoint) {
            this.getChart().getDimensions().forEach(function (mCategory) {
                var dataValue = mDatapoint[mCategory.id];
                // format date categories
                var oAttributeConfig = MriFrontendConfig.getFrontendConfig().getAttributeByPath(mCategory.id);
                if (oAttributeConfig.getType() === sap.hc.mri.pa.ui.lib.CDMAttrType.Date || oAttributeConfig.getType() === sap.hc.mri.pa.ui.lib.CDMAttrType.Datetime) {
                    var dDate;
                    if (oAttributeConfig.getType() === sap.hc.mri.pa.ui.lib.CDMAttrType.Date) {
                        dDate = Utils.parseDate(mDatapoint[mCategory.id], true);
                    } else {
                        dDate = Utils.parseDateTime(mDatapoint[mCategory.id], true);
                    }
                    if (dDate) {
                        dataValue = Utils.formatISODate(dDate);
                    }
                }
                aSelectedData.push({
                    id: mCategory.id,
                    value: dataValue
                });
            });
        }, this);

        aSelectedData = MriFrontendConfig.getFrontendConfig().reverseTranslate(aSelectedData);

        return aSelectedData;
    };

    BoxplotChart.prototype.getResponseData = function () {
        return this.getChart().getData();
    };

    /**
     * Returns the data that the chart represents as CSV string.
     * Comma is used as column delimeter and Windows style line endings as row delimeter.
     * @returns {String} String of CSV formatted data.
     * @overwrite
     */
    BoxplotChart.prototype._getCSV = function () {
        var oResourceBundle = this.getModel("i18n").getResourceBundle();

        var aHeaderRow = [];
        var aHeaderColumns = [];
        this.getChart().getDimensions().forEach(function (mCategory) {
            aHeaderRow.push(mCategory.name);
            aHeaderColumns.push(mCategory.id);
        });

        // The Boxplot uses multiple values to represent each measure, so we need to add one column for each.
        this.getChart().getMeasures().forEach(function (mMeasure) {
            Boxplot.ValueKeyList.forEach(function (sKey) {
                aHeaderRow.push(mMeasure.name + " - " + oResourceBundle.getText(sKey));
            });
        });
        aHeaderRow.push(oResourceBundle.getText("MRI_PA_PATIENTS"));

        var aBody = [];
        this.getChart().getData().forEach(function (mData) {
            var aRow = [];
            aHeaderColumns.forEach(function (sHeaderColumn) {
                aRow.push(mData[sHeaderColumn]);
            });
            aRow = aRow.concat(mData.values);
            aRow.push(mData.NUM_ENTRIES);
            aBody.push(aRow.join(";"));
        });

        return aHeaderRow.join(";") + "\r\n" + aBody.join("\r\n");
    };

    /**
     * Return the download link url.
     * @returns {string} URL of the download link for the BoxPlotChart.
     */
    BoxplotChart.prototype._getDownloadLink = function () {
        return "/sap/hc/mri/pa/services/analytics.xsjs?action=boxplotcsv";
    };

    /**
     * Return the download data
     * @returns {object} Filter Data of the download link for the BoxPlotChart.
     */
    BoxplotChart.prototype._getDownloadData = function () {
        var oFilterObject = this.getController().generateBackendIFR();
        return oFilterObject;
    };

    /**
     * Update the model defining the position of the Axis selector menus.
     */
    BoxplotChart.prototype._updateLocationsModel = function () {
        var i;
        // get locations data and initially hide everything
        var mSelectionsData = this.getModel(Utils.models.SELECTIONS).getData();
        var mLocationsData = this.getModel(Utils.models.LOCATIONS).getData();
        for (i = 0; i < sap.hc.mri.pa.ui.lib.Dimensions.Count; i++) {
            mLocationsData.attr[i].visible = false;
        }

        // adjust and show Y measure button
        mLocationsData.attr[sap.hc.mri.pa.ui.lib.Dimensions.Y] = {
            left: "0px",
            top: "30px",
            visible: true,
            enabled: true,
            text: "",
            icon: "sap-icon://MRI/y-axis"
        };

        // adjust and show X measure buttons
        var iLevelHeight = 30;
        for (i = sap.hc.mri.pa.ui.lib.Dimensions.X1; i <= sap.hc.mri.pa.ui.lib.Dimensions.X3; i++) {
            mLocationsData.attr[i].bottom = 20 + i * iLevelHeight + "px";
            mLocationsData.attr[i].left = "0px";
            mLocationsData.attr[i].visible = true;
            mLocationsData.attr[i].text = "";
            mLocationsData.attr[i].icon = {
                0: "sap-icon://MRI/x1-axis",
                1: "sap-icon://MRI/x2-axis",
                2: "sap-icon://MRI/x3-axis"
            }[i];

            mSelectionsData.attr[i].isCategory = true;
            mSelectionsData.attr[i].isMeasure = false;
            mSelectionsData.attr[i].scope = "boxplot";
        }

        // set the new locations to model
        this.getModel(Utils.models.LOCATIONS).setData(mLocationsData);
        this.getModel(Utils.models.SELECTIONS).setData(mSelectionsData);
    };

    BoxplotChart.prototype.getDataURL = function () {
        return "/sap/hc/mri/pa/services/analytics.xsjs?action=boxplot";
    };

    return BoxplotChart;
});
