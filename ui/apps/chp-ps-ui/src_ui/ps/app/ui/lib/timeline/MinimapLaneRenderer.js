sap.ui.define([
    "./Clustering",
    "sap/ui/thirdparty/d3"
], function (Clustering) {
    "use strict";

    /**
     * D3 based Minimap lane renderer.
     * @namespace
     */
    var MinimapLaneRenderer = {};

    /** @constant {number} Size of an outer border in the minimap. */
    MinimapLaneRenderer.MINIMAP_TILE_EXTRA_WIDTH = 2;

    /** @constant {number} Size (width and height) of a Tile in the minimap. */
    MinimapLaneRenderer.MINIMAP_TILE_HEIGHT = 8;

    /** @constant {number} Size (width and height) of a Tile in the minimap. */
    MinimapLaneRenderer.MINIMAP_LANE_HEIGHT = 10;

    /** @constant {number} Size (width and height) of a Tile in the minimap. */
    MinimapLaneRenderer.MINIMAP_TILE_MIN_DISTANCE = 2;

    // tiles rendering
    MinimapLaneRenderer.renderD3TileUpdate = function (div, aRange) {
        d3.select(div)
            .attr("x", aRange[0] - MinimapLaneRenderer.MINIMAP_TILE_EXTRA_WIDTH)
            .attr("width", aRange[1] + MinimapLaneRenderer.MINIMAP_TILE_EXTRA_WIDTH * 2);
    };

    MinimapLaneRenderer.renderD3TileEnter = function (aRange) {
        var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        d3.select(rect)
            .attr("height", MinimapLaneRenderer.MINIMAP_TILE_HEIGHT)
            .attr("x", aRange[0] - MinimapLaneRenderer.MINIMAP_TILE_EXTRA_WIDTH)
            .attr("width", aRange[1] + MinimapLaneRenderer.MINIMAP_TILE_EXTRA_WIDTH * 2);

        return rect;
    };

    MinimapLaneRenderer.renderD3TileExit = function (div) {
        d3.select(div).remove();
    };

    MinimapLaneRenderer.renderTiles = function (group, oMinimapLane) {
        var aData = oMinimapLane.getData();
        var aRanges = Clustering.clusterOverlappingRangesLeftToRight(aData, oMinimapLane._extract.bind(oMinimapLane), 0, MinimapLaneRenderer.MINIMAP_TILE_MIN_DISTANCE)
            .map(function (oCluster) {
                return [oCluster.start, oCluster.end - oCluster.start];
            });

        var node = group.selectAll("rect")
            .data(aRanges)
            .each(function (d) {
                return MinimapLaneRenderer.renderD3TileUpdate(this, d);
            });

        node.enter()
            .append(MinimapLaneRenderer.renderD3TileEnter);

        node.exit()
            .each(function () {
                return MinimapLaneRenderer.renderD3TileExit(this);
            });
    };

    // lanes rendering
    MinimapLaneRenderer.renderLane = function (d3Group, oMinimapLane) {
        d3Group.attr("class", "sapTlTimelineMinimapLane sapTlTimelineMinimapLane" + oMinimapLane.getColor());
        MinimapLaneRenderer.renderTiles(d3Group, oMinimapLane);
    };

    MinimapLaneRenderer.renderD3Update = function (group, oMinimapLane, i) {
        var d3Group = d3.select(group)
            .attr("id", oMinimapLane.getId())
            .attr("transform", "translate(0," + (i * MinimapLaneRenderer.MINIMAP_LANE_HEIGHT + (MinimapLaneRenderer.MINIMAP_LANE_HEIGHT - MinimapLaneRenderer.MINIMAP_TILE_HEIGHT) / 2) + ")");

        MinimapLaneRenderer.renderLane(d3Group, oMinimapLane);
    };

    MinimapLaneRenderer.renderD3Enter = function (oMinimapLane, i) {
        var group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        var d3Group = d3.select(group)
            .attr("id", oMinimapLane.getId())
            .attr("transform", "translate(0," + (i * MinimapLaneRenderer.MINIMAP_LANE_HEIGHT + (MinimapLaneRenderer.MINIMAP_LANE_HEIGHT - MinimapLaneRenderer.MINIMAP_TILE_HEIGHT) / 2) + ")");

        MinimapLaneRenderer.renderLane(d3Group, oMinimapLane);
        return group;
    };

    MinimapLaneRenderer.renderD3Exit = function (group) {
        d3.select(group).remove();
    };

    return MinimapLaneRenderer;
}, true);
