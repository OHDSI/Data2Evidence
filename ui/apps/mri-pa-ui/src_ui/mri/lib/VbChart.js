sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "./MedexChart",
    "./MriFrontendConfig",
    "sap/m/MessageToast",
    "sap/ui/commons/Button",
    "sap/ui/commons/Label",
    "sap/ui/model/json/JSONModel"
], function (jQuery, Utils, MedexChart, MriFrontendConfig, MessageToast, Button, Label, JSONModel) {
    "use strict";

    /**
     * Constructor for a new VbChart.
     * @constructor
     * @param {string} [sId] id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * Variant Browser chart.
     * @extends sap.hc.mri.pa.ui.lib.MedexChart
     * @alias sap.hc.mri.pa.ui.lib.VbChart
     */
    var VbChart = MedexChart.extend("sap.hc.mri.pa.ui.lib.VbChart", {
        metadata: {
            properties: {
                sessionId: {
                    type: "string"
                }
            },
            aggregations: {
                chart: {
                    type: "sap.ui.core.mvc.XMLView",
                    multiple: false
                }
            }
        },
        renderer: function (oRm, oControl) {
            oRm.write("<div");
            oRm.writeControlData(oControl);
            oRm.writeClasses(oControl);
            oRm.write(">");
            oRm.renderControl(oControl._chart);
            oRm.write("<div>");
        }
    });

    VbChart.prototype.init = function () {
        MedexChart.prototype.init.call(this);
        this._chartKey = "vb";

        this._chart = sap.ui.xmlview("sap.hc.mri.pa.ui.views.MriVariantBrowser");
        this._vb = this._chart.byId("mriVbCohorts");

        this.setAggregation("chart", this._chart);

        this.setModel(new JSONModel({
            colorPalette: this.getColorPalette(),
            referenceName: MriFrontendConfig.getFrontendConfig().getChartOptions(this._chartKey).referenceName
        }), "settingsModel");

        this._searchVbBtn = new Button({
            icon: "sap-icon://search",
            enabled: true,
            visible: true,
            tooltip: "{i18n>MRI_PA_BUTTON_SEARCH_VB}",
            press: [this._handleSearchPopover, this],
            styled: false
        });

        this._toolbarSeparator = new Label().addStyleClass("sapMriPaFakeToolbarSeparator");

        sap.ui.getCore().getEventBus().subscribe(
            Utils.events.CHANNEL,
            Utils.events.EVENT_FILTER_ON_GENE,
            this._filterOnGene,
            this
        );

        this._sampleInteractionPath = MriFrontendConfig.getFrontendConfig().getInterHavingAttrAnnotation("genomics_sample_id")[0];
        this._variantInteractionPath = MriFrontendConfig.getFrontendConfig().getInterHavingAttrAnnotation("genomics_variant_location")[0];
        if (this._variantInteractionPath) {
            this._variantLocationAttribute = MriFrontendConfig.getFrontendConfig().getFilterCardByPath(this._variantInteractionPath)
                .getAttributesWithAnnotation("genomics_variant_location")[0];
        }
    };

    VbChart.prototype.exit = function () {
        sap.ui.getCore().getEventBus().unsubscribe(
            Utils.events.CHANNEL,
            Utils.events.EVENT_FILTER_ON_GENE,
            this._filterOnGene,
            this
        );
    };

    VbChart.prototype.setSessionId = function (sNewSessionId) {
        this.setProperty("sessionId", sNewSessionId, true);

        // also change the session id used by the VB
        var parameters = this._vb.getParameters();
        parameters.sessionId = sNewSessionId;
        this._vb.setProperty("parameters", parameters, true);
    };

    VbChart.prototype._handleSearchPopover = function (oEvent) {
        if (!this._searchPopover) {
            this._searchPopover = sap.ui.xmlfragment("sap.hc.mri.pa.ui.views.MriVariantBrowserSearch", this);
            this._searchPopover.setInitialFocus(this._searchPopover.getContent()[0]);
        }

        if (this._searchPopover.isOpen()) {
            this._searchPopover.close();
        } else {
            this._searchPopover.openBy(oEvent.getSource());
        }
    };

    VbChart.prototype._handleSearch = function (oEvent) {
        var sQuery = oEvent.getParameters().query;
        this._searchPopover.close();
        if (sQuery) {
            if (!this._vb.goto(sQuery)) {
                MessageToast.show('Could not find "' + sQuery.trim() + '"');
            }
        }
    };

    VbChart.prototype._generateSessionId = function () {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0;
            var v = c === "x" ? r : r & 0x3 | 0x8;
            return v.toString(16);
        });
    };

    VbChart.prototype._updateSessionId = function () {
        var sessionId = this.getSessionId();
        var parameters = this._vb.getParameters();
        parameters.sessionId = sessionId;
        this._vb.setProperty("parameters", parameters, true);
    };


    VbChart.prototype._addToolbarButton = function () {
        var indexInToolbar = this._getIndexOfButtonsInToolbar();
        sap.ui.getCore().byId(this.getMriToolbar()).insertContent(this._searchVbBtn, indexInToolbar);
        sap.ui.getCore().byId(this.getMriToolbar()).insertContent(this._toolbarSeparator, indexInToolbar);
    };

    VbChart.prototype._removeToolbarButton = function () {
        sap.ui.getCore().byId(this.getMriToolbar()).removeContent(this._searchVbBtn);
        sap.ui.getCore().byId(this.getMriToolbar()).removeContent(this._toolbarSeparator);
    };

    VbChart.prototype.onAfterRendering = function () {
        var $this = this.getDomRef();
        var that = this;

        sap.ui.core.ResizeHandler.register($this, jQuery.proxy(function () {
            // relocate attribute selection buttons after resize
            that._updateLocationsModel();
            that._resizeChart();
        }, this));
    };

    VbChart.prototype._resizeChart = function () {
        this._vb.rerender();
    };

    VbChart.prototype.onAfterShow = function () {
        MedexChart.prototype.onAfterShow.call(this);
        this._aCurrentSelections = this.getModel("selections").getProperty("/attr").map(function (mAttribute) {
            return mAttribute.selection;
        });

        var oStatusData = this.getModel(Utils.models.RESULTS).getData();
        oStatusData.drilldown.enabled = false;
        oStatusData.download.enabled = false;
        oStatusData.pdfDownload.enabled = false;
        oStatusData.collection.enabled = false;
        this.getModel(Utils.models.RESULTS).setData(oStatusData);

        this.getModel(Utils.models.STATUS).setProperty("/beginVisible", true);

        this._addToolbarButton();

        this._updateLocationsModel();
    };

    VbChart.prototype.onBeforeHide = function () {
        this._removeToolbarButton();
    };

    VbChart.prototype._getIndexOfButtonsInToolbar = function () {
        // find the index of the patients number label
        return sap.ui.getCore().byId(this.getMriToolbar()).getContent().length - 6;
    };

    /**
     * Specifies Toolbar settings for the chart:
     *  - Availability of Data download
     *  - Availability of Collection feature
     *  - Visibilty of the Data Dropdowns
     * @returns {Object} Object with one Property each
     * @overwrite
     */
    VbChart.prototype.getChartSettings = function () {
        return {
            downloadEnabled: false,
            pdfDownloadEnabled: false,
            collectionEnabled: false,
            beginVisible: true
        };
    };

    VbChart.prototype.clearChart = function () { /* implement abstract method, not needed */ };

    VbChart.prototype.updateChart = function (oFilterObject) {
        var that = this;
        this._aCurrentSelections = this.getModel("selections").getProperty("/attr").map(function (mAttribute) {
            return mAttribute.selection;
        });
        this._vb.setBusy();

        // send a cleanup request
        Utils.ajax({
            type: "POST",
            url: "/sap/hc/hph/genomics/services/",
            contentType: "application/json;charset=utf-8",
            data: JSON.stringify({
                request: "mri.SessionSamples.cleanUp",
                parameters: {
                    sessionId: this.getSessionId() // send the previous session id for cleaning
                },
                directResult: true
            })
        }).fail(function (xhr, textStatus) {
            jQuery.sap.log.error("VariantBrowserChart" + textStatus, xhr.responseText, "hc.mri.pa");
        });

        // generate a new session id
        this.setSessionId(this._generateSessionId());

        // send the cohort creation request
        this._currentRequest = Utils.ajax({
            type: "POST",
            url: "/sap/hc/hph/genomics/services/",
            contentType: "application/json;charset=utf-8",
            data: JSON.stringify({
                request: "mri.SessionSamples.createCohorts",
                parameters: {
                    requestContent: oFilterObject,
                    sessionId: this.getSessionId(),
                    configData: {
                        configId: MriFrontendConfig.getFrontendConfig().getPaConfigId(),
                        configVersion: MriFrontendConfig.getFrontendConfig().getPaConfigVersion()
                    }
                },
                directResult: true
            })
        }).done(function () {
            var parameters = {
                configData: {
                    configId: MriFrontendConfig.getFrontendConfig().getPaConfigId(),
                    configVersion: MriFrontendConfig.getFrontendConfig().getPaConfigVersion()
                }
            };
            that._vb.setProperty("validationParameters", parameters, true);
            that._vb.update(true);
        }).fail(function (xhr, textStatus) {
            jQuery.sap.log.error("VariantBrowserChart" + textStatus, xhr.responseText, "hc.mri.pa");
        });
    };

    VbChart.prototype.getAxesData = function () {
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
     * Add VB annotations to the filter objects.
     * @param   {sap.hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.Filter} oIFR IFR object
     * @returns {object[]}                                                     Filter object enriched with axis selections
     */
    VbChart.prototype.preprocessFilterQuery = function (oIFR) {
        var aFilters = MedexChart.prototype.preprocessFilterQuery.call(this, oIFR);
        oIFR.axes = this.getAxesData();
        var aRequests = aFilters.map(function (oFilter) {
            return this._preprocessOneFilterObject(oFilter);
        }, this);
        return aRequests;
    };

    VbChart.prototype._preprocessOneFilterObject = function (oFilter) {
        // clone filter object
        var oNewFilter = jQuery.extend({}, oFilter);

        // get current attribute buttons' selections
        var oItemsModel = this.getModel(Utils.models.SELECTIONS);
        var mItemsData = oItemsModel.getData();
        var changed = false;
        var oQueryObject;

        // annotate filter object w.r.t. the three X axes attributes
        for (var i = sap.hc.mri.pa.ui.lib.Dimensions.X1; i <= sap.hc.mri.pa.ui.lib.Dimensions.X3; i++) {
            if (this.isValidSelection(mItemsData.attr[i].selection)) {
                oQueryObject = Utils.getPropertyByPath(oNewFilter, mItemsData.attr[i].selection);
                if (!oQueryObject) {
                    // filter object does not contain current selection: add it to the object
                    oQueryObject = [{}];
                    Utils.createPathInObject(oNewFilter, mItemsData.attr[i].selection, oQueryObject);
                }
                oQueryObject[0].xaxis = i + 1; // annotate category attribute (with position i+1)
                if (this._aCurrentSelections && this._aCurrentSelections[i] === mItemsData.attr[i].selection) {
                    if (parseFloat(mItemsData.attr[i].binsize)) {
                        oQueryObject[0].binsize = parseFloat(mItemsData.attr[i].binsize);
                    }
                } else {
                    var oCurrentAttribute = MriFrontendConfig.getFrontendConfig().getAttributeByPath(mItemsData.attr[i].selection);
                    oQueryObject[0].binsize = oCurrentAttribute.getDefaultBinSize();
                }
            }
        }

        // check if the filter object contains a DNA sample filter card. If not, add one
        var jsonWalk = Utils.getJsonWalkFunction(oNewFilter);
        var walkResult = jsonWalk(this._sampleInteractionPath);
        if (walkResult.length === 0) {
            // create an empty sample "filter card"
            var sInstancePath = this._sampleInteractionPath.concat(".1");
            Utils.createPathInObject(oNewFilter, sInstancePath, {
                attributes: {},
                isFiltercard: true
            });
        }

        if (changed) {
            oItemsModel.setData(mItemsData);
        }

        return oNewFilter;
    };

    VbChart.prototype._updateLocationsModel = function () {
        // get locations data and initially hide everything
        var oSelectionsData = this.getModel(Utils.models.SELECTIONS).getData();
        var oLocationsData = this.getModel(Utils.models.LOCATIONS).getData();
        var i;
        for (i = 0; i < sap.hc.mri.pa.ui.lib.Dimensions.Count; i++) {
            oLocationsData.attr[i].visible = false;
        }

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
            oSelectionsData.attr[i].scope = "boxplot";
        }

        oSelectionsData.attr[sap.hc.mri.pa.ui.lib.Dimensions.Y].isCategory = false;
        oSelectionsData.attr[sap.hc.mri.pa.ui.lib.Dimensions.Y].isMeasure = true;

        // set the new locations to model
        this.getModel(Utils.models.LOCATIONS).setData(oLocationsData);
        this.getModel(Utils.models.SELECTIONS).setData(oSelectionsData);
    };

    VbChart.prototype._filterOnGene = function (sChannelId, sEventId, oParameter) {
        // only add a gene attribute if such an attribute is available in the config
        if (this._variantInteractionPath && this._variantLocationAttribute) {
            sap.ui.getCore().getEventBus().publish(
                Utils.events.CHANNEL,
                Utils.events.EVENT_ADD_ATTRIBUTE, {
                    interactionInstance: this._variantInteractionPath,
                    attributeKey: this._variantLocationAttribute,
                    values: [oParameter.gene]
                }
            );
        }
    };

    return VbChart;
});
