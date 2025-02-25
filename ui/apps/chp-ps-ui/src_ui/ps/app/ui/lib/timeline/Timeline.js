sap.ui.define([
    "jquery.sap.global",
    "sap/hc/hph/patient/app/ui/lib/utils/Utils",
    "sap/ui/core/Control",
    "sap/ui/core/format/DateFormat",
    "sap/ui/core/LocaleData",
    "sap/ui/thirdparty/d3",
    "sap/ui/thirdparty/jqueryui/jquery-ui-effect",
    "sap/ui/thirdparty/jqueryui/jquery-ui-core",
    "sap/ui/thirdparty/jqueryui/jquery-ui-widget",
    "sap/ui/thirdparty/jqueryui/jquery-ui-mouse",
    "sap/ui/thirdparty/jqueryui/jquery-ui-sortable"
], function (jQuery, Utils, Control, DateFormat, LocaleData) {
    "use strict";

    /**
     * Constructor for a new Timeline.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * The Timeline control shows patient interactions as Tiles according to start and end date
     * grouped into several Lanes.
     * @extends sap.ui.core.Control
     * @alias sap.hc.hph.patient.app.ui.lib.timeline.Timeline
     */
    var Timeline = Control.extend("sap.hc.hph.patient.app.ui.lib.timeline.Timeline", {
        metadata: {
            library: "sap.hc.hph.patient.app.ui.lib",
            properties: {
                /**
                 * The patient's date of birth ruler text.
                 */
                todayText: {
                    type: "string",
                    group: "Appearance",
                    defaultValue: ""
                },
                /**
                 * The patient's date of birth line tooltip.
                 */
                todayTooltip: {
                    type: "string",
                    group: "Appearance",
                    defaultValue: ""
                },
                /**
                 * The patient's date of birth as Date object.
                 */
                dateOfBirth: {
                    type: "object",
                    group: "Data"
                },
                /**
                 * The patient's date of birth ruler text.
                 */
                dateOfBirthText: {
                    type: "string",
                    group: "Appearance",
                    defaultValue: ""
                },
                /**
                 * The patient's date of birth line tooltip.
                 */
                dateOfBirthTooltip: {
                    type: "string",
                    group: "Appearance",
                    defaultValue: ""
                },
                /**
                 * The patient's date of death as Date object.
                 */
                dateOfDeath: {
                    type: "object",
                    group: "Data"
                },
                /**
                 * The patient's date of death ruler text.
                 */
                dateOfDeathText: {
                    type: "string",
                    group: "Data",
                    defaultValue: ""
                },
                /**
                 * The patient's date of death line tooltip.
                 */
                dateOfDeathTooltip: {
                    type: "string",
                    group: "Data",
                    defaultValue: ""
                },
                /**
                 * Minimum date of range.
                 * The default start date of the date range: Current timestamp minus 1 year.
                 */
                dateRangeMin: {
                    type: "object",
                    group: "Data",
                    defaultValue: new Date(new Date().setFullYear(new Date().getFullYear() - 1))
                },
                /**
                 * Maximum date of range.
                 * The default end date of the date range: Current timestamp plus 1 year.
                */
                dateRangeMax: {
                    type: "object",
                    group: "Data",
                    defaultValue: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
                },
                /**
                 * Lower edge of zoom.
                 * The lower edge of the zoom: a date to be determined by the set quick zoom option
                 */
                zoomLowerEdge: {
                    type: "object",
                    group: "Data"
                },
                /**
                 * Upper edge of zoom.
                 * The upper edge of the zoom: a date to be determined by the set quick zoom option
                */
                zoomUpperEdge: {
                    type: "object",
                    group: "Data"
                },
                /**
                 * Show dateless interactions in an extra column on the right of all lane headers.
                 */
                showDatelessInteractions: {
                    type: "boolean",
                    group: "Appearance",
                    defaultValue: false
                },
                /**
                 * Show dateless interactions in an extra column on the right of all lane headers.
                 */
                datelessInteractionsTooltip: {
                    type: "string",
                    group: "Appearance",
                    defaultValue: ""
                }
            },
            defaultAggregation: "lanes",
            aggregations: {
                /**
                 * The Lanes for this Timeline.
                 */
                lanes: {
                    type: "sap.hc.hph.patient.app.ui.lib.timeline.LaneBase",
                    multiple: true,
                    bindable: "bindable"
                },
                minimap: {
                    type: "sap.hc.hph.patient.app.ui.lib.timeline.Minimap",
                    multiple: false,
                    bindable: "bindable"
                }
            },
            events: {
                /**
                 * Event is fired when the user induces change of the viewport
                 */
                timelineZoomControlUpdate: {}
            }
        }
    });

    var oLocaleData = new LocaleData(sap.ui.getCore().getConfiguration().getLocale());

    /** @constant {number} Percentage size of one zoom and pan step. */
    Timeline.STEP_SIZE = 0.1;

    /** @constant {number} Inverse of the {@link STEP_SIZE}. */
    // When zooming in, the viewport borders are shifted by a STEP_SIZE fraction to the inner.
    // Hence, the new extent is reduced twice and the relative size factor is (1 - 2 * Timeline.STEP_SIZE).
    // When zooming out, the STEP_SIZE is applied to the smaller extent which we have to correct accordingly.
    Timeline.INVERSE_STEP_SIZE = Timeline.STEP_SIZE / (1 - 2 * Timeline.STEP_SIZE);

    /** @constant {number} Minimum range of viewport Time. Equals 1 day. */
    Timeline.TIMERANGE_MIN = 86400000;

    /** @constant {number} Padding beyond the date range on either side as ratio.
     * It extends the maximal viewport range by this ratio. The minimap domain will be extended by 2x of this factor. */
    Timeline.RANGE_PADDING = 0.1;

    /** @constant {number} Outer margin size of the bracket around the timeline and minimap.
     * This margin is used to include the handles of the minimap extend rectangle. */
    Timeline.TIMELINE_BRACKET_MARGIN = 8;

    /** @constant {number} Size of the resize handles in the minimap. */
    Timeline.MINIMAP_HANDLE_WIDTH = 14;

    /** @constant {number} Maximal height of the resize hande in the minimap. */
    Timeline.MINIMAP_MAX_HANDLE_HEIGHT = 40;

    /** @constant {number} Minimal vertical margin above and below the resize hande in the minimap. */
    Timeline.MINIMAP_MIN_HANDLE_MARGIN = 5;

    /** @constant {number} Size of the resize handle ticks in the minimap. */
    Timeline.MINIMAP_HANDLE_TICK_SIZE = 5;

    /** @constant {number} Distance of the resize handle ticks in the minimap. */
    Timeline.MINIMAP_HANDLE_TICK_DISTANCE = 5;

    /** @constant {number} Space reserved left and right of the DOB tick to be used for the DOB label and date. */
    Timeline.DOB_PADDING = 70;

    /** @constant {number} Space reserved left and right of the DOD tick to be used for the DOB label and date. */
    Timeline.DOD_PADDING = 70;

    /**
     * Initialize the Timeline.
     * Create d3 objects: scale, axis and zoom.
     * The zoom extent is between 100 years and 1 day.
     * @override
     * @protected
     */
    Timeline.prototype.init = function () {
        this.d3mapScale = d3.time.scale();
        this._updateDateRange();

        this.dViewportMin = new Date(this.getDateRangeMin().getTime() - this.iDateRangePadding);
        this.dViewportMax = new Date(this.getDateRangeMax().getTime() + this.iDateRangePadding);

        this._d3scale = d3.time.scale();
        this.d3zoomScale = d3.time.scale();
        this.d3UpperAxis = d3.svg.axis()
            .scale(this._d3scale)
            .orient("top")
            .tickSize(0);
        this.d3LowerAxis = d3.svg.axis()
            .scale(this._d3scale)
            .orient("top")
            .tickSize(12);

        this._d3zoom = d3.behavior.zoom()
            .on("zoom", this._onZoomUpdate.bind(this))
            .on("zoomend", this._updateZoom.bind(this));

        this.d3brush = d3.svg.brush()
            .x(this.d3mapScale)
            .on("brush", this._onBrushed.bind(this))
            .on("brushend", this._onBrushEnd.bind(this));

        var that = this;
        sap.ui.core.ResizeHandler.register(this, function () {
            that._updateScales();
            that._renderTimeAxis();
            that.getMinimap().rerender();
            that.getLanes().forEach(function (oLane) {
                oLane.setScale(this.getScale());
            }, that);
            // Set the height on the svg and parent (both to prevent overflow)
            d3.select(that.getDomRef()).select(".sapTlTimelineMinimapPlaceholder")
                .style("height", that.getMinimap().getHeight() + "px")
                .select("svg")
                .attr("height", that.getMinimap().getHeight());
            that._renderMinimapBracket();
        });
    };

    /**
     * Adjust the date of birth time to be displayed in UTC instead of browser local
     * @override
     */
    Timeline.prototype.getDateOfBirth = function () {
        return Utils.utcToLocal(this.getProperty("dateOfBirth"));
    };

    /**
     * Adjust the date of death time to be displayed in UTC instead of browser local
     * @override
     */
    Timeline.prototype.getDateOfDeath = function () {
        return Utils.utcToLocal(this.getProperty("dateOfDeath"));
    };

    Timeline.prototype._updateScales = function () {
        var oAreaRight = this.$("area-right");
        this._d3scale
            .range([0, oAreaRight.width()]);
        this.d3zoomScale
            .range([oAreaRight.position().left, oAreaRight.position().left + oAreaRight.width()]);
        this.d3mapScale
            .range([0, this.$().find(".sapTlTimelineMinimapPlaceholder svg").width()]);
    };

    /**
     * This functions replaces an internal jQuery function (jQuery.ui.sortable.prototype._intersectsWithPointer) to fix a bug
     * where first and last elements in a sortable list may not be reachable as the target of a drag-and-drop operation.
     * This is the the case when user clicks the top/bottom part of a large item and moves it down/up.
     *
     * The bug is fixed by replacing the current mouse position with the position of the helper object's top and
     * bottom border for vertical "up" and "down" movements, respectively. The function below was copied verbatim from
     * jQuery.ui.sortable.prototype._intersectsWithPointer (version: jQuery UI Sortable 1.10.4). The only line that was changed
     * is marked by a comment.
     *
     *   List      Original Implementation         Replacement Implementation
     *   -------
     *   |     |   Dragged Item  ("Helper")        Dragged Item ("Helper")
     *   |item |   -------                         -------  <-- upper border determines intersection
     *   |     |   |     |       mouse click       |     |      for "up" moves
     *   -------   | *   | <--   position          |     |
     *   |     |   |     |       determines        |     |
     *   |item |   -------       intersection      -------  <-- lower border determines intersection
     *   |     |                                                for "down" moves
     *   -------
     *   |     |
     *   |item |
     *   |     |
     *   -------
     *
     * @param {object} item sortable item that is checked for interaction with the current pointer
     * @returns {boolean} true if intersection found; otherwise false
     * @private
     */
    Timeline.prototype._jQuerySortableIntersectsWithPointer = function (item) {
        function isOverAxis(x, reference, size) {
            return x > reference && x < reference + size;
        }

        var verticalDirection = this._getDragVerticalDirection();
        var horizontalDirection = this._getDragHorizontalDirection();

        // the next line was patched to use helper elements upper/lower border position
        var isOverElementHeight = this.options.axis === "x" || isOverAxis(this.positionAbs.top + (verticalDirection === "down" ? this.helperProportions.height : 0), item.top, item.height);
        var isOverElementWidth = this.options.axis === "y" || isOverAxis(this.positionAbs.left + this.offset.click.left, item.left, item.width);
        var isOverElement = isOverElementHeight && isOverElementWidth;

        if (!isOverElement) {
            return false;
        }

        if (this.floating) {
            return horizontalDirection === "right" || verticalDirection === "down" ? 2 : 1;
        } else {
            return verticalDirection && (verticalDirection === "down" ? 2 : 1);
        }
    };

    /**
     * Updates the model with order of the dom elements.
     * Used when changing the lane order via drag and drop.
     * @private
     */
    Timeline.prototype._applyDomOrderToModel = function () {
        var oBinding = this.getBinding("lanes");
        var aNewList = this.getLanes();

        function getLaneIndex(oLane) {
            var oDomRef = oLane.getDomRef();
            if (!oDomRef) {
                // If no DOM node was found, look for the invisible placeholder node
                oDomRef = jQuery.sap.domById(sap.ui.core.RenderPrefixes.Invisible + oLane.getId());
            }
            return jQuery(oDomRef).index();
        }

        aNewList.sort(function (a, b) {
            return getLaneIndex(a) - getLaneIndex(b);
        });

        aNewList = aNewList.map(function (oLane, rank) {
            var oData = oLane.getBindingContext().getObject();
            oData.rank = rank;
            return oData;
        });

        oBinding.getModel().setProperty(oBinding.getPath(), aNewList, oBinding.getContext());
        this.rerender();
    };

    /**
     * Reevaluates whether drag'n'drop of sublanes should be enabled.
     */
    Timeline.prototype.updateDragAndDrop = function () {
        var sIdSelector = "#" + this.getIdForLabel();
        var nVisibleLanes = this.getLanes().reduce(function (counter, oLane) {
            return oLane.getVisible() ? counter + 1 : counter;
        }, 0);
        jQuery(sIdSelector + " .sapTlTimelineLanes").sortable("option", "disabled", nVisibleLanes < 2);
    };

    /**
     * Uses jQuery sortable to allow changing the attribute order via drag and drop.
     */
    Timeline.prototype._enableDragAndDrop = function () {
        var sIdSelector = "#" + this.getIdForLabel();
        var that = this;
        jQuery(sIdSelector + " .sapTlTimelineLanes").sortable({
            axis: "y",
            containment: "parent",
            delay: 200,
            distance: 0,
            handle: ".sapTlTimelineLaneHeader",
            items: "> .sapTlTimelineLaneFamily",
            scroll: false, // we disable scrolling support, as jQuery doesn't work correctly here
            tolerance: "pointer",
            update: this._applyDomOrderToModel.bind(this),
            zIndex: 4
        })
            .disableSelection()
            .each(function (index, element) {
            // overwrite internal jQuery function to fix bug (see replacement function's comment above)
                jQuery(element).data("uiSortable")._intersectsWithPointer = that._jQuerySortableIntersectsWithPointer;
            });
        // Fix for IE and Firefox where the area wouldn't get the focus on click (swallowed by sortable)
        jQuery(sIdSelector + " .sapTlTimelineLanes").click(function () {
            that.$("area").focus();
        });
        this.updateDragAndDrop();
    };

    /**
     * Set formatters for date and time to guarantee the re-rendering of the timeline with changed formatters (in case of format changes).
     * @override
     * @protected
     */
    Timeline.prototype.onBeforeRendering = function () {
        if (Utils.loadUserPreferences().state() === "resolved") {
            this.oDateFormatter = Utils.getDateFormatter();
            this.oTimeFormatter = Utils.getTimeFormatter();
        } else {
            this.oDateFormatter = DateFormat.getDateInstance();
            this.oTimeFormatter = DateFormat.getTimeInstance();
        }
    };

    /**
     * Call d3 objects after rendering.
     * Set the scale range based on the width of the Lanes div and the domain based on the specified viewport dates.
     * Render the top bar containing ruler and perform an initial clustering of the Tiles.
     * @override
     * @protected
     */
    Timeline.prototype.onAfterRendering = function () {
        var oAreaRight = this.$("area-right");

        this._updateScales();

        // The following part creates a zoom handler that is limited to the lane area of the timeline
        // as we have to bind the zoom handler to the root div of the timeline which clashes with
        // JQuery's sortable behaviour on the left, i.e. both behaviors are active there and neither can
        // D3 otherwise be limited to the right area (in "zoomstart" we cannot stop the zoom event) nor
        // can JQuery's sortable being stopped from bubbling up of the events after it handles them.
        //
        // Our solution:
        // We define a mocked DOM element to attach D3's zoom handlers to. After having them we wrap our
        // own D3 event handler around it that checks whether the event was started in the right area.
        // If so, the corresponding original zoom handler will be called.

        // 1. Extract D3 zoom handlers
        var oZoomHandlers = {};
        var oMockedDOM = {};
        oMockedDOM.on = function (sEvent, fHandler) {
            oZoomHandlers[sEvent] = fHandler;
            return this;
        }.bind(oMockedDOM);
        this._d3zoom(oMockedDOM);

        // 2. Factory that creates our own zoom handlers
        function zoomProxyHandler(sEvent) {
            return function () {
                if (d3.mouse(this)[0] >= oAreaRight.position().left) {
                    return oZoomHandlers[sEvent].apply(this, arguments);
                }
            };
        }

        // 3. Mocked zoom object to attach our handlers to the target area
        function zoomProxy(g) {
            for (var sEvent in oZoomHandlers) {
                // disable doubleclick zoom step
                if (sEvent !== "dblclick.zoom") {
                    g.on(sEvent, zoomProxyHandler(sEvent));
                }
            }
            // Always restore proxies, as D3 overloads the event handlers during event handling
            g.on("mouseup.restoreProxies", function () {
                zoomProxy(g);
            });
            g.on("touchend.restoreProxies", function () {
                zoomProxy(g);
            });
        }

        this.setViewport(this.dViewportMin, this.dViewportMax, true);
        d3.select(this.$("area").get(0))
            .call(zoomProxy);

        this._renderMinimapBracket();
        this._enableDragAndDrop();
    };

    /**
     * Handler for keyboard arrow down without modifiers.
     * @private
     * @param {object} oEvent jQuery Event
     */
    Timeline.prototype.onsapdown = function (oEvent) {
        if (oEvent.srcControl === this) {
            this.zoomOut();
            oEvent.preventDefault();
        }
    };

    /**
     * Handler for keyboard arrow left without modifiers.
     * @private
     * @param {object} oEvent jQuery Event
     */
    Timeline.prototype.onsapleft = function (oEvent) {
        if (oEvent.srcControl === this) {
            if (sap.ui.getCore().getConfiguration().getRTL()) {
                this.panRight();
            } else {
                this.panLeft();
            }
            oEvent.preventDefault();
        }
    };

    /**
     * Handler for keyboard minus without modifiers.
     * @private
     * @param {object} oEvent jQuery Event
     */
    Timeline.prototype.onsapminus = function (oEvent) {
        if (oEvent.srcControl === this) {
            this.zoomOut();
            oEvent.preventDefault();
        }
    };

    /**
     * Handler for keyboard plus without modifiers.
     * @private
     * @param {object} oEvent jQuery Event
     */
    Timeline.prototype.onsapplus = function (oEvent) {
        if (oEvent.srcControl === this) {
            this.zoomIn();
            oEvent.preventDefault();
        }
    };

    /**
     * Handler for keyboard arrow right without modifiers.
     * @private
     * @param {object} oEvent jQuery Event
     */
    Timeline.prototype.onsapright = function (oEvent) {
        if (oEvent.srcControl === this) {
            if (sap.ui.getCore().getConfiguration().getRTL()) {
                this.panLeft();
            } else {
                this.panRight();
            }
            oEvent.preventDefault();
        }
    };

    /**
     * Handler for keyboard arrow up without modifiers.
     * @private
     * @param {object} oEvent jQuery Event
     */
    Timeline.prototype.onsapup = function (oEvent) {
        if (oEvent.srcControl === this) {
            this.zoomIn();
            oEvent.preventDefault();
        }
    };

    /**
     * Returns the DOM Element that should get the focus.
     * Returns the lane area of the Timeline.
     * @protected
     * @override
     * @returns {HTMLElement} DOM Element that should get focus.
     */
    Timeline.prototype.getFocusDomRef = function () {
        return this.$("area-right").get(0);
    };

    /**
     * Return the scale used by the Timeline so the child controls can share it.
     * @returns {d3.time.scale} d3 time scale
     */
    Timeline.prototype.getScale = function () {
        return this._d3scale;
    };

    /**
     * Return a map of texts needed for rendering.
     * @returns {object} Object with texts.
     */
    Timeline.prototype.getTexts = function () {
        var dToday = new Date();
        var dDOB = this.getDateOfBirth();
        var dDOD = this.getDateOfDeath();

        return {
            todayLabel: this.getTodayText(),
            dobLabel: this.getDateOfBirthText(),
            dodLabel: this.getDateOfDeathText(),
            todayTooltip: jQuery.sap.formatMessage(this.getTodayTooltip(), this.oDateFormatter.format(dToday)),
            dobTooltip: jQuery.sap.formatMessage(this.getDateOfBirthTooltip(), dDOB ? this.oDateFormatter.format(dDOB) : ""),
            dodTooltip: jQuery.sap.formatMessage(this.getDateOfDeathTooltip(), dDOD ? this.oDateFormatter.format(dDOD) : "")
        };
    };

    /**
     * Move the viewport to the left by one {@link STEP_SIZE}.
     */
    Timeline.prototype.panLeft = function () {
        this._updateViewport(-Timeline.STEP_SIZE, -Timeline.STEP_SIZE);
    };

    /**
     * Move the viewport to the right by one {@link STEP_SIZE}.
     */
    Timeline.prototype.panRight = function () {
        this._updateViewport(Timeline.STEP_SIZE, Timeline.STEP_SIZE);
    };

    /**
     * Reset the zoom and position of the Tiles to the default.
     */
    Timeline.prototype.resetZoom = function () {
        if (this.getZoomLowerEdge() && this.getZoomUpperEdge()) {
            var iZoomRangePadding = (this.getZoomUpperEdge().getTime() - this.getZoomLowerEdge().getTime()) * Timeline.RANGE_PADDING;
            this.setViewport(this.getZoomLowerEdge().getTime() - iZoomRangePadding, this.getZoomUpperEdge().getTime() + iZoomRangePadding);
        } else {
            this.setViewport(this.getDateRangeMin().getTime() - this.iDateRangePadding, this.getDateRangeMax().getTime() + this.iDateRangePadding);
        }
    };

    /**
     * Set the viewport to center on a given date.
     * Does not affect the zoom level.
     * @param {Date} dCenter Date of the new viewport center.
     */
    Timeline.prototype.scrollToDate = function (dCenter) {
        // When focussing a Tile, the browser might scrolls the lanes, which has to be undone
        var iHalf = (this.dViewportMax.getTime() - this.dViewportMin.getTime()) / 2;
        this.setViewport(dCenter.getTime() - iHalf, dCenter.getTime() + iHalf);
    };

    /**
     * Set the minimum date of the display range.
     * Also updates the viewport to the default display.
     * @override
     * @param {Date} dDateRangeMin Minimum date of range
     */
    Timeline.prototype.setDateRangeMin = function (dDateRangeMin) {
        if (dDateRangeMin) {
            this.setProperty("dateRangeMin", dDateRangeMin, false);
            this._updateDateRange();
            this.resetZoom();
        }
    };

    /**
     * Set the maximum date of the display range.
     * Also updates the viewport to the default display.
     * @override
     * @param {Date} dDateRangeMax Maximum date of range
     */
    Timeline.prototype.setDateRangeMax = function (dDateRangeMax) {
        if (dDateRangeMax) {
            this.setProperty("dateRangeMax", dDateRangeMax, false);
            this._updateDateRange();
            this.resetZoom();
        }
    };

    /**
     * Set the lower edge of the zoom range.
     * Also updates the viewport to the new zoom range.
     * @override
     * @param {Date} dZoomLowerEdge Minimum date of range
     */
    Timeline.prototype.setZoomLowerEdge = function (dZoomLowerEdge) {
        if (dZoomLowerEdge) {
            this.setProperty("zoomLowerEdge", dZoomLowerEdge, false);
            this.resetZoom();
        }
    };

    /**
     * Set the upper edge of the zoom range.
     * Also updates the viewport to the new zoom range.
     * @override
     * @param {Date} dZoomUpperEdge Maximum date of range
     */
    Timeline.prototype.setZoomUpperEdge = function (dZoomUpperEdge) {
        if (dZoomUpperEdge) {
            this.setProperty("zoomUpperEdge", dZoomUpperEdge, false);
            this.resetZoom();
        }
    };

    /**
     * Zoom in the viewport by one {@link STEP_SIZE}.
     */
    Timeline.prototype.zoomIn = function () {
        this._updateViewport(Timeline.STEP_SIZE, -Timeline.STEP_SIZE);
    };

    /**
     * Zoom out the viewport by one {@link INVERSE_STEP_SIZE}.
     */
    Timeline.prototype.zoomOut = function () {
        this._updateViewport(-Timeline.INVERSE_STEP_SIZE, Timeline.INVERSE_STEP_SIZE);
    };

    /**
     * Return the scale used by the Minimap so the child controls can share it.
     * @returns {d3.time.scale} d3 time scale
     */
    Timeline.prototype.getMinimapScale = function () {
        return this.d3mapScale;
    };

    /**
     * Draw the minimap with d3.
     * @private
     */
    Timeline.prototype._renderMinimapBracket = function () {
        // Create a minimap handle with round edges and horizontal ticks (small lines)
        function appendHandle(selection, handleOffset, handleHeight) {
            //
            //              -
            //              |
            //              | handleOffset
            //              |
            //     .-.      -
            //     |=|      |
            //     |=|      | handleHeight
            //     |=|      |
            //     '-'      -
            //

            function shiftY(y) {
                return handleOffset + y;
            }

            var group = selection.append("g")
                .classed("sapTlTimelineMapHandle", true);

            // draw border of handle as rectangle with round edges
            group.append("rect")
                .attr("x", -Timeline.MINIMAP_HANDLE_WIDTH / 2)
                .attr("y", handleOffset + 0.5)
                .attr("width", Timeline.MINIMAP_HANDLE_WIDTH)
                .attr("height", handleHeight - 1)
                .attr("rx", 7);

            // draw horizontal ticks
            var tickPadding = 2 * Timeline.MINIMAP_HANDLE_TICK_DISTANCE;
            group.selectAll("line")
                // use range() to generate an array of y-values for the ticks
                .data(d3.range(
                    tickPadding,
                    handleHeight + 1 - tickPadding,
                    Timeline.MINIMAP_HANDLE_TICK_DISTANCE))
                .enter()
                .append("line")
                .attr("x1", -Timeline.MINIMAP_HANDLE_TICK_SIZE / 2)
                .attr("x2", Timeline.MINIMAP_HANDLE_TICK_SIZE / 2)
                .attr("y1", shiftY)
                .attr("y2", shiftY);
        }

        if (!this.getMinimap()) {
            return;
        }

        var iMinimapHeight = this.getMinimap().getHeight();
        var iHandleHeight = Math.min(iMinimapHeight - 2 * Timeline.MINIMAP_MIN_HANDLE_MARGIN, Timeline.MINIMAP_MAX_HANDLE_HEIGHT);

        // Set the height on the svg and parent (both to prevent overflow)
        var d3handles = d3.select(this.getDomRef()).select(".sapTlTimelineMinimapPlaceholder")
            .style("height", iMinimapHeight + "px")
            .select("svg")
            .attr("height", iMinimapHeight);

        var nHeight = jQuery("#" + this.getId() + " .sapTlTimelineLaneAreaPointsInTime").height() - 1;
        var d3svg = d3.select(this.getDomRef()).select(".sapTlTimelineBracket");

        // 1. We increase the minimap height by one pixel and shift the tiles down by one pixel to remove an otherwise visible blank line
        iMinimapHeight += 1;
        d3svg = d3svg.select("g");
        d3svg.select(".sapTlTimelineMap")
            .attr("transform", "translate(0," + nHeight + ")");

        // Add the brush itself as invisible element
        d3handles.selectAll("g").remove();
        var d3brushG = d3handles.append("g")
            .classed("sapTlTimelineMapBrush", true)
            .call(this.d3brush);

        // Set the height of all brush elements
        d3brushG.selectAll("rect")
            .attr("height", iMinimapHeight);

        // Move the resize handles "outside" of the brush
        d3brushG.select(".resize.e rect")
            .attr("x", -Timeline.MINIMAP_HANDLE_WIDTH / 2)
            .attr("width", Timeline.MINIMAP_HANDLE_WIDTH);

        d3brushG.select(".resize.w rect")
            .attr("x", -Timeline.MINIMAP_HANDLE_WIDTH / 2)
            .attr("width", Timeline.MINIMAP_HANDLE_WIDTH);


        var handleOffset = (iMinimapHeight - iHandleHeight) / 2;

        // Create two DOM elements for handles.
        // They will be moved by _updateMinimapBracket() to their correct position based on the extent of d3mapScale.
        d3svg.selectAll(".sapTlTimelineMapHandle").remove();
        appendHandle(d3svg, nHeight + handleOffset, iHandleHeight);
        appendHandle(d3svg, nHeight + handleOffset, iHandleHeight);

        // Call update to set the correct position for moving elements
        this._updateMinimapBracketAndExtent();
    };

    /**
     * Handle the brush event.
     * A brush event is fired every time the brush is moved or changed.
     * Set the viewport to the current brush extent.
     * @private
     */
    Timeline.prototype._onBrushed = function () {
        if (!this.d3brush.empty()) {
            this.setViewport.apply(this, this.d3brush.extent());
            this.fireTimelineZoomControlUpdate();
        }
        this._updateMinimapBracket(this.d3brush.extent());
    };

    /**
     * Handle the brushend event.
     * After ending the brushing, the minimap can be updated to the new zoom level.
     * @private
     */
    Timeline.prototype._onBrushEnd = function () {
        // Skip empty events that are sent in intervals
        if (!d3.event.sourceEvent) {
            return;
        }

        // Set or transition the brush extent to the current viewport
        if (this.d3brush.empty()) {
            this._updateMinimapBracketAndExtent(false);
        } else {
            this._updateMinimapBracketAndExtent(true);
        }
    };

    /**
     * Handle the zoom update.
     * Update the viewport dates, cluster the Tiles if necessary and update the position of the Tiles.
     * @private
     */
    Timeline.prototype._onZoomUpdate = function () {
        var domain = this.d3zoomScale.domain();
        this.setViewport(domain[0], domain[1]);
        this.fireTimelineZoomControlUpdate();
    };

    /**
     * Update the internal variables on an update of the date range.
     * @private
     */
    Timeline.prototype._updateDateRange = function () {
        var iRangeDelta = this.getDateRangeMax() - this.getDateRangeMin();
        this.iDateRangePadding = iRangeDelta * Timeline.RANGE_PADDING;
        this.dDateRangeMin = new Date(this.getDateRangeMin().getTime() - 2 * this.iDateRangePadding);
        this.dDateRangeMax = new Date(this.getDateRangeMax().getTime() + 2 * this.iDateRangePadding);
        this.iTimeRangeMax = iRangeDelta + 2 * this.iDateRangePadding;
        this.d3mapScale
            .domain([this.dDateRangeMin, this.dDateRangeMax]);
    };

    /**
     * Update the visible moving elements in the minimap, i.e. the bracket with handles that shows the visible area in the minimap.
     * @private
     * @param {array} aExtent Date array with the boundaries of visible area
     * @param {boolean} bTransition True to animate the changes
     */
    Timeline.prototype._updateMinimapBracket = function (aExtent, bTransition) {
        var svg = d3.select(this.getDomRef()).select(".sapTlTimelineBracket");
        if (svg.empty() || !this.getMinimap()) {
            return;
        }
        var xMin = this.d3mapScale(aExtent[0]);
        var xMax = this.d3mapScale(aExtent[1]);

        var iMinimapHeight = this.getMinimap().getHeight();
        var nHeight = jQuery("#" + this.getId() + " .sapTlTimelineLaneAreaPointsInTime").height();
        var nWidth = jQuery("#" + this.getId() + " .sapTlTimelineLaneAreaPointsInTime").width();

        var handleHeight = Math.min(iMinimapHeight - 2 * Timeline.MINIMAP_MIN_HANDLE_MARGIN, Timeline.MINIMAP_MAX_HANDLE_HEIGHT);
        var leftMiddleRadius = Math.min(2, xMin / 2);
        var leftTopRadius = Math.min(5, xMin - leftMiddleRadius);
        var bottomRadius = Math.min(handleHeight / 2 - 5, (xMax - xMin) / 3);
        var rightMiddleRadius = Math.min(2, (nWidth - xMax) / 2);
        var rightTopRadius = Math.min(5, nWidth - xMax - rightMiddleRadius);

        var bracketPath = svg.select(".sapTlTimelineBracketPath");
        var inverseLeft = svg.select(".sapTlTimelineMapBrushInverseBegin");
        var inverseRight = svg.select(".sapTlTimelineMapBrushInverseEnd");
        var handles = svg.selectAll(".sapTlTimelineMapHandle").data([xMax, xMin]); // D3's brush handles are ordered this way

        if (bTransition) {
            bracketPath = bracketPath.transition();
            inverseLeft = inverseLeft.transition();
            inverseRight = inverseRight.transition();
            handles = handles.transition();
        }

        handles
            .attr("transform", function (x) {
                return "translate(" + x + ",0)";
            });

        // Returns a 90 degrees circle segment as an SVG path segment
        //
        //                 bClockwise
        //
        //              false       true
        //
        //              |           ---.
        //    false     |              |
        //              '---           |
        //  bUp
        //                 |        .---
        //     true        |        |
        //              ---'        |
        //
        function corner(radius, bClockwise, bUp) {
            // The syntax of the SVG path arc is:
            //
            // a <xRadius> <yRadius> <xAxisRotation> <largeArc> <sweep> <dx> <dy>
            //
            // The arc is a segment of a rotated oval that is drawn to a point with relative coordinates dx dy
            //
            // 1. As we want to use circle segments, we use the same radius for x and y, without rotation (xAxisRotation = 0)
            // 2. We use the shorter of the 2 possible segment of the circle to connect (largeArc = 0, i.e. 90 instead of 270 degree segment)
            // 3. sweep = 0/1 draws the segment counter-clockwise/clockwise
            // 4. The four 90 degrees segments depicted above have horizontal and vertical extents of the 1 radius, (dx = radius, dy = +/-radius)
            //
            var sweep = bClockwise ? 1 : 0;
            var dy = bUp ? -radius : radius;
            return ["a", radius, radius, 0, 0, sweep, radius, dy].join(" ");
        }

        // Macros used repetetively for the bracket path and for the gray areas with round corners outside the bracket
        //
        // M x y ... move to the absolute coordinate x y
        // H x ..... draw horizontal line to absolute coordinate x
        // h dx .... draw horizontal line to relative coordinate dx
        // V y .....      vertical           absolute
        // v dy ....      vertical           relative
        // z ....... close path, i.e. connect to path origin
        //
        function leftLowerU() {
            return "H" + (xMin - leftMiddleRadius) +
                    corner(leftMiddleRadius, true, false) +
                    "V" + (nHeight + iMinimapHeight - bottomRadius) +
                    corner(bottomRadius, false, false);
        }

        function rightLowerU() {
            return "H" + (xMax - bottomRadius) +
                    corner(bottomRadius, false, true) +
                    "V" + (nHeight + rightMiddleRadius) +
                    corner(rightMiddleRadius, true, true);
        }

        bracketPath.attr("d", function () {
            return "M0,0" +
                    "V" + (nHeight - leftTopRadius) +
                    corner(leftTopRadius, false, false) +
                    leftLowerU() +
                    rightLowerU() +
                    "H" + (nWidth - rightTopRadius) +
                    corner(rightTopRadius, false, true) +
                    "V0";
        });

        inverseLeft.attr("d", function () {
            return "M0," + nHeight +
                    leftLowerU() +
                    "H0z";
        });

        inverseRight.attr("d", function () {
            return "M" + nWidth + "," + (nHeight + iMinimapHeight) +
                    rightLowerU() +
                    "H" + nWidth + "z";
        });
    };

    /**
     * Update the visible moving elements and the invisible D3 brush element in the minimap.
     * @private
     * @param {boolean} bTransition True to animate the changes
     */
    Timeline.prototype._updateMinimapBracketAndExtent = function (bTransition) {
        var aExtent = [this.dViewportMin, this.dViewportMax];

        this._updateMinimapBracket(aExtent, bTransition);
        var d3brushG = d3.select(this.getDomRef()).select(".sapTlTimelineMapBrush");
        if (bTransition) {
            d3brushG = d3brushG.transition();
        }
        d3brushG.call(this.d3brush.extent(aExtent));
    };

    /**
     * Update the d3 zoom.
     * Set the zoom scale's range and domain to the current values.
     * @private
     */
    Timeline.prototype._updateZoom = function () {
        this.d3zoomScale
            .domain([this.dViewportMin, this.dViewportMax]);
        this._d3zoom
            .x(this.d3zoomScale);
    };

    /**
     * Render the top bar of the Timeline containing the ruler and the indicator lines for today, DoB and DoD.
     * @private
     */
    Timeline.prototype._renderTimeAxis = function () {
        var domTimeline = this.getDomRef();

        // We could be called before rendering when the date range properties are set,
        // e.g. setDateRangeMin() -> resetZoom() -> setViewport() -> _renderTimeAxis()
        if (!domTimeline) {
            return;
        }

        var scale = this.getScale();
        var domain = scale.domain();
        var iDiff = domain[1] - domain[0];
        var that = this;

        var upperTicks = [];
        var lowerTicks = [];
        var upperFormat;
        var lowerFormat;

        if (iDiff > 1000 * 60 * 60 * 24 * 365 * 15) { // 15 years
            lowerTicks = scale.ticks(10);
            lowerFormat = d3.time.format("%Y");
        } else if (iDiff > 1000 * 60 * 60 * 24 * 365 * 5) { // 5 years
            lowerTicks = scale.ticks(10);
            lowerFormat = d3.time.format("%Y");
        } else if (iDiff > 1000 * 60 * 60 * 24 * 365) { // 1 year
            upperTicks = scale.ticks(d3.time.year, 1);
            upperFormat = d3.time.format("%Y");
            lowerTicks = scale.ticks(10);
            lowerFormat = function (dDate) {
                return oLocaleData.getMonths("abbreviated")[dDate.getMonth()];
            };
        } else if (iDiff > 1000 * 60 * 60 * 24 * 30 * 5) { // 5 month
            upperTicks = scale.ticks(d3.time.year, 1);
            upperFormat = d3.time.format("%Y");
            lowerTicks = scale.ticks(d3.time.month, 1);
            lowerFormat = function (dDate) {
                return oLocaleData.getMonths("abbreviated")[dDate.getMonth()];
            };
        } else if (iDiff > 1000 * 60 * 60 * 24 * 15) { // 15 days
            upperTicks = scale.ticks(d3.time.month, 1);
            upperFormat = function (dDate) {
                return oLocaleData.getMonths("abbreviated")[dDate.getMonth()] + " " + dDate.getFullYear();
            };
            lowerTicks = scale.ticks(10);
            lowerFormat = d3.time.format("%e");
        } else if (iDiff > 1000 * 60 * 60 * 24 * 3) { // 3 days
            upperTicks = scale.ticks(d3.time.month, 1);
            upperFormat = function (dDate) {
                return oLocaleData.getMonths("abbreviated")[dDate.getMonth()] + " " + dDate.getFullYear();
            };
            lowerTicks = scale.ticks(d3.time.day, 1);
            lowerFormat = d3.time.format("%e");
        } else {
            upperTicks = scale.ticks(d3.time.day, 1);
            upperFormat = function (dDate) {
                return this.oDateFormatter.format(dDate);
            }.bind(this);
            lowerTicks = scale.ticks(10);
            lowerFormat = function (dDate) {
                return this.oTimeFormatter.format(dDate);
            }.bind(this);
        }

        this.$().find(".sapTlTimelineToday").css("left", "calc(" + scale(new Date()) + "px - 0.5rem)");

        var dDOB = this.getDateOfBirth();
        var iDOBPosition = this.getScale()(dDOB);
        var $DOBLine = this.$().find(".sapTlTimelineDOB");
        if (iDOBPosition > 0) {
            $DOBLine.css({
                width: iDOBPosition + 0.5,
                display: "block"
            });
        } else {
            $DOBLine.css("display", "none");
        }

        var dDOD = this.getDateOfDeath();
        var iDODPosition = this.getScale()(dDOD);
        var $DODLine = this.$().find(".sapTlTimelineDOD");
        if (iDODPosition < this.getScale().range()[1]) {
            $DODLine.css({
                left: iDODPosition - 0.5,
                display: "block"
            });
        } else {
            $DODLine.css("display", "none");
        }

        function filterTicks(dTick) {
            var x = scale(dTick);
            return (!dDOB || x < iDOBPosition - Timeline.DOB_PADDING || x > iDOBPosition + Timeline.DOB_PADDING) &&
                   (!dDOD || x < iDODPosition - Timeline.DOD_PADDING || x > iDODPosition + Timeline.DOD_PADDING);
        }

        lowerTicks = lowerTicks.filter(filterTicks);
        upperTicks = upperTicks.filter(filterTicks);
        if (dDOB) {
            upperTicks.push(dDOB);
            lowerTicks.push(dDOB);
        }
        if (dDOD) {
            upperTicks.push(dDOD);
            lowerTicks.push(dDOD);
        }

        var mTexts = this.getTexts();

        this.d3UpperAxis
            .tickValues(upperTicks)
            .tickFormat(function (dTick) {
                if (dTick === dDOB) {
                    return that.oDateFormatter.format(dDOB);
                } else if (dTick === dDOD) {
                    return that.oDateFormatter.format(dDOD);
                }
                return upperFormat(dTick);
            });
        this.d3LowerAxis
            .tickValues(lowerTicks)
            .tickFormat(function (dTick) {
                if (dTick === dDOB) {
                    return mTexts.dobLabel;
                } else if (dTick === dDOD) {
                    return mTexts.dodLabel;
                }
                return lowerFormat(dTick);
            });

        d3.select(domTimeline).select(".sapTlTimelineRulerUpperAxis").call(this.d3UpperAxis);
        d3.select(domTimeline).select(".sapTlTimelineRulerLowerAxis").call(this.d3LowerAxis);

        // add tooltips to the lower ruler
        d3.select(this.getDomRef()).selectAll(".sapTlTimelineRulerLowerAxis text")
            .each(function (dDate) {
                var tick = d3.select(this);
                var sTitle = that.oDateFormatter.format(dDate);
                if (iDiff <= 1000 * 60 * 60 * 24 * 3) {
                    // show the time of the day as well
                    sTitle += ", " + that.oTimeFormatter.format(dDate);
                }
                tick.append("title")
                    .text(sTitle);
            });
    };

    /**
     * Set the new range of the viewport.
     * A change will only occur if the new range is within the allowed extents.
     * @param   {Date|number} dViewportMin New min date as Date or timestamp number
     * @param   {Date|number} dViewportMax New max date as Date or timestamp number
     * @param   {boolean}     bForce       True, to force an update
     * @returns {boolean}     True, if the viewport was changed.
     */
    Timeline.prototype.setViewport = function (dViewportMin, dViewportMax, bForce) {
        function linearScale(from, to, ratio) {
            return Math.round(from + (to - from) * ratio);
        }

        function getRatio(from, to, value) {
            return (value - from) / (to - from);
        }

        var iViewportMin = dViewportMin instanceof Date ? dViewportMin.getTime() : dViewportMin;
        var iViewportMax = dViewportMax instanceof Date ? dViewportMax.getTime() : dViewportMax;

        // Only proceed if the input is a valid date
        if (isNaN(iViewportMin) || isNaN(iViewportMax)) {
            return false;
        }

        // Only proceed if the viewport has changed or force flag is set
        if (!bForce && iViewportMin === this.dViewportMin.getTime() && iViewportMax === this.dViewportMax.getTime()) {
            return false;
        }

        var iViewportDeltaOld = this.dViewportMax - this.dViewportMin;
        var iViewportDelta = iViewportMax - iViewportMin;

        if (iViewportDelta < Timeline.TIMERANGE_MIN) {
            // If zoomed in too much, we fall back to the minimum range length
            if (iViewportDeltaOld >= Timeline.TIMERANGE_MIN) {
                var scaleDown = getRatio(iViewportDeltaOld, iViewportDelta, Timeline.TIMERANGE_MIN);
                iViewportMin = linearScale(this.dViewportMin.getTime(), iViewportMin, scaleDown);
                iViewportMax = linearScale(this.dViewportMax.getTime(), iViewportMax, scaleDown);
                iViewportDelta = iViewportMax - iViewportMin;
            } else {
                iViewportDelta = Timeline.TIMERANGE_MIN;
            }
        } else if (iViewportDelta > this.iTimeRangeMax) {
            // If zoomed out too far, we fall back to the maximum range length
            if (iViewportDeltaOld !== iViewportDelta) {
                var scaleUp = getRatio(iViewportDeltaOld, iViewportDelta, this.iTimeRangeMax);
                iViewportMin = linearScale(this.dViewportMin.getTime(), iViewportMin, scaleUp);
                iViewportMax = linearScale(this.dViewportMax.getTime(), iViewportMax, scaleUp);
                iViewportDelta = iViewportMax - iViewportMin;
            } else {
                iViewportDelta = Timeline.iTimeRangeMax;
            }
        }

        // Make sure the new viewport doesn't go beyond the defined range limit
        var iPaddedLimitMin = Math.max(this.getDateRangeMin().getTime() - iViewportDelta * 2 * Timeline.RANGE_PADDING, this.dDateRangeMin.getTime());
        var iPaddedLimitMax = Math.min(this.getDateRangeMax().getTime() + iViewportDelta * 2 * Timeline.RANGE_PADDING, this.dDateRangeMax.getTime());
        if (iViewportMin < iPaddedLimitMin) {
            iViewportMin = iPaddedLimitMin;
            iViewportMax = iViewportMin + iViewportDelta;
        } else if (iViewportMax > iPaddedLimitMax) {
            iViewportMax = iPaddedLimitMax;
            iViewportMin = iViewportMax - iViewportDelta;
        }

        // Do nothing, if the viewport remains unchanged
        if (!bForce && iViewportMin === this.dViewportMin.getTime() && iViewportMax === this.dViewportMax.getTime()) {
            return false;
        }

        this.dViewportMin = new Date(iViewportMin);
        this.dViewportMax = new Date(iViewportMax);

        this._d3scale.domain([this.dViewportMin, this.dViewportMax]);

        // Reposition the Tiles if the range delta stayed the same (ie panning), otherwise cluster (ie zoom)
        this.getLanes().forEach(function (oLane) {
            oLane.setScale(this.getScale());
        }, this);


        this._renderTimeAxis();

        // Update the zoom domain if the change did not originate there
        if (!d3.event || d3.event.type !== "zoom") {
            this._updateZoom();
        }

        // Update the brush's extent if the change did not originate there
        if (!d3.event || d3.event.type !== "brush") {
            this._updateMinimapBracketAndExtent();
        }

        return true;
    };

    /**
     * Move the viewport in both directions by the given deltas.
     * A change will only occur if the new range is within the allowed extents.
     * @private
     * @param   {number}  nDeltaMin Change for the viewportMinDate
     * @param   {number}  nDeltaMax Change for the viewportMaxDate
     * @returns {boolean} True, if the viewport was changed.
     */
    Timeline.prototype._updateViewport = function (nDeltaMin, nDeltaMax) {
        var iRange = this.dViewportMax - this.dViewportMin;
        var iMinTime = this.dViewportMin.getTime() + iRange * nDeltaMin;
        var iMaxTime = this.dViewportMax.getTime() + iRange * nDeltaMax;

        this.fireTimelineZoomControlUpdate();
        return this.setViewport(iMinTime, iMaxTime);
    };

    return Timeline;
});
