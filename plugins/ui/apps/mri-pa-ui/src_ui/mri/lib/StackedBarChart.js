sap.ui.define([
    "jquery.sap.global",
    "./library",
    "./MedexChart",
    "./MriFrontendConfig",
    "sap/hc/mri/pa/ui/lib/utils/Sorter",
    "sap/hc/mri/pa/ui/Utils",
    "sap/m/FlexBox",
    "sap/ui/commons/Label",
    "sap/ui/model/json/JSONModel",
    "sap/viz/ui5/data/DimensionDefinition",
    "sap/viz/ui5/data/FlattenedDataset",
    "sap/viz/ui5/data/MeasureDefinition",
    "sap/viz/ui5/StackedColumn",
    "sap/viz/ui5/types/legend/Common",
    "sap/viz/ui5/types/StackedVerticalBar"
], function (jQuery, library, MedexChart, MriFrontendConfig, Sorter, Utils, FlexBox, Label, JSONModel, DimensionDefinition, FlattenedDataset, MeasureDefinition, StackedColumn, Common, StackedVerticalBar) {
    "use strict";

    /**
     * Constructor for a new StackedBarChart.
     * @constructor
     * @param {string} [sId] id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * This control displays a stacked column chart.
     * @extends sap.hc.mri.pa.ui.lib.MedexChart
     * @alias sap.hc.mri.pa.ui.lib.StackedBarChart
     */
    var StackedBarChart = MedexChart.extend("sap.hc.mri.pa.ui.lib.StackedBarChart", {
        metadata: {
            aggregations: {
                chart: {
                    type: "sap.viz.ui5.StackedColumn",
                    multiple: false
                }
            }
        },
        renderer: function (oRenderManager, oControl) {
            oRenderManager.write("<div");
            oRenderManager.writeControlData(oControl);
            oRenderManager.writeClasses(oControl);
            oRenderManager.write(">");
            oRenderManager.renderControl(oControl.getChart());
            oRenderManager.write("</div>");
        }
    });

    StackedBarChart.prototype.init = function () {
        MedexChart.prototype.init.call(this);

        this._chartKey = "stacked";

        this._settings = {
            downloadEnabled: MriFrontendConfig.getFrontendConfig().isChartDownloadEnabled(this._chartKey),
            collectionEnabled: MriFrontendConfig.getFrontendConfig().isChartCollectionEnabled(this._chartKey),
            pdfDownloadEnabled: MriFrontendConfig.getFrontendConfig().isChartPDFDownloadEnabled(this._chartKey)
        };

        // create an instance of a viz stacked bar chart
        this._chart = new StackedColumn({
            height: "100%",
            width: "100%",
            legend: new Common({
                isScrollable: true
            }),
            plotArea: new StackedVerticalBar({
                colorPalette: this.getColorPalette()
            }),
            noData: new FlexBox({
                height: "100%",
                alignItems: "Center",
                justifyContent: "Center",
                items: [new Label({
                    text: "{" + Utils.models.RESULTS + ">/noDataReason}",
                    icon: "sap-icon://message-information"
                })]
            }).addStyleClass("sapMriChartNoDataPholder")
        });
        this.setAggregation("chart", this._chart);
        this.clearChart();

        var that = this;

        this._chart.attachSelectData(function () {
            that.setDrillDownBtnEnabled(this.selection().length > 0);
        });

        this._chart.attachDeselectData(function () {
            that.setDrillDownBtnEnabled(this.selection().length > 0);
        });
    };

    StackedBarChart.prototype.onAfterRendering = function () {
        var $this = this.getDomRef();
        var that = this;

        sap.ui.core.ResizeHandler.register($this, jQuery.proxy(function () {
            // relocate attribute selection buttons after resize
            that._updateLocationsModel();
        }, this));
    };

    StackedBarChart.prototype.setChartOptions = function (oOptions) {
        this._aCurrentSelections = oOptions.axisSelection.map(function (axis) {
            return axis.attributeId;
        });
        if (oOptions.stacked && oOptions.stacked.sorting) {
            var oSelectionsData = this.getModel(Utils.models.SELECTIONS).getData();
            oSelectionsData.attr[sap.hc.mri.pa.ui.lib.Dimensions.Sort].sortData = oOptions.stacked.sorting;
            this.getModel(Utils.models.SELECTIONS).setData(oSelectionsData);
        }
    };

    StackedBarChart.prototype.onAfterShow = function () {
        var oStatusData = this.getModel(Utils.models.RESULTS).getData();
        oStatusData.drilldown.enabled = false;
        oStatusData.download.enabled = this._settings.downloadEnabled;
        oStatusData.collection.enabled = this._settings.collectionEnabled;
        oStatusData.pdfDownload.enabled = this._settings.pdfDownloadEnabled;
        this.getModel(Utils.models.RESULTS).setData(oStatusData);

        this.getModel(Utils.models.STATUS).setProperty("/beginVisible", true);

        this._updateLocationsModel();

        this.clearChart();
    };

    /**
     * Update locations and visibility of external controls.
     * @private
     */
    StackedBarChart.prototype._updateLocationsModel = function () {
        var i;
        // get locations data and initially hide everything
        var oSelectionsData = this.getModel(Utils.models.SELECTIONS).getData();
        var oLocationsData = this.getModel(Utils.models.LOCATIONS).getData();
        for (i = 0; i < sap.hc.mri.pa.ui.lib.Dimensions.Count; i++) {
            oLocationsData.attr[i].visible = false;
        }

        oLocationsData.attr[sap.hc.mri.pa.ui.lib.Dimensions.Sort] = {
            left: "0px",
            top: "30px",
            visible: true,
            text: "",
            icon: "sap-icon://sort"
        }; // stack category
        oLocationsData.attr[sap.hc.mri.pa.ui.lib.Dimensions.Y] = {
            left: "0px",
            top: "108px",
            visible: true,
            text: "",
            icon: "sap-icon://MRI/y-axis",
            enabled: true
        }; // Y measure
        oLocationsData.attr[sap.hc.mri.pa.ui.lib.Dimensions.StackAttribute] = {
            left: "0px",
            top: "138px",
            visible: true,
            text: "",
            icon: "sap-icon://vertical-stacked-chart"
        }; // stack category

        // adjust and show X measure buttons
        var iLevelHeight = 30;
        for (i = sap.hc.mri.pa.ui.lib.Dimensions.X1; i <= sap.hc.mri.pa.ui.lib.Dimensions.X3; i++) {
            oLocationsData.attr[i].bottom = 20 + i * iLevelHeight + "px";
            oLocationsData.attr[i].left = "0px";
            oLocationsData.attr[i].visible = true;
            oLocationsData.attr[i].text = "";
            oLocationsData.attr[i].icon = {
                0: "sap-icon://MRI/x1-axis",
                1: "sap-icon://MRI/x2-axis",
                2: "sap-icon://MRI/x3-axis"
            }[i];

            oSelectionsData.attr[i].isCategory = true;
            oSelectionsData.attr[i].isMeasure = false;
            oSelectionsData.attr[i].scope = "stackedbarchart";
        }
        oSelectionsData.attr[sap.hc.mri.pa.ui.lib.Dimensions.Sort].isCategory = false;
        oSelectionsData.attr[sap.hc.mri.pa.ui.lib.Dimensions.Sort].isMeasure = false;
        oSelectionsData.attr[sap.hc.mri.pa.ui.lib.Dimensions.Sort].scope = "stackedbarchart";

        oSelectionsData.attr[sap.hc.mri.pa.ui.lib.Dimensions.StackAttribute].isCategory = true;
        oSelectionsData.attr[sap.hc.mri.pa.ui.lib.Dimensions.StackAttribute].isMeasure = false;
        oSelectionsData.attr[sap.hc.mri.pa.ui.lib.Dimensions.StackAttribute].scope = "stackedbarchart";
        oSelectionsData.attr[sap.hc.mri.pa.ui.lib.Dimensions.Y].isCategory = false;
        oSelectionsData.attr[sap.hc.mri.pa.ui.lib.Dimensions.Y].isMeasure = true;

        // set the new locations to model
        this.getModel(Utils.models.LOCATIONS).setData(oLocationsData);
        this.getModel(Utils.models.SELECTIONS).setData(oSelectionsData);
    };

    /**
     * Annotate the filter object such that the backend can infer which attributes have to be categories or measures
     * (and in which order).
     * @param   {sap.hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.Filter} oIFR IFR object
     * @returns {object[]}                                                     annotated copy of the original filter object (<code>aFilter</code>)
     */
    StackedBarChart.prototype.preprocessFilterQuery = function (oIFR) {
        var aFilters = MedexChart.prototype.preprocessFilterQuery.call(this, oIFR);
        var aResult = [];

        // get current attribute buttons' selections
        var oItemsModel = this.getModel(Utils.models.SELECTIONS);
        var mItemsData = oItemsModel.getData();

        oIFR.axes = this.getAxesData();

        for (var j = 0; j < aFilters.length; j++) {
            // clone filter object
            var oNewFilter = jQuery.extend({}, aFilters[j]);
            var changed = false;
            var oObject;
            var sConfigPath;
            var oCurrentAttribute;


            // annotate filter object w.r.t. the three X axes attributes
            for (var i = sap.hc.mri.pa.ui.lib.Dimensions.X1; i <= sap.hc.mri.pa.ui.lib.Dimensions.X3; i++) {
                if (this.isValidSelection(mItemsData.attr[i].selection)) {
                    oObject = Utils.getPropertyByPath(oNewFilter, mItemsData.attr[i].selection);
                    if (!oObject) {
                        // filter object does not contain current selection: add it to the object
                        oObject = [{}];
                        Utils.createPathInObject(oNewFilter, mItemsData.attr[i].selection, oObject);
                    }
                    oObject[0].xaxis = i + 1; // annotate category attribute (with position i+1)
                    if (this._aCurrentSelections && this._aCurrentSelections[i] === mItemsData.attr[i].selection) {
                        if (parseFloat(mItemsData.attr[i].binsize)) {
                            oObject[0].binsize = parseFloat(mItemsData.attr[i].binsize);
                        }
                    } else {
                        // FIXME using old FO path
                        sConfigPath = MriFrontendConfig.getFrontendConfig()
                            .convertInternalPathToConfigPath(mItemsData.attr[i].selection);
                        oCurrentAttribute = MriFrontendConfig.getFrontendConfig().getAttributeByPath(sConfigPath);
                        oObject[0].binsize = oCurrentAttribute.getDefaultBinSize();
                    }
                }
            }
            // annotate filter object w.r.t. the Y axis attribute
            if (this.isValidSelection(mItemsData.attr[sap.hc.mri.pa.ui.lib.Dimensions.Y].selection)) {
                oObject = Utils.getPropertyByPath(oNewFilter, mItemsData.attr[sap.hc.mri.pa.ui.lib.Dimensions.Y].selection);
                if (!oObject) {
                    // filter object does not contain current selection: add it to the object
                    oObject = [{}];
                    Utils.createPathInObject(oNewFilter, mItemsData.attr[sap.hc.mri.pa.ui.lib.Dimensions.Y].selection, oObject);
                }
                oObject[0].yaxis = 1; // annotate measure attribute
            }
            // annotate filter object w.r.t. the stacking attribute
            var stackingAttribute = mItemsData.attr[sap.hc.mri.pa.ui.lib.Dimensions.StackAttribute];
            if (this.isValidSelection(stackingAttribute.selection)) {
                oObject = Utils.getPropertyByPath(oNewFilter, stackingAttribute.selection);
                if (!oObject) {
                    // filter object does not contain current selection: add it to the object
                    oObject = [{}];
                    Utils.createPathInObject(oNewFilter, stackingAttribute.selection, oObject);
                }
                oObject[0].xaxis = 4; // annotate stacking attribute
                if (this._aCurrentSelections && this._aCurrentSelections[sap.hc.mri.pa.ui.lib.Dimensions.StackAttribute] === stackingAttribute.selection) {
                    if (parseFloat(stackingAttribute.binsize)) {
                        oObject[0].binsize = parseFloat(stackingAttribute.binsize);
                    }
                } else {
                    // FIXME using old FO path
                    sConfigPath = MriFrontendConfig.getFrontendConfig().convertInternalPathToConfigPath(stackingAttribute.selection);
                    oCurrentAttribute = MriFrontendConfig.getFrontendConfig().getAttributeByPath(sConfigPath);
                    oObject[0].binsize = oCurrentAttribute.getDefaultBinSize();
                }
            }
            if (changed) {
                oItemsModel.setData(mItemsData);
            }
            aResult.push(oNewFilter);
        }
        return aResult;
    };

    /**
     * Get an array of fully qualified (instantiated) attribute IDs and values which are to
     * be set to the filter control. E.g., if the user selected ICD code C50 and biomarker BRAF
     * in one column segment and ICD code C34 and no biomarker in another segment, the return
     * would like this:
     * <pre>
     * [
     *   {
     *     id:    "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
     *     value: "C50"
     *   }, {
     *     id:    "patient.attributes.biomarker",
     *     value: "BRAF"
     *   }, {
     *     id:    "patient.conditions.acme.interactions.priDiag.1.attributes.icd",
     *     value: "C34"
     *   }, {
     *     id:    "patient.attributes.biomarker",
     *     value: null
     *   }
     * ]
     * </pre>
     * Setting an attribute value to <code>null</code> means to include missing values. The method
     * currently does not check for doublettes as this is taken care of in the filter control/backend.
     * @returns {Array} the above-mentioned array of instance ID/value pairs
     */
    StackedBarChart.prototype.getSelectedData = function () {
        var aSelectedData = [];
        var aCategories = this._chart.getDataset().getModel().getProperty("/categories");

        this._chart.selection().forEach(function (oDatapoint) {
            aCategories.forEach(function (mCategory) {
                var dataValue = oDatapoint.data[mCategory.name];

                // format date categories
                var oAttributeConfig = MriFrontendConfig.getFrontendConfig().getAttributeByPath(mCategory.id);
                if (oAttributeConfig.getType() === sap.hc.mri.pa.ui.lib.CDMAttrType.Date || oAttributeConfig.getType() === sap.hc.mri.pa.ui.lib.CDMAttrType.Datetime) {
                    var dDate;
                    if (oAttributeConfig.getType() === sap.hc.mri.pa.ui.lib.CDMAttrType.Date) {
                        dDate = Utils.parseDate(oDatapoint.data[mCategory.name], true);
                    } else {
                        dDate = Utils.parseDateTime(oDatapoint.data[mCategory.name], true);
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
        });

        aSelectedData = MriFrontendConfig.getFrontendConfig().reverseTranslate(aSelectedData);

        return aSelectedData;
    };

    StackedBarChart.prototype.getResponseData = function () {
        return this._chart.getDataset().getModel().getData().data;
    };

    /**
     * Return the download link url.
     * @returns {string} URL of the download link for the StackedBarChart.
     */
    StackedBarChart.prototype._getDownloadLink = function () {
        return "/sap/hc/mri/pa/services/analytics.xsjs?action=aggquerycsv";
    };

    /**
     * Return the download data
     * @returns {object} Filter Data of the download link for the StackedBarChart.
     */
    StackedBarChart.prototype._getDownloadData = function () {
        var oFilterObject = this.getController().generateBackendIFR();
        return oFilterObject;
    };

    StackedBarChart.prototype.clearChart = function () {
        var oDataset = this._chart.getDataset();

        if (!oDataset) {
            oDataset = new FlattenedDataset();
            oDataset.setModel(new JSONModel());
            this._chart.setDataset(oDataset);
        } else {
            oDataset.destroyDimensions();
            oDataset.destroyMeasures();
            oDataset.getModel().setData({});
        }
    };

    StackedBarChart.prototype.getDataURL = function () {
        return "/sap/hc/mri/pa/services/analytics.xsjs?action=aggquery";
    };

    StackedBarChart.prototype.getAxesData = function () {
        var axes = [];

        // get current attribute buttons' selections
        var oItemsModel = this.getModel(Utils.models.SELECTIONS);
        var mItemsData = oItemsModel.getData();

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
    StackedBarChart.prototype.updateValues = function (mResponse) {
        var bHasDummyCategory = false;
        var bHasStackCategory = false;

        mResponse.categories = mResponse.categories.map(function (mCategory) {
            if (mCategory.id === "dummy_category") {
                mCategory.name = Utils.getText("MRI_PA_DUMMY_CATEGORY");
                bHasDummyCategory = true;
            } else {
                mCategory.name = this.getCategoryName(mCategory.id);

                // format date categories
                var oAttributeConfig = MriFrontendConfig.getFrontendConfig().getAttributeByPath(mCategory.id);
                if (oAttributeConfig.getType() === sap.hc.mri.pa.ui.lib.CDMAttrType.Date || oAttributeConfig.getType() === sap.hc.mri.pa.ui.lib.CDMAttrType.Datetime) {
                    mResponse.data.forEach(function (mDatum) {
                        var dDate = Utils.parseISODate(mDatum[mCategory.id]);
                        if (dDate) {
                            if (oAttributeConfig.getType() === sap.hc.mri.pa.ui.lib.CDMAttrType.Date) {
                                mDatum[mCategory.id] = Utils.formatDate(dDate);
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

        var oDataset = this.getChart().getDataset();
        oDataset.destroyDimensions();
        oDataset.destroyMeasures();

        this._aCurrentSelections = this.getModel(Utils.models.SELECTIONS).getProperty("/attr").map(function (mAttribute) {
            return mAttribute.selection;
        });

        mResponse.categories.forEach(function (mCategory) {
            if (mCategory.axis > 1) {
                bHasStackCategory = true;
            }
            oDataset.addDimension(new DimensionDefinition({
                axis: mCategory.axis,
                name: mCategory.name,
                value: mCategory.value
            }));
        });
        mResponse.measures.forEach(function (mMeasure) {
            oDataset.addMeasure(new MeasureDefinition({
                group: mMeasure.group,
                name: mMeasure.name,
                value: mMeasure.value
            }));
        });

        if (bHasStackCategory) {
            this._chart.getLegend().setVisible(true);
        } else {
            this._chart.getLegend().setVisible(false);
        }

        if (oDataset.getDimensions().length > 0 && oDataset.getMeasures().length > 0) {
            oDataset.bindData("/data");
        }
        var internalData = mResponse.data;
        var sortableCategories = Sorter.buildSortableCategories(mResponse);
        var sortedOriginalData = Sorter.sortCategory(sortableCategories, internalData, "MRI_PA_CHART_SORT_ASCENDING", 0);
        mResponse.data = sortedOriginalData;
        this._preSortData = mResponse;
        var sortedData = this._sortData(mResponse, this._getSortType());
        sortedData.data = MriFrontendConfig.getFrontendConfig().translate(sortedData.data);
        oDataset.getModel().setData(sortedData);

        // Update status bar
        this.setDrillDownBtnEnabled(false);
    };

    StackedBarChart.prototype._sortDataByCategory = function (constantCategories, meassure, data, sortType, categoryIndex) {
        var categoryData = {};
        var summarizedData = [];

        var sortFunction = sortType === "MRI_PA_CHART_SORT_ASCENDING" ?
            function (a, b) {
                return a.value - b.value;
            } :
            function (a, b) {
                return b.value - a.value;
            };

        categoryData[constantCategories[categoryIndex].id] = data[0][constantCategories[categoryIndex].id];
        categoryData[meassure] = 0;
        var previousIndex = 0;

        //Colate Measure for 
        for (var i = 0; i < data.length; i++) {
            if (categoryData[constantCategories[categoryIndex].id] === data[i][constantCategories[categoryIndex].id]) {
                categoryData[meassure] += data[i][meassure];
            } else {
                categoryData.rangeBegin = previousIndex;
                categoryData.rangeEnd = i - 1;
                categoryData.value = categoryData[meassure];
                summarizedData.push(categoryData);

                categoryData = {};
                categoryData[constantCategories[categoryIndex].id] = data[i][constantCategories[categoryIndex].id];
                categoryData[meassure] = data[i][meassure];
                previousIndex = i;
            }
        }

        categoryData.rangeBegin = previousIndex;
        categoryData.rangeEnd = data.length - 1;
        categoryData.value = categoryData[meassure];
        summarizedData.push(categoryData);

        summarizedData.sort(sortFunction);

        var sortedData = [];
        var physicalData = [];

        for (i = 0; i < summarizedData.length; i++) {
            physicalData = [];
            for (var ii = summarizedData[i].rangeBegin; ii <= summarizedData[i].rangeEnd; ii++) {
                physicalData.push(data[ii]);
            }

            if (categoryIndex < constantCategories.length - 1) {
                physicalData = this._sortDataByCategory(constantCategories, meassure, physicalData, sortType, categoryIndex + 1);
            }

            for (ii = 0; ii < physicalData.length; ii++) {
                sortedData.push(physicalData[ii]);
            }
        }

        return sortedData;
    };

    StackedBarChart.prototype._sortData = function (originalData, sortType) {
        var sortedData = JSON.parse(JSON.stringify(originalData));
        var internalData = sortedData.data;

        if (!sortType || sortType === "MRI_PA_CHART_SORT_DEFAULT" || internalData.length <= 0) {
            return sortedData;
        }

        var sortableCategories = Sorter.buildSortableCategories(sortedData);

        if (sortType === "MRI_PA_CHART_SORT_REVERSE") {
            sortedData.data = Sorter.sortCategory(sortableCategories, internalData, "MRI_PA_CHART_SORT_DESCENDING", 0);
            return sortedData;
        }

        var meassure = sortedData.measures[0].id;
        internalData = this._sortDataByCategory(sortableCategories, meassure, internalData, sortType, 0);

        sortedData.data = internalData;

        return sortedData;
    };

    StackedBarChart.prototype._getSortType = function () {
        return this.getModel(Utils.models.SELECTIONS).getData().attr[sap.hc.mri.pa.ui.lib.Dimensions.Sort].sortData;
    };

    /**
     * Sort the Chart According to the Sortkey
     * @param {string} SortKey is one of the following: MRI_PA_CHART_SORT_ASCENDING, MRI_PA_CHART_SORT_DESCENDING, MRI_PA_CHART_SORT_REVERSE, MRI_PA_CHART_SORT_DEFAULT
     */
    StackedBarChart.prototype.sortChart = function (sortKey) {
        var oDataset = this.getChart().getDataset();
        var originalData = this._preSortData;

        var oSelectionsData = this.getModel(Utils.models.SELECTIONS).getData();
        oSelectionsData.attr[sap.hc.mri.pa.ui.lib.Dimensions.Sort].sortData = sortKey;
        this.getModel(Utils.models.SELECTIONS).setData(oSelectionsData);

        var sortedData = this._sortData(originalData, sortKey);
        sortedData.data = MriFrontendConfig.getFrontendConfig().translate(sortedData.data);
        oDataset.getModel().setData(sortedData);
    };
});
