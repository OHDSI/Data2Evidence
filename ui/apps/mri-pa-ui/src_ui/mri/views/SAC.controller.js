sap.ui.define(
  [
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "sap/hc/mri/pa/ui/lib/AttributeMenuButton",
    "sap/hc/mri/pa/ui/lib/BinningButton",
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
    "sap/ui/commons/layout/PositionContainer",
    "sap/ui/commons/Label",
    "sap/ui/commons/ToggleButton",
    "sap/ui/layout/HorizontalLayout",
    "sap/ui/layout/VerticalLayout",
    "sap/ui/model/json/JSONModel",
    "sap/ui/unified/Menu",
    "sap/ui/unified/MenuItem"
  ],
  function(
    jQuery,
    Utils,
    AttributeMenuButton,
    BinningButton,
    BookmarkUtils,
    Filter,
    LazyMenu,
    MriFrontendConfig,
    PdfExport,
    BMv2Parser,
    AnnotateBM,
    ChartConfigService,
    ChartableCardsVisitor,
    ControlGenerator,
    ifr2backendifr,
    ifr2bookmark,
    KeyCounter,
    UrlFilterParser,
    FlexBox,
    Label,
    MessageBox,
    Popover,
    PositionContainer,
    CommonsLabel,
    ToggleButton,
    HorizontalLayout,
    VerticalLayout,
    JSONModel,
    Menu,
    MenuItem
  ) {
    "use strict";

    /**
     * Controller class for linking the {@linkplain sap.hc.mri.pa.ui.lib.BoolFilterContainer|filter control}
     * with the charts container (whose skeleton is contained in `PatientAnalytics.view.xml` and
     * which is programmatically built by this controller
     * in {@link sap.hc.mri.pa.ui.views.PatientAnalytics.prototype.onInit}).
     *
     * The controller creates and binds four models that other controls have to use in order to
     * orchestrate the data interchange.
     *
     * ### Locations Model {@link (sap.hc.mri.pa.ui.Utils.models.LOCATIONS)}
     *
     * The charts container is responsible for:
     *
     *  - Allowing the user to change charts (bar, h bar, bubble, etc.)
     *  - Displaying appropriate controls for attribute selection
     *  - Updating the filter object (representing the current state of the
     *    filter control) with the correct axis assignments.
     *
     * #### Adjusting the locations of the attribute selection controls: the locations model
     * When the user selects another chart type to show, the attribute selection
     * controls (currently custom {@link sap.hc.mri.pa.ui.AttributeMenuButton}s) have to be updated:
     *
     *  - Showing/enabling controls that are needed because of additional measures/categories of the new chart.
     *  - Relocating controls to make sure they are aligned to better conceive them visually.
     *    (this is also necessary when the browser windows has been resized. That is why each
     *    chart control registers a resize event handler.)
     *
     * Upon creation of this controller, seven attribute selection controls are created (which can be freely
     * (re)used by the various charts). The attribute selection controls locations, enabled status and visibility states
     * are purely managed via data binding to a named model called sap.hc.mri.pa.ui.Utils.models.LOCATIONS.
     * This model is also created in <code>onInit</code>. The model's data will look as follows:
     *
     * ```json
     * {
     *     attr: [
     *         { left: "0px", top: "0px", visible: false, enabled: true },   // 0th control's location
     *         { left: "0px", top: "0px", visible: false, enabled: true },
     *         ... ... ...
     *         { left: "0px", top: "0px", visible: false, enabled: true }    // 6th control's location
     *     ]
     * }
     * ```
     *
     * As this model is bound to the entire view, each chart has access to it and can adjust it appropriately.
     *
     *
     * @class
     * @extends     sap.ui.core.mvc.Controller
     * @constructor
     * @name        sap.hc.mri.pa.ui.views.PatientAnalytics
     */
    sap.ui.controller("sap.hc.mri.pa.ui.views.SAC", {
      /**
       * Called when a controller is instantiated and its View controls (if available) are already created.
       * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time
       * initialization.
       * @protected
       * @override
       */
      onInit: function() {
        // apply content density mode to root view
        this.getView().addStyleClass(Utils.getContentDensityClass());

        this._patientFilter = this.getView().byId("filterContainer");
        this._updateFilterDescriptionColumnWidthOnSplitterResize(
          this._patientFilter
        );

        // Get config object and default filter content from server
        this._config = MriFrontendConfig.getFrontendConfig();
        if (!this._config) {
          throw new Error(
            Utils.getText("MRI_PA_CONFIG_ERROR_NOT_FOUND_ACTIVE") +
              " " +
              Utils.getText("MRI_PA_CONFIG_ERROR_NOT_FOUND_ACTIVE_REFER")
          );
        }

        this._updateTitle();

        // Left side panel (Bmk & navigation)
        this._bookmarksPanel = this.getView().byId("bookmarks");
        this._bookmarksPanel.reinit();
        this._bookmarksPage = this.getView().byId("bookmarksPage");
        this._navContainer = this.getView().byId("navFilterBmkContainer");

        this.layMain = this.getView().byId("layMain");
        this.layMain.getCenter().addStyleClass("sapMriPaChartCenter");

        sap.ui
          .getCore()
          .getEventBus()
          .subscribe(
            Utils.events.CHANNEL,
            Utils.events.EVENT_ADD_ATTRIBUTE,
            this.onAddAttribute,
            this
          );

        /*
                 * Set up default data for models
                 */
        var oLocations = {
          // TODO: rename variable to oLocationsData
          attr: []
        };
        var oSelectionsData = {
          // TODO: rename variable to oSelectionData
          attr: []
        };

        /*
                 * Init model that carries info for status bar
                 * (hidden until backend returns required data)
                 */
        var oResultSetData = {
          total: {
            size: 0,
            visible: true
          },
          drilldown: {
            enabled: false,
            visible: true
          },
          download: {
            enabled: false,
            visible: true
          },
          pdfDownload: {
            enabled: false,
            visible: true
          },
          collection: {
            enabled: true,
            visible: true
          },
          noDataReason: ""
        };

        /*
                 * Set the models
                 */
        var i;
        for (i = 0; i < sap.hc.mri.pa.ui.lib.Dimensions.Count; i++) {
          oLocations.attr.push({
            left: "0px",
            visible: false,
            enabled: true
          });

          oSelectionsData.attr.push({
            selection: sap.hc.mri.pa.ui.lib.Selection.Invalid,
            isCategory: true,
            isMeasure: true,
            scope: "", // "" means any
            binsize: sap.hc.mri.pa.ui.lib.Selection.NoBinning
          });
        }

        this.sortMenu = new Menu({ itemSelect: [this._sortChart, this] });
        this.sortMenu.addItem(
          new MenuItem({ text: "{i18n>MRI_PA_CHART_SORT_DEFAULT}" })
        );
        this.sortMenu.addItem(
          new MenuItem({ text: "{i18n>MRI_PA_CHART_SORT_REVERSE}" })
        );
        this.sortMenu.addItem(
          new MenuItem({ text: "{i18n>MRI_PA_CHART_SORT_ASCENDING}" })
        );
        this.sortMenu.addItem(
          new MenuItem({ text: "{i18n>MRI_PA_CHART_SORT_DESCENDING}" })
        );

        this.sortLabel = new CommonsLabel({
          text: "{i18n>MRI_PA_CHART_SORT_LABEL}",
          visible:
            "{" +
            Utils.models.LOCATIONS +
            ">/attr/" +
            sap.hc.mri.pa.ui.lib.Dimensions.Sort +
            "/visible}"
        });

        // Create selection controls
        this.binningButtons = [];
        var oLayoutAttributesContainer = this.getView().byId(
          "layAttributesContainer"
        );

        for (i = 0; i < sap.hc.mri.pa.ui.lib.Dimensions.Count; i++) {
          var axisBtn = new AttributeMenuButton({
            chartableFilterCards:
              "{" + Utils.models.SELECTIONS + ">/chartableFilterCards}",
            enabled: "{" + Utils.models.LOCATIONS + ">/attr/" + i + "/enabled}",
            selection:
              "{" + Utils.models.SELECTIONS + ">/attr/" + i + "/selection}",
            visible: "{" + Utils.models.LOCATIONS + ">/attr/" + i + "/visible}",
            width: "120px",
            menu:
              i === sap.hc.mri.pa.ui.lib.Dimensions.Sort
                ? this.sortMenu
                : new LazyMenu({
                    category: "{" + Utils.models.SELECTIONS + ">isCategory}",
                    chartableFilterCards:
                      "{" + Utils.models.SELECTIONS + ">/chartableFilterCards}",
                    measure: "{" + Utils.models.SELECTIONS + ">isMeasure}",
                    selections: "{" + Utils.models.SELECTIONS + ">/attr}",
                    select: [this.onAxisSelect, this]
                  }).bindElement({
                    model: Utils.models.SELECTIONS,
                    path: "/attr/" + i
                  })
          });

          var iconLabel = new CommonsLabel({
            text: "{" + Utils.models.LOCATIONS + ">/attr/" + i + "/text}",
            icon: "{" + Utils.models.LOCATIONS + ">/attr/" + i + "/icon}",
            visible: "{" + Utils.models.LOCATIONS + ">/attr/" + i + "/visible}",
            labelFor: axisBtn
          });

          var oBinningButton = new BinningButton({
            attribute:
              "{" + Utils.models.SELECTIONS + ">/attr/" + i + "/selection}",
            binsize:
              "{" + Utils.models.SELECTIONS + ">/attr/" + i + "/binsize}",
            tooltip: "{i18n>MRI_PA_BINNING_BUTTON}",
            binningChange: [this.updateChart, this]
          });

          this.bindBinningButton(oBinningButton, i);

          iconLabel.addStyleClass("sapMriPaAxisIcon");

          oLayoutAttributesContainer.addPosition(
            new PositionContainer({
              left: "{" + Utils.models.LOCATIONS + ">/attr/" + i + "/left}",
              top: "{" + Utils.models.LOCATIONS + ">/attr/" + i + "/top}",
              bottom: "{" + Utils.models.LOCATIONS + ">/attr/" + i + "/bottom}",
              control: new HorizontalLayout({
                content: [iconLabel, axisBtn, oBinningButton]
              })
            })
          );
          this.binningButtons.push(oBinningButton);
        }

        //Special Treatment for Sort Button as per Design:
        if (oLayoutAttributesContainer) {
          oLayoutAttributesContainer.addPosition(
            new PositionContainer({
              left: "40px",
              top: "10px",
              bottom: "",
              control: new HorizontalLayout({
                content: [this.sortLabel]
              })
            })
          );
        }

        var parentAttributeButton = this.sortMenu.getParent();
        if (parentAttributeButton) {
          var parentLayout = parentAttributeButton.getParent();
          var parentIcon = parentLayout.getContent()[0];

          parentIcon.addStyleClass("sapMriPaAxisIconSort");
          parentAttributeButton._updateTexts = function() {
            var sortData = this.getModel(Utils.models.SELECTIONS).getData()
              .attr[sap.hc.mri.pa.ui.lib.Dimensions.Sort].sortData;
            if (
              sortData === "MRI_PA_CHART_SORT_ASCENDING" ||
              sortData === "MRI_PA_CHART_SORT_DESCENDING" ||
              sortData === "MRI_PA_CHART_SORT_REVERSE"
            ) {
              this.setText(Utils.getText(sortData));
            } else {
              this.setText(Utils.getText("MRI_PA_CHART_SORT_DEFAULT"));
            }
          };
        }

        var resultModel = new JSONModel(oResultSetData);
        this.getView().setModel(resultModel, Utils.models.RESULTS);
        this.getView().setModel(
          new JSONModel(oLocations),
          Utils.models.LOCATIONS
        );
        this.getView().setModel(
          new JSONModel(oSelectionsData),
          Utils.models.SELECTIONS
        );
        this.getView().setModel(
          new JSONModel({
            beginVisible: true
          }),
          Utils.models.STATUS
        );
        this.getView().setModel(
          new JSONModel({
            collapsed: false,
            buttonIcon: "sap-icon://close-command-field",
            expandedSize: "311px", // store size of expanded filter bar
            expandedMinSize: 311, // min size of the expanded filter bar
            currentSize: "311px", // current size of filter bar
            currentMinSize: 311 // current min size of filter bar
          }),
          Utils.models.FILTERBAR_DATA
        );

        /*
                 * Set up chart cache to where the lazily loaded instances are stored.
                 * BTW: there is only one dataset (this.oDataset) that contains the
                 * current data and is bound to the respective current chart.
                 */
        this.oChartCache = {};
        this._chartConfigs = new ChartConfigService(this._config);

        this.oCurrentChart = "list";

        this.chartButtonsMap = {};
        // this._toolbarAnalytics = this._buildToolbar(this.byId("tlbAnalytics"), this.chartButtonsMap);

        try {
          this._oCollectionsComponent = sap.ui.component({
            name: "sap.hc.mri.pa.ui.collection"
          });
          this._collectionComponentAvailable = true;
        } catch (err) {
          this._collectionComponentAvailable = false;
          console.error("Collection Component Unvailable");
        }

        var componentAvailableModel = new JSONModel({
          collectionComponentAvailable: this._collectionComponentAvailable
        });
        this.getView().setModel(
          componentAvailableModel,
          "componentAvailableModel"
        );

        if (this._hasUrlParameters()) {
          this._handleUrlParameters();
        } else {
          this._loadDefaultChartsAndFilters();
        }

        var that = this;
        this._labelTotal = new Label({
          text: {
            path: "results>/total/allPatientCount",
            formatter: function(oVal) {
              if (oVal !== 0 && !oVal) {
                oVal = "-";
              }
              return (
                Utils.getText("MRI_PA_PATIENT_COUNT_TOOLTIP_TOTAL") +
                ": " +
                oVal
              );
            }
          }
        });
        this._labelSelected = new Label({
          text: {
            path: "results>/total/size",
            formatter: function(oVal) {
              if (oVal !== 0 && !oVal) {
                oVal = "-";
              }
              return (
                Utils.getText("MRI_PA_PATIENT_COUNT_TOOLTIP_MATCH") +
                ": " +
                oVal
              );
            }
          }
        });
        var vLayout = new VerticalLayout({
          content: [this._labelSelected, this._labelTotal]
        });
        this._patientCountPopover = new Popover({
          placement: sap.m.PlacementType.Bottom,
          title: Utils.getText("MRI_PA_DOWNLOAD_PDF_TEXT_PATIENT_COUNT"),
          content: [vLayout]
        }).addStyleClass("patientCountPopover");
        this._patientCountPopover.setModel(resultModel, Utils.models.RESULTS);

        var patientLabel = this.getView().byId("patientCountLabel");
        if (patientLabel) {
          patientLabel.attachBrowserEvent("mouseenter", function() {
            that._patientCountPopover.openBy(this);
          });
        }

        this.loadViewList();
      },

      _handleUrlParameters: function() {
        var urlParameters = this._getUrlParameters();

        if (urlParameters.bmkId) {
          this._loadBookmarkWithId(urlParameters.bmkId[0]);
        } else {
          this._loadDefaultChartsAndFilters();

          if (urlParameters.filterV1) {
            this._applyFilterFromUrl(urlParameters.filterV1[0]);
          }
        }
      },

      _loadDefaultChartsAndFilters: function() {
        this._loadDefaultFilters();
        this._switchToChart(this.oCurrentChart);
      },

      _hasUrlParameters: function() {
        var urlsParameters = this._getUrlParameters();

        return Object.keys(urlsParameters).length > 0;
      },

      _getUrlParameters: function() {
        var componentData = this.getOwnerComponent().getComponentData();
        if (componentData && componentData.startupParameters) {
          return componentData.startupParameters;
        } else {
          return {};
        }
      },
      _collapseOrExpandFilterBar: function() {
        var isCollapsed = this.getView()
          .getModel(Utils.models.FILTERBAR_DATA)
          .getProperty("/collapsed");
        if (isCollapsed) {
          this._expandFilterBar();
        } else {
          this._collapseFilterBar();
        }
      },
      _collapseFilterBar: function() {
        var splitter = this.getView().getContent()[0];
        var layoutData = splitter.getContentAreas()[0].getLayoutData();
        layoutData.setResizable(false);

        var size = layoutData.getSize();
        this.getView()
          .getModel(Utils.models.FILTERBAR_DATA)
          .setProperty("/expandedSize", size);
        this.getView()
          .getModel(Utils.models.FILTERBAR_DATA)
          .setProperty("/currentSize", "0px");
        this.getView()
          .getModel(Utils.models.FILTERBAR_DATA)
          .setProperty("/currentMinSize", 0);

        this.getView()
          .getModel(Utils.models.FILTERBAR_DATA)
          .setProperty("/collapsed", true);
        this.getView()
          .getModel(Utils.models.FILTERBAR_DATA)
          .setProperty("/buttonIcon", "sap-icon://open-command-field");
      },

      _expandFilterBar: function() {
        var splitter = this.getView().getContent()[0];
        var layoutData = splitter.getContentAreas()[0].getLayoutData();
        layoutData.setResizable(true);

        var size = this.getView()
          .getModel(Utils.models.FILTERBAR_DATA)
          .getProperty("/expandedSize");
        var minSize = this.getView()
          .getModel(Utils.models.FILTERBAR_DATA)
          .getProperty("/expandedMinSize");
        this.getView()
          .getModel(Utils.models.FILTERBAR_DATA)
          .setProperty("/currentSize", size);
        this.getView()
          .getModel(Utils.models.FILTERBAR_DATA)
          .setProperty("/currentMinSize", minSize);

        this.getView()
          .getModel(Utils.models.FILTERBAR_DATA)
          .setProperty("/collapsed", false);
        this.getView()
          .getModel(Utils.models.FILTERBAR_DATA)
          .setProperty("/buttonIcon", "sap-icon://close-command-field");
      },

      _buildToolbar: function(toolbarAnalytics, chartButtonsMap) {
        this._updateToolbarButtonVisibility();

        this._chartConfigs
          .getAllChartConfigs()
          .forEach(function(chartConfig, iIndex) {
            var btn = new ToggleButton(chartConfig.getChartId(), {
              icon: chartConfig.getIcon(),
              tooltip: chartConfig.getTooltip(),
              lite: true,
              styled: false,
              visible: chartConfig.isVisible(),
              press: [
                function() {
                  this._switchToChart(chartConfig.getChartId());
                },
                this
              ],
              pressed: chartConfig.getChartId() === this.oCurrentChart
            });
            toolbarAnalytics.insertContent(btn, 3 + iIndex * 2);
            toolbarAnalytics.insertContent(
              new CommonsLabel({
                id: chartConfig.getChartId() + "-separator",
                visible: chartConfig.isVisible()
              }).addStyleClass("sapMriPaFakeToolbarSeparator"),
              4 + iIndex * 2
            );

            // keep a map of the buttons to be able to set the selected one programmatically
            chartButtonsMap[chartConfig.getChartId()] = btn;
          }, this);

        var registerHotkeys = function() {
          jQuery(window).on(
            "keydown",
            function(event) {
              if (event.ctrlKey === true) {
                // TODO: use chart-type-service
                this._chartConfigs
                  .getAllChartConfigs()
                  .forEach(function(chartConfig) {
                    if (chartConfig.getKeyCode() === event.keyCode) {
                      chartButtonsMap[chartConfig.getChartId()].firePress();
                      return false; // break
                    }
                  });
              }
            }.bind(this)
          );
        };
        registerHotkeys.bind(this)();

        return toolbarAnalytics;
      },

      _updateFilterDescriptionColumnWidthOnSplitterResize: function(oFilter) {
        var oSplitter = this.byId("splitterLayout");
        oSplitter.attachResize(function(oControlEvent) {
          var iMaxWidth = Math.floor(
            oControlEvent.getParameter("newSizes")[0] * 0.4
          );
          oFilter.setDescriptionColumnsMaxWidth(iMaxWidth);
        });
      },

      _updateToolbarButtonVisibility: function() {
        var bShowDownloadButton = false;
        var bShowCollectionButton = false;

        var aChartConfigs = this._chartConfigs.getAllChartConfigs();
        aChartConfigs.forEach(function(oChartConfig) {
          if (oChartConfig.isVisible()) {
            if (oChartConfig.isDownloadEnabled()) {
              bShowDownloadButton = true;
            }
            if (oChartConfig.isCollectionEnabled()) {
              bShowCollectionButton = true;
            }
          }
        });

        this.getView()
          .getModel(Utils.models.RESULTS)
          .setProperty("/download/visible", bShowDownloadButton);
        this.getView()
          .getModel(Utils.models.RESULTS)
          .setProperty("/collection/visible", bShowCollectionButton);
      },

      _applyFilterFromUrl: function(filterString) {
        var filterList;

        try {
          filterList = JSON.parse(filterString);
        } catch (e) {
          jQuery.sap.log.error("Error parsing filter JSON: " + e);
          return;
        }

        var filterCardCounter = KeyCounter.getKeyCountingStrategy("default", 1);
        var pathAttributeValuePairs = new UrlFilterParser(
          filterList
        ).getPathAttributeValuePairs();

        pathAttributeValuePairs.forEach(function(pathAttributeValuePair) {
          this._checkPathAndAttributeAndAddToFilter(
            pathAttributeValuePair,
            filterCardCounter
          );
        }, this);
      },

      _checkPathAndAttributeAndAddToFilter: function(
        pathAttributeValuePair,
        filterCardCounter
      ) {
        var interactionPath = pathAttributeValuePair.interactionPath;
        var attributeId = pathAttributeValuePair.attributeId;
        var filterValue = pathAttributeValuePair.value;

        var filterCardConfig = this._config.getFilterCardByPath(
          interactionPath
        );

        if (!filterCardConfig) {
          jQuery.sap.log.error(
            "Interaction path was not found in config: " + interactionPath
          );
          return;
        }

        var attributeConfig = filterCardConfig.getAttributeByRelativeKey(
          attributeId
        );
        if (!attributeConfig) {
          jQuery.sap.log.error(
            "Attribute id was not found in config: " +
              attributeId +
              " (interaction path: " +
              interactionPath +
              ")"
          );
          return;
        }

        var filterCardIndex = filterCardCounter.getNextValueFor(
          interactionPath
        );

        var internalInteractionPath = interactionPath;
        if (!filterCardConfig.isBasicData()) {
          internalInteractionPath += "." + filterCardIndex;
        }

        this._patientFilter.setFilterValues(
          internalInteractionPath,
          attributeId,
          filterValue,
          Utils.valuesMergeMode.OVERRIDE
        );
      },

      /*
             * bind the binning button to both the visibility of the corresponding axis and to the selected value
             * (show only for numerical values)
             */
      bindBinningButton: function(oBinningButton, attrIndex) {
        var that = this;
        oBinningButton.bindProperty("visible", {
          parts: [
            Utils.models.SELECTIONS + ">/attr/" + attrIndex + "/isCategory",
            Utils.models.LOCATIONS + ">/attr/" + attrIndex + "/visible",
            Utils.models.SELECTIONS + ">/attr/" + attrIndex + "/selection"
          ],
          formatter: function(isCategory, isAttrVisible, currentSelection) {
            if (isCategory && isAttrVisible) {
              if (
                currentSelection &&
                currentSelection !== sap.hc.mri.pa.ui.lib.Selection.Invalid
              ) {
                // FIXME MRI path used
                var sConfigPath = that._config.convertInternalPathToConfigPath(
                  currentSelection
                );
                return that._config
                  .getAttributeByPath(sConfigPath)
                  .isBinnable();
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
      _loadDefaultFilters: function() {
        ControlGenerator.generate(
          this._config.getInitialIFR(),
          this._patientFilter
        );
        var initialAxis = this._config.getInitialAxisSelection();
        this.setAxisSelectionFromSelectionList(initialAxis);
      },

      /**
       * Exports annotated bookmark
       * @param   {string}    sBookmarkName Name of the new bookmark
       * @returns {object}    mBookmark   Bookmark object with version, annotated filter, chartType and annotated axisSelection information
       */
      _exportBookmark: function(sBookmarkName) {
        var annotatedBmk = AnnotateBM.annotate(
          this._patientFilter.getIFR(),
          this.getAxisSelection(),
          this._config
        );
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
      _importBookmark: function(mBookmark) {
        try {
          if (
            mBookmark.afp === this._config.isMatchAnyFilterEnabled() &&
            mBookmark.advancedTimeFiltering ===
              this._config.isAdvancedTimeFilteringEnabled()
          ) {
            // if the bookmark is compatible with the current configuration
            if (BookmarkUtils.checkBookmarkConfigCompatible(mBookmark)) {
              var deannotatedBmk = AnnotateBM.deannotate(
                BMv2Parser.convertBM2IFR(mBookmark.filter),
                mBookmark.axisSelection,
                this._config
              );
              deannotatedBmk.name = mBookmark.name;
              deannotatedBmk.chartType = mBookmark.chartType;
              deannotatedBmk.metadata = mBookmark.metadata;
              /* For future use: data for populating comparison view */
              // deannotatedBmk.data = mBookmark.data;

              // go back to the filters page
              this._navContainer.back();
              var oOptions = this._getChartOptions(mBookmark);

              this._patientFilter.reset();
              ControlGenerator.generate(
                deannotatedBmk.filter,
                this._patientFilter
              );

              // set the axis
              this.setAxisSelectionFromSelectionList(mBookmark.axisSelection);

              this._switchToChart(mBookmark.chartType, oOptions);

              return deannotatedBmk;
            } else {
              throw new Error(Utils.getText("MRI_PA_BMK_CONFIG_CONFLICT_TEXT"));
            }
          } else {
            return {
              error:
                "Import bookmark settings are not compatible with current PA configuration settings"
            };
          }
        } catch (oError) {
          jQuery.sap.log.error("Error restoring bookmark: " + oError.message);
          this.openBookmarkErrorDialog(
            null,
            Utils.getText("MRI_PA_BMK_CONFIG_CONFLICT_TEXT")
          );
        }
      },

      /**
       * Updates the page title to the configured title. If no title is configured the default title is used.
       * @private
       */
      _updateTitle: function() {
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
      onAddBookmarkButtonPressed: function(oEvent) {
        var oAddBookmarkButton = oEvent.getSource();
        if (!this.oSaveBookmarkPopover) {
          this.oSaveBookmarkPopover = sap.ui.xmlfragment(
            "sap.hc.mri.pa.ui.views.SaveBookmark",
            this
          );
          this.oSaveBookmarkPopover.addStyleClass(
            Utils.getContentDensityClass()
          );
          this.oSaveBookmarkPopover.setModel(
            new JSONModel({
              name: ""
            }),
            "name"
          );
          oAddBookmarkButton.addDependent(this.oSaveBookmarkPopover);
        }
        this.oSaveBookmarkPopover.getModel("name").setProperty("/name", "");
        this.oSaveBookmarkPopover.openBy(oAddBookmarkButton);
      },

      onHideFilter: function(oEvent) {
        var state = oEvent.getParameters().state;
        this.getView()
          .getModel(Utils.models.FILTERBAR_DATA)
          .setProperty("/collapsed", state);
        this._collapseOrExpandFilterBar();
        this.getView()
          .byId("btnCollapse")
          .setVisible(state);
      },
      loadViewList: function() {
        Utils.ajax({
          type: "GET",
          url: "/sap/hc/mri/api/services/calcview",
          contentType: "application/json;charset=utf-8"
        })
          .done(
            function(mResponse) {
              this.byId("viewList").setModel(new JSONModel(mResponse));
            }.bind(this)
          )
          .fail(
            function() {
              Utils.notifyUser(null, "Error getting views");
            }.bind(this)
          )
          .always(function() {}.bind(this));
      },
      onDeleteView: function(oEvent) {
        var oList = oEvent.getSource(),
          oItem = oEvent.getParameter("listItem"),
          sPath = oItem.getBindingContext().getPath();

        // after deletion put the focus back to the list
        oList.attachEventOnce("updateFinished", oList.focus, oList);

        Utils.ajax({
          type: "DELETE",
          url: "/sap/hc/mri/api/services/calcview/" + oItem.getTitle(),
          contentType: "application/json;charset=utf-8"
        })
          .done(
            function(mResponse) {
              Utils.notifyUser(null, "View deleted");
            }.bind(this)
          )
          .fail(
            function() {
              Utils.notifyUser(null, "Error deleting view");
            }.bind(this)
          )
          .always(
            function() {
              this.loadViewList();
            }.bind(this)
          );
      },
      onGenerate: function(oEvent) {
        var params = {
          isForBackend: true
        };
        var oIFR = this.generateBackendIFR(params);
        var viewName = this.getView()
          .byId("inputViewName")
          .getValue();
        var useFilter = this.getView()
          .getModel(Utils.models.FILTERBAR_DATA)
          .getProperty("/collapsed");

        if (viewName.replace(" ", "") === "") {
          this.openBookmarkErrorDialog(
            "View Generation Error",
            "View name is required."
          );
          return;
        }

        oIFR.viewInformation = {
          functionName: viewName,
          modelName: viewName,
          noFilter: useFilter
        };

        Utils.ajax({
          type: "POST",
          url: "/sap/hc/mri/api/services/calcview",
          contentType: "application/json;charset=utf-8",
          data: JSON.stringify(oIFR)
        })
          .done(
            function(mResponse) {
              Utils.notifyUser(null, "View generated");
            }.bind(this)
          )
          .fail(function() {}.bind(this))
          .always(
            function() {
              this.getView()
                .byId("inputViewName")
                .setValue("");
              this.loadViewList();
            }.bind(this)
          );
      },

      validateBookmark: function(oEvent) {
        var valu = oEvent.getParameter("newValue");
        var source = oEvent.getSource();
        if (valu.length > 40) {
          source.setValueState("Error");
        } else {
          source.setValueState("None");
        }
      },

      /**
       * Handler for the save bookmark Button press event.
       * Delegates the saving to sap.hc.mri.pa.ui.BookmarkList with name, filterdata, chartType and axisSelection.
       * @param {sap.ui.base.Event} oEvent Button press event
       */
      onSaveBookmark: function(oEvent) {
        this.oSaveBookmarkPopover.close();

        var sBookmarkName = oEvent
          .getSource()
          .getModel("name")
          .getProperty("/name");
        var mBookmarkFilterData = ifr2bookmark(this._patientFilter.getIFR());
        var mBookmark = {
          name: sBookmarkName,
          filterdata: mBookmarkFilterData,
          chartType: this.getCurrentChartType(),
          axisSelection: this.getAxisSelection()
        };

        var sortDirection = this.getView()
          .getModel(Utils.models.SELECTIONS)
          .getProperty(
            "/attr/" + sap.hc.mri.pa.ui.lib.Dimensions.Sort + "/sortData"
          );

        switch (this.getChart()._chartKey) {
          case "list":
            mBookmark.filterdata.selected_attributes = this.getChart()
              .getModel()
              .getProperty("/selected_attributes");
            mBookmark.filterdata.sorting_directions = this.getChart()
              .getModel()
              .getProperty("/sorting_directions");
            mBookmark.filterdata.sorted_attributes = this.getChart()
              .getModel()
              .getProperty("/sorted_attributes");
            break;
          case "km":
            mBookmark.filterdata.errorlines = this.getChart()
              .getModel()
              .getProperty("/errorlines");
            mBookmark.filterdata.censoring = this.getChart()
              .getModel()
              .getProperty("/censoring");
            mBookmark.filterdata.selected_event = this.getChart()
              .getModel()
              .getProperty("/selected_event");
            mBookmark.filterdata.selected_start_event_occ = this.getChart()
              .getModel()
              .getProperty("/selected_start_event_occ");
            mBookmark.filterdata.selected_end_event = this.getChart()
              .getModel()
              .getProperty("/selected_end_event");
            mBookmark.filterdata.selected_end_event_occ = this.getChart()
              .getModel()
              .getProperty("/selected_end_event_occ");
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
      onSaveBookmarkCancel: function() {
        this.oSaveBookmarkPopover.close();
      },

      onRestoreBookmarkRequested: function(oEvent) {
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
          this.openBookmarkErrorDialog(
            null,
            Utils.getText("MRI_PA_BMK_CONFIG_CONFLICT_TEXT")
          );
        }
      },

      /**
       * Restores the options to match the bookmark.
       * @param {object}                            mBookmark   Bookmark object with filter, chartType and
       *                                                        axisSelection information
       * @param {sap.hc.mri.pa.ui.PatientAnalytics} oController This controller
       */
      restoreBookmark: function(mBookmark, oController) {
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
      onGoToBookmarksPage: function() {
        this._navContainer.to(this._bookmarksPage);
        this._bookmarksPanel.loadRemoteBookmarks();
      },

      onResetFilters: function() {
        if (!this._resetFiltersDialog) {
          this._resetFiltersDialog = sap.ui.xmlfragment(
            "resetFiltersDialog",
            "sap.hc.mri.pa.ui.views.ResetFiltersDialog",
            this
          );
          this._resetFiltersDialog.addStyleClass(
            Utils.getContentDensityClass()
          );
          this.getView().addDependent(this._resetFiltersDialog);
        }
        this._resetFiltersDialog.open();
      },

      onResetFiltersOk: function() {
        this.reloadWithNewConfig(MriFrontendConfig.getFrontendConfig());
        this._resetFiltersDialog.close();
      },

      onResetFiltersCancel: function() {
        this._resetFiltersDialog.close();
      },

      onGoToFiltersPage: function() {
        this._navContainer.back();
      },

      /**
       * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
       * @override
       * @protected
       */
      onExit: function() {
        sap.ui
          .getCore()
          .getEventBus()
          .unsubscribe(
            Utils.events.CHANNEL,
            Utils.events.EVENT_ADD_ATTRIBUTE,
            this.onAddAttribute,
            this
          );
      },

      /**
       * Update the chart data if the current chart is visible.
       * Waits for 300ms before refreshing the chart data.
       */
      updateChart: function() {
        if (this.sChangedTimeout) {
          jQuery.sap.clearDelayedCall(this.sChangedTimeout);
        }
        this.sChangedTimeout = jQuery.sap.delayedCall(300, this, function() {
          if (this._config.isChartVisible(this.getCurrentChartType())) {
            this._showChart();
          } else {
            this._showNoChartErrorMessage();
          }
        });
      },

      _showChart: function() {
        var chartTypes = ["stacked", "list", "boxplot", "km"];
        var params = {
          isForBackend: true
        };
        var isChartType = chartTypes.indexOf(this.getChart()._chartKey) !== -1;
        var aFilters = !isChartType
          ? this.generateAnnotatedFilterObject(params)
          : null;
        var oIFR = this.generateBackendIFR(params);

        this.getChart().updateChart(isChartType ? oIFR : aFilters);

        if (!isChartType) {
          if (this._currentPcountRequest) {
            this._currentPcountRequest.reject(null, "abort");
          }

          // the patient count request
          this._currentPcountRequest = Utils.ajax({
            type: "POST",
            url: "/sap/hc/mri/pa/services/analytics.xsjs?action=totalpcount",
            contentType: "application/json;charset=utf-8",
            data: JSON.stringify(oIFR)
          })
            .done(
              function(mResponse) {
                var iPcount = mResponse.data[0]["patient.attributes.pcount"];
                this.getView()
                  .getModel(Utils.models.RESULTS)
                  .setProperty("/total/size", iPcount);
              }.bind(this)
            )
            .fail(
              function() {
                this.getView()
                  .getModel(Utils.models.RESULTS)
                  .setProperty("/total/size", "–");
              }.bind(this)
            )
            .always(
              function() {
                delete this._currentPcountRequest;
              }.bind(this)
            );
        }

        var patientListCount = this.getView()
          .getModel(Utils.models.RESULTS)
          .getProperty("/total/allPatientList");
        if (this.getChart()._chartKey === "list" && !patientListCount) {
          oIFR.cards.content[0].content = [];
          oIFR.cards.content[1].content = [];
          oIFR.axes = [
            {
              aggregation: "string_agg",
              axis: "y",
              configPath: "patient",
              id: "patient.attributes.pid",
              instanceID: "patient",
              isFiltercard: true,
              seq: 1
            }
          ];
          //this._allPcountRequest
          this._currentPcountRequest = Utils.ajax({
            type: "POST",
            url: "/sap/hc/mri/pa/services/analytics.xsjs?action=totalpcount",
            contentType: "application/json;charset=utf-8",
            data: JSON.stringify(oIFR)
          })
            .done(
              function(mResponse) {
                var iPcount = mResponse.data[0]["patient.attributes.pcount"];
                this.getView()
                  .getModel(Utils.models.RESULTS)
                  .setProperty("/total/allPatientList", iPcount);
                this.getView()
                  .getModel(Utils.models.RESULTS)
                  .setProperty("/total/allPatientCount", iPcount);
              }.bind(this)
            )
            .fail(
              function() {
                this.getView()
                  .getModel(Utils.models.RESULTS)
                  .setProperty("/total/allPatientList", "–");
              }.bind(this)
            )
            .always(
              function() {
                delete this._currentPcountRequest;
              }.bind(this)
            );
        }

        var patientChartCount = this.getView()
          .getModel(Utils.models.RESULTS)
          .getProperty("/total/allPatientChart");
        if (
          isChartType &&
          this.getChart()._chartKey !== "list" &&
          !patientChartCount
        ) {
          oIFR.cards.content[0].content = [];
          oIFR.cards.content[1].content = [];

          //this._allPcountRequest
          this._currentPcountRequest = Utils.ajax({
            type: "POST",
            url: "/sap/hc/mri/pa/services/analytics.xsjs?action=totalpcount",
            contentType: "application/json;charset=utf-8",
            data: JSON.stringify(oIFR)
          })
            .done(
              function(mResponse) {
                var iPcount = mResponse.data[0]["patient.attributes.pcount"];
                this.getView()
                  .getModel(Utils.models.RESULTS)
                  .setProperty("/total/allPatientChart", iPcount);
                this.getView()
                  .getModel(Utils.models.RESULTS)
                  .setProperty("/total/allPatientCount", iPcount);
              }.bind(this)
            )
            .fail(
              function() {
                this.getView()
                  .getModel(Utils.models.RESULTS)
                  .setProperty("/total/allPatientChart", "–");
              }.bind(this)
            )
            .always(
              function() {
                delete this._currentPcountRequest;
              }.bind(this)
            );
        }
      },

      _showNoChartErrorMessage: function() {
        var noChartLabel = new FlexBox({
          height: "100%",
          alignItems: sap.m.FlexAlignItems.Center,
          justifyContent: sap.m.FlexJustifyContent.Center,
          items: [
            new CommonsLabel({
              text: Utils.getText("MRI_PA_CONFIG_NO_CHART_VISIBLE"),
              icon: "sap-icon://message-information"
            })
          ]
        }).addStyleClass("sapMriChartNoDataPholder");
        this.layMain.getCenter().addContent(noChartLabel);
      },

      _switchToChart: function(sType, oOptions) {
        if (this._config.isChartVisible(sType)) {
          this.changeCurrentChart(sType);
          if (oOptions && Object.keys(oOptions).length !== 0) {
            this.getChart().setChartOptions(oOptions);
          }

          var previousTotalCount = this.getView()
            .getModel(Utils.models.RESULTS)
            .getProperty("/total/allPatientCount");
          var totalPatientCount = "-";
          if (sType === "list") {
            totalPatientCount = this.getView()
              .getModel(Utils.models.RESULTS)
              .getProperty("/total/allPatientList");
            this.getChart().bindProperty(
              "chartableFilterCards",
              Utils.models.SELECTIONS + ">/chartableFilterCards"
            );
          } else {
            totalPatientCount = this.getView()
              .getModel(Utils.models.RESULTS)
              .getProperty("/total/allPatientChart");
          }

          if (totalPatientCount !== 0 && !totalPatientCount) {
            if (previousTotalCount) {
              totalPatientCount = previousTotalCount;
            } else {
              totalPatientCount = "0";
            }
          }

          this.getView()
            .getModel(Utils.models.RESULTS)
            .setProperty("/total/allPatientCount", totalPatientCount);

          this.updateChart();
        }
      },

      _getChartOptions: function(mBookmark) {
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
                selected_start_event_occ:
                  mBookmark.filter.selected_start_event_occ,
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

      changeCurrentChart: function(sType) {
        this.oCurrentChart = sType;

        var oOldChart = this.getChart();

        Object.keys(this.chartButtonsMap).forEach(function(sKey) {
          this.chartButtonsMap[sKey].setPressed(sKey === sType);
        }, this);

        var oNewChart = this.oChartCache[sType];
        if (!oNewChart) {
          var newChartConfig = this._chartConfigs.getChartConfigFor(sType);
          var newChartClassName = newChartConfig.getClassName();
          jQuery.sap.require(newChartClassName);
          var ChartClass = jQuery.sap.getObject(newChartClassName);
          oNewChart = new ChartClass({
            mriToolbar: this.getView().byId("tlbAnalytics")
          });
          oNewChart.setBusyIndicatorDelay(0);
          this.oChartCache[sType] = oNewChart;
        }

        if (oOldChart) {
          oOldChart.onBeforeHide();
        }
        oNewChart.onBeforeShow();

        this.layMain.getCenter().removeAllContent();
        this.layMain.getCenter().addContent(oNewChart);
        if (oOldChart) {
          oOldChart.onAfterHide();
        }
        oNewChart.onAfterShow();
      },

      /**
       * Call the preprocessing function of the current chart.
       * @param   {sap.hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.Filter} oIFR    IFR object
       * @param   {object}                                                       mParams Parameter object
       * @returns {object[]}                                                     Classic FilterObject
       */
      processFilterUpdate: function(oIFR, mParams) {
        if (this._config.isChartVisible(this.getCurrentChartType())) {
          var aFilters = this.getChart().preprocessFilterQuery(oIFR, mParams);
          return aFilters;
        }
      },

      getChart: function() {
        return this.layMain.getCenter().getContent()[0];
      },

      /**
       * Returns the array of the complete current axis selections.
       * @returns {object[]} List of axis selections.
       */
      getAxisSelection: function() {
        var itemsModel = this.getView().getModel(Utils.models.SELECTIONS);
        var selections = [];

        // empty the previous axis selection
        for (var index in itemsModel.getData().attr) {
          var axisData = {
            attributeId: itemsModel.getProperty(
              "/attr/" + index + "/selection"
            ),
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

      clearAxisSelection: function() {
        var itemsModel = this.getView().getModel(Utils.models.SELECTIONS);

        // clear the previous axis selection
        for (var index in itemsModel.getData().attr) {
          itemsModel.setProperty(
            "/attr/" + index + "/selection",
            sap.hc.mri.pa.ui.lib.Selection.Invalid
          );
          itemsModel.setProperty(
            "/attr/" + index + "/binsize",
            sap.hc.mri.pa.ui.lib.Selection.Invalid
          );
        }
      },

      /**
       * Set the selection from an array of axis selections.
       * Selections can be a simple string path or an object containing the path and bin size.
       * @param {any[]} aSelections List of axis selections
       */
      setAxisSelectionFromSelectionList: function(aSelections) {
        // clear the previous axis selection
        this.clearAxisSelection();

        var oModel = this.getView().getModel(Utils.models.SELECTIONS);
        aSelections.forEach(function(vSelection, iIndex) {
          if (typeof vSelection === "string") {
            oModel.setProperty("/attr/" + iIndex + "/selection", vSelection);
          } else {
            oModel.setProperty(
              "/attr/" + iIndex + "/selection",
              vSelection.attributeId
            );
            oModel.setProperty(
              "/attr/" + iIndex + "/binsize",
              vSelection.binsize
            );
          }
        }, this);
      },

      setSelectedDataToFilter: function(aSelectedData) {
        var that = this;

        var collectedConstraints = {};
        jQuery.each(aSelectedData, function(nIndex, oData) {
          collectedConstraints[oData.id] = collectedConstraints[oData.id] || {
            filterValues: []
          };

          if (
            that._config.getAttributeByPath(oData.id).getType() === "num" &&
            typeof oData.value === "string"
          ) {
            var matchIntervals =
              oData.value.match(/[-]?[0-9]+([,.][0-9]+)?/g) || [];
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
          var sInteractionInstPath = this._config.getInteractionInstancePath(
            sAttrPath
          );
          var sAttrKey = this._config.getAttributeKeyFromPath(sAttrPath);

          // TODO: Instead of overwriting the old filters we might combine them with the new ones,
          //       i.e. calculate the intersection between the two.
          //       However, this is only relevant for number-attributes,
          //       and as the new filters should always be more restrictive than the old ones,
          //       the behaviour is correct.
          this._patientFilter.setFilterValues(
            sInteractionInstPath,
            sAttrKey,
            collectedConstraints[sAttrPath].filterValues,
            Utils.valuesMergeMode.OVERRIDE
          );
        }
      },

      onDrillDownBtnPress: function() {
        var oChartInstance = this.layMain.getCenter().getContent()[0];
        this.setSelectedDataToFilter(oChartInstance.getSelectedData());
      },

      /**
       * Handler for the Add to Collections Button.
       * Opens a Dialog for the user to choose between existing collections or creating a new collection.
       * The necessary FilterObject is created and sent to the endpoint when the Dialog is confirmed.
       */
      onAddToCollectionsBtnPress: function() {
        if (
          this._config.isChartVisible(this.getCurrentChartType()) &&
          this._collectionComponentAvailable
        ) {
          var that = this;
          this._oCollectionsComponent.openDialog(function(
            bNew,
            sCollection,
            bGuarded
          ) {
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
              url:
                "/sap/hc/mri/services/collection.xsjs?action=patients_collection_service",
              type: "POST",
              contentType: "application/json;charset=utf-8",
              data: JSON.stringify(oFilterObject)
            });
          },
          true);
        }
      },

      onDownloadBtnPress: function(oEvent) {
        this._downloadMenu = this.getView().byId("downloadMenu");
        this._downloadMenu.open(
          true,
          oEvent.getSource(),
          sap.ui.core.Popup.Dock.BeginTop,
          sap.ui.core.Popup.Dock.BeginBottom,
          oEvent.getSource()
        );
      },

      onDownloadCsvBtnPress: function() {
        if (
          this._config.isChartVisible(this.getCurrentChartType()) &&
          typeof this.getChart().saveAsCsv === "function"
        ) {
          var that = this;
          MessageBox.confirm(
            Utils.getText("MRI_PA_PATIENT_LIST_DOWNLOAD_AS_CSV_FULL"),
            {
              title: Utils.getText("MRI_PA_PATIENT_LIST_DOWNLOAD_AS_CSV"),
              actions: [
                Utils.getText("MRI_PA_BUTTON_DOWNLOAD"),
                MessageBox.Action.CANCEL
              ],
              styleClass: Utils.getContentDensityClass(),
              onClose: function(sAction) {
                if (sAction === Utils.getText("MRI_PA_BUTTON_DOWNLOAD")) {
                  that.getChart().saveAsCsv("All");
                }
              }
            }
          );
        }
      },

      onDownloadPdfBtnPress: function() {
        var newPdfModel = new JSONModel({
          fileName: "",
          includeFiltercard: true,
          includeDetails: true,
          paperSize: "a4",
          orientation: "l",
          availableSize: [
            { sizeId: "a4", sizeName: "A4" },
            { sizeId: "a3", sizeName: "A3" },
            { sizeId: "letter", sizeName: "Letter" },
            { sizeId: "legal", sizeName: "Legal" }
          ]
        });
        this.getView().setModel(newPdfModel, "pdfModel");

        if (!this._pdfExportDialog) {
          this._pdfExportDialog = sap.ui.xmlfragment(
            "pdfExportDialog",
            "sap.hc.mri.pa.ui.views.PdfExportDialog",
            this
          );
          this.getView().addDependent(this._pdfExportDialog);
        }

        this._pdfExportDialog.open();
      },

      onPdfExportConfirmed: function() {
        this._pdfExportDialog.close();
        this._generatePdf(
          this.getView()
            .getModel("pdfModel")
            .getData()
        );
      },

      onPdfExportCancelled: function() {
        this._pdfExportDialog.close();
      },

      _generatePdf: function(pdfParam) {
        var pdfExporter = new PdfExport();
        pdfExporter.generatePDF(this, pdfParam);
      },

      /**
       * Handler for the filterChange event.
       * Is triggered whenever any filter condition has changed.
       * Refreshes the axes data and the chart if available.
       * @param {Object} oEvent BoolContainer change event
       */
      onFilterChange: function(oEvent) {
        var oIFR = oEvent.getSource().getIFR();
        var aChartableFilterCards = ChartableCardsVisitor.getChartableCards(
          oIFR
        );
        var oModel = this.getView().getModel(Utils.models.SELECTIONS);

        // Check if the current selections are valid
        oModel.getProperty("/attr").forEach(function(mSelection, iIndex) {
          var bValidSelection = aChartableFilterCards.some(function(
            mFilterCardInfo
          ) {
            return mFilterCardInfo.aAttributes.some(function(mAttributeInfo) {
              return (
                mAttributeInfo.bAvailable &&
                mAttributeInfo.sAttributeInstance === mSelection.selection
              );
            });
          });
          if (!bValidSelection) {
            oModel.setProperty(
              "/attr/" + iIndex + "/selection",
              sap.hc.mri.pa.ui.lib.Selection.Invalid
            );
          }
        });

        oModel.setProperty("/chartableFilterCards", aChartableFilterCards);

        if (this.getChart()) {
          this.updateChart();
        }
      },

      /**
       * Handler for an axis selection event.
       * Update the filters in case a new FilterCard or Attribute needs to be added and refresh the chart data.
       * @param {Object} oEvent LazyMenu select event
       */
      onAxisSelect: function(oEvent) {
        var sInteractionInstance = oEvent.getParameter("interactionInstance");
        var sAttributeKey = oEvent.getParameter("attributeKey");
        var sSelection;
        if (sInteractionInstance && sAttributeKey) {
          sSelection = this._patientFilter.setFilterValues(
            sInteractionInstance,
            sAttributeKey,
            [],
            Utils.valuesMergeMode.APPEND
          );
        } else {
          sSelection = sap.hc.mri.pa.ui.lib.Selection.Invalid;
        }

        // Set the model at the index given by the buttons binding context
        var oBindingContext = oEvent
          .getSource()
          .getBindingContext(Utils.models.SELECTIONS);
        oBindingContext
          .getModel()
          .setProperty(oBindingContext.getPath() + "/selection", sSelection);

        this.updateChart();
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
      onAddAttribute: function(sChannelId, sEventId, oEventData) {
        var aValues = oEventData.values || [];
        var sMergeMode = oEventData.mergeMode || Utils.valuesMergeMode.APPEND;
        this._patientFilter.setFilterValues(
          oEventData.interactionInstance,
          oEventData.attributeKey,
          aValues,
          sMergeMode
        );

        this.updateChart();
      },

      // Generates transformed request
      generateAnnotatedFilterObject: function(mParams) {
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
      generateBackendIFR: function(mParams) {
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

        return oIFR;
      },

      /**
       * Returns the type of the chart currently selected.
       * @returns {string} type of the current chart
       */
      getCurrentChartType: function() {
        return this.oCurrentChart;
      },

      /**
       * Reloads the application with new configuration.
       * @param {object} oNewConfig new configuration object.
       */
      reloadWithNewConfig: function(oNewConfig) {
        this._config = oNewConfig;
        this._updateTitle();
        // clear the cache of the charts such that the charts are reinitialised
        this.oChartCache = {};
        this._chartConfigs = new ChartConfigService(this._config);

        // reset visibility of charts
        var oCore = sap.ui.getCore();
        this._chartConfigs.getAllChartConfigs().forEach(function(chartConfig) {
          var chartId = chartConfig.getChartId();
          var elem = oCore.byId(chartId);

          if (!elem) {
            return;
          }

          var separator = oCore.byId(chartId + "-separator");
          elem.setVisible(this._config.isChartVisible(chartId));
          separator.setVisible(this._config.isChartVisible(chartId));
        }, this);

        // ask the filters to reinit
        this._patientFilter.reset();

        // get default filters
        this._loadDefaultFilters();

        // set current chart
        this.oCurrentChart = "list";
        // switch to current chart
        this._switchToChart(this.oCurrentChart);

        // reload bookmarks (in particular, reassess the bookmark compatibility to the new config)
        this._bookmarksPanel.loadRemoteBookmarks();

        this._updateToolbarButtonVisibility();

        // rebind binning button
        for (var i = 0; i < this.binningButtons.length; i++) {
          this.bindBinningButton(this.binningButtons[i], i);
        }
      },

      /**
       * Loads a bookmark from url
       * Used for bookmarks which are saved as tiles
       * @param {string} bookmarkId Bookmark id
       */
      _loadBookmarkWithId: function(bookmarkId) {
        var restoreFunc = this.restoreBookmark.bind(this);
        this._bookmarksPanel.loadRemoteSingleBookmark(bookmarkId, restoreFunc);
      },

      /**
       * Creates and opens a dialog with an error message.
       * @param {string}  [sTitle] Dialog title
       * @param {string}  [sError] Error message
       * @param {boolean} [bExit]  If the application should be closed (return to fiori launchpad)
       */
      openBookmarkErrorDialog: function(sTitle, sError, bExit) {
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
          onClose: function() {
            if (bExit) {
              sap.ushell.Container.getService(
                "CrossApplicationNavigation"
              ).toExternal({
                target: {
                  shellHash: ""
                }
              });
            }
          }
        });
      },

      _sortChart: function(oEvent) {
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
  }
);
