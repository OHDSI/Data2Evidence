sap.ui.define([
    "sap/hc/hph/patient/app/ui/lib/utils/Utils",
    "./Tile"
], function (Utils, Tile) {
    "use strict";

    /**
     * D3 based Tile renderer.
     * @namespace
     */
    var TileRenderer = {};

    TileRenderer.renderAttributes = function (details) {
        var columns = details.selectAll(".sapTlTileDetailsColumn")
                    .data(function (column) {
                        return column;
                    });
        columns.enter().append("div")
                    .classed("sapTlTileDetailsColumn", true)
                    .classed("sapTlTileDetailsColumnLeft", function (o, i) {
                        return i === 0; // Left column has index 0
                    });

        var cells = columns.selectAll(".sapTlTileDetailsCell")
                    .data(function (cell) {
                        return cell;
                    });
        cells.enter().append("div")
                    .classed("sapTlTileDetailsCell", true);

        cells.text(function (s) {
            return s;
        });

        cells.exit().remove();
        columns.exit().remove();
    };

    TileRenderer.getTileDetails = function (oTile) {
        var aAttr = oTile.getMainAttributes();
        return [
            aAttr.map(Tile.getAttributeName),
            aAttr.map(function (oAttr) {
                return Tile.getAttributeValues(oAttr).join(", ");
            })
        ];
    };

    TileRenderer.renderContent = function (content, oTile) {
        if (oTile.isMultiple()) {
            content.selectAll(".sapTlTileDetails").remove();
            var simpleDetails = content.selectAll(".sapTlTileSimpleDetails")
                .data([oTile.getSimpleDetails()]);

            simpleDetails
                .enter().append("div")
                .classed("sapTlTileSimpleDetails", true);

            simpleDetails.text(function (s) {
                return s;
            });

            simpleDetails
                .exit().remove();
        } else {
            content.selectAll(".sapTlTileSimpleDetails").remove();
            var details = content.selectAll(".sapTlTileDetails")
                .data([TileRenderer.getTileDetails(oTile)]);

            details
                .enter().append("div")
                .classed("sapTlTileDetails", true);

            this.renderAttributes(details);

            details
                .exit().remove();
        }
    };

    TileRenderer.renderIndicators = function (dots, oTile) {
        var iTileLeft = oTile.getLeft();
        var indicators = dots.selectAll(".sapTlTileDot")
            .data(oTile.getIndicators());

        indicators
            .enter().append("div")
            .classed("sapTlTileDot", true);

        // the following operates on both the enter and update selection
        // see https://github.com/d3/d3-3.x-api-reference/blob/master/Selections.md#enter
        // "The enter selection merges into the update selection ..."
        indicators
            .style("left", function (mIndicator) {
                return oTile._getX(mIndicator.start) - iTileLeft + "px";
            })
            .style("width", function (mIndicator) {
                return Math.max(oTile._getX(mIndicator.end) - oTile._getX(mIndicator.start), Tile.TIME_INDICATOR_MIN_WIDTH) + "px";
            });

        indicators
            .exit().remove();
    };

    TileRenderer.centerTile = function (dStart, dEnd, oTimeline) {
        d3.event.preventDefault();
        if (oTimeline) {
            var oScale = oTimeline.getScale();
            var iLeft = oScale(Utils.utcToLocal(dStart));
            var iRight = oScale(Utils.utcToLocal(dEnd));
            if (iRight - iLeft < Tile.MIN_WIDTH) {
                iRight = iLeft + Tile.MIN_WIDTH;
            }

            if (iRight <= oScale.range()[0] || iLeft >= oScale.range()[1]) {
                oTimeline.scrollToDate(oScale.invert((iLeft + iRight) / 2));
            }
        }
    };

    /**
     * Updates the tile content position/width to make it visible, even if a tile is partially hidden.
     * @param  {object} oTile           The reference to the rendered tile
     * @param  {HTMLElement} tileElem   The dom element for the tile
     */
    TileRenderer.updateTileContentPosition = function (oTile, tileElem) {
        var oScale = oTile._getScale();
        var iLaneWidth = oScale.range()[1];
        var iLeft = oTile.getLeft();
        var iRight = oTile.getRight();
        var iWidth = oTile.getWidth();

        if (iLeft < 0) {
            var iRelativeLeft;
            var iVisibleWidth;
            if (iRight < Tile.MIN_WIDTH) {
                // Don't reduce the tile content width below the min tile width
                iRelativeLeft = iWidth - Tile.MIN_WIDTH;
                iVisibleWidth = Tile.MIN_WIDTH;
            } else {
                // Keep the tile content visible
                iRelativeLeft = -iLeft;
                iVisibleWidth = iRight;
            }
            tileElem.select(".sapTlTilePaddedArea")
                .style("left", iRelativeLeft + "px")
                .style("width", "calc(" + iVisibleWidth + "px - 1.5rem)")
                .style("position", "relative");
        } else {
            tileElem.select(".sapTlTilePaddedArea")
                .style("left", "0")
                .style("width", null)
                .style("position", "initial");
        }

        if (iRight > iLaneWidth) {
            var iContentWidth = iLaneWidth - Math.max(0, iLeft);
            tileElem.select(".sapTlTilePaddedArea")
                .style("width", "calc(" + Math.max(iContentWidth, Tile.MIN_WIDTH) + "px - 1.5rem)");
        }
    };

    TileRenderer.renderD3Update = function (div, oTile, bPan) {
        var oScale = oTile._getScale();
        var iLaneWidth = oScale.range()[1];
        var iLeft = oTile.getLeft();
        var iWidth = oTile.getWidth();
        var oLane = oTile.getLane();
        var oTimeline = oTile.getTimeline();
        var dStart = oTile.getStart();
        var dEnd = oTile.getEnd();

        d3.select(div).attr("id", oTile.getId() + "-d3");

        var node = d3.select(div).select(".sapTlTile")
            .classed("sapTlTileMultiple", oTile.isMultiple())
            .classed("sapTlTileStacked", oTile.isMultiple())
            .classed("sapTlTileUndated", !oTile.isDated())
            .classed("sapTlTileShortened", iLeft < 0 && iWidth > Tile.MIN_WIDTH)
            .style("left", iLeft + "px")
            .style("width", iWidth + "px")
            .on("click", Tile.prototype._press.bind(oTile))
            .on("keydown", function () {
                if (d3.event.keyCode === 32 || d3.event.keyCode === 13) {
                    oTile._press();
                }
            })
            .on("focus", function () {
                if (oLane) {
                    oLane.getBody().scrollLeft(0);
                }
                TileRenderer.centerTile(dStart, dEnd, oTimeline);
            })
            .on("focusin", function () {
                if (oLane) {
                    oLane.getBody().scrollLeft(0);
                }
                TileRenderer.centerTile(dStart, dEnd, oTimeline);
            });

        TileRenderer.updateTileContentPosition(oTile, node);

        // render an invisible anchor for the popover
        if (iLeft < 0) {
            iWidth += iLeft;
            iLeft = 0;
        }

        d3.select(div).select(".sapTlTileAnchor")
            .style("left", iLeft + "px")
            .style("width", iWidth + "px")
            .style("max-width", "calc(100% - " + iLeft + "px)")
            // hide anchor for invisible tiles to close attached Tile Popovers
            .style("display", iWidth <= 0 || iLeft >= iLaneWidth ? "none" : null);

        if (bPan) {
            return;
        }

        TileRenderer.renderIndicators(node.select(".sapTlTileDots"), oTile);

        node.select(".sapTlTileBadgePlaceholder")
            .classed("sapTlTileBadge", oTile.isMultiple())
            .text(oTile.isMultiple() ? oTile.getBadgeCount() : "");


        node.select(".sapTlTileTitleText")
            .text(oTile.getName());

        node.select(".sapTlTileTime")
            .text(oTile.getTime());

        TileRenderer.renderContent(node.select(".sapTlTileContent"), oTile);
    };

    TileRenderer.renderD3Enter = function (oTile) {
        var iLeft = oTile.getLeft();
        var iWidth = oTile.getWidth();
        var oLane = oTile.getLane();
        var oTimeline = oTile.getTimeline();
        var dStart = oTile.getStart();
        var dEnd = oTile.getEnd();

        var div = document.createElement("div");
        var umbrella = d3.select(div)
            .attr("id", oTile.getId() + "-d3")
            .classed("sapTlTileUmbrella", true);
        var tile = umbrella.append("div")
            .attr("tabindex", "0")
            .classed("sapTlTile", true)
            .classed("sapTlTileMultiple", oTile.isMultiple())
            .classed("sapTlTileStacked", oTile.isMultiple())
            .classed("sapTlTileUndated", !oTile.isDated())
            .classed("sapTlTileShortened", iLeft < 0 && iWidth > Tile.MIN_WIDTH)
            .style("left", iLeft + "px")
            .style("width", iWidth + "px")
            .on("click", Tile.prototype._press.bind(oTile))
            .on("keydown", function () {
                if (d3.event.keyCode === 32 || d3.event.keyCode === 13) {
                    oTile._press();
                }
            })
            // Hook to modify the rendered control.
            // Adds an on focus handler that will update the viewport of the Timeline to center this Tile, if it is not currently visible.
            .on("focus", function () {
                if (oLane) {
                    oLane.getBody().scrollLeft(0);
                }
                TileRenderer.centerTile(dStart, dEnd, oTimeline);
            })
            .on("focusin", function () {
                if (oLane) {
                    oLane.getBody().scrollLeft(0);
                }
                TileRenderer.centerTile(dStart, dEnd, oTimeline);
            });

        var dots = tile.append("div")
            .classed("sapTlTileDots", true);
        TileRenderer.renderIndicators(dots, oTile);

        var titleArea = tile.append("div")
            .classed("sapTlTilePaddedArea", true);

        var title = titleArea.append("div")
            .classed("sapTlTileTitle", true);

        title.append("div")
            .classed("sapTlTileBadgePlaceholder", true)
            .classed("sapTlTileBadge", oTile.isMultiple())
            .text(oTile.isMultiple() ? oTile.getBadgeCount() : "");

        title.append("div")
            .classed("sapTlTileTitleText", true)
            .text(oTile.getName());

        var content = titleArea.append("div")
            .classed("sapTlTileContent", true);
        TileRenderer.renderContent(content, oTile);

        titleArea.append("div")
            .classed("sapTlTileTime", true)
            .text(oTile.getTime());

        TileRenderer.updateTileContentPosition(oTile, tile);

        // Render an invisible anchor for the popover
        // The Tile itself cannot be used directly as it can be too large and cause weird effects.
        // See https://github.wdf.sap.corp/hc/mri-pot/issues/795
        if (iLeft < 0) {
            iWidth += iLeft;
            iLeft = 0;
        }

        umbrella.append("div")
                .classed("sapTlTileAnchor", true)
                .style("left", iLeft + "px")
                .style("width", iWidth + "px")
                .style("max-width", "calc(100% - " + iLeft + "px)");

        return div;
    };

    TileRenderer.renderD3Exit = function (div) {
        d3.select(div).remove();
    };

    return TileRenderer;
}, true);
