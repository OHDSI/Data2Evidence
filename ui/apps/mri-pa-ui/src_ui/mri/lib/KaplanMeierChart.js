sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "./KaplanMeierChartControl",
    "./KaplanMeierLegend",
    "./library",
    "./MedexChart",
    "./MenuButton",
    "./MriFrontendConfig",
    "./ifr/KMVisitor",
    "sap/m/Button",
    "sap/m/CheckBox",
    "sap/m/FlexBox",
    "sap/m/FlexItemData",
    "sap/m/HBox",
    "sap/m/Label",
    "sap/m/List",
    "sap/m/Popover",
    "sap/m/StandardListItem",
    "sap/m/Text",
    "sap/m/VBox",
    "sap/ui/core/CustomData",
    "sap/ui/commons/Label",
    "sap/ui/commons/RangeSlider",
    "sap/ui/model/json/JSONModel",
    "sap/ui/unified/Menu",
    "sap/ui/unified/MenuItem"
], function (jQuery, Utils, KaplanMeierChartControl, KaplanMeierLegend, library, MedexChart, MenuButton, MriFrontendConfig,
    KMVisitor, Button, CheckBox, FlexBox, FlexItemData, HBox, Label, List, Popover, StandardListItem, Text, VBox, CustomData,
    CommonsLabel, RangeSlider, JSONModel, Menu, MenuItem) {
    "use strict";

    /**
     * Constructor for a new KaplanMeierChart.
     * @constructor
     * @param {string} [sId] id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * Displays a Kaplan-Meier-Char with functionality for MRI.
     * @extends sap.hc.mri.pa.ui.lib.MedexChart
     * @alias sap.hc.mri.pa.ui.lib.KaplanMeierChart
     */
    var KaplanMeierChart = MedexChart.extend("sap.hc.mri.pa.ui.lib.KaplanMeierChart", {
        metadata: {
            aggregations: {
                layout: {
                    type: "sap.m.FlexBox",
                    multiple: false,
                    visibility: "hidden"
                },
                popover: {
                    type: "sap.m.Popover",
                    multiple: false,
                    visibility: "hidden"
                },
                noData: {
                    type: "sap.ui.core.Control",
                    multiple: false
                }
            }
        },
        renderer: function (oRenderManager, oControl) {
            if (oControl.getDataModel().getProperty("/series").length > 0) {
                oRenderManager.write("<div ");
                oRenderManager.writeControlData(oControl);
                oRenderManager.writeClasses();
                oRenderManager.addStyle("height", "100%");
                oRenderManager.addStyle("width", "100%");
                oRenderManager.writeStyles();
                oRenderManager.write(">");
                oRenderManager.renderControl(oControl._getLayout());
                oRenderManager.write("</div>");
            } else {
                oRenderManager.write("<div ");
                oRenderManager.writeControlData(oControl);
                oRenderManager.writeClasses();
                oRenderManager.addStyle("height", "100%");
                oRenderManager.addStyle("width", "100%");
                oRenderManager.writeStyles();
                oRenderManager.write(">");
                oRenderManager.renderControl(oControl._getNoData());
                oRenderManager.write("</div>");
            }
        }
    });

    KaplanMeierChart.prototype._getLayout = function () {
        var layout = this.getAggregation("layout");
        if (!layout) {
            layout = this._buildLayout();
        }
        return layout;
    };

    KaplanMeierChart.prototype._getNoData = function () {
        var noData = this.getAggregation("noData");
        if (!noData) {
            noData = this._buildNoData();
        }
        return noData;
    };

    KaplanMeierChart.prototype._reloadChart = function () {
        this.getParent().getParent().getParent().getParent().getParent().getParent().getController().updateChart();
    };

    KaplanMeierChart.prototype._onChangeStartEvent = function (sEventName, sOccValue) {
        var aEvents = this.getModel().getProperty("/events");
        jQuery.each(aEvents, function (i, v) {
            if (v.name === sEventName) {
                this.getModel().setProperty("/selected_event", v);
                if (sEventName === Utils.getText("MRI_PA_KAPLAN_DOB")) {
                    this.getModel().setProperty("/selected_start_event_occ", "");
                    this.getModel().setProperty("/selected_event_label", v.name);
                } else if (sOccValue) {
                    jQuery.each(this._oStartEventOccurrenceSettings, function (index, item) {
                        if (item.name === sOccValue) {
                            this.getModel().setProperty("/selected_start_event_occ", item);
                            this.getModel().setProperty("/selected_event_label", v.name + " - " + item.name);
                        }
                    }.bind(this));
                }
                this._reloadChart();
                return false;
            }
        }.bind(this));
    };

    KaplanMeierChart.prototype._onChangeEndEvent = function (sEventName, sOccValue) {
        var aEndEvents = this.getModel().getProperty("/endEventInteractions");
        jQuery.each(aEndEvents, function (i, v) {
            if (v.name === sEventName) {
                this.getModel().setProperty("/selected_end_event", v);
                if (sEventName === Utils.getText("MRI_PA_KAPLAN_DOD")) {
                    this.getModel().setProperty("/selected_end_event_occ", "");
                    this.getModel().setProperty("/selected_end_event_label", v.name);
                } else if (sOccValue) {
                    jQuery.each(this._oEndEventOccurrenceSettings, function (index, item) {
                        if (item.name === sOccValue) {
                            this.getModel().setProperty("/selected_end_event_occ", item);
                            this.getModel().setProperty("/selected_end_event_label", v.name + " - " + item.name);
                        }
                    }.bind(this));
                }
                this._reloadChart();
                return false;
            }
        }.bind(this));
    };
    KaplanMeierChart.prototype.getResponseData = function () {
        return this.getDataModel().getProperty("/series");
    };

    KaplanMeierChart.prototype.setChartOptions = function (oOptions) {
        if ("km" in oOptions) {
            this.getDataModel().setProperty("/errorlines", oOptions.km.errorlines);
            this.getDataModel().setProperty("/censoring", oOptions.km.censoring);

            if (oOptions.km.selected_event) {
                this.getDataModel().setProperty("/selected_event/key", oOptions.km.selected_event.key);
            }

            if (oOptions.km.selected_end_event) {
                this.getDataModel().setProperty("/selected_end_event/key", oOptions.km.selected_end_event.key);
            }

            if (oOptions.km.selected_start_event_occ) {
                this.getDataModel().setProperty("/selected_start_event_occ/key", oOptions.km.selected_start_event_occ.key);
            }

            if (oOptions.km.selected_end_event_occ) {
                this.getDataModel().setProperty("/selected_end_event_occ/key", oOptions.km.selected_end_event_occ.key);
            }
        }

        this._aCurrentSelections = oOptions.axisSelection.map(function (axis) {
            return axis.attributeId;
        });
    };

    KaplanMeierChart.prototype.zoom = function (day, factor) {
        if (day > 0) {
            var model = this.getDataModel();
            var minday = model.getProperty("/minday");
            var maxday = model.getProperty("/maxday");
            var width = maxday - minday;

            minday = Math.floor(day * (1.0 - factor) + factor * minday);
            maxday = Math.ceil(minday + factor * width);

            model.setProperty("/minday", minday);
            model.setProperty("/maxday", maxday);
        }
    };

    KaplanMeierChart.prototype._buildNoData = function () {
        var noData = new FlexBox({
            height: "100%",
            alignItems: "Center",
            justifyContent: "Center",
            items: [new CommonsLabel({
                text: "{" + Utils.models.RESULTS + ">/noDataReason}",
                icon: "sap-icon://message-information"
            })]
        }).addStyleClass("sapMriChartNoDataPholder");

        this.setAggregation("noData", noData);
        return noData;
    };

    KaplanMeierChart.prototype._buildLayout = function () {
        this._km = new KaplanMeierChartControl({
            series: "{/series}",
            showErrorlines: "{/errorlines}",
            showCensoring: "{/censoring}",
            minday: "{/minday}",
            maxday: "{/maxday}",
            maxDataday: "{/maxdataday}",
            colorPalette: this.getColorPalette()
        });

        var that = this;
        this._km.attachBrowserEvent("click", function (event) {
            var target = event.currentTarget;

            var rect = target.getBoundingClientRect();
            var offsetX = event.clientX - rect.left;

            that.zoom(this.getXScale().invert(offsetX), 0.75);
        });

        function mousewheelHandler(event) {
            event.stopImmediatePropagation();

            var target = event.currentTarget;
            var rect = target.getBoundingClientRect();
            var offsetX = event.originalEvent.clientX - rect.left;

            var day = this.getXScale().invert(offsetX);
            var normalizedDelta = 0; // positive = UP, negative = DOWN
            if (event.originalEvent.detail) {
                normalizedDelta = -event.originalEvent.detail / 3;
            } else if (event.originalEvent.wheelDelta) {
                normalizedDelta = event.originalEvent.wheelDelta / 120;
            }
            if (normalizedDelta > 0) {
                that.zoom(day, 0.75);
            } else if (normalizedDelta < 0) {
                that.zoom(day, 1.0 / 0.75);
            }
        }

        this._km.attachBrowserEvent("mousewheel", mousewheelHandler);
        this._km.attachBrowserEvent("DOMMouseScroll", mousewheelHandler);

        this._slider = new RangeSlider({
            width: "96%",
            value: "{/minday}",
            value2: "{/maxday}",
            max: "{/maxdataday}"
        });

        this._legend = new KaplanMeierLegend({
            title: "{/legendTitle}",
            entries: {
                path: "/series",
                template: new Text({
                    maxLines: 1,
                    text: "{name}",
                    wrapping: false,
                    customData: new CustomData({
                        key: "color",
                        value: "{_color}"
                    })
                })
            }
        });

        var oMenu = new Menu({
            items: {
                path: "/events",
                template: new MenuItem({
                    text: "{name}"
                })
            }
        }).addStyleClass(Utils.getContentDensityClass());

        var fnHandleStartEventSelectWithOcc = function (oEvent) {
            this._onChangeStartEvent(oEvent.getParameters().item.oParent.oParent.getText(), oEvent.getParameter("item").getText());
        };

        var fnHandleStartEventSelectWoOcc = function (oEvent) {
            this._onChangeStartEvent(oEvent.getParameter("item").getText());
        };

        var fnHandleStartEvents = function (oEvent) {
            var oButton = oEvent.getSource();
            var oMenuItems = oMenu.getItems();

            // Attach sub menu items with event handlers for certain events & attach only the event handler for the default event.
            for (var index in oMenuItems) {
                var oMenuItem = oMenuItems[index];
                if (oMenuItem.getText() !== Utils.getText("MRI_PA_KAPLAN_DOB") && !oMenuItem.getSubmenu()) {
                    oMenuItem.setSubmenu(new Menu().addItem(new MenuItem({ text: "{i18n>MRI_PA_KAPLAN_END_EVENT_FIRST_OCCURRENCE_LABEL}" }).attachSelect(fnHandleStartEventSelectWithOcc, this))
                        .addItem(new MenuItem({ text: "{i18n>MRI_PA_KAPLAN_START_EVENT_LAST_OCCURRENCE_LABEL}" }).attachSelect(fnHandleStartEventSelectWithOcc, this)));
                } else if (oMenuItem.getText() === Utils.getText("MRI_PA_KAPLAN_DOB")) {
                    oMenuItem.attachSelect(fnHandleStartEventSelectWoOcc, this);
                }
            }

            oMenu.open(false, oButton, sap.ui.core.Popup.Dock.BeginTop, sap.ui.core.Popup.Dock.BeginBottom, oButton);
        };

        this._oStartEventSelector = new MenuButton({
            text: "{/selected_event_label}",
            press: [fnHandleStartEvents, this],
            tooltip: "{/selected_event_label}"
        }).addDependent(oMenu)
          .addStyleClass("sapMriPaKMInfoBtnTextOverFlow");

     //For end event Interactions List
        var _oEndEventsMenu = new Menu({
            items: {
                path: "/endEventInteractions",
                template: new MenuItem({
                    text: "{name}"
                })
            }
        }).addStyleClass(Utils.getContentDensityClass());


        var fnHandleEndEventSelectWithOcc = function (oEvent) {
            this._onChangeEndEvent(oEvent.getParameters().item.oParent.oParent.getText(), oEvent.getParameter("item").getText());
        };

        var fnHandleEndEventSelectWoOcc = function (oEvent) {
            this._onChangeEndEvent(oEvent.getParameter("item").getText());
        };

        var fnHandleEndEvents = function (oEvent) {
            var oButton = oEvent.getSource();
            var oMenuItems = _oEndEventsMenu.getItems();

            // Attach sub menu items with event handlers for certain events & attach only the event handler for the default event.
            for (var index in oMenuItems) {
                var oMenuItem = oMenuItems[index];
                if (oMenuItem.getText() !== Utils.getText("MRI_PA_KAPLAN_DOD") && !oMenuItem.getSubmenu()) {
                    oMenuItem.setSubmenu(new Menu().addItem(new MenuItem({ text: "{i18n>MRI_PA_KAPLAN_END_EVENT_FIRST_OCCURRENCE_LABEL}" }).attachSelect(fnHandleEndEventSelectWithOcc, this))
                        .addItem(new MenuItem({ text: "{i18n>MRI_PA_KAPLAN_END_EVENT_LAST_OCCURRENCE_LABEL}" }).attachSelect(fnHandleEndEventSelectWithOcc, this)));
                } else if (oMenuItem.getText() === Utils.getText("MRI_PA_KAPLAN_DOD")) {
                    oMenuItem.attachSelect(fnHandleEndEventSelectWoOcc, this);
                }
            }

            _oEndEventsMenu.open(false, oButton, sap.ui.core.Popup.Dock.BeginTop, sap.ui.core.Popup.Dock.BeginBottom, oButton);
        };


        this._oEndEventSelector = new MenuButton({
            text: "{/selected_end_event_label}",
            press: [fnHandleEndEvents, this],
            tooltip: "{/selected_end_event_label}"
        }).addDependent(_oEndEventsMenu)
          .addStyleClass("sapMriPaKMInfoBtnTextOverFlow");


        var oPopover = new Popover({
            placement: sap.m.PlacementType.Auto,
            title: "{i18n>MRI_PA_KAPLAN_INTERACTIONS_LIST}",
            content: new List({
                items: {
                    path: "/series/0/censoringInteractions",
                    template: new StandardListItem({
                        title: "{name}"
                    })
                }
            })
        }).addStyleClass(Utils.getContentDensityClass());

        this._censoringInteractions = new Button({
            text: "{i18n>MRI_PA_KAPLAN_VIEW_INTERACTIONS_LIST_BUTTON}",
            tooltip: "{i18n>MRI_PA_KAPLAN_VIEW_INTERACTIONS_LIST_TOOLTIP}",
            press: [function (oEvent) {
                oPopover.openBy(oEvent.getSource());
            }, this]
        }).addDependent(oPopover)
          .addStyleClass("sapMriPaKMInfoBtnTextOverFlow");


        var outerRowLayout = new HBox({
            height: "100%",
            width: "100%"
        });

         var colWithKmAndSlider = new VBox({
            height: "100%",
            width: "100%"
        });

        colWithKmAndSlider.addItem(this._km);

        var rowWithSliderAndMaxDate = new HBox({
            justifyContent: sap.m.FlexJustifyContent.SpaceAround
        });
        this._slider.setLayoutData(new FlexItemData({
            growFactor: 10,
            alignSelf: sap.m.FlexAlignSelf.Center
        }));
        rowWithSliderAndMaxDate.addItem(new CommonsLabel().setLayoutData(new FlexItemData({
            growFactor: 0.5,
            alignSelf: sap.m.FlexAlignSelf.Center
        })));
        rowWithSliderAndMaxDate.addItem(this._slider);
        var wrappedDayFormatter = function (days) {
            var func = that._km.getActiveDayFormatter(true);
            return func(days);
        };
        rowWithSliderAndMaxDate.addItem(new CommonsLabel({
            text: {
                path: "/maxdataday",
                formatter: wrappedDayFormatter
            }
        }).setLayoutData(new FlexItemData({
            growFactor: 1,
            alignSelf: sap.m.FlexAlignSelf.Center
        })));

        colWithKmAndSlider.addItem(rowWithSliderAndMaxDate);

        outerRowLayout.addItem(colWithKmAndSlider);

          this._logrankValueLabel = new Label({
            textAlign: "Center",
            text: "{i18n>MRI_PA_KAPLAN_LOG_RANK_P} {/kaplanMeierStatistics/overallResult/pValue}"
        }).addStyleClass("sapMriPaKaplanLogRankPValue");

        outerRowLayout.addItem(new VBox({
            items: [
                new Label({
                    text: "{i18n>MRI_PA_KAPLAN_LOG_RANK}:",
                    labelFor: this._logrankValueLabel,
					tooltip: "{i18n>MRI_PA_KAPLAN_LOG_RANK}"
                }).addStyleClass("sapUiSmallMarginTop"),
                this._logrankValueLabel,
                this._legend,
                new Label({
                    text: "{i18n>MRI_PA_KAPLAN_START_EVENT}",
                    labelFor: this._oStartEventSelector,
                    tooltip: "{i18n>MRI_PA_KAPLAN_START_EVENT_TLTIP_LABEL}"
                }).addStyleClass("sapUiSmallMarginTop"),
                this._oStartEventSelector,
                new Label({
                     text: "{i18n>MRI_PA_KAPLAN_END_EVENT}",
                     labelFor: this._oEndEventSelector,
                     tooltip: "{i18n>MRI_PA_KAPLAN_END_EVENT_TLTIP_LABEL}"
                    }).addStyleClass("sapUiSmallMarginTop"),
                this._oEndEventSelector,
                new HBox({
                    items: [
                        new CheckBox({
                            selected: "{/errorlines}"
                        }),
                        new Label({
                            text: "{i18n>MRI_PA_KAPLAN_ERROR_LINES}"
                        }).addStyleClass("sapMRIPaKMInfoChkbox")
                ]}).addStyleClass("sapMriPaKMInfoHBox sapUiSmallMarginTop"),
                new HBox({items: [
                    new CheckBox({
                        selected: "{/censoring}"
                    }),
                    new Label({
                        text: "{i18n>MRI_PA_KAPLAN_CENSORING_EVENTS}"
                    }).addStyleClass("sapMRIPaKMInfoChkbox")
                ]}).addStyleClass("sapMriPaKMInfoHBox sapUiSmallMarginTop"),
                new Label({
                    text: "{i18n>MRI_PA_KAPLAN_INTERACTIONS_LABEL}",
                    labelFor: this._censoringInteractions
                }).addStyleClass("sapUiSmallMarginTop"),
                this._censoringInteractions
            ]
        }).addStyleClass("sapMriPaKMInfo"));

        this.setAggregation("layout", outerRowLayout);
        return outerRowLayout;
    };

    KaplanMeierChart.prototype.init = function () {
        MedexChart.prototype.init.call(this);
        this._chartKey = "km";

        this._settings = {
            downloadEnabled: MriFrontendConfig.getFrontendConfig().isChartDownloadEnabled(this._chartKey),
            collectionEnabled: MriFrontendConfig.getFrontendConfig().isChartCollectionEnabled(this._chartKey),
            pdfDownloadEnabled: MriFrontendConfig.getFrontendConfig().isChartPDFDownloadEnabled(this._chartKey)
        };

        this._oStartEventOccurrenceSettings = [
            { name: Utils.getText("MRI_PA_KAPLAN_END_EVENT_FIRST_OCCURRENCE_LABEL"), key:"start_min"},
            { name: Utils.getText("MRI_PA_KAPLAN_START_EVENT_LAST_OCCURRENCE_LABEL"), key:"start_before_end"}
        ];

        this._oEndEventOccurrenceSettings = [
            { name: Utils.getText("MRI_PA_KAPLAN_END_EVENT_FIRST_OCCURRENCE_LABEL"), key:"end_min"},
            { name: Utils.getText("MRI_PA_KAPLAN_END_EVENT_LAST_OCCURRENCE_LABEL"), key:"end_max"}
        ];

        this._buildLayout();

        //get filtercards list
        var aSelectedEndInteractionsKey = MriFrontendConfig.getFrontendConfig().getChartOptions("km").selectedEndInteractions;
        var aSelectedEndInteractions = [];

        //loop through filter cards, by passing the key and get the interaction name
        var getInteractionName = function(interactionKey){
            var aFilterCards = MriFrontendConfig.getFrontendConfig().getFilterCards();
            var sInteractionName;
            aFilterCards.some(function(item){
                if(item._sConfigPath === interactionKey){
                    sInteractionName = item._oInternalConfigFilterCard.name;
                    return true;
                }
            });
            return sInteractionName;
        };

        if(aSelectedEndInteractionsKey){
            aSelectedEndInteractions = aSelectedEndInteractionsKey.map(function(iKey){
                var interactionName = getInteractionName(iKey);
                return {
                    name: interactionName,
                    key: iKey
                };
            });
        }
        this._addDefaultEndEvent(aSelectedEndInteractions);

        var model = new JSONModel({
            errorlines: false,
            censoring: false,
            endEventInteractions: aSelectedEndInteractions
        });
        this.setModel(model);
        this._buildLayout(); // init this._km
    };

    KaplanMeierChart.prototype.getDataModel = function () {
        var model = this.getModel();
        return model;
    };

    KaplanMeierChart.prototype.clearChart = function () {
        this.updateValues(null);
    };

    /**
     * Modify the response and set the data to the chart.
     * Replace the names of the categories and measures with a full name composed of
     * filter card name, filter card number and attribute name.
     * @param {Object} mResponse Response from the analytics service
     */
    KaplanMeierChart.prototype.updateValues = function (mResponse) {
        if (!mResponse) {
            mResponse = {
                categories: [],
                data: []
            };
        }

        mResponse.data = MriFrontendConfig.getFrontendConfig().translate(mResponse.data);

        mResponse.data.forEach(function (mData) {
            mData.name = mResponse.categories.map(function (mCategory) {
                var oAttributeConfig = MriFrontendConfig.getFrontendConfig().getAttributeByPath(mCategory.id);
                if (oAttributeConfig) {
                    if (oAttributeConfig.getType() === sap.hc.mri.pa.ui.lib.CDMAttrType.Date || oAttributeConfig.getType() === sap.hc.mri.pa.ui.lib.CDMAttrType.Datetime) {
                        var dDate = Utils.parseHANADate(mData[mCategory.id]);
                        if (dDate) {
                            if (oAttributeConfig.getType() === sap.hc.mri.pa.ui.lib.CDMAttrType.Date) {
                                return Utils.formatDate(dDate, true);
                            } else {
                                return Utils.formatDateTime(dDate);
                            }
                        }
                    }
                } else if (mCategory.id === "dummy_category") {
                    return Utils.getText("MRI_PA_CURRENT_COHORT");
                }
                return mData[mCategory.id];
            }).join(", ");

            // Remove all entries that have a negative value for x
            // That can be caused by bad patient data (eg. DoD before DoB and interactions)
            mData.censored = mData.censored.filter(function (aCensor) {
                return aCensor[0] >= 0;
            });
            mData.points = mData.points.filter(function (aPoint) {
                return aPoint[0] >= 0;
            });
        });

        // Concatenate all category names as title for the legend.
        var sLegendTitle = mResponse.categories.map(function (mCategory) {
            if (mCategory.id === "dummy_category") {
                mCategory.name = Utils.getText("MRI_PA_DUMMY_CATEGORY");
            }
            return mCategory.name;
        }).join(", ");
        this.getDataModel().setProperty("/legendTitle", sLegendTitle);

        this._km.addColors(mResponse.data);
        this.getDataModel().setProperty("/series", mResponse.data);
        this.getDataModel().setProperty("/kaplanMeierStatistics", mResponse.kaplanMeierStatistics);
        this._aCurrentSelections = this.getModel(Utils.models.SELECTIONS).getProperty("/attr").map(function (mAttribute) {
            return mAttribute.selection;
        });
        this._slider.setEnabled(mResponse.data.length > 0);

        // Update status bar
        this.setDrillDownBtnEnabled(false);

        this.rerender();
    };

    /**
     * Modify the response data end event interactions by adding a default end event.
     * If the end event selected is the default end event which is date of death then occurrence info is removed.
     * @param {Object} endEvents Part of the Response from the analytics service
     */
    KaplanMeierChart.prototype._addDefaultEndEvent = function (endEvents) {
        var defaultEndEvent = {
            key: "patient.dateOfDeath",
            name: Utils.getText("MRI_PA_KAPLAN_DOD")
        };

        if (endEvents) {
            endEvents.unshift(defaultEndEvent);
        }
    };

    KaplanMeierChart.prototype.onAfterRendering = function () {
        sap.ui.core.ResizeHandler.register(this.getDomRef(), function () {
            this._resizeKMChart();
            this._updateLocationsModel();
        }.bind(this));
        jQuery.sap.delayedCall(1, this, this._resizeKMChart);
    };

    KaplanMeierChart.prototype._resizeKMChart = function () {
        var width = jQuery(".sapMriPaChartCenter").width();
        var height = jQuery(".sapMriPaChartCenter").height();

        //fix the chart to be a certain percentage of total width and height
        this._km.setXpoints(Math.round(width * 0.75));
        this._km.setYpoints(Math.round(height * 0.85));
    };

    KaplanMeierChart.prototype._updateLocationsModel = function () {
        var i;
        // get locations data and initially hide everything
        var oLocationsData = this.getModel(Utils.models.LOCATIONS).getData();
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
        }

        // set the new locations to model
        this.getModel(Utils.models.LOCATIONS).setData(oLocationsData);
    };

    KaplanMeierChart.prototype.getAxesData = function () {
        var oItemsModel = this.getModel(Utils.models.SELECTIONS);
        var mItemsData = oItemsModel.getData();
        var axes = [];

        // populates IFR with axes data
        for (var k = 0; k < mItemsData.attr.length; k++) {
            var sSelection = mItemsData.attr[k].selection;
            if (this.isValidSelection(sSelection) && k !== sap.hc.mri.pa.ui.lib.Dimensions.Y) {
                var instanceID = MriFrontendConfig.getFrontendConfig().getInteractionInstancePath(sSelection);
                var axis = {
                    id: sSelection,
                    configPath: MriFrontendConfig.getFrontendConfig().getGenericPath(instanceID),
                    instanceID: instanceID,
                    axis: "x",
                    seq: k + 1
                };
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
     * Add the Axis selections to the filter query object.
     * @param   {sap.hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.Filter} oIFR IFR object
     * @returns {object[]}                                                     Filter object enriched with axis selections
     */
    KaplanMeierChart.prototype.preprocessFilterQuery = function (oIFR) {
        var aFilters = MedexChart.prototype.preprocessFilterQuery.call(this, oIFR);
        this._updateStartEvents(oIFR);
        this._updateEndEvents();

        oIFR.axes = this.getAxesData();

        var sSeletectedEventKey = this.getDataModel().getProperty("/selected_event/key");
        oIFR.kmEventIdentifier = MriFrontendConfig.getFrontendConfig().convertInternalPathToConfigPath(sSeletectedEventKey);
        oIFR.kmStartEventOccurence = this.getDataModel().getProperty("/selected_start_event_occ/key");
        oIFR.kmEndEventIdentifier = this.getDataModel().getProperty("/selected_end_event/key");
        oIFR.kmEndEventOccurence = this.getDataModel().getProperty("/selected_end_event_occ/key");

        var aRequests = aFilters.map(function (oFilter) {
            return this._preprocessOneFilterObject(oFilter);
        }, this);
        return aRequests;
    };

   /**
     * Update End events of KM
     * @private
     */
    KaplanMeierChart.prototype._updateEndEvents = function () {
        var aEndEvents = this.getDataModel().getProperty("/endEventInteractions");
        var mSelectedEndEvent = this.getDataModel().getProperty("/selected_end_event");
        var iSelectedIndex = 0;
        if (!aEndEvents) {
            aEndEvents = [];
        }

        // If there is a selected event, check if it is still in the list
        if (mSelectedEndEvent) {
            var iIndex = aEndEvents.map(function (mEvent) {
                return mEvent.key;
            }).indexOf(mSelectedEndEvent.key);
            if (iIndex !== -1) {
                iSelectedIndex = iIndex;
            }
        }
        var oEndOccurrenceValue = this.getDataModel().getProperty("/selected_end_event_occ");
        // Set the selected event from the list (updates the name in case of a rename)
        mSelectedEndEvent = aEndEvents[iSelectedIndex];

        //update data model
        if (mSelectedEndEvent.key !== "patient.dateOfDeath") {
            if(!oEndOccurrenceValue){
                 oEndOccurrenceValue = this._oEndEventOccurrenceSettings[0];
                 this.getDataModel().setProperty("/selected_end_event_occ", oEndOccurrenceValue);
            }
            this.getDataModel().setProperty("/selected_end_event_label", mSelectedEndEvent.name + " - " + oEndOccurrenceValue.name);
        } else {
            this.getDataModel().setProperty("/selected_end_event_occ", "");
            this.getDataModel().setProperty("/selected_end_event_label", mSelectedEndEvent.name);
        }

        this.getDataModel().setProperty("/selected_end_event", mSelectedEndEvent);
        this.getDataModel().setProperty("/endEventInteractions", aEndEvents);
    };


   /**
     * Update the currently selected start event and the list of potential start events.
     * @private
     * @param {sap.hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.Filter} oIFR IFR object
     */
    KaplanMeierChart.prototype._updateStartEvents = function (oIFR) {
        var aEvents = KMVisitor.getFilterCardNames(oIFR);

        aEvents = aEvents.filter(function (potentialEvent) {
            var eventKey = potentialEvent.key.split(".");
            eventKey.pop();
            var interactionConfig = MriFrontendConfig.getFrontendConfig().getFilterCardByPath(eventKey.join("."));
            return !interactionConfig.hasAnnotation("genomics_variant_location");
        });

        aEvents.push({
            key: "patient.dateOfBirth",
            name: Utils.getText("MRI_PA_KAPLAN_DOB")
        });

        var mSelectedEvent = this.getDataModel().getProperty("/selected_event");
        var iSelectedIndex = 0;

        // If there is a selected event, check if it is still in the list
        if (mSelectedEvent) {
            var iIndex = aEvents.map(function (mEvent) {
                return mEvent.key;
            }).indexOf(mSelectedEvent.key);
            if (iIndex !== -1) {
                iSelectedIndex = iIndex;
            }
        }

        // Set the selected event from the list (updates the name in case of a rename)
        mSelectedEvent = aEvents[iSelectedIndex];
        var oStartOccurrenceValue = this.getDataModel().getProperty("/selected_start_event_occ");

        //Update the model as per the new selected event and occurrence
        if (mSelectedEvent.key !== "patient.dateOfBirth") {
            if(!oStartOccurrenceValue){
                oStartOccurrenceValue = this._oStartEventOccurrenceSettings[0];
            }
            this.getDataModel().setProperty("/selected_start_event_occ", oStartOccurrenceValue);
            this.getDataModel().setProperty("/selected_event_label", mSelectedEvent.name + " - " + oStartOccurrenceValue.name);
        } else if (mSelectedEvent.key === "patient.dateOfBirth") {
            this.getDataModel().setProperty("/selected_start_event_occ", "");
              this.getDataModel().setProperty("/selected_event_label", mSelectedEvent.name);
        }
        this.getDataModel().setProperty("/selected_event", mSelectedEvent);
        this.getDataModel().setProperty("/events", aEvents);
    };

    KaplanMeierChart.prototype._preprocessOneFilterObject = function (oFilter) {
        var filterObject = jQuery.extend({}, oFilter);
        // get current attribute buttons' selections
        var oItemsModel = this.getModel(Utils.models.SELECTIONS);
        var mItemsData = oItemsModel.getData();

        // annotate filter object w.r.t. the three X axes attributes
        for (var i = sap.hc.mri.pa.ui.lib.Dimensions.X1; i <= sap.hc.mri.pa.ui.lib.Dimensions.X3; i++) {
            if (this.isValidSelection(mItemsData.attr[i].selection)) {
                var oObject = Utils.getPropertyByPath(filterObject, mItemsData.attr[i].selection);
                if (!oObject) {
                    // filter object does not contain current selection: add it to the object
                    oObject = [{}];
                    Utils.createPathInObject(filterObject, mItemsData.attr[i].selection, oObject);
                }
                oObject[0].xaxis = i + 1; // annotate category attribute (with position i+1)
                if (this._aCurrentSelections && this._aCurrentSelections[i] === mItemsData.attr[i].selection) {
                    if (parseFloat(mItemsData.attr[i].binsize)) {
                        oObject[0].binsize = parseFloat(mItemsData.attr[i].binsize);
                    }
                } else {
                    // FIXME using old FO path
                    var sConfigPath = MriFrontendConfig.getFrontendConfig().convertInternalPathToConfigPath(mItemsData.attr[i].selection);
                    var oCurrentAttribute = MriFrontendConfig.getFrontendConfig().getAttributeByPath(sConfigPath);
                    oObject[0].binsize = oCurrentAttribute.getDefaultBinSize();
                }
            }
        }

        var sSeletectedEventKey = this.getDataModel().getProperty("/selected_event/key");
        filterObject.kmEventIdentifier = MriFrontendConfig.getFrontendConfig().convertInternalPathToConfigPath(sSeletectedEventKey);
        filterObject.kmStartEventOccurence = this.getDataModel().getProperty("/selected_start_event_occ/key");
        filterObject.kmEndEventIdentifier = this.getDataModel().getProperty("/selected_end_event/key");
        filterObject.kmEndEventOccurence = this.getDataModel().getProperty("/selected_end_event_occ/key");

        return filterObject;
    };

    /**
     * Return the download link url.
     * @returns {string} URL of the download link for the KaplanMeierChart.
     */
    KaplanMeierChart.prototype._getDownloadLink = function () {
        return "/sap/hc/mri/pa/services/analytics.xsjs?action=kmquerycsv";
    };

    /**
     * Return the download data
     * @returns {object} Filter Data of the download link for the KaplanMeierChart.
     */
    KaplanMeierChart.prototype._getDownloadData = function () {
        var oFilterObject = this.getController().generateBackendIFR();
        return oFilterObject;
    };

    KaplanMeierChart.prototype.onAfterShow = function () {
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

    KaplanMeierChart.prototype.getDataURL = function () {
        return "/sap/hc/mri/pa/services/analytics.xsjs?action=kmquery";
    };

    return KaplanMeierChart;
});

