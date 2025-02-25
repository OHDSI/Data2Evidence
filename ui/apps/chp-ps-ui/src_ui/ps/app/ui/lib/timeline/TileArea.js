sap.ui.define([
    "jquery.sap.global",
    "sap/ui/core/Control",
    "sap/hc/hph/patient/app/ui/lib/Tile",
    "sap/hc/hph/patient/app/ui/lib/TileRenderer",
    "sap/ui/thirdparty/d3"
], function (jQuery, Control, Tile, TileRenderer) {
    "use strict";
    /**
     * Constructor for a new TileArea.
     *
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @class
     * The TileArea control renders Tiles into the body part of a Lane.
     * @extends sap.ui.core.Control
     *
     * @author SAP SE
     * @version 1.0.0
     *
     * @constructor
     * @alias sap.hc.hph.patient.app.ui.lib.timeline.TileArea
     */
    var TileArea = Control.extend("sap.hc.hph.patient.app.ui.lib.timeline.TileArea", {
        metadata: {
            defaultAggregation: "tiles",
            properties: {
                /**
                 * D3 scale used to map dates to pixels.
                 */
                scale: {
                    type: "object",
                    group: "Data",
                    defaultValue: d3.time.scale()
                },
                /**
                 * Color of the Lane.
                 */
                color: {
                    type: "sap.hc.hph.patient.app.ui.lib.LaneColor",
                    group: "Appearance"
                }
            },
            aggregations: {
                /**
                 * List of Tiles in this Lane. Not all of them will be visualized due to stacking of Tiles.
                 */
                tiles: {
                    type: "sap.hc.hph.patient.app.ui.lib.Tile",
                    multiple: true
                }
            },
            events: {
                /**
                 * Event is fired when the user clicks on Tile
                 */
                press: {
                    parameters: {
                        /**
                         * The title of the pressed tile.
                         */
                        title: {
                            type: "string"
                        },
                        /**
                         * DOM object of the pressed tile. Should be used as anchor for the popover.
                         */
                        anchor: {
                            type: "object"
                        },
                        /**
                         * This TileArea object.
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
                         * Badge count of the pressed tile.
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
                         * Start/end time range of the pressed tile as string.
                         */
                        time: {
                            type: "string"
                        }
                    }
                },
                /**
                 * Event is fired when the scale has been changed.
                 */
                scaleChange: {
                    allowPreventDefault: true,
                    parameters: {
                        /**
                         * The D3 scale object after the update.
                         */
                        scale: {
                            type: "Scale"
                        },
                        /**
                         * Indicates whether the scale range remains unchanged while the scale domain was shifted (i.e. horizontal panning)
                         */
                        pan: {
                            type: "boolean"
                        }
                    }
                }
            }
        }
    });

    TileArea.prototype.init = function () {
        this.pendingScaleChange = false;
    };

    /**
     * Return the placeholder div element where tiles should be rendered.
     * @returns {object} DOM element where tile should be rendered
     */
    TileArea.prototype._getTilesDiv = function () {
        return d3.select("#" + this.getIdForLabel());
    };

    /**
     * Use D3 to (re-)render the tiles below the placeholder div element.
     * @param {boolean} bPan Boolean to indicate that tiles have been panned (not zoomed) to speed up the D3 update
     */
    TileArea.prototype._refreshTiles = function (bPan) {
        var node = this._getTilesDiv().selectAll(".sapTlTileUmbrella")
            .data(this.getTiles(), function (oTile) {
                return oTile.getKey();
            })
            .each(function (d) {
                return TileRenderer.renderD3Update(this, d, bPan);
            });

        node.enter()
            .append(TileRenderer.renderD3Enter);

        node.exit()
            .each(function () {
                return TileRenderer.renderD3Exit(this);
            });

        node.order();
    };

    /**
     * Render the tiles using D3.
     */
    TileArea.prototype.onAfterRendering = function () {
        this._refreshTiles();
    };

    /**
     * Overloaded rerender function to avoid UI5 flickering.
     */
    TileArea.prototype.rerender = function () {
        if (this._bNeedsHardRerendering || !this.getVisible()) {
            Control.prototype.rerender.call(this);
        } else {
            this._refreshTiles();

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
    TileArea.prototype.setScale = function (oScale) {
        var oldDomain = this.getScale().domain();
        var newDomain = oScale.domain();
        var bPan = oldDomain[1] - oldDomain[0] === newDomain[1] - newDomain[0];
        if (bPan) {
            // domain was shifted (could be horizontal panning, if area wasn't resized)
            var oldRange = this.getScale().range();
            var newRange = oScale.range();
            if (oldRange[0] === newRange[0] && oldRange[1] === newRange[1]) {
                // area wasn't resized
                if (oldDomain[0].valueOf() === newDomain[0].valueOf()) {
                    // scale didn't change at all
                    return;
                }
            } else {
                // area was resized, reclustering required
                bPan = false;
            }
        }
        this.setProperty("scale", oScale.copy(), true);
        if (this.getVisible()) {
            this._refreshTiles(bPan);
            this.fireScaleChange({
                scale: oScale,
                pan: bPan
            });
            this.pendingScaleChange = false;
        } else {
            this.pendingScaleChange = true;
        }
    };

    /**
     * Changes visibility of the TileArea and fires (potentially) pending scaleChange events.
     * @param {boolean} bVisible Indicates whether the TileArea should become visible or not.
     */
    TileArea.prototype.setVisible = function (bVisible) {
        if (!this.getVisible() && bVisible && this.pendingScaleChange) {
            this.fireScaleChange({
                scale: this.getScale(),
                pan: false
            });
            this.pendingScaleChange = false;
        }
        Control.prototype.setVisible.call(this, bVisible);
    };

    /**
     * Returns width of this TileArea in pixels
     * @returns {number} With in pixels
     */
    TileArea.prototype.getWidth = function () {
        return this.$().width();
    };

    /**
     * Lock a datapoint (in this case a tile), that should be kept as DOM element and can be used as Popover anchor.
     * @param {Object} oDatapoint Object from the tiles aggregation.
     * @returns {object} DOM object to be used as the popover anchor
     */
    TileArea.prototype.lockPoint = function (oDatapoint) {
        if (oDatapoint) {
            var oHook = this._getTilesDiv().selectAll(".sapTlTileUmbrella")
                .data([oDatapoint], function (oTile) {
                    return oTile.getKey();
                })
                .select(".sapTlTileAnchor");
            return oHook[0] && oHook[0][0];
        }
    };

    /**
     * Dummy implementation to be compatible with unlockPoint() of the MiniTileArea.
     */
    TileArea.prototype.unlockPoint = function () {
        /* Dummy */
    };

    return TileArea;
});
