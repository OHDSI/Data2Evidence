sap.ui.define([
    "jquery.sap.global",
    "./TilePopoverContent",
    "sap/hc/hph/patient/app/ui/lib/utils/Utils",
    "sap/m/Button",
    "sap/m/Popover",
    "sap/ui/core/Element"
], function (jQuery, TilePopoverContent, Utils, Button, Popover, Element) {
    "use strict";

    /**
     * Constructor for a new Tile.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * The Tile visualizes one or many interactions in a Lane of the Timeline.
     * @extends sap.ui.core.Element
     * @alias sap.hc.hph.patient.app.ui.lib.Tile
     */
    var Tile = Element.extend("sap.hc.hph.patient.app.ui.lib.Tile", {
        metadata: {
            library: "sap.hc.hph.patient.app.ui.lib",
            properties: {
                /**
                 * End date of the interaction. For point-interaction it has to be the same as the start.
                 */
                end: {
                    type: "object",
                    group: "Data"
                },
                /**
                 * Name of this interaction.
                 */
                name: {
                    type: "string",
                    group: "Data",
                    defaultValue: ""
                },
                /**
                 * Start date of the interaction.
                 */
                start: {
                    type: "object",
                    group: "Data"
                },
                /**
                 * String to uniquely identify an interaction.
                 */
                key: {
                    type: "string",
                    group: "Data"
                },
                /**
                 * The attributes of the represented interaction.
                 * This is an array of attributes. An attribute is an object of type
                 * {
                 *   main: string,      // Information whether this attribute should be present on the Tile itself rather than only in the details Popover.
                 *   mainOrder: string, // Order in which this attribute appears on the Tile. The order in the Popover is determined by the array of attributes.
                 *   name: string,      // Name of the attribute.
                 *   values: string[]   // List of values of the attribute.
                 * }
                 */
                attributes: {
                    type: "object[]",
                    group: "Data",
                    defaultValue: []
                },
                /**
                 * Integer that is shown in the top-left corner of the tile if greater than 1.
                 * If it is greater than 1, the tile is considered to be a cluster that represents multiple tiles.
                 */
                badgeCount: {
                    type: "int",
                    group: "Data",
                    defaultValue: 1
                },
                /**
                 * Array of {left: .., width: ..} entries that are used to shown as tile indicators.
                 */
                indicators: {
                    type: "object[]",
                    group: "Data",
                    defaultValue: []
                },
                /**
                 * String that is shown instead of the main attributes if badgeCount > 1.
                 */
                simpleDetails: {
                    type: "string",
                    group: "Data"
                }
            },
            aggregations: {
                /**
                 * The annotations of the attributes of the represented interaction.
                 */
                annotations: {
                    type: "sap.hc.hph.patient.app.ui.lib.TileAnnotation",
                    multiple: true,
                    singleName: "annotation",
                    bindable: true
                }
            }
        }
    });

    /** @const{number} Minimum Tile width */
    Tile.MIN_WIDTH = 200;
    /** @const{number} Minimum Time Indicator width */
    Tile.TIME_INDICATOR_MIN_WIDTH = 10;
    /** @const{number} Minimum distance between two Time Indicators */
    Tile.TIME_INDICATOR_MIN_DISTANCE = 10;

    /**
     * Return the list of TileAttributes, that should be shown on a Tile.
     * @returns {sap.hc.hph.patient.app.ui.lib.TileAttribute[]} List of TileAttributes
     */
    Tile.prototype.getMainAttributes = function () {
        return this.getAttributes().filter(function (mTileAttribute) {
            return Tile.getMain(mTileAttribute);
        }).sort(function (mTileAttributeA, mTileAttributeB) {
            return Tile.getMainOrder(mTileAttributeA) - Tile.getMainOrder(mTileAttributeB);
        });
    };

    /**
     * Returns the responsible TileArea control.
     * @returns {sap.hc.hph.patient.app.ui.lib.timeline.TileArea|undefined} Lane for this Tile
     */
    Tile.prototype.getTileArea = function () {
        var oParent = this.getParent();
        if (oParent instanceof sap.hc.hph.patient.app.ui.lib.timeline.TileArea) {
            return oParent;
        }
    };

    /**
     * Returns the responsible Lane control.
     * @returns {sap.hc.hph.patient.app.ui.lib.timeline.LaneBase|undefined} Lane for this Tile
     */
    Tile.prototype.getLane = function () {
        var oParent = this.getTileArea();
        if (oParent) {
            oParent = oParent.getParent();
            if (oParent instanceof sap.hc.hph.patient.app.ui.lib.timeline.LaneBase) {
                return oParent;
            }
        }
    };

    /**
     * Returns the responsible Timeline control.
     * @returns {sap.hc.hph.patient.app.ui.lib.timeline.Timeline|undefined} Lane for this Tile
     */
    Tile.prototype.getTimeline = function () {
        var oLane = this.getLane();
        if (oLane) {
            return oLane.getTimeline();
        }
    };

    Tile.prototype._getX = function (dDate) {
        return this._getScale()(Utils.utcToLocal(dDate));
    };

    /**
     * Return the value for the css-property left.
     * The calculation is done by using the scale of the Timeline.
     * @returns {number} Position in pixel
     */
    Tile.prototype.getLeft = function () {
        return isNaN(this.getStart()) ? 0 : this._getScale()(Utils.utcToLocal(this.getStart()));
    };

    /**
     * Return the value of the right end of the Tile.
     * This does not necessarily correspond to the width of the Tile.
     * @returns {number} Position in pixel
     */
    Tile.prototype.getRight = function () {
        return isNaN(this.getEnd()) ? 0 : this._getScale()(Utils.utcToLocal(this.getEnd()));
    };

    /**
     * Return the timestring for only this Tile, regardless of any represented Tiles.
     * @returns {string} Locale depended timestring
     */
    Tile.prototype.getTime = function () {
        if (!this.isDated()) {
            return Utils.getText("HPH_PAT_CONTENT_UNDATED");
        }
        if (this.isPoint()) {
            return Utils.formatDate(this.getStart());
        }
        return Utils.formatDate(this.getStart()) + " - " + Utils.formatDate(this.getEnd());
    };

    /**
     * Return the width of only this Tile.
     * @returns {number} Width in pixel
     */
    Tile.prototype.getWidth = function () {
        return Math.max(this.getRight() - this.getLeft(), Tile.MIN_WIDTH);
    };

    /**
     * Returns true if start and end date of this Tile are valid.
     * @returns {boolean} True, if the Tile is dated.
     */
    Tile.prototype.isDated = function () {
        return !isNaN(this.getStart()) && !isNaN(this.getEnd());
    };

    /**
     * Returns true if this Tile has hidden Tiles associated.
     * @returns {Boolean} True, if this Tile represents multiple Tiles.
     */
    Tile.prototype.isMultiple = function () {
        return this.getBadgeCount() > 1;
    };

    /**
     * Detects if the interaction described by this tile is a point in time.
     * @returns {Boolean} True, if start and end is the same.
     */
    Tile.prototype.isPoint = function () {
        return this.getStart().getTime() === this.getEnd().getTime();
    };

    /**
     * Fires the Tile press event.
     * The event can be triggered by mouse or keyboard events.
     * The event handler may open a Popover with details.
     * @private
     */
    Tile.prototype._press = function () {
        var oTileDom = d3.event.currentTarget;
        var oHook = d3.select(oTileDom.parentNode).select(".sapTlTileAnchor");
        var oTileArea = this.getTileArea();
        oTileArea.firePress({
            anchor: oHook[0][0],
            area: oTileArea,
            color: oTileArea.getColor(),
            count: this.getBadgeCount(),
            datapoint: this,
            time: this.getTime(),
            tileIndices: this.getBindingContext().getProperty("tileIndices"),
            title: this.getName()
        });
    };

    /**
     * Returns the scale of the Timeline.
     * @returns {d3.time.scale} d3 time scale used by the Timeline
     * @private
     */
    Tile.prototype._getScale = function () {
        return this.getTileArea().getScale();
    };

    /**
     * Getter for the name of a tile attribute.
     * @param {object} mTileAttribute A tile attribute
     * @returns {string} The name of the tile attribute
     */
    Tile.getAttributeName = function (mTileAttribute) {
        return mTileAttribute.name;
    };

    /**
     * Getter for the values of a tile attribute.
     * @param {object} mTileAttribute A tile attribute
     * @returns {string[]} The values of the tile attribute
     */
    Tile.getAttributeValues = function (mTileAttribute) {
        if (Array.isArray(mTileAttribute.values)) {
            return mTileAttribute.values;
        } else {
            return [mTileAttribute.values];
        }
    };

    /**
     * Getter for the main flag of a tile attribute.
     * @param {object} mTileAttribute A tile attribute
     * @returns {boolean} Whether the attribute is a main attribute
     */
    Tile.getMain = function (mTileAttribute) {
        return mTileAttribute.main;
    };

    /**
     * Getter for the order of a main tile attribute.
     * @param {object} mTileAttribute A main tile attribute
     * @returns {number} The order of the attribute
     */
    Tile.getMainOrder = function (mTileAttribute) {
        return mTileAttribute.mainOrder;
    };

    return Tile;
});
