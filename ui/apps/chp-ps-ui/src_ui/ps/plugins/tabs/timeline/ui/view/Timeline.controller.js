sap.ui.define([
    "jquery.sap.global",
    "sap/hc/hph/core/ui/JSONBinding/DeepJSONPropertyBinding",
    "sap/hc/hph/patient/app/ui/lib/utils/Utils",
    "sap/hc/hph/patient/app/ui/lib/timeline/ClusterTiles",
    "sap/hc/hph/patient/app/ui/lib/timeline/MiniTileArea",
    "sap/hc/hph/patient/app/ui/lib/PatientData",
    "sap/hc/hph/patient/app/ui/lib/Tile",
    "sap/hc/hph/patient/app/ui/lib/TileAnnotation",
    "sap/hc/hph/patient/app/ui/lib/TilePopoverContent",
    "sap/hc/hph/patient/app/ui/lib/timeline/Timeline",
    "sap/hc/hph/patient/plugins/tabs/timeline/ui/lib/UserStateTimeline",
    "sap/hc/hph/patient/plugins/tabs/timeline/ui/lib/Utils",
    "sap/m/GroupHeaderListItem",
    "sap/m/Popover",
    "sap/hc/hph/patient/app/ui/lib/tab/TabBaseController",
    "sap/ui/model/Filter",
    "sap/hc/hph/patient/shared/ZoomOptions"
], function (jQuery, DeepJSONPropertyBinding, LibUtils, ClusterTiles, MiniTileArea, PatientData, Tile, TileAnnotation, TilePopoverContent, Timeline, UserStateTimeline, Utils, GroupHeaderListItem, Popover, TabBaseController, Filter, ZoomOptions) {
    "use strict";

    /**
     * Constructor for the Patient Summary Timeline Controller.
     * @constructor
     *
     * @classdesc
     * This Controller is responsible for loading the patient data and handling all actions on the tabs of the Patient Summary.
     * @extends sap.ui.core.mvc.Controller
     * @alias sap.hc.hph.patient.app.ui.content.view.Content
     */
    var TimelineController = TabBaseController.extend("hc.hph.patient.plugins.tabs.timeline.ui.view.Timeline");

    /** @constant {string[]} Properties of timeline lanes that are relevant for user state */
    TimelineController.USER_STATE_TIMELINE_BOUND_PROPERTIES = ["minimized", "laneId", "visible", "subLanes"];

    TimelineController.prototype.setPatientModel = function (mPatientData) {
        // call parent implementation
        TabBaseController.prototype.setPatientModel.call(this, mPatientData);
        this._registerModelBindings();
    };

    // to check whether patient data processing is needed
    TimelineController.prototype.hasPatientData = function () {
        return TabBaseController.prototype.hasPatientData.call(this)
            && this.getPatientModel().getProperty("processed");
    };

    TimelineController.prototype.getUserState = function () {
        var aLanes = this.getPatientModel().getProperty("/lanes");
        return UserStateTimeline.getUserStateFromLanes(aLanes);
    };

    TimelineController.prototype.applyUserState = function (mUserState) {
        var aLanes = this.getPatientModel().getProperty("/lanes");
        // Save lane order as defined in config
        aLanes.forEach(function (oLane, index) {
            oLane.defaultRank = index;
        }, this);
        UserStateTimeline.applyUserStateToLanes(mUserState, aLanes);
        this.getPatientModel().updateBindings();
    };

    /**
     * formatter for translating the zoom options in the time based zoom buttons
     * @param   {string} sKey   - key of the selected zoom option
     * @returns {string}        - translated name of the zoom option
     */
    TimelineController.prototype.formatTimeZoomKey = function (sKey) {
        return ZoomOptions.formatTimeZoomKey(sKey);
    };

    /**
     * formatter for translating the zoom option in the data based zoom button
     * @param   {string} sKey   - key of the selected zoom option
     * @returns {string}        - translated name of the zoom option
     */
    TimelineController.prototype.formatDatabasedZoomKey = function (sKey) {
        return ZoomOptions.formatDatabasedZoomKey(sKey);
    };

    /**
     * formatter for translating the tooltip for the data based zoom button
     * @param   {string} sKey   - key of the databased zoom option
     * @returns {string}        - translated tooltip of the zoom option
     */
    TimelineController.prototype.formatDatabasedTooltip = function (sKey) {
        return ZoomOptions.formatDatabasedTooltip(sKey);
    };

    /**
     * formatter for getting the zoom key for a zoom option from the model
     * @param   {string} oModelData    - object with with patient model structure (config + patient data)
     * @param   {string} sKey          - key of the zoom button set
     * @returns {string}               - key of the configured zoom option for that button
     */
    TimelineController.prototype.getZoomKey = function (oModelData, sKey) {
        return oModelData.inspectorOptions.timeline.zoom[sKey];
    };

    /**
     * TODO: function duplicate for both overview and timeline tab
     *
     * Attaches a change handler for all given user state-relevant properties to all lanes in the given model.
     *
     * @private
     * @param {object} oModel The model with lanes.
     * @param {string[]} aPropertiesToBind The properties of a lane that should be used for attaching a change handler.
     */
    TimelineController.prototype._attachUserStateChangeHandlerToLanes = function (oModel, aPropertiesToBind) {
        // detach first to avoid double binding
        if (typeof this._aUserStatePropertyBindings !== "undefined") {
            this._aUserStatePropertyBindings.forEach(function (oPropertyBinding) {
                oPropertyBinding.detachChange(this.markUserStateChanged, this);
            }, this);
        }
        this._aUserStatePropertyBindings = [];

        oModel.getData().lanes.forEach(function (oLane, nIndex) {
            var oLaneContext = oModel.getContext("/lanes/" + nIndex);
            aPropertiesToBind.forEach(function (sProperty) {
                var oPropertyBinding = new DeepJSONPropertyBinding(oModel, sProperty, oLaneContext);
                this._aUserStatePropertyBindings.push(oPropertyBinding);
                oPropertyBinding.attachChange(this.markUserStateChanged, this);
            }, this);
        }, this);
    };

    /**
     * Register model bindings to be notified about changes that are relevant for user state.
     * @private
     */
    TimelineController.prototype._registerModelBindings = function () {
        // bind user state relevent properties to timeline lanes
        this._attachUserStateChangeHandlerToLanes(this.getPatientModel(), TimelineController.USER_STATE_TIMELINE_BOUND_PROPERTIES);
    };


    TimelineController.prototype.startDataProcessing = function (mResult) {
        // Add timeline specific properties to result data set
        jQuery.extend(true, mResult, {
            timeline: {
                showDatelessInteractions: false
            }
        });
        delete this.firstEventDateSeen;
        delete this.lastEventDateSeen;
    };

    TimelineController.prototype.startLane = function (mLane) {
        // Recursively fill undefined attributes with defaults
        function completeLane(mLane2) {
            if (mLane2.laneType === "InteractionLane") {
                if (typeof mLane2.minimized !== "boolean") {
                    mLane2.minimized = false;
                }
                if (typeof mLane2.tilesHidden !== "boolean") {
                    mLane2.tilesHidden = false;
                }
                if (typeof mLane2.visible !== "boolean") {
                    mLane2.visible = false;
                }
            }

            if (Array.isArray(mLane2.subLanes)) {
                mLane2.subLanes.forEach(completeLane);
            } else {
                mLane2.subLanes = [];
            }
        }

        completeLane(mLane);
        mLane.tiles = {
            dated: [],
            undated: []
        };

        // Initialize object with plot data arrays
        mLane.plotData = {};
    };

    TimelineController.prototype.startInteractionType = function (mInteractionType, mLane) {
        mLane.plotData[mInteractionType.source] = [];
    };

    TimelineController.prototype.addEntry = function (mEntry, mInteractionType, mLane) {
        // 1. Add entries for timeline
        var iKey = mLane.tiles.dated.length; // unique key that to identify tile <=> data point
        var mTile = {
            name: mInteractionType.name,
            start: mEntry.start,
            end: mEntry.end,
            annotations: mEntry.annotations,
            attributes: PatientData.getTileAttributes(mEntry),
            key: iKey
        };

        // Group timeline entries in dated/dateless interactions
        // Assumes that all entries have either NEITHER start nor end or BOTH
        if (PatientData._hasFullDateInfo(mEntry)) {
            mLane.tiles.dated.push(mTile);
        } else {
            mLane.tiles.undated.push(mTile);
        }

        // 2. Add plottable data points
        if (mEntry.plottableAttributes.length && PatientData._hasFullDateInfo(mEntry)) {
            var aDataPoints = [];
            mEntry.plottableAttributes.forEach(function (mAttributeType) {
                var aValues = mEntry.attributes[mAttributeType.id];
                if (!Array.isArray(aValues)) {
                    aValues = [aValues];
                }
                // iterate over individual values
                aValues.forEach(function (sValue, index) {
                    var mDataPoint = aDataPoints[index] || {
                        /* Convert time to local timezone since this is expected by the
                        D3 code used to render the start */
                        _startDate: Utils.utcToLocal(mEntry.start),
                        _id: iKey
                    };
                    var aNumberUnit = PatientData.extractPlottableValue(sValue);
                    var sKey = PatientData.getKeyForAttributeUnit(mEntry.plotKeyCache, mAttributeType.id, aNumberUnit[1]);
                    // Numerical value for plotting
                    mDataPoint["y" + sKey] = aNumberUnit[0];
                    // Formatted value for display
                    mDataPoint["s" + sKey] = mEntry.attributesFormatted[mAttributeType.id][index];
                    aDataPoints[index] = mDataPoint;
                });
            });
            Array.prototype.push.apply(mLane.plotData[mInteractionType.source], aDataPoints);
        }

        // 3. Update global min and max date of the timeline
        if (mEntry.start && (!this.firstEventDateSeen || mEntry.start < this.firstEventDateSeen)) {
            this.firstEventDateSeen = new Date(mEntry.start.getTime()); // Copy the date object
        }
        if (mEntry.end && (!this.lastEventDateSeen || mEntry.end > this.lastEventDateSeen)) {
            this.lastEventDateSeen = new Date(mEntry.end.getTime()); // Copy the date object
        }
    };

    // This function is called after an interaction type has been processed
    TimelineController.prototype.finishInteractionType = function (mInteractionType, mLane) {
        if (mInteractionType.visible) {
            mInteractionType.attributes.forEach(function (mAttribute) {
                if (mAttribute.plottable) {
                    mLane.plottableAttributes.push({
                        interactionId: mInteractionType.source,
                        interactionName: mInteractionType.name,
                        attribute: mAttribute
                    });
                }
            });
        }
    };

    // This function is called after a lane has been processed
    TimelineController.prototype.finishLane = function (mLane) {
        // update total lane tile count
        mLane.tileCount = mLane.tiles.dated.length + mLane.tiles.undated.length;

        // Sort tiles by their start date (for the clustering and clustered tiles popover)
        if (mLane.interactions.length > 1) {
            // As interactions of the same type are sorted already
            // We need to sort only for more than one interaction type
            mLane.tiles.dated.sort(function (oTileA, oTileB) {
                return oTileA.start - oTileB.start;
            });
        }
    };

    // This function is called after all lanes have been processed
    TimelineController.prototype.finishDataProcessing = function (mResult) {
        // update show-dateless-interactions flag
        var bShowDatelessInteractions = false;
        mResult.lanes.forEach(function (mLane) {
            bShowDatelessInteractions = bShowDatelessInteractions || mLane.tiles.undated.length !== 0;
        });
        mResult.timeline.showDatelessInteractions = bShowDatelessInteractions;

        var leftZoomKey = this.getZoomKey(mResult, "leftZoom");
        var middleZoomKey = this.getZoomKey(mResult, "middleZoom");
        var rightZoomKey = this.getZoomKey(mResult, "rightZoom");
        var leftZoomRange = this.getZoomRangeForKey(mResult, leftZoomKey);
        var middleZoomRange = this.getZoomRangeForKey(mResult, middleZoomKey);
        var rightZoomRange = this.getZoomRangeForKey(mResult, rightZoomKey);

        this.zoomRanges = {
            leftZoom: leftZoomRange,
            middleZoom: middleZoomRange,
            rightZoom: rightZoomRange
        };

        var initialZoomButton = this.getZoomKey(mResult, "initialZoom");
        mResult.timeline.zoomLowerEdge = this.zoomRanges[initialZoomButton].lower;
        mResult.timeline.zoomUpperEdge = this.zoomRanges[initialZoomButton].upper;

        // FIXME: Move the conversion from here to a central place
        // - getMaximumZoomRange compares 4 events with today, which is local time
        // - the 4 events were parsed as ISO dates but are actually in local time with the wrong time zone (UTC)
        // - The Timeline extent is interpreted in local time (like all D3 scales and axes)
        var zoomRange = PatientData.getMaximumZoomRange(
            Utils.utcToLocal(mResult.masterdata.dob),
            Utils.utcToLocal(mResult.masterdata.dod),
            Utils.utcToLocal(this.firstEventDateSeen),
            Utils.utcToLocal(this.lastEventDateSeen));
        mResult.timeline.min = zoomRange.lower;
        mResult.timeline.max = zoomRange.upper;

        mResult.processed = true;
    };

    TimelineController.prototype.formatText = function (sText) {
        return jQuery.sap.formatMessage(sText, Array.prototype.slice.call(arguments, 1));
    };

    TimelineController.prototype.formatNoDataText = function () {
        return LibUtils.getText("HPH_PAT_CONTENT_NO_VALUE");
    };

    /**
     * Fixme: function duplicate for both overview and timeline tab
     *
     * Factory function to create TileAnnotations.
     * Creates TileAnnotations and adds Controls from extensions.
     * @private
     * @param   {string}               sId          Id of the new control
     * @param   {sap.ui.model.Context} oContext     BindingContext of the control
     * @param   {string}               sFunction    Name of the function to get the extension controls
     * @param   {object}               oTabControl  Tab control where extension Controls may bound themselves as dependency
     * @returns {sap.hc.hph.patient.app.ui.lib.TileAnnotation} New TileAnnotation control.
     */
    TimelineController.prototype._createAnnotations = function (sId, oContext, sFunction, oTabControl) {
        var sAnnotation = oContext.getProperty("annotation");
        var aValues = oContext.getProperty("values");
        return new TileAnnotation(sId, {
            name: sAnnotation,
            values: aValues,
            controls: this.getOwnerComponent().getExtensions(sAnnotation).reduce(function (aControls, mExtension) {
                var aExtensionControls;
                try {
                    aExtensionControls = mExtension.controller[sFunction](sAnnotation, aValues, oTabControl);
                } catch (oError) {
                    jQuery.sap.log.error("Patient Summary Extension \"" + mExtension.id + "\" threw an exception on " + sFunction + ": " + oError.message);
                }
                if (aExtensionControls && Array.isArray(aExtensionControls)) {
                    aExtensionControls.forEach(function (oControl) {
                        if (oControl instanceof sap.ui.core.Control) {
                            aControls.push(oControl);
                        }
                    });
                }
                return aControls;
            }, [])
        });
    };

    TimelineController.prototype.isEmpty = function (plottableAttributes) {
        return Array.isArray(plottableAttributes) && plottableAttributes.length === 0;
    };
    TimelineController.prototype.isNotEmpty = function (plottableAttributes) {
        return Array.isArray(plottableAttributes) && plottableAttributes.length > 0;
    };
    TimelineController.prototype.isNotEmptyAndNotHidden = function (plottableAttributes, bHidden) {
        return Array.isArray(plottableAttributes) && plottableAttributes.length > 0 && !bHidden;
    };
    TimelineController.prototype.hasNotPlottedAttributes = function (subLaneCount, plottableAttributeCount) {
        return typeof subLaneCount !== "undefined" &&
               typeof plottableAttributeCount !== "undefined" &&
               subLaneCount < plottableAttributeCount;
    };

    TimelineController.prototype.addChartTooltipFormatter = function (subLaneCount, plottableAttributeCount) {
        if (this.hasNotPlottedAttributes(subLaneCount, plottableAttributeCount)) {
            return Utils.getText("HPH_PAT_CONTENT_ADD_CHART_TOOLTIP");
        } else {
            return Utils.getText("HPH_PAT_CONTENT_ADD_CHART_NON_LEFT_TOOLTIP");
        }
    };

    TimelineController.prototype.createLane = function (sId, oContext) {
        var sLaneType = oContext.getProperty("laneType");
        if (sLaneType === "ChartLane") {
            var oChart = sap.ui.xmlfragment("hc.hph.patient.plugins.tabs.timeline.ui.view.Chart", this);
            var aPath = oContext.getPath().split("/");
            aPath.splice(-2);
            aPath.push("plotData");
            aPath.push(oContext.getProperty("interactionId"));
            oChart.bindProperty("data", {path: aPath.join("/")});
            return oChart;
        } else {
            if (sLaneType !== "InteractionLane") {
                jQuery.sap.log.error("Unknown lane type:", sLaneType);
            }
            return sap.ui.xmlfragment("hc.hph.patient.plugins.tabs.timeline.ui.view.Lane", this);
        }
    };

    TimelineController.prototype.handleUndatedBadgeClick = function (oEvent) {
        var oButton = oEvent.getSource();
        if (!this.undatedTilesPopover) {
            this.undatedTilesPopover = sap.ui.xmlfragment("hc.hph.patient.plugins.tabs.timeline.ui.view.UndatedTilesPopover", this);
            this.getView().addDependent(this.undatedTilesPopover);
        }
        this.undatedTilesPopover.bindElement(oButton.getBindingContext().getPath());
        this.undatedTilesPopover.openBy(oButton);
    };

    TimelineController.prototype.onOpenChartVisualizationDialog = function (oEvent) {
        var oSource = oEvent.getSource();
        var sBindingPath = oSource.getBindingContext().getPath();

        if (!this.chartSelectionDialog) {
            this.chartSelectionDialog = sap.ui.xmlfragment("hc.hph.patient.plugins.tabs.timeline.ui.view.ChartSelection", this);
            this.getView().addDependent(this.chartSelectionDialog);
        }
        this.chartSelectionDialog.bindElement(sBindingPath);
        this.chartSelectionDialog.openBy(oSource);
    };

    TimelineController.prototype.onOpenAddChartDialog = function (oEvent) {
        var oSource = oEvent.getSource();
        var sBindingPath = oSource.getBindingContext().getPath();

        if (!this.attributeSelectionDialog) {
            this.attributeSelectionDialog = sap.ui.xmlfragment("hc.hph.patient.plugins.tabs.timeline.ui.view.AttributeSelection", this);
            this.getView().addDependent(this.attributeSelectionDialog);
        }
        this.attributeSelectionDialog.bindElement(sBindingPath);
        this.attributeSelectionDialog.getContent()[0].removeSelections(true);
        this.attributeSelectionDialog.getSubHeader().getContent()[0].setValue();
        this.attributeSelectionDialog.getSubHeader().getContent()[0].fireLiveChange();
        this.attributeSelectionDialog.openBy(oSource);
        this.attributeSelectionDialog.$().find("input").attr("autocomplete", "off");
    };

    /**
     * Tile factory that returns a Tile object bound to a given model path
     * @param {any} sPath Model base path
     * @returns {sap.hc.hph.patient.app.ui.lib.Tile} Created Tile object
     */
    TimelineController.prototype.createTile = function (sPath) {
        return new Tile({
            name: "{" + sPath + "/name}",
            start: "{" + sPath + "/start}",
            end: "{" + sPath + "/end}",
            attributes: "{" + sPath + "/attributes}",
            annotations: {
                path: sPath + "/annotations",
                factory: TimelineController.prototype.createTimelineAnnotations.bind(this)
            }
        });
    };

    /**
     * Return the timestring for an array of Tiles.
     * @param   {sap.hc.hph.patient.app.ui.lib.Tile[]} aTiles Array of tiles to compute the timestring for
     * @returns {string} String containing the displayTime
     * @private
     */
    TimelineController.prototype.getTimeOfTiles = function (aTiles) {
        var iMinDate = Math.min.apply(null, aTiles.map(function (oTile) {
            return oTile.getStart();
        }));
        var iMaxDate = Math.max.apply(null, aTiles.map(function (oTile) {
            return oTile.getEnd();
        }));
        if (iMinDate !== iMaxDate) {
            return Utils.formatDate(new Date(iMinDate)) + " - " + Utils.formatDate(new Date(iMaxDate));
        } else {
            return Utils.formatDate(new Date(iMinDate));
        }
    };

    /**
     * Opens the tile popover and fills it with Tiles given its indices in the model
     * @param {object}   oArea TileArea or MiniTileArea to lock/unlock the anchor in the SVG (until it is closed)
     * @param {object}   oContext Binding context of the parent lane
     * @param {number[]} aTileIndices Array of indices of the tiles that should be shown in the popover
     * @param {object}   params TilePopoverContent parameters, e.g. title, time, color, ...
     * @param {object}   oDatapoint If available, datapoint that needs to be locked/unlocked in the SVG (as anchor)
     */
    TimelineController.prototype.openTilePopover = function (oArea, oContext, aTileIndices, params, oDatapoint) {
        var sTilesPath = oContext.getPath() + "/tiles/dated";
        params.content = aTileIndices.map(function (index) {
            var sPath = sTilesPath + "/" + index;
            var oTile = this.createTile(sPath);
            oTile.setModel(oContext.getModel());
            return oTile;
        }, this);

        if (!params.time || !params.title) {
            var oLane = oArea.getParent();
            params.time = TimelineController.prototype.getTimeOfTiles(params.content);
            params.title = aTileIndices.length > 1 ? oLane.getTitle() : "{" + sTilesPath + "/" + aTileIndices[0] + "/name}";
        }

        var oView = this.getView();
        var oPopover = new Popover({
            contentWidth: "240px",
            horizontalScrolling: false,
            placement: sap.m.PlacementType.Horizontal,
            showHeader: false,
            verticalScrolling: false,
            afterClose: function (oEvent2) {
                var oPopover2 = oEvent2.getSource();
                oView.removeDependent(oPopover2);
                oPopover2.destroy();
            },
            content: new TilePopoverContent(params)
        });
        var oDom = oArea.lockPoint(oDatapoint);
        // Attach a on-after-close handler to remove the point from the list of anchors we need to keep in the SVG
        oPopover.attachEventOnce("afterClose", function () {
            oArea.unlockPoint(oDatapoint);
        });
        oView.addDependent(oPopover);
        oPopover.openBy(oDom);
    };

    TimelineController.prototype.onTilePress = function (oEvent) {
        var oArea = oEvent.getParameter("area");
        var oContext = oArea.getBindingContext();
        var oDatapoint = oEvent.getParameter("datapoint");
        var aTileIndices = oEvent.getParameter("tileIndices").slice().reverse();

        this.openTilePopover(oArea, oContext, aTileIndices, {
            color: oEvent.getParameter("color"),
            count: oEvent.getParameter("count"),
            time: oEvent.getParameter("time"),
            title: oEvent.getParameter("title")
        }, oDatapoint);
    };

    TimelineController.prototype.handleDatapointClick = function (oEvent) {
        var oChart = oEvent.getSource();
        var oLane = oChart.getLane();
        var oMiniTilesArea = oLane.getContent().filter(function (oControl) {
            return oControl instanceof MiniTileArea;
        })[0];
        var oContext = oLane.getBindingContext();
        var oDatapoint = oEvent.getParameter("datapoint");
        var iTileIndex = oMiniTilesArea.getData().reduce(function (lastIndex, oTile, index) {
            return oMiniTilesArea.getTileKey(oTile) === oDatapoint._id ? index : lastIndex;
        }, -1);
        if (iTileIndex >= 0) {
            this.openTilePopover(oChart, oContext, [iTileIndex], {
                color: oChart.getColor(),
                count: 1
            }, oDatapoint);
        }
    };

    TimelineController.prototype.addChartLane = function (oContext) {
        var oAttribute = oContext.getObject();
        var aPath = oContext.getPath().split("/");

        // remove "plottable/<index>" suffix from path and get lane
        aPath.splice(-2, 2);
        var oLane = oContext.getModel().getProperty(aPath.join("/"));

        // create sublane array if necessary
        var sPath = aPath.join("/") + "/subLanes";
        if (!oLane.subLanes) {
            oContext.getModel().setProperty(sPath, []);
        }

        // add a new chart lane at the end of the lane's sublanes
        var sSublanePath = aPath.join("/") + "/subLanes/" + oLane.subLanes.length;

        oContext.getModel().setProperty(sSublanePath, {
            color: oLane.color,
            interactionId: oAttribute.interactionId,
            interactionName: oAttribute.interactionName,
            laneType: "ChartLane",
            mode: sap.hc.hph.patient.app.ui.lib.timeline.ChartMode.Line,
            plottableAttributes: [],
            subLanes: [],
            title: oAttribute.attribute.name,
            valueColumn: oAttribute.attribute.id
        });
    };

    TimelineController.prototype.onRemoveLane = function (oEvent) {
        var oButton = oEvent.getSource();
        var oContext = oButton.getBindingContext();
        var aPath = oContext.getPath().split("/");
        var iLaneIndex = parseInt(aPath.pop(), 10);

        // remove lane from array
        oContext.getProperty(aPath.join("/")).splice(iLaneIndex, 1);
        oContext.getModel().updateBindings();
    };

    TimelineController.prototype.onToggleMinimized = function (oEvent) {
        var oButton = oEvent.getSource();
        var oContext = oButton.getBindingContext();

        // toggle minimized boolean
        oContext.getModel().setProperty("minimized", !oContext.getProperty("minimized"), oContext);
    };

    TimelineController.prototype.onChartAttributeSelected = function (oEvent) {
        var oSource = oEvent.getSource();
        this.addChartLane(oSource.getSelectedContexts()[0]);
        this.attributeSelectionDialog.close();
    };

    TimelineController.prototype.onChartAttributeSearch = function (oEvent) {
        var listItems = this.attributeSelectionDialog.getContent()[0].getVisibleItems();
        var attributeListItems = listItems.filter(function (e) {
            return e.getMode() === "SingleSelectMaster";
        });
        // This is the only way to distinguish an enter-press in an empty search field from pressing the X-button
        if (oEvent.getParameter("refreshButtonPressed") === false) {
            if (attributeListItems.length > 0) {
                this.addChartLane(attributeListItems[0].getBindingContext());
                this.attributeSelectionDialog.close();
            }
        }
    };

    TimelineController.prototype.onChartAttributeLiveChange = function (oEvt) {
        var oSource = oEvt.getSource();
        var sBindingPath = oSource.getBindingContext().getPath();
        var oModel = oSource.getModel();

        // add filter for search
        var aFilters = [];
        var sQuery = oEvt.getSource().getValue();
        if (sQuery && sQuery.length > 0) {
            var filter = new Filter("attribute/name", sap.ui.model.FilterOperator.Contains, sQuery);
            aFilters.push(filter);
        }

        // add filter for not used

        var subLanes = oModel.getProperty(sBindingPath + "/subLanes") || [];

        var notPlottedFilter = new Filter("", function (oValue) {
            function matchingSubLane(oLane) {
                return oLane.interactionId === oValue.interactionId &&
                       oLane.valueColumn === oValue.attribute.id;
            }
            return subLanes.filter(matchingSubLane).length === 0;
        });
        aFilters.push(notPlottedFilter);

        // update list binding
        var list = this.attributeSelectionDialog.getContent()[0];
        var binding = list.getBinding("items");
        binding.filter([new Filter({
            filters: aFilters,
            and: true
        })], "Application");
    };

    TimelineController.prototype.getAttributeSelectionGroupHeader = function (oGroup) {
        return new GroupHeaderListItem({
            title: oGroup.key,
            upperCase: false
        });
    };

    TimelineController.prototype.resetSettings = function () {
        // 1. Reset timeline model
        var oTimelineModel = this.getPatientModel();
        var aLanes = oTimelineModel.getProperty("/lanes");
        aLanes.forEach(function (oLane) {
            oLane.visible = true;
            oLane.minimized = false;
            oLane.subLanes = [];
            oLane.rank = oLane.defaultRank;
        });
        aLanes.sort(function comp(a, b) {
            return a.rank - b.rank;
        });
        var initialZoomButton = oTimelineModel.getProperty("/inspectorOptions/timeline/zoom/initialZoom");
        this.byId("timelineQuickZoomButtons").setSelectedKey(initialZoomButton);
        this.setZoomRanges(initialZoomButton);
        oTimelineModel.updateBindings();
    };

    TimelineController.prototype.onExit = function () {
        if (this.attributeSelectionDialog) {
            this.attributeSelectionDialog.destroy();
        }
        if (this.chartSelectionDialog) {
            this.chartSelectionDialog.destroy();
        }
    };

    /**
     * Factory function to create TileAnnotations for the Timeline.
     * Creates TileAnnotations and adds Controls from extensions.
     * @private
     * @param   {string}               sId       Id of the new control
     * @param   {sap.ui.model.Context} oContext  BindingContext of the control
     * @returns {sap.hc.hph.patient.app.ui.lib.TileAnnotation} New TileAnnotation control.
     */
    TimelineController.prototype.createTimelineAnnotations = function (sId, oContext) {
        return this._createAnnotations(sId, oContext, "getTimelineControls", this.getView());
    };

    TimelineController.prototype.onTileAreaScaleChange = function (oEvent) {
        var oContext = oEvent.getSource().getBindingContext();
        var oScale = oEvent.getParameter("scale");
        var oLane = oEvent.getSource().getParent();
        var aTiles = oLane.getBindingContext().getObject("tiles/dated");
        var aClusters = ClusterTiles.clusterTiles(aTiles, oScale, oLane.getTitle());
        oContext.getModel().setProperty("clusters", aClusters, oContext);
    };

    TimelineController.prototype.onTimelineZoomControlUpdate = function () {
        this.byId("timelineQuickZoomButtons").setSelectedButton("invalid");
        this.getPatientModel().setProperty("/timeline/zoomLowerEdge", null);
        this.getPatientModel().setProperty("/timeline/zoomUpperEdge", null);
    };

    TimelineController.prototype.setZoomRanges = function (sSelectedZoomRangeKey) {
        var zoomRange = this.zoomRanges[sSelectedZoomRangeKey];
        this.getPatientModel().setProperty("/timeline/zoomLowerEdge", zoomRange.lower);
        this.getPatientModel().setProperty("/timeline/zoomUpperEdge", zoomRange.upper);
    };

    TimelineController.prototype.quickZoomPressed = function (oEvent) {
        var sSelectedKey = oEvent.getParameters().key;
        this.setZoomRanges(sSelectedKey);
    };

    /**
     * Computes lower and upper zoom boundaries for the given zoom option.
     *
     * @param   {object} oModelData    - object with with patient model structure (config + patient data)
     * @param   {any}    sKey          - key of zoom option
     * @returns {object}               - returns object with properties "lower" and "upper"
     */
    TimelineController.prototype.getZoomRangeForKey = function (oModelData, sKey) {
        switch (sKey) {
            case "1m":
                return this._getZoomRangeLastMonths(1);
            case "3m":
                return this._getZoomRangeLastMonths(3);
            case "6m":
                return this._getZoomRangeLastMonths(6);
            case "1y":
                return this._getZoomRangeLastYears(1);
            case "3y":
                return this._getZoomRangeLastYears(3);
            case "5y":
                return this._getZoomRangeLastYears(5);
            case "lifespan":
                return this._getZoomRangeLifespan(oModelData);
            case "interactions":
                return this._getZoomRangeInteractions(oModelData);
            case "firstDOD":
                return this._getZoomRangeFirstDOD(oModelData);
            default:
                jQuery.sap.log.error("Unsupported quick zoom level");
        }
    };

    TimelineController.prototype._getZoomRangeLastYears = function (iYears) {
        return this._getZoomRangeTimeBased(iYears, "years");
    };

    TimelineController.prototype._getZoomRangeLastMonths = function (iMonths) {
        return this._getZoomRangeTimeBased(iMonths, "months");
    };

    TimelineController.prototype._getZoomRangeTimeBased = function (iAmount, sTimeUnit) {
        var today = new Date();
        var min = new Date();

        if (sTimeUnit === "years") {
            min.setYear(today.getFullYear() - iAmount);
        } else if (sTimeUnit === "months") {
            min.setMonth(today.getMonth() - iAmount);
        }

        var rangePadding = Timeline.RANGE_PADDING;
        var range = today.getTime() - min.getTime();
        var max = new Date(today.getTime() + range * rangePadding);
        return {
            lower: min,
            upper: max
        };
    };

    TimelineController.prototype._getZoomRangeLifespan = function (oModelData) {
        var dob = oModelData.masterdata.dob;
        var dod = oModelData.masterdata.dod;
        var zoomRange = PatientData.getLifespanZoomRange(
            Utils.utcToLocal(dob),
            Utils.utcToLocal(dod));
        return zoomRange;
    };

    TimelineController.prototype._getZoomRangeInteractions = function (oModelData) {
        var dob = oModelData.masterdata.dob;
        var dod = oModelData.masterdata.dod;
        var zoomRange = PatientData.getInteractionsZoomRange(
            Utils.utcToLocal(dob),
            Utils.utcToLocal(dod),
            Utils.utcToLocal(this.firstEventDateSeen),
            Utils.utcToLocal(this.lastEventDateSeen));
        return zoomRange;
    };

    TimelineController.prototype._getZoomRangeFirstDOD = function (oModelData) {
        var dob = oModelData.masterdata.dob;
        var dod = oModelData.masterdata.dod;
        var zoomRange = PatientData.getFirstDODZoomRange(
            Utils.utcToLocal(dob),
            Utils.utcToLocal(dod),
            Utils.utcToLocal(this.firstEventDateSeen));
        return zoomRange;
    };

    return TimelineController;
});
