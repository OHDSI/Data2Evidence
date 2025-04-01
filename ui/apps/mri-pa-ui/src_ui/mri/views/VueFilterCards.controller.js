sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "sap/hc/mri/pa/ui/lib/BookmarkUtils",
    "sap/hc/mri/pa/ui/lib/BoolFilterContainer",
    "sap/hc/mri/pa/ui/lib/LazyMenu",
    "sap/hc/mri/pa/ui/lib/MriFrontendConfig",
    "sap/hc/mri/pa/ui/lib/PdfExport",
    "sap/hc/mri/pa/ui/lib/bookmarks/BMv2Parser",
    "sap/hc/mri/pa/ui/lib/bookmarks/AnnotateBM",
    "sap/hc/mri/pa/ui/lib/charts/ChartConfigService",
    "sap/hc/mri/pa/ui/lib/ifr/ChartableCardsVisitor",
    "sap/hc/mri/pa/ui/lib/ifr/ControlGenerator",
    "sap/hc/mri/pa/ui/lib/ifr/IFR2BackendIFR",
    "sap/hc/mri/pa/ui/lib/ifr/IFR2Bookmark",
    "sap/hc/mri/pa/ui/lib/utils/KeyCounter",
    "sap/hc/mri/pa/ui/lib/utils/UrlFilterParser",
    "sap/m/FlexBox",
    "sap/m/Label",
    "sap/m/MessageBox",
    "sap/m/Popover",
    "sap/ui/commons/Label",
    "sap/ui/commons/ToggleButton",
    "sap/ui/model/json/JSONModel",
    "sap/hc/mri/pa/ui/lib/VueAdaptor",
    "sap/ui/model/resource/ResourceModel"
], function (jQuery, Utils, BookmarkUtils, Filter, LazyMenu, MriFrontendConfig, PdfExport,
    BMv2Parser, AnnotateBM, ChartConfigService, ChartableCardsVisitor, ControlGenerator, ifr2backendifr, ifr2bookmark, KeyCounter,
    UrlFilterParser, FlexBox, Label, MessageBox, Popover, CommonsLabel, ToggleButton,
    JSONModel, VueAdaptor, ResourceModel
) {
        "use strict";

        const eventBus = window.sap.ui.getCore().getEventBus();

        sap.ui.controller("sap.hc.mri.pa.ui.views.VueFilterCards", {

            onInit: function () {
                // apply content density mode to root view
                this.getView().addStyleClass(Utils.getContentDensityClass());

                this._patientFilter = this.getView().byId("filterContainer");

                // Get config object and default filter content from server
                this._config = MriFrontendConfig.getFrontendConfig();
                if (!this._config) {
                    throw new Error(Utils.getText("MRI_PA_CONFIG_ERROR_NOT_FOUND_ACTIVE") + " " + Utils.getText("MRI_PA_CONFIG_ERROR_NOT_FOUND_ACTIVE_REFER"));
                }

                this._updateTitle();

                eventBus.subscribe(
                    Utils.events.CHANNEL,
                    Utils.events.EVENT_ADD_ATTRIBUTE,
                    this.onAddAttribute,
                    this
                );
                eventBus.subscribe(
                    'VUE_START_FILTERCARD',
                    this._startFilterCard,
                    this);
                eventBus.subscribe(
                    'VUE_DRILLDOWN',
                    this.setSelectedDataToFilter,
                    this);
                eventBus.subscribe(
                    'VUE_CONFIG_CHANGED',
                    function (sChannelId, sEventId, config) {
                        this.reloadWithNewConfig(config);
                    },
                    this);
                eventBus.subscribe(
                    'VUE_LOAD_BOOKMARK',
                    this.reloadWithBookmark,
                    this);
                eventBus.subscribe(
                    'VUE_AXIS_SELECT',
                    function (sChannelId, sEventId, attributeParameters) {
                        this.onAxisSelect(attributeParameters);
                    },
                    this);
                eventBus.subscribe(
                    'VUE_SPLITTER_RESIZE',
                    function (sChannelId, sEventId, dimensions) {
                        this._updateFilterDescriptionColumnWidthOnSplitterResize(dimensions);
                    },
                    this);

                try {
                    this._oCollectionsComponent = sap.ui.component({
                        name: "sap.hc.mri.pa.ui.collection"
                    });
                    this._collectionComponentAvailable = true;
                }
                catch (err) {
                    this._collectionComponentAvailable = false;
                    console.error("Collection Component Unvailable");
                }

                this.getView().setModel(new ResourceModel({
                    bundleUrl: jQuery.sap.getModulePath("sap.hc.mri.pa.ui") + "/i18n/text.properties"
                }), 'i18n');

                var componentAvailableModel = new JSONModel({
                    collectionComponentAvailable: this._collectionComponentAvailable
                });
                this.getView().setModel(componentAvailableModel, "componentAvailableModel");

                /*
                if (this._hasUrlParameters()) {
                    this._handleUrlParameters();
                } else {
                    this._loadDefaultChartsAndFilters();
                }
                */

            },

            _startFilterCard: function (sChannelId, sEventId, eventData) {
                if (eventData && eventData.startData && (eventData.startData.type === 'filter' || eventData.startData.type === 'bookmark')) {
                    this._handleUrlParameters(eventData.startData);
                } else {
                    this._loadDefaultChartsAndFilters();
                }
            },

            _handleUrlParameters: function (startData) {
                if (startData.type === 'bookmark') {
                    this._loadDefaultChartsAndFilters();
                    this.reloadWithBookmark(null, null, {bookmark: startData.data});
                } else {
                    this._loadDefaultChartsAndFilters();

                    if (startData.type === 'filter') {
                        this._applyFilterFromUrl(startData.data);
                    }
                }
            },

            _loadDefaultChartsAndFilters: function () {
                this._loadDefaultFilters();
                // this._switchToChart(this.oCurrentChart);
            },

            _hasUrlParameters: function () {
                var urlsParameters = this._getUrlParameters();

                return Object.keys(urlsParameters).length > 0;
            },

            _getUrlParameters: function () {
                return {};
                // var componentData = this.getOwnerComponent().getComponentData();
                // if (componentData && componentData.startupParameters) {
                //     return componentData.startupParameters;
                // } else {
                //     return {};
                // }
            },
            _collapseOrExpandFilterBar: function () {
                var isCollapsed = this.getView().getModel(Utils.models.FILTERBAR_DATA).getProperty("/collapsed");
                if (isCollapsed) {
                    this._expandFilterBar();
                } else {
                    this._collapseFilterBar();
                }
            },
            _collapseFilterBar: function () {
                var splitter = this.getView().getContent()[0];
                var layoutData = splitter.getContentAreas()[0].getLayoutData();
                layoutData.setResizable(false);

                var size = layoutData.getSize();
                this.getView().getModel(Utils.models.FILTERBAR_DATA).setProperty("/expandedSize", size);
                this.getView().getModel(Utils.models.FILTERBAR_DATA).setProperty("/currentSize", "0px");
                this.getView().getModel(Utils.models.FILTERBAR_DATA).setProperty("/currentMinSize", 0);

                this.getView().getModel(Utils.models.FILTERBAR_DATA).setProperty("/collapsed", true);
                this.getView().getModel(Utils.models.FILTERBAR_DATA).setProperty("/buttonIcon", "sap-icon://open-command-field");
            },

            _expandFilterBar: function () {
                var splitter = this.getView().getContent()[0];
                var layoutData = splitter.getContentAreas()[0].getLayoutData();
                layoutData.setResizable(true);

                var size = this.getView().getModel(Utils.models.FILTERBAR_DATA).getProperty("/expandedSize");
                var minSize = this.getView().getModel(Utils.models.FILTERBAR_DATA).getProperty("/expandedMinSize");
                this.getView().getModel(Utils.models.FILTERBAR_DATA).setProperty("/currentSize", size);
                this.getView().getModel(Utils.models.FILTERBAR_DATA).setProperty("/currentMinSize", minSize);

                this.getView().getModel(Utils.models.FILTERBAR_DATA).setProperty("/collapsed", false);
                this.getView().getModel(Utils.models.FILTERBAR_DATA).setProperty("/buttonIcon", "sap-icon://close-command-field");
            },

            _buildToolbar: function (toolbarAnalytics, chartButtonsMap) {
                this._updateToolbarButtonVisibility();

                this._chartConfigs.getAllChartConfigs().forEach(function (chartConfig, iIndex) {
                    var btn = new ToggleButton(chartConfig.getChartId(), {
                        icon: chartConfig.getIcon(),
                        tooltip: chartConfig.getTooltip(),
                        lite: true,
                        styled: false,
                        visible: chartConfig.isVisible(),
                        press: [function () {
                            this._switchToChart(chartConfig.getChartId());
                        }, this],
                        pressed: chartConfig.getChartId() === this.oCurrentChart
                    });
                    toolbarAnalytics.insertContent(btn, 3 + iIndex * 2);
                    toolbarAnalytics.insertContent(new CommonsLabel({
                        id: chartConfig.getChartId() + "-separator",
                        visible: chartConfig.isVisible()
                    }).addStyleClass("sapMriPaFakeToolbarSeparator"), 4 + iIndex * 2);

                    // keep a map of the buttons to be able to set the selected one programmatically
                    chartButtonsMap[chartConfig.getChartId()] = btn;
                }, this);

                var registerHotkeys = function () {
                    jQuery(window).on("keydown", function (event) {
                        if (event.ctrlKey === true) {
                            // TODO: use chart-type-service
                            this._chartConfigs.getAllChartConfigs().forEach(function (chartConfig) {
                                if (chartConfig.getKeyCode() === event.keyCode) {
                                    chartButtonsMap[chartConfig.getChartId()].firePress();
                                    return false; // break
                                }
                            });
                        }
                    }.bind(this));
                };
                registerHotkeys.bind(this)();

                return toolbarAnalytics;
            },

            _updateFilterDescriptionColumnWidthOnSplitterResize: function (dimensions) {
                var width = dimensions.width;
                var iMaxWidth = Math.floor(width * 0.4);
                this._patientFilter.setDescriptionColumnsMaxWidth(iMaxWidth);
            },

            _updateToolbarButtonVisibility: function () {
                var bShowDownloadButton = false;
                var bShowCollectionButton = false;

                var aChartConfigs = this._chartConfigs.getAllChartConfigs();
                aChartConfigs.forEach(function (oChartConfig) {
                    if (oChartConfig.isVisible()) {
                        if (oChartConfig.isDownloadEnabled()) {
                            bShowDownloadButton = true;
                        }
                        if (oChartConfig.isCollectionEnabled()) {
                            bShowCollectionButton = true;
                        }
                    }
                });

                this.getView().getModel(Utils.models.RESULTS).setProperty("/download/visible", bShowDownloadButton);
                this.getView().getModel(Utils.models.RESULTS).setProperty("/collection/visible", bShowCollectionButton);
            },

            _applyFilterFromUrl: function (filterString) {
                var filterList;

                try {
                    filterList = JSON.parse(filterString);
                } catch (e) {
                    jQuery.sap.log.error("Error parsing filter JSON: " + e);
                    return;
                }

                var filterCardCounter = KeyCounter.getKeyCountingStrategy("default", 1);
                var pathAttributeValuePairs = new UrlFilterParser(filterList).getPathAttributeValuePairs();

                pathAttributeValuePairs.forEach(function (pathAttributeValuePair) {
                    this._checkPathAndAttributeAndAddToFilter(pathAttributeValuePair, filterCardCounter);
                }, this);

                var oIFR = this._patientFilter.getIFR();
                VueAdaptor.setIFR({
                    ifr: this._patientFilter.getIFR(),
                    backendIFR: ifr2backendifr(oIFR),
                    topics: {
                        "FILTERCARDS_LOAD_DEFAULT_FILTERS": {
                        }
                    }
                });
            },

            _checkPathAndAttributeAndAddToFilter: function (pathAttributeValuePair, filterCardCounter) {
                var interactionPath = pathAttributeValuePair.interactionPath;
                var attributeId = pathAttributeValuePair.attributeId;
                var filterValue = pathAttributeValuePair.value;

                var filterCardConfig = this._config.getFilterCardByPath(interactionPath);

                if (!filterCardConfig) {
                    jQuery.sap.log.error("Interaction path was not found in config: " + interactionPath);
                    return;
                }

                var attributeConfig = filterCardConfig.getAttributeByRelativeKey(attributeId);
                if (!attributeConfig) {
                    jQuery.sap.log.error("Attribute id was not found in config: " + attributeId + " (interaction path: " + interactionPath + ")");
                    return;
                }

                var filterCardIndex = filterCardCounter.getNextValueFor(interactionPath);

                var internalInteractionPath = interactionPath;
                if (!filterCardConfig.isBasicData()) {
                    internalInteractionPath += "." + filterCardIndex;
                }

                this._patientFilter.setFilterValues(internalInteractionPath, attributeId, filterValue, Utils.valuesMergeMode.OVERRIDE);
            },

            /*
             * bind the binning button to both the visibility of the corresponding axis and to the selected value
             * (show only for numerical values)
             */
            bindBinningButton: function (oBinningButton, attrIndex) {
                var that = this;
                oBinningButton.bindProperty("visible", {
                    parts: [
                        Utils.models.SELECTIONS + ">/attr/" + attrIndex + "/isCategory",
                        Utils.models.LOCATIONS + ">/attr/" + attrIndex + "/visible",
                        Utils.models.SELECTIONS + ">/attr/" + attrIndex + "/selection"
                    ],
                    formatter: function (isCategory, isAttrVisible, currentSelection) {
                        if (isCategory && isAttrVisible) {
                            if (currentSelection && currentSelection !== sap.hc.mri.pa.ui.lib.Selection.Invalid) {
                                // FIXME MRI path used
                                var sConfigPath = that._config.convertInternalPathToConfigPath(currentSelection);
                                return that._config.getAttributeByPath(sConfigPath).isBinnable();
                            }
                        }
                        return false;
                    }
                });
            },

            /**
             * Load the default filter when the application is being initialized or after the configuration has changed.
             * @private
             */
            _loadDefaultFilters: function () {
                var initialIFR = this._config.getInitialIFR();
                ControlGenerator.generate(initialIFR, this._patientFilter);
                const oIFR = this._patientFilter.getIFR();
                VueAdaptor.setIFR({
                    ifr: this._patientFilter.getIFR(),
                    backendIFR: ifr2backendifr(oIFR),
                    topics: {
                        "FILTERCARDS_LOAD_DEFAULT_FILTERS": {

                        }
                    }
                });
            },

            /**
             * Exports annotated bookmark
             * @param   {string}    sBookmarkName Name of the new bookmark
             * @returns {object}    mBookmark   Bookmark object with version, annotated filter, chartType and annotated axisSelection information
             */
            _exportBookmark: function (sBookmarkName) {
                var annotatedBmk = AnnotateBM.annotate(this._patientFilter.getIFR(), this.getAxisSelection(), this._config);
                annotatedBmk.name = sBookmarkName;
                annotatedBmk.chartType = this.getCurrentChartType();
                var exportBmk = this._bookmarksPanel.exportBookmark(annotatedBmk);
                exportBmk.afp = this._config.isMatchAnyFilterEnabled();
                exportBmk.advancedTimeFiltering = this._config.isAdvancedTimeFilteringEnabled();

                /* For future use: data for populating comparison view */
                // annotatedBmk.data = this.getChart().getResponseData();

                return JSON.stringify(exportBmk);
            },

            /**
             * Imports annotated bookmark
             * @param   {object}    mBookmark   Bookmark object with filter, chartType and axisSelection information
             * @returns {object}    mBookmark   Bookmark object with version, deannotated filter, chartType and deannotated axisSelection information
             */
            _importBookmark: function (mBookmark) {
                try {
                    if (mBookmark.afp === this._config.isMatchAnyFilterEnabled() &&
                        mBookmark.advancedTimeFiltering === this._config.isAdvancedTimeFilteringEnabled()) {
                        // if the bookmark is compatible with the current configuration
                        if (BookmarkUtils.checkBookmarkConfigCompatible(mBookmark)) {
                            var deannotatedBmk = AnnotateBM.deannotate(BMv2Parser.convertBM2IFR(mBookmark.filter), mBookmark.axisSelection, this._config);
                            deannotatedBmk.name = mBookmark.name;
                            deannotatedBmk.chartType = mBookmark.chartType;
                            deannotatedBmk.metadata = mBookmark.metadata;
                            /* For future use: data for populating comparison view */
                            // deannotatedBmk.data = mBookmark.data;

                            // go back to the filters page
                            this._navContainer.back();
                            var oOptions = this._getChartOptions(mBookmark);

                            this._patientFilter.reset();
                            ControlGenerator.generate(deannotatedBmk.filter, this._patientFilter);

                            // set the axis
                            this.setAxisSelectionFromSelectionList(mBookmark.axisSelection);

                            this._switchToChart(mBookmark.chartType, oOptions);

                            return deannotatedBmk;
                        } else {
                            throw new Error(Utils.getText("MRI_PA_BMK_CONFIG_CONFLICT_TEXT"));
                        }
                    } else {
                        return { error: "Import bookmark settings are not compatible with current PA configuration settings" };
                    }
                } catch (oError) {
                    jQuery.sap.log.error("Error restoring bookmark: " + oError.message);
                    this.openBookmarkErrorDialog(null, Utils.getText("MRI_PA_BMK_CONFIG_CONFLICT_TEXT"));
                }
            },

            /**
             * Updates the page title to the configured title. If no title is configured the default title is used.
             * @private
             */
            _updateTitle: function () {
                // Update page title
                var title = this._config.getPageTitle();
                if (!title) {
                    title = Utils.getText("MRI_PA_TITLE");
                }
                $(document).prop("title", title);
            },

            /**
             * Handler for the add bookmark Button press event.
             * Opens a Popover to enter the bookmark name.
             * @param {sap.ui.base.Event} oEvent Button press event
             */
            onAddBookmarkButtonPressed: function (oEvent) {
                var oAddBookmarkButton = oEvent.getSource();
                if (!this.oSaveBookmarkPopover) {
                    this.oSaveBookmarkPopover = sap.ui.xmlfragment("sap.hc.mri.pa.ui.views.SaveBookmark", this);
                    this.oSaveBookmarkPopover.addStyleClass(Utils.getContentDensityClass());
                    this.oSaveBookmarkPopover.setModel(new JSONModel({
                        name: ""
                    }), "name");
                    oAddBookmarkButton.addDependent(this.oSaveBookmarkPopover);
                }
                this.oSaveBookmarkPopover.getModel("name").setProperty("/name", "");
                this.oSaveBookmarkPopover.openBy(oAddBookmarkButton);
            },

            /**
             * Handler for the save bookmark Button press event.
             * Delegates the saving to sap.hc.mri.pa.ui.BookmarkList with name, filterdata, chartType and axisSelection.
             * @param {sap.ui.base.Event} oEvent Button press event
             */
            onSaveBookmark: function (oEvent) {
                this.oSaveBookmarkPopover.close();

                var sBookmarkName = oEvent.getSource().getModel("name").getProperty("/name");
                var mBookmarkFilterData = ifr2bookmark(this._patientFilter.getIFR());
                var mBookmark = {
                    name: sBookmarkName,
                    filterdata: mBookmarkFilterData,
                    chartType: this.getCurrentChartType(),
                    axisSelection: this.getAxisSelection()
                };

                var sortDirection = this.getView().getModel(Utils.models.SELECTIONS).getProperty("/attr/" + sap.hc.mri.pa.ui.lib.Dimensions.Sort + "/sortData");

                switch (this.getChart()._chartKey) {
                    case "list":
                        mBookmark.filterdata.selected_attributes = this.getChart().getModel().getProperty("/selected_attributes");
                        mBookmark.filterdata.sorting_directions = this.getChart().getModel().getProperty("/sorting_directions");
                        mBookmark.filterdata.sorted_attributes = this.getChart().getModel().getProperty("/sorted_attributes");
                        break;
                    case "km":
                        mBookmark.filterdata.errorlines = this.getChart().getModel().getProperty("/errorlines");
                        mBookmark.filterdata.censoring = this.getChart().getModel().getProperty("/censoring");
                        mBookmark.filterdata.selected_event = this.getChart().getModel().getProperty("/selected_event");
                        mBookmark.filterdata.selected_start_event_occ = this.getChart().getModel().getProperty("/selected_start_event_occ");
                        mBookmark.filterdata.selected_end_event = this.getChart().getModel().getProperty("/selected_end_event");
                        mBookmark.filterdata.selected_end_event_occ = this.getChart().getModel().getProperty("/selected_end_event_occ");
                        break;
                    case "stacked":
                        mBookmark.filterdata.sorting = sortDirection;
                        break;
                    default:
                        break;
                }
                this._bookmarksPanel.saveBookmark(mBookmark);
            },

            /**
             * Handler for the cancel save bookmark Button press event.
             * Closes the Popover.
             * @param {sap.ui.base.Event} oEvent Button press event
             */
            onSaveBookmarkCancel: function () {
                this.oSaveBookmarkPopover.close();
            },

            onRestoreBookmarkRequested: function (oEvent) {
                try {
                    // transform the bookmark into a json object
                    var mBookmark = JSON.parse(oEvent.getParameter("bmk"));
                    // if the bookmark is compatible with the current configuration
                    if (BookmarkUtils.checkBookmarkConfigCompatible(mBookmark)) {
                        // restore bookmark
                        this.restoreBookmark(mBookmark, this);
                    } else {
                        throw new Error(Utils.getText("MRI_PA_BMK_CONFIG_CONFLICT_TEXT"));
                    }
                } catch (oError) {
                    jQuery.sap.log.error("Error restoring bookmark: " + oError.message);
                    this.openBookmarkErrorDialog(null, Utils.getText("MRI_PA_BMK_CONFIG_CONFLICT_TEXT"));
                }
            },

            reloadWithBookmark: function (sChannelId, sEventId, oEventData) {
                var bookmark = JSON.parse(oEventData.bookmark);
                var ifr = BMv2Parser.convertBM2IFR(bookmark.filter);
                this._patientFilter.reset();
                ControlGenerator.generate(ifr, this._patientFilter);
                const oIFR = this._patientFilter.getIFR();
                VueAdaptor.setIFR({
                    ifr: this._patientFilter.getIFR(),
                    backendIFR: ifr2backendifr(oIFR),
                    topics: {
                        "VUE_SET_BOOKMARK": {
                            bookmark: oEventData.bookmark
                        }
                    }
                });
            },

            /**
             * Restores the options to match the bookmark.
             * @param {object}                            mBookmark   Bookmark object with filter, chartType and
             *                                                        axisSelection information
             * @param {sap.hc.mri.pa.ui.PatientAnalytics} oController This controller
             */
            restoreBookmark: function (mBookmark, oController) {
                // go back to the filters page
                oController._navContainer.back();

                var ifr = BMv2Parser.convertBM2IFR(mBookmark.filter);

                var oOptions = this._getChartOptions(mBookmark);


                oController._patientFilter.reset();
                ControlGenerator.generate(ifr, oController._patientFilter);

                // set the axis
                oController.setAxisSelectionFromSelectionList(mBookmark.axisSelection);

                oController._switchToChart(mBookmark.chartType, oOptions);
            },
            onGoToBookmarksPage: function () {
                this._navContainer.to(this._bookmarksPage);
                this._bookmarksPanel.loadRemoteBookmarks();
            },

            onGoToFiltersPage: function () {
                this._navContainer.back();
            },

            /**
             * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
             * @override
             * @protected
             */
            onExit: function () {

                eventBus.unsubscribe(
                    Utils.events.CHANNEL,
                    Utils.events.EVENT_ADD_ATTRIBUTE,
                    this.onAddAttribute,
                    this
                );
                eventBus.unsubscribe(
                    'VUE_START_FILTERCARD',
                    this._startFilterCard,
                    this);
                eventBus.unsubscribe(
                    'VUE_DRILLDOWN',
                    this.setSelectedDataToFilter,
                    this);
                eventBus.unsubscribe(
                    'VUE_LOAD_BOOKMARK',
                    this.reloadWithBookmark,
                    this);
                eventBus.unsubscribe(
                    'VUE_CONFIG_CHANGED',
                    function (sChannelId, sEventId, config) {
                        this.reloadWithNewConfig(config);
                    },
                    this);
                eventBus.unsubscribe(
                    'VUE_AXIS_SELECT',
                    function (sChannelId, sEventId, attributeParameters) {
                        this.onAxisSelect(attributeParameters);
                    },
                    this);
            },

            /**
             * Update the chart data if the current chart is visible.
             * Waits for 300ms before refreshing the chart data.
             */
            updateChart: function () {
                if (this.sChangedTimeout) {
                    jQuery.sap.clearDelayedCall(this.sChangedTimeout);
                }
                this.sChangedTimeout = jQuery.sap.delayedCall(300, this, function () {
                    if (this._config.isChartVisible(this.getCurrentChartType())) {
                        this._showChart();
                    } else {
                        this._showNoChartErrorMessage();
                    }
                });
            },

            _showChart: function () {
                // var chartTypes = [
                //     "stacked",
                //     "list",
                //     "boxplot",
                //     "km"
                // ];
                // var params = {
                //     isForBackend: true
                // };
                // var isChartType = chartTypes.indexOf(this.getChart()._chartKey) !== -1;
                // var aFilters = !isChartType ? this.generateAnnotatedFilterObject(params) : null;
                // var oIFR = this.generateBackendIFR(params);

                // this.getChart().updateChart(isChartType ? oIFR : aFilters);

                // if (!isChartType) {
                //     if (this._currentPcountRequest) {
                //         this._currentPcountRequest.reject(null, "abort");
                //     }

                //     // the patient count request
                //     this._currentPcountRequest = Utils.ajax({
                //         type: "POST",
                //         url: "/sap/hc/mri/pa/services/analytics.xsjs?action=totalpcount",
                //         contentType: "application/json;charset=utf-8",
                //         data: JSON.stringify(oIFR)
                //     }).done(function (mResponse) {
                //         var iPcount = mResponse.data[0]["patient.attributes.pcount"];
                //         this.getView().getModel(Utils.models.RESULTS).setProperty("/total/size", iPcount);
                //     }.bind(this)).fail(function () {
                //         this.getView().getModel(Utils.models.RESULTS).setProperty("/total/size", "–");
                //     }.bind(this)).always(function () {
                //         delete this._currentPcountRequest;
                //     }.bind(this));
                // }

                // var patientListCount = this.getView().getModel(Utils.models.RESULTS).getProperty("/total/allPatientList");
                // if (this.getChart()._chartKey === "list" && !patientListCount) {
                //     oIFR.cards.content[0].content = [];
                //     oIFR.cards.content[1].content = [];
                //     oIFR.axes = [{ aggregation: "string_agg", axis: "y", configPath: "patient", id: "patient.attributes.pid", instanceID: "patient", isFiltercard: true, seq: 1 }];
                //     //this._allPcountRequest
                //     this._currentPcountRequest = Utils.ajax({
                //         type: "POST",
                //         url: "/sap/hc/mri/pa/services/analytics.xsjs?action=totalpcount",
                //         contentType: "application/json;charset=utf-8",
                //         data: JSON.stringify(oIFR)
                //     }).done(function (mResponse) {
                //         var iPcount = mResponse.data[0]["patient.attributes.pcount"];
                //         this.getView().getModel(Utils.models.RESULTS).setProperty("/total/allPatientList", iPcount);
                //         this.getView().getModel(Utils.models.RESULTS).setProperty("/total/allPatientCount", iPcount);
                //     }.bind(this)).fail(function () {
                //         this.getView().getModel(Utils.models.RESULTS).setProperty("/total/allPatientList", "–");
                //     }.bind(this)).always(function () {
                //         delete this._currentPcountRequest;
                //     }.bind(this));
                // }

                // var patientChartCount = this.getView().getModel(Utils.models.RESULTS).getProperty("/total/allPatientChart");
                // if (isChartType && this.getChart()._chartKey !== "list" && !patientChartCount) {
                //     oIFR.cards.content[0].content = [];
                //     oIFR.cards.content[1].content = [];

                //     //this._allPcountRequest
                //     this._currentPcountRequest = Utils.ajax({
                //         type: "POST",
                //         url: "/sap/hc/mri/pa/services/analytics.xsjs?action=totalpcount",
                //         contentType: "application/json;charset=utf-8",
                //         data: JSON.stringify(oIFR)
                //     }).done(function (mResponse) {
                //         var iPcount = mResponse.data[0]["patient.attributes.pcount"];
                //         this.getView().getModel(Utils.models.RESULTS).setProperty("/total/allPatientChart", iPcount);
                //         this.getView().getModel(Utils.models.RESULTS).setProperty("/total/allPatientCount", iPcount);
                //     }.bind(this)).fail(function () {
                //         this.getView().getModel(Utils.models.RESULTS).setProperty("/total/allPatientChart", "–");
                //     }.bind(this)).always(function () {
                //         delete this._currentPcountRequest;
                //     }.bind(this));
                // }
            },

            _showNoChartErrorMessage: function () {
                var noChartLabel = new FlexBox({
                    height: "100%",
                    alignItems: sap.m.FlexAlignItems.Center,
                    justifyContent: sap.m.FlexJustifyContent.Center,
                    items: [new CommonsLabel({
                        text: Utils.getText("MRI_PA_CONFIG_NO_CHART_VISIBLE"),
                        icon: "sap-icon://message-information"
                    })]
                }).addStyleClass("sapMriChartNoDataPholder");
                this.layMain.getCenter().addContent(noChartLabel);
            },

            _switchToChart: function (sType, oOptions) {
                if (this._config.isChartVisible(sType)) {
                    this.changeCurrentChart(sType);
                    if (oOptions && Object.keys(oOptions).length !== 0) {
                        this.getChart().setChartOptions(oOptions);
                    }

                    var previousTotalCount = this.getView().getModel(Utils.models.RESULTS).getProperty("/total/allPatientCount");
                    var totalPatientCount = "-";
                    if (sType === "list") {
                        totalPatientCount = this.getView().getModel(Utils.models.RESULTS).getProperty("/total/allPatientList");
                        this.getChart().bindProperty("chartableFilterCards", Utils.models.SELECTIONS + ">/chartableFilterCards");
                    } else {
                        totalPatientCount = this.getView().getModel(Utils.models.RESULTS).getProperty("/total/allPatientChart");
                    }

                    if (totalPatientCount !== 0 && !totalPatientCount) {
                        if (previousTotalCount) {
                            totalPatientCount = previousTotalCount;
                        } else {
                            totalPatientCount = "0";
                        }

                    }

                    this.getView().getModel(Utils.models.RESULTS).setProperty("/total/allPatientCount", totalPatientCount);

                    this.updateChart();
                }
            },

            _getChartOptions: function (mBookmark) {
                var oOptions = {};
                if (mBookmark.metadata.version >= 3) {
                    switch (mBookmark.chartType) {
                        case "list":
                            oOptions.list = {
                                selected_attributes: mBookmark.filter.selected_attributes,
                                sorting_directions: mBookmark.filter.sorting_directions,
                                sorted_attributes: mBookmark.filter.sorted_attributes
                            };
                            break;
                        case "km":
                            oOptions.km = {
                                errorlines: mBookmark.filter.errorlines,
                                censoring: mBookmark.filter.censoring,
                                selected_event: mBookmark.filter.selected_event,
                                selected_start_event_occ: mBookmark.filter.selected_start_event_occ,
                                selected_end_event: mBookmark.filter.selected_end_event,
                                selected_end_event_occ: mBookmark.filter.selected_end_event_occ
                            };
                            break;
                        case "stacked":
                            if (mBookmark.filter) {
                                oOptions.stacked = {
                                    sorting: mBookmark.filter.sorting
                                };
                            }
                            break;
                        default:
                            break;
                    }
                    oOptions.axisSelection = mBookmark.axisSelection;
                }
                return oOptions;
            },

            changeCurrentChart: function (sType) {
                this.oCurrentChart = sType;

                // var oOldChart = this.getChart();

                // Object.keys(this.chartButtonsMap).forEach(function (sKey) {
                //     this.chartButtonsMap[sKey].setPressed(sKey === sType);
                // }, this);

                // var oNewChart = this.oChartCache[sType];
                // if (!oNewChart) {
                //     var newChartConfig = this._chartConfigs.getChartConfigFor(sType);
                //     var newChartClassName = newChartConfig.getClassName();
                //     jQuery.sap.require(newChartClassName);
                //     var ChartClass = jQuery.sap.getObject(newChartClassName);
                //     oNewChart = new ChartClass({
                //         mriToolbar: this.getView().byId("tlbAnalytics")
                //     });
                //     oNewChart.setBusyIndicatorDelay(0);
                //     this.oChartCache[sType] = oNewChart;
                // }

                // if (oOldChart) {
                //     oOldChart.onBeforeHide();
                // }
                // oNewChart.onBeforeShow();

                // this.layMain.getCenter().removeAllContent();
                // this.layMain.getCenter().addContent(oNewChart);
                // if (oOldChart) {
                //     oOldChart.onAfterHide();
                // }
                // oNewChart.onAfterShow();
            },

            /**
             * Call the preprocessing function of the current chart.
             * @param   {sap.hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.Filter} oIFR    IFR object
             * @param   {object}                                                       mParams Parameter object
             * @returns {object[]}                                                     Classic FilterObject
             */
            processFilterUpdate: function (oIFR, mParams) {
                if (this._config.isChartVisible(this.getCurrentChartType())) {
                    var aFilters = this.getChart().preprocessFilterQuery(oIFR, mParams);
                    return aFilters;
                }
            },

            getChart: function () {
                return this.layMain.getCenter().getContent()[0];
            },

            /**
             * Returns the array of the complete current axis selections.
             * @returns {object[]} List of axis selections.
             */
            getAxisSelection: function () {
                var itemsModel = this.getView().getModel(Utils.models.SELECTIONS);
                var selections = [];

                // empty the previous axis selection
                for (var index in itemsModel.getData().attr) {
                    var axisData = {
                        attributeId: itemsModel.getProperty("/attr/" + index + "/selection"),
                        binsize: itemsModel.getProperty("/attr/" + index + "/binsize")
                    };
                    if (index <= 3) {
                        axisData.categoryId = "x" + (parseInt(index, 10) + 1);
                    } else {
                        axisData.measureId = "y1";
                    }
                    selections[index] = axisData;
                }

                return selections;
            },

            clearAxisSelection: function () {
                var itemsModel = this.getView().getModel(Utils.models.SELECTIONS);

                // clear the previous axis selection
                for (var index in itemsModel.getData().attr) {
                    itemsModel.setProperty("/attr/" + index + "/selection", sap.hc.mri.pa.ui.lib.Selection.Invalid);
                    itemsModel.setProperty("/attr/" + index + "/binsize", sap.hc.mri.pa.ui.lib.Selection.Invalid);
                }
            },

            /**
             * Set the selection from an array of axis selections.
             * Selections can be a simple string path or an object containing the path and bin size.
             * @param {any[]} aSelections List of axis selections
             */
            setAxisSelectionFromSelectionList: function (aSelections) {
                // clear the previous axis selection
                this.clearAxisSelection();

                var oModel = this.getView().getModel(Utils.models.SELECTIONS);
                aSelections.forEach(function (vSelection, iIndex) {
                    if (typeof vSelection === "string") {
                        oModel.setProperty("/attr/" + iIndex + "/selection", vSelection);
                    } else {
                        oModel.setProperty("/attr/" + iIndex + "/selection", vSelection.attributeId);
                        oModel.setProperty("/attr/" + iIndex + "/binsize", vSelection.binsize);
                    }
                }, this);
            },

            setSelectedDataToFilter: function (sChannelId, sEventId, aSelectedData) {
                var that = this;

                var collectedConstraints = {};
                jQuery.each(aSelectedData, function (nIndex, oData) {
                    collectedConstraints[oData.id] = collectedConstraints[oData.id] || {
                        filterValues: []
                    };

                    if (that._config.getAttributeByPath(oData.id).getType() === "num" && typeof oData.value === "string") {
                        var matchIntervals = oData.value.match(/[-]?[0-9]+([,.][0-9]+)?/g) || [];
                        // for matching intervals
                        if (matchIntervals.length === 2) {
                            // remove whitespaces and add the intervall notation
                            var sValidIntervall = "[" + oData.value.replace(/ /g, "") + "[";
                            collectedConstraints[oData.id].filterValues.push(sValidIntervall);
                        }
                        if (matchIntervals.length === 1) {
                            collectedConstraints[oData.id].filterValues.push(oData.value);
                        }
                    } else {
                        var filterValue;
                        if (oData.value === "NoValue" || oData.value === null) {
                            filterValue = "NoValue";
                        } else {
                            filterValue = oData.value;
                        }
                        collectedConstraints[oData.id].filterValues.push(filterValue);
                    }
                });

                for (var sAttrPath in collectedConstraints) {
                    var sInteractionInstPath = this._config.getInteractionInstancePath(sAttrPath);
                    var sAttrKey = this._config.getAttributeKeyFromPath(sAttrPath);

                    // TODO: Instead of overwriting the old filters we might combine them with the new ones,
                    //       i.e. calculate the intersection between the two.
                    //       However, this is only relevant for number-attributes,
                    //       and as the new filters should always be more restrictive than the old ones,
                    //       the behaviour is correct.
                    this._patientFilter.setFilterValues(sInteractionInstPath, sAttrKey,
                        collectedConstraints[sAttrPath].filterValues, Utils.valuesMergeMode.OVERRIDE);
                }
            },

            onDrillDownBtnPress: function () {
                var oChartInstance = this.layMain.getCenter().getContent()[0];
                this.setSelectedDataToFilter(oChartInstance.getSelectedData());
            },

            /**
             * Handler for the Add to Collections Button.
             * Opens a Dialog for the user to choose between existing collections or creating a new collection.
             * The necessary FilterObject is created and sent to the endpoint when the Dialog is confirmed.
             */
            onAddToCollectionsBtnPress: function () {
                if (this._config.isChartVisible(this.getCurrentChartType()) && this._collectionComponentAvailable) {
                    var that = this;
                    this._oCollectionsComponent.openDialog(function (bNew, sCollection, bGuarded) {
                        var oFilterObject = that.generateBackendIFR({
                            collection: true,
                            isForBackend: true
                        });
                        if (bNew) {
                            oFilterObject.collection = {
                                title: sCollection,
                                description: ""
                            };
                        } else {
                            oFilterObject.collection = {
                                id: sCollection
                            };
                        }
                        if (bGuarded) {
                            oFilterObject.collection.guarded = true;
                        }
                        return Utils.ajax({
                            url: "/sap/hc/mri/services/collection.xsjs?action=patients_collection_service",
                            type: "POST",
                            contentType: "application/json;charset=utf-8",
                            data: JSON.stringify(oFilterObject)
                        });
                    }, true);
                }
            },

            onDownloadBtnPress: function (oEvent) {
                this._downloadMenu = this.getView().byId("downloadMenu");
                this._downloadMenu.open(true, oEvent.getSource(), sap.ui.core.Popup.Dock.BeginTop, sap.ui.core.Popup.Dock.BeginBottom, oEvent.getSource());
            },

            onDownloadCsvBtnPress: function () {
                if (this._config.isChartVisible(this.getCurrentChartType()) && typeof this.getChart().saveAsCsv === "function") {
                    var that = this;
                    MessageBox.confirm(Utils.getText("MRI_PA_PATIENT_LIST_DOWNLOAD_AS_CSV_FULL"), {
                        title: Utils.getText("MRI_PA_PATIENT_LIST_DOWNLOAD_AS_CSV"),
                        actions: [
                            Utils.getText("MRI_PA_BUTTON_DOWNLOAD"),
                            MessageBox.Action.CANCEL
                        ],
                        styleClass: Utils.getContentDensityClass(),
                        onClose: function (sAction) {
                            if (sAction === Utils.getText("MRI_PA_BUTTON_DOWNLOAD")) {
                                that.getChart().saveAsCsv("All");
                            }
                        }
                    });
                }
            },

            onDownloadPdfBtnPress: function () {
                var newPdfModel = new JSONModel({
                    fileName: "",
                    includeFiltercard: true,
                    includeDetails: true,
                    paperSize: "a4",
                    orientation: "l",
                    availableSize: [{ sizeId: "a4", sizeName: "A4" }, { sizeId: "a3", sizeName: "A3" }]
                });
                this.getView().setModel(newPdfModel, "pdfModel");

                if (!this._pdfExportDialog) {
                    this._pdfExportDialog = sap.ui.xmlfragment("pdfExportDialog", "sap.hc.mri.pa.ui.views.PdfExportDialog", this);
                    this.getView().addDependent(this._pdfExportDialog);
                }

                this._pdfExportDialog.open();
            },

            onPdfExportConfirmed: function () {
                this._pdfExportDialog.close();
                this._generatePdf(this.getView().getModel("pdfModel").getData());
            },

            onPdfExportCancelled: function () {
                this._pdfExportDialog.close();
            },

            _generatePdf: function (pdfParam) {
                var pdfExporter = new PdfExport();
                pdfExporter.generatePDF(this, pdfParam);
            },


            /**
             * Handler for the filterChange event.
             * Is triggered whenever any filter condition has changed.
             * Refreshes the axes data and the chart if available.
             * @param {Object} oEvent BoolContainer change event
             */
            onFilterChange: function (oEvent) {
                var oIFR = oEvent.getSource().getIFR();
                var bookmark = ifr2bookmark(oIFR);
                var andFilterCards = bookmark.cards.content.filter(function (obj) { return obj.op === 'AND'; });
                var variantFilterConfigPath = this._config.getInterHavingAttrAnnotation('genomics_variant_location');
                var variantFilterCards = [];
                andFilterCards.forEach(function (boolContainer) {
                    boolContainer.content.forEach(function (filterCard) {
                        if (variantFilterConfigPath.indexOf(filterCard.configPath) > -1) {
                            variantFilterCards.push(filterCard);
                        }
                    });
                });
                VueAdaptor.setVariantFiltercards(variantFilterCards);
                VueAdaptor.setIFR({
                    ifr: oIFR,
                    backendIFR: ifr2backendifr(oIFR)
                });
            },

            /**
           * Handler for the filterChange event.
           * Is triggered whenever any filter condition has changed.
           * Refreshes the axes data and the chart if available.
           * @param {Object} oEvent BoolContainer change event
           */
            onNewCardAdded: function (oEvent) {
                VueAdaptor.fireNewCardAdded(oEvent.getParameters().getParameter("cardName"));
            },

            onAxisSelect: function (parameters) {
                var sInteractionInstance = parameters.interactionInstance;
                var sAttributeKey = parameters.attributeKey;
                var sSelection;
                if (sInteractionInstance && sAttributeKey) {
                    sSelection = this._patientFilter.setFilterValues(sInteractionInstance, sAttributeKey, [], Utils.valuesMergeMode.APPEND);

                    const oIFR = this._patientFilter.getIFR();
                    VueAdaptor.setIFR({
                        ifr: this._patientFilter.getIFR(),
                        backendIFR: ifr2backendifr(oIFR),
                        topics: {
                            "VUE_SET_SELECTED_AXIS": {
                                attributeId: sSelection,
                                filterCardId: sSelection.replace(".attributes." + sAttributeKey, ''),
                                key: sAttributeKey,
                                dimensionIndex: parameters.dimensionIndex
                            }
                        }
                    });

                } else {
                    sSelection = sap.hc.mri.pa.ui.lib.Selection.Invalid;

                    const oIFR = this._patientFilter.getIFR();
                    VueAdaptor.setIFR({
                        ifr: this._patientFilter.getIFR(),
                        backendIFR: ifr2backendifr(oIFR),
                        topics: {
                            "VUE_CLEAR_SELECTED_AXIS": { dimensionIndex: parameters.dimensionIndex }
                        }
                    });
                }
            },

            /**
             * Event handler called when an attribute shall be added to an existing filter card.
             * @param {string} sChannelId                     Event bus channel
             * @param {string} sEventId                       Event type
             * @param {object} oEventData                     Event payload (interaction instance, attribute key)
             * @param {string} oEventData.interactionInstance The id of the interaction. It can be either an instance or a generic config path
             * @param {string} oEventData.attributeKey        The key of the attribute
             * @param {array}  oEventData.values              An array of values to be added to the attribute constraint
             * @param {enum}   oEventData.mergeMode           The merge mode, specifying how the existing values will be combined with the new ones
             */
            onAddAttribute: function (sChannelId, sEventId, oEventData) {
                var aValues = oEventData.values || [];
                var sMergeMode = oEventData.mergeMode || Utils.valuesMergeMode.APPEND;
                this._patientFilter.setFilterValues(oEventData.interactionInstance, oEventData.attributeKey, aValues, sMergeMode);

                this.updateChart();
            },

            // Generates transformed request
            generateAnnotatedFilterObject: function (mParams) {
                // Generate IFR from patient filter...
                var oIFR = this._patientFilter.getIFR();

                // ...augment it with proper axis assignments...
                var aFilters = this.processFilterUpdate(oIFR, mParams);

                return aFilters;
            },

            /**
             * Generates Backend IFR request
             * @param {object} mParams      Parameter object
             * @returns {object} oIFR       Backend IFR request
             */
            generateBackendIFR: function (mParams) {
                // Generate IFR from patient filter...
                var oIFR = this._patientFilter.getIFR();

                // ...augment it with proper axis assignments...
                this.processFilterUpdate(oIFR, mParams);

                // Converts gene location to literal position values
                oIFR = ifr2backendifr(oIFR);
                oIFR.configData = {
                    configId: oIFR.configMetadata.id,
                    configVersion: oIFR.configMetadata.version
                };
                delete oIFR.configMetadata;

                // Bind oFilterObject to dialog box
                if (this._collectionComponentAvailable) {
                    this._oCollectionsComponent.setModel(new JSONModel(oIFR), "IFRModel");
                }

                VueAdaptor.setIFR({ ifr: oIFR });

                return oIFR;
            },

            /**
             * Returns the type of the chart currently selected.
             * @returns {string} type of the current chart
             */
            getCurrentChartType: function () {
                return this.oCurrentChart;
            },

            /**
             * Reloads the application with new configuration.
             * @param {object} oNewConfig new configuration object.
             */
            reloadWithNewConfig: function (oNewConfig) {

                this._config = oNewConfig;
                this._updateTitle();
                // clear the cache of the charts such that the charts are reinitialised
                this.oChartCache = {};
                this._chartConfigs = new ChartConfigService(this._config);

                // // reset visibility of charts
                // var oCore = sap.ui.getCore();
                // this._chartConfigs.getAllChartConfigs().forEach(function (chartConfig) {
                //     var chartId = chartConfig.getChartId();
                //     var elem = oCore.byId(chartId);
                //     var separator = oCore.byId(chartId + "-separator");
                //     elem.setVisible(this._config.isChartVisible(chartId));
                //     separator.setVisible(this._config.isChartVisible(chartId));
                // }, this);

                // ask the filters to reinit
                this._patientFilter.reset();

                // get default filters
                this._loadDefaultFilters();

                // // set current chart
                // this.oCurrentChart = this._config.getInitialChart();
                // // switch to current chart
                // this._switchToChart(this.oCurrentChart);

                // // reload bookmarks (in particular, reassess the bookmark compatibility to the new config)
                // this._bookmarksPanel.loadRemoteBookmarks();

                // this._updateToolbarButtonVisibility();

                // // rebind binning button
                // for (var i = 0; i < this.binningButtons.length; i++) {
                //     this.bindBinningButton(this.binningButtons[i], i);
                // }
            },

            /**
             * Loads a bookmark from url
             * Used for bookmarks which are saved as tiles
             * @param {string} bookmarkId Bookmark id
             */
            _loadBookmarkWithId: function (bookmarkId) {
                var restoreFunc = this.restoreBookmark.bind(this);
                this._bookmarksPanel.loadRemoteSingleBookmark(bookmarkId, restoreFunc);
            },

            /**
             * Creates and opens a dialog with an error message.
             * @param {string}  [sTitle] Dialog title
             * @param {string}  [sError] Error message
             * @param {boolean} [bExit]  If the application should be closed (return to fiori launchpad)
             */
            openBookmarkErrorDialog: function (sTitle, sError, bExit) {
                if (!sTitle) {
                    sTitle = Utils.getText("MRI_PA_BMK_CONFIG_READ_ERROR");
                }

                if (!sError) {
                    sError = Utils.getText("MRI_PA_BMK_CONFIG_READ_ERROR");
                }

                MessageBox.show(sError, {
                    icon: MessageBox.Icon.ERROR,
                    styleClass: Utils.getContentDensityClass(),
                    title: sTitle,
                    onClose: function () {
                        if (bExit) {
                            sap.ushell.Container.getService("CrossApplicationNavigation").toExternal({
                                target: {
                                    shellHash: ""
                                }
                            });
                        }
                    }
                });
            },

            _sortChart: function (oEvent) {
                var sortText = oEvent.getParameters().item.getText();
                this.sortMenu.getParent().setText(sortText);
                this.sortMenu.getParent().setTooltip(sortText);
                var chartType = this.getCurrentChartType();
                var chartWrapper = this.oChartCache[chartType];

                var sortKey = "MRI_PA_CHART_SORT_DEFAULT";

                if (sortText === Utils.getText("MRI_PA_CHART_SORT_ASCENDING")) {
                    sortKey = "MRI_PA_CHART_SORT_ASCENDING";
                } else if (sortText === Utils.getText("MRI_PA_CHART_SORT_DESCENDING")) {
                    sortKey = "MRI_PA_CHART_SORT_DESCENDING";
                } else if (sortText === Utils.getText("MRI_PA_CHART_SORT_REVERSE")) {
                    sortKey = "MRI_PA_CHART_SORT_REVERSE";
                }

                if (chartType === "stacked" && chartWrapper.sortChart) {
                    chartWrapper.sortChart(sortKey);
                }
            }
        });
    });