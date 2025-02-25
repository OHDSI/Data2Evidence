sap.ui.define([
    "./CircleStencil",
    "jquery.sap.global",
    "sap/hc/hph/patient/app/ui/lib/utils/Utils",
    "sap/ui/core/Control",
    "sap/ui/thirdparty/d3"
], function (CircleStencil, jQuery, Utils, Control) {
    "use strict";
    /**
     * Constructor for a new MiniTileArea.
     *
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @class
     * The MiniTileAre control renders all tiles as circles in the body part of a minimized Lane.
     * @extends sap.ui.core.Control
     *
     * @author SAP SE
     * @version 1.0.0
     *
     * @constructor
     * @alias sap.hc.hph.patient.app.ui.lib.timeline.TileArea
     */
    var MiniTileArea = Control.extend("sap.hc.hph.patient.app.ui.lib.timeline.MiniTileArea", {
        metadata: {
            properties: {
                /**
                 * Scale used to map dates to pixels.
                 */
                scale: {
                    type: "object",
                    group: "Data",
                    defaultValue: d3.time.scale()
                },
                /**
                 * Color of the MiniTileArea
                 */
                color: {
                    type: "sap.hc.hph.patient.app.ui.lib.LaneColor",
                    group: "Appearance"
                },
                /**
                 * Array of unclustered tile data objects.
                 */
                data: {
                    type: "object[]",
                    group: "Data",
                    defaultValue: []
                },
                /**
                 * Name of the start date property in a tile data object.
                 */
                dateColumn: {
                    type: "string",
                    group: "Data",
                    defaultValue: "start"
                },
                /**
                 * Name of the column that uniquely identifies a datapoint.
                 */
                keyColumn: {
                    type: "string",
                    group: "Data"
                }
            },
            events: {
                /**
                 * Event is fired when the user clicks on Tile, before the Popover with the Tile details is opened.
                 */
                press: {
                    parameters: {
                        /**
                         * DOM object of the pressed mini tile. Should be used as anchor for the popover.
                         */
                        anchor: {
                            type: "object"
                        },
                        /**
                         * This MiniTileArea object.
                         */
                        area: {
                            type: "object"
                        },
                        /**
                         * Color of the parent lane.
                         */
                        color: {
                            type: "string"
                        },
                        /**
                         * Badge count of the pressed mini tile.
                         */
                        count: {
                            type: "integer"
                        },
                        /**
                         * The indices of the Tile represented by the clicked Tile as they appear in the data model.
                         */
                        tileIndices: {
                            type: "integer[]"
                        },
                        /**
                         * The data object of the pressed mini tile.
                         */
                        datapoint: {
                            type: "object"
                        }
                    }
                }
            }
        }
    });

    /** @const{number} The point with the shortest distance between center and mouse will get the focus if it is within this threshold */
    MiniTileArea.FOCUS_DISTANCE = 50;

    /** @const{number} Defines the circle radius of an unfocussed data point in pixels */
    MiniTileArea.CIRCLE_RADIUS = 4;

    /** @const{number} Defines the circle radius of a focussed data point in pixels */
    MiniTileArea.CIRCLE_TOUCH_RADIUS = MiniTileArea.CIRCLE_RADIUS * 3;

    /** @const{number} Pixel density of the circle stencil used to draw the data points.
     * Defines the resolution of the circle template used to draw all data points in the canvas. It should be >1 to avoid Jaggies.
     * Large values result in a poor anti-aliasing. A value of 2 turned out to work quite well.
     */
    MiniTileArea.STENCIL_DENSITY = 2;

    /** @const{number} Left and right margin of the MiniTileArea.
     * The visible area is extended by a margin to the left and right. Data points with a center outside
     * this area are not drawn. The margin should be at least the radius of a focussed point.
     */
    MiniTileArea.CLIPPING_MARGIN = Math.ceil(MiniTileArea.CIRCLE_RADIUS * 1.7);

    MiniTileArea.prototype.init = function () {
        // nHalfHeight is the y-center of all mini tile circles.
        // It will be updated with the minimized lane height / 2 in each invocation of onAfterRendering.
        this.nHalfHeight = 15;

        // Some data points are drawn in an SVG layed over the Canvas in order to easily realize mouse interactions and animations.
        // This array keeps track of those points. A data point enters this array when it gets the focus and leaves it after it losing the focus
        // and after the focus-out animation is finished.
        this._trackedPoints = [];

        // The reason to keep points in the SVG is if they are used as an anchor for a popover that opens when clicking them
        // Points in this array enter before the popover opens and leave after close.
        this._popoverPoints = [];

        // Array of all pending mousemove events. The delayed handling is required to detect the delayed mousemove event sent by a touch device
        this._delayedMouseMoveEvents = [];
    };

    /**
     * Return the SVG DOM element used to render the chart.
     * @returns {object} D3 selection of the SVG DOM element
     */
    MiniTileArea.prototype.getSVG = function () {
        return d3.select(this.$("svg")[0]);
    };

    /**
     * Returns the start date of a tile
     * @param {object} oData Tile object from the data aggregation
     * @returns {date} Tile's start date
     */
    MiniTileArea.prototype._getStart = function (oData) {
        return oData[this.getDateColumn()];
    };

    /**
     * Returns a unique key to identify a tile
     * @param {object} oData Tile object from the data aggregation
     * @returns {string} Tile key
     */
    MiniTileArea.prototype.getTileKey = function (oData) {
        return oData[this.getKeyColumn()];
    };

    /**
     * Returns whether a tile is dated
     * @param {object} oData Tile object from the data aggregation
     * @returns {boolean} true, if the tile is dated
     */
    MiniTileArea.prototype._isDated = function (oData) {
        return !isNaN(this._getStart(oData));
    };

    /**
     * Returns the x-coordinate of the tile in pixels
     * @param {object} oData Tile object from the data aggregation
     * @returns {number} x-coordinate in pixels
     */
    MiniTileArea.prototype._getLeft = function (oData) {
        var dStart = this._getStart(oData);
        return isNaN(dStart) ? 0 : this.getScale()(Utils.utcToLocal(dStart));
    };

    /**
     * Returns width of this MiniTileArea in pixels
     * @returns {number} With in pixels
     */
    MiniTileArea.prototype.getWidth = function () {
        return this.$().width();
    };

    /**
     * Lock a datapoint, i.e. it will be stored in the list of datapoints that should be kept as DOM elements in the SVG.
     * @param {Object} oDatapoint Object from the data aggregation.
     * @returns {object} DOM object to be used as the popover anchor
     */
    MiniTileArea.prototype.lockPoint = function (oDatapoint) {
        if (oDatapoint) {
            this._popoverPoints.push(oDatapoint);
            if (this._trackedPoints.indexOf(oDatapoint) === -1) {
                // The point doesn't exist in the SVG yet, render it
                this.updateFocusPoint();
            }
            var that = this;
            var oHook = this.getSVG().selectAll("g")
                .data([oDatapoint], function (oDatapoint2) {
                    return oDatapoint2[that.getKeyColumn()];
                })
                .select(".sapTlTimelineChartDotHook");
            return oHook[0] && oHook[0][0];
        }
    };

    /**
     * Unlock a datapoint, i.e. it will be potentially removed from the SVG (unless it is hovered or currently being animated).
     * @param {Object} oDatapoint Object from the data aggregation.
     */
    MiniTileArea.prototype.unlockPoint = function (oDatapoint) {
        if (oDatapoint) {
            var index = this._popoverPoints.indexOf(oDatapoint);
            if (index !== -1) {
                this._popoverPoints.splice(index, 1);
                if (this._trackedPoints.indexOf(oDatapoint) === -1) {
                    // No need to keep the point in the SVG any longer, remove it
                    this.updateFocusPoint();
                }
            }
        }
    };

    /**
     * Manually open the tile popover.
     * Fires the Tile press event and opens the Popover with the details for only this Tile or an array of tiles (if aTiles is given).
     * @param  {array}  aTileIndices Array of indices of the tiles that should be included into the popover
     * @param  {object} oDatapoint Data object associated to the mini tile that was pressed
     */
    MiniTileArea.prototype.openTilePopover = function (aTileIndices, oDatapoint) {
        this.firePress({
            area: this,
            color: this.getColor(),
            count: aTileIndices.length,
            tileIndices: aTileIndices,
            datapoint: oDatapoint
        });
    };

    /**
     * Rerenders the focussed point.
     * The current focus point, all former focus points that are still being animated (this._trackedPoints) and
     * points that are used as anchors for Popovers (this._popoverPoints) are rendered in the SVG that overlays
     * the canvas.
     */
    MiniTileArea.prototype.updateFocusPoint = function () {
        var that = this;
        var aRange = this.getScale().range();
        var nMinPos = aRange[0] - MiniTileArea.CLIPPING_MARGIN;
        var nMaxPos = aRange[1] + MiniTileArea.CLIPPING_MARGIN;

        // remove points from the lists that are no longer visible
        this._trackedPoints = this._trackedPoints.filter(function (oTile) {
            var nLeft = that._getLeft(oTile);
            return nMinPos <= nLeft && nLeft <= nMaxPos;
        });
        this._popoverPoints = that._popoverPoints.filter(function (oTile) {
            var nLeft = that._getLeft(oTile);
            return nMinPos <= nLeft && nLeft <= nMaxPos;
        });

        // Handler to remove points from the tracked list and potentially from the DOM,
        // who lose their focus and whose unfocus-animation ended
        var fRemoveHandler = function (oTile) {
            var nIndex = that._trackedPoints.indexOf(oTile);
            if (nIndex !== -1) {
                that._trackedPoints.splice(nIndex, 1);
                // We can remove the DOM element only if the popover isn't using it as an anchor
                if (that._popoverPoints.indexOf(oTile) === -1) {
                    d3.select(this).remove();
                }
            }
        };

        // Add current focus point to list of tracked points
        if (this._focusTile) {
            if (this._trackedPoints.indexOf(this._focusTile) === -1) {
                this._trackedPoints.push(this._focusTile);
            }
        }

        // concat the lists of tracked and popover points, while removing duplicates
        var aSVGPoints = this._trackedPoints.concat(this._popoverPoints.filter(function (oTile) {
            return this._trackedPoints.indexOf(oTile) === -1;
        }, this));

        // Render/update data points
        var oCircle = this.getSVG().selectAll("g")
            .data(aSVGPoints, function (oTile) {
                return that.getTileKey(oTile);
            })
            .attr("transform", function (oTile) {
                return "translate(" + that._getLeft(oTile) + "," + that.nHalfHeight + ")";
            })
            .classed("focus", function (oTile) {
                return oTile === that._focusTile;
            })
            .classed("focusInit", false)
            .on("transitionend", fRemoveHandler);

        var oGroup = oCircle.enter()
            .append("g")
            .attr("transform", function (oTile) {
                return "translate(" + that._getLeft(oTile) + "," + that.nHalfHeight + ")";
            })
            .classed("focus", true)
            .classed("focusInit", true)
            .on("transitionend", fRemoveHandler);

        oGroup.append("circle")
            .attr("r", MiniTileArea.CIRCLE_RADIUS)
            .on("click", function (oTile) {
                d3.event.stopPropagation(); // silence other listeners
                var xPos = that._getLeft(oTile);
                var aCloseTilesIndices = that.getData().map(function (oTileOther, index) {
                    var xPosOther = that._getLeft(oTileOther);
                    // Aggregate tiles that are less than a pixel away
                    return xPos - 1 < xPosOther && xPosOther < xPos + 1 ? index : -1;
                }).filter(function (index) {
                    return index >= 0;
                });
                that.openTilePopover(aCloseTilesIndices, oTile);
            });

        // Add an invisible circle with a tiny radius as a centered anchor for the popover.
        // The circle above cannot be used as it changes its radius on hover and the popover would move
        oGroup.append("circle")
            .attr("r", 0.1)
            .classed("sapTlTimelineChartDotHook", true);

        oCircle.exit()
            .remove();

        // All but the focus point will be removed after their animation finishes
        d3.select("#" + this.getId() + " svg").selectAll("g.focus")
            .on("transitionend", null);
    };

    /**
     * Return the tile object with minimal distance to mouse cursor
     * @param {number[]} aPosition Mouse cursor coordinates [x,y]
     * @param {number}   nMaxDistance Horizontal distance cutoff
     * @param {object[]} aTiles (Optional) array of tile objects to examine (use 'data' aggregation if undefined)
     * @returns {object} The tile object with minimal horizontal distance to aPosition or undefined, if greater than distance cutoff
     */
    MiniTileArea.prototype.getClosestTile = function (aPosition, nMaxDistance, aTiles) {
        var that = this;

        // Minimize distance
        if (!nMaxDistance) {
            nMaxDistance = Infinity;
        }

        if (!aTiles) {
            aTiles = this.getData() || [];
        }

        return aTiles.reduce(function (oMin, oTile) {
            if (that._isDated(oTile)) {
                var nDist = Math.abs(that._getLeft(oTile) - aPosition[0]);
                if (nDist < oMin.dist) {
                    oMin.dist = nDist;
                    oMin.tile = oTile;
                }
            }
            return oMin;
        }, {
            dist: nMaxDistance
        }).tile;
    };

    /**
     * Updates the focus point. The point with minimal distance to the mouse cursor will be determined and focussed,
     * i.e. it becomes slightly bigger and changes its fill colour.
     * @param {number[]} aPosition Mouse cursor coordinates [x,y]
     * @param {number} [nDistance=MiniTileArea.FOCUS_DISTANCE] Distance cutoff
     * @returns {object} The point that is closed to aPosition and within distance cutoff
     */
    MiniTileArea.prototype.updateFocus = function (aPosition, nDistance) {
        var oFocusTile;
        nDistance = nDistance || MiniTileArea.FOCUS_DISTANCE;
        this._focusPosition = aPosition;
        if (aPosition) {
            oFocusTile = this.getClosestTile(this._focusPosition, nDistance, this._visibleTiles);
        }
        this._focusTile = oFocusTile;
        this.updateFocusPoint();
        return oFocusTile;
    };

    /**
     * Update the canvas and circle stencil in case of a change in size or resolution.
     */
    MiniTileArea.prototype._checkResize = function () {
        var oCanvas = this.$("canvas")[0];

        // It could be that we get here because of getVisible() === true,
        // but the DOM is not yet existent, because of a pending rendering event
        if (!oCanvas) {
            return;
        }

        // Update canvas if necessary
        var oCtx = oCanvas.getContext("2d");
        var iWidth = this.getScale().range()[1];
        var fDensity = window.devicePixelRatio ? window.devicePixelRatio : 1;

        // Prepare canvas for displays with a resolution that is higher than 1 pixel, e.g. Retina
        if (this._canvasWidth !== iWidth || this._canvasDensity !== fDensity) {
            this._canvasWidth = iWidth;
            this._canvasDensity = fDensity;

            // Prepare canvas for displays with a resolution that is higher than 1 pixel, e.g. Retina
            oCanvas.setAttribute("width", this._canvasWidth * this._canvasDensity);
            oCanvas.setAttribute("height", this._canvasHeight * this._canvasDensity);
            oCtx.scale(this._canvasDensity, this._canvasDensity);

            // Set canvas line and fill styles
            oCtx.strokeStyle = this._strokeColor;
            oCtx.fillStyle = this._fillColor;
            oCtx.lineWidth = 1.5;
            oCtx.lineJoin = "bevel";

            // Prepare dot stencil
            this._dotStencil = new CircleStencil({
                radius: MiniTileArea.CIRCLE_RADIUS,
                density: MiniTileArea.STENCIL_DENSITY * this._canvasDensity
            });
            this._dotStencil.prepareStencil(MiniTileArea.CIRCLE_RADIUS, this._strokeColor, this._fillColor);
            this._dirtyRect = [0, 0, this._canvasWidth, this._canvasHeight];
        }
    };

    /**
     * Renders mini tiles in the canvas. To improve rendering performance we use a single image (stencil) of a circle
     * and draw it many times on the canvas instead of calling the slower arc() function.
     */
    MiniTileArea.prototype.refreshMiniTiles = function () {
        var oCanvas = this.$("canvas")[0];

        // It could be that we get here because of getVisible() === true,
        // but the DOM is not yet existent, because of a pending rendering event
        if (!oCanvas) {
            return;
        }

        this._checkResize();

        // Rendering optimization:
        // 1. Only render mini tiles that are within the viewport
        // 2. In a sequence of mini tiles that would be rendered at the same pixel, render only the first one
        var aRange = this.getScale().range();
        var nMinPos = aRange[0] - MiniTileArea.CLIPPING_MARGIN;
        var nMaxPos = aRange[1] + MiniTileArea.CLIPPING_MARGIN;
        var nLast = nMinPos;
        var aTiles = (this.getData() || []).filter(function (oTile) {
            var nLeft = this._getLeft(oTile);
            var nPos = Math.floor(nLeft);
            if (nLast === nPos) {
                return false;
            }
            nLast = nPos;
            return nMinPos <= nLeft && nLeft <= nMaxPos;
        }, this);
        this._visibleTiles = aTiles;

        // Clear canvas
        var oCtx = oCanvas.getContext("2d");
        oCtx.clearRect.apply(oCtx, this._dirtyRect);

        // Render dots
        var oStencil = this._dotStencil;
        var oStencilCanvas = oStencil.getCanvas();
        var aCenter = oStencil.getCenter();
        var nWidth = oStencil.getWidth();
        var nHeight = oStencil.getHeight();
        var nY = this.nHalfHeight - aCenter[1];
        var nTiles = aTiles.length;
        for (var j = 0; j < nTiles; ++j) {
            oCtx.drawImage(oStencilCanvas, this._getLeft(aTiles[j]) - aCenter[0], nY, nWidth, nHeight);
        }
        // keep track of the area that needs to be cleared before rendering the next time
        if (nTiles) {
            var nX = this._getLeft(aTiles[0]);
            this._dirtyRect = [nX - aCenter[0], nY, this._getLeft(aTiles[nTiles - 1]) - nX + nWidth, nHeight];
        } else {
            this._dirtyRect = [0, 0, 0, 0];
        }

        this.updateFocus(this._focusPosition);
    };

    /**
     * Sets up the canvas stroke/fill styles by extracting the actual CSS defined colors from the already
     * rendered parent Lane header.
     * Renders mini tiles in the canvas by calling refreshMiniTiles() and sets up mouse handlers.
     */
    MiniTileArea.prototype.onAfterRendering = function () {
        var that = this;
        var oCanvas = this.$("canvas")[0];
        var bIsTouchDevice = "ontouchstart" in window || navigator.msMaxTouchPoints;

        this._canvasWidth = jQuery(oCanvas).width();
        this._canvasHeight = jQuery(oCanvas).height();
        this._canvasDensity = -1;

        // We set the getScale() ourselves only when its not already set.
        // In general, we prefer updates from the parent timeline to be pixel synchronized.
        // If we try to always take our own width here to set the range, we get a wrong width due to a dynamic scrollbar which depends
        // on lanes rendered later, see hc/mri-pot#650.
        if (this.getScale().range()[1] === 1) {
            this.getScale().range([0, this._canvasWidth]);
        }

        // Clone stroke and fill style from already visible elements and create stencil
        var sParentId = this.getParent().getId();
        this._strokeColor = jQuery("#" + sParentId + " .sapTlTimelineLaneDescriptionTitle").css("color");
        this._fillColor = jQuery("#" + sParentId + " .sapTlTimelineLaneBody").css("background-color");
        this._trackedPoints = [];
        this._popoverPoints = [];

        this.nHalfHeight = this._canvasHeight / 2;

        this._dirtyRect = [0, 0, this._canvasWidth, this._canvasHeight];
        this.refreshMiniTiles();

        var oSVG = this.getSVG()
            .on("mousemove", function () {
                var pos = d3.mouse(this);
                if (bIsTouchDevice) {
                    // For backward compatibility, on a 1-finger tap touch devices fire a mousemove immediately before a click event
                    // The SVG-circle created in updateFocus() disturbes the mouse events and prevent the SVG from receiving the click event
                    // Hence, we delay the mousemove handler in case of a touch device and even prevent it from execution in case of a click event
                    var sTimeoutId = window.setTimeout(function () {
                        var index = that._delayedMouseMoveEvents.indexOf(sTimeoutId);
                        if (index >= 0) {
                            that._delayedMouseMoveEvents.splice(index, 1);
                        }
                        that.updateFocus(pos);
                    }, 10);
                    that._delayedMouseMoveEvents.push(sTimeoutId);
                } else {
                    that.updateFocus(pos);
                }
            })
            .on("mouseout", function () {
                // Prevent delayed mousemove handler execution after mouse left the lane
                that._delayedMouseMoveEvents.forEach(window.clearTimeout);
                that.updateFocus();
            });

        // Detect whether browser supports touch
        if (bIsTouchDevice) {
            // To support touch devices, we react on click events on the SVG directly.
            // A click within a scaled circle around a datapoint, will induce the click
            // event event directly. For touch devices we don't receive mousemove events
            // before which would allow us to create responsive SVG circles.
            oSVG.on("click", function () {
                var oFocusTile = that.updateFocus(d3.mouse(this), MiniTileArea.CIRCLE_TOUCH_RADIUS);
                delete that._focusPosition;
                // Prevent delayed mousemove handler execution (no need for focussing circles that have been clicked already)
                that._delayedMouseMoveEvents.forEach(window.clearTimeout);
                if (oFocusTile) {
                    var xPos = that._getLeft(oFocusTile);
                    var aCloseTilesIndices = that.getData().map(function (oTileOther, index) {
                        var xPosOther = that._getLeft(oTileOther);
                        // Aggregate tiles that are less than a pixel away
                        return xPos - 1 < xPosOther && xPosOther < xPos + 1 ? index : -1;
                    }).filter(function (index) {
                        return index >= 0;
                    });
                    that.openTilePopover(aCloseTilesIndices, oFocusTile);
                }
            });
        }
    };

    /**
     * Overloaded rerender function to avoid UI5 flickering.
     */
    MiniTileArea.prototype.rerender = function () {
        if (this._bNeedsHardRerendering) {
            Control.prototype.rerender.call(this);
        } else {
            this.refreshMiniTiles();

            // delete pending invalidates
            var uiArea = this.getUIArea();
            if (uiArea) {
                uiArea._onControlRendered(this);
            }
        }
    };

    /**
     * Update the underlying D3 scale that is used to map dates to pixels
     * @param {object} oScale D3 scale to map dates to pixels
     */
    MiniTileArea.prototype.setScale = function (oScale) {
        this.setProperty("scale", oScale.copy(), true);

        if (this.getVisible()) {
            this.refreshMiniTiles();
        }
    };

    return MiniTileArea;
});
