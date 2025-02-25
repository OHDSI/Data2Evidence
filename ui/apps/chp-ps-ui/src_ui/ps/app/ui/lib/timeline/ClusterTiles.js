sap.ui.define([
    "./Clustering",
    "sap/hc/hph/patient/app/ui/lib/Tile",
    "sap/hc/hph/patient/app/ui/lib/utils/Utils"
], function (Clustering, Tile, Utils) {
    "use strict";

    var ClusterTiles = {};

    /** @const{number} Minimum distance between two tiles */
    ClusterTiles.MIN_TILE_DISTANCE = 4;

    /**
     * Extracts the start date of a tile object
     * @param {object} oTile Tile object from the data model
     * @returns {date} Start date of the tile
     * @private
     */
    function _getTileStart(oTile) {
        return oTile.start;
    }

    /**
     * Extracts the end date of a tile object
     * @param {object} oTile Tile object from the data model
     * @returns {date} End date of the tile
     * @private
     */
    function _getTileEnd(oTile) {
        return oTile.end;
    }

    /**
     * Extracts the name of a tile object
     * @param {object} oTile Tile object from the data model
     * @returns {date} Name of the tile
     * @private
     */
    function _getTileName(oTile) {
        return oTile.name;
    }

    /**
     * Return the left pixel boundary of a tile
     * The calculation is done by using the scale of the Timeline.
     * @param {object} oTile Tile object from the data model
     * @param {object} oScale D3 scale object to convert from dates to pixels
     * @returns {number} Position in pixels
     * @private
     */
    function _getTileLeft(oTile, oScale) {
        return isNaN(_getTileStart(oTile)) ? 0 : oScale(Utils.utcToLocal(_getTileStart(oTile)));
    }

    /**
     * Return the right pixel boundary of a tile
     * The calculation is done by using the scale of the Timeline.
     * @param {object} oTile Tile object from the data model
     * @param {object} oScale D3 scale object to convert from dates to pixels
     * @returns {number} Position in pixels
     * @private
     */
    function _getTileRight(oTile, oScale) {
        return isNaN(_getTileEnd(oTile)) ? 0 : oScale(Utils.utcToLocal(_getTileEnd(oTile)));
    }

    /**
     * Return a function that extracts the left and right boundaries of a tile in pixels.
     * @param {object} oScale D3 scale object to convert from dates to pixels
     * @returns {function} Function that for a tile returns an array [start, end] of pixel boundaries.
     */
    ClusterTiles.getTileOutlineExtractor = function (oScale) {
        return function (oTile) {
            return [_getTileLeft(oTile, oScale), _getTileRight(oTile, oScale)];
        };
    };

    /**
     * Return "simple" details for merged tiles.
     * The simple details is a string of the names of each represented tile.
     * Duplicate names are counted in parens instead.
     * @param {array} aTiles Array of tile objects from the data model
     * @returns {string} The names of the tiles with their abundances, e.g. "Chemotherapy (2), Radiotherapy".
     */
    ClusterTiles.getSimpleDetails = function (aTiles) {
        var mTileNames = {};
        aTiles.forEach(function (oTile) {
            var sName = _getTileName(oTile);
            mTileNames[sName] = (mTileNames[sName] || 0) + 1;
        });
        return Object.keys(mTileNames).map(function (sTileName) {
            return mTileNames[sTileName] === 1 ? sTileName : sTileName + " (" + mTileNames[sTileName] + ")";
        }).join(", ");
    };

    /**
     * Run the clustering algorithm on the tiles of one lane. The result is an array of currently visible and potentially clustered tiles.
     * @param {array} aTiles Array of tile objects from the data model
     * @param {object} oScale D3 scale object to convert from dates to pixels
     * @param {string} sLaneTitle Title of the lane. It is used as tile name for clustered tiles.
     * @returns {array} Array of currently visible and potentially clustered tiles.
     */
    ClusterTiles.clusterTiles = function (aTiles, oScale, sLaneTitle) {
        if (!aTiles) {
            return [];
        }

        var fExtract = ClusterTiles.getTileOutlineExtractor(oScale);
        var aRange = oScale.range();
        var aTileClusters = Clustering.clusterOverlappingRangesLeftToRight(aTiles, fExtract, Tile.MIN_WIDTH, ClusterTiles.MIN_TILE_DISTANCE, aRange[0], aRange[1], true);

        // Create the data model of the visible tiles.
        // Each cluster will be rendered as a tile and reflects either a singleton or multiple interactions.
        //
        // badgeCount ..... the number of tiles in the cluster
        // start/end ...... first start and last end date of interactions in the cluster
        // tileIndices .... indices of the clustered tiles in their original array in the model
        // name ........... tile title
        // attributes ..... key/value pairs of the interaction (singleton)
        // annotations .... annotations of the interaction (singleton)
        // simpleDetails .. short summary text of the clustered interactions
        // indicators ..... array of {start, end} date pairs that represent the clustered interactions
        //
        return aTileClusters.map(function (mTileCluster) {
            var aClusteredTiles = mTileCluster.indices.map(function (index) {
                return aTiles[index];
            });
            var oFirstTile = aClusteredTiles[0];
            var mCluster = {
                badgeCount: aClusteredTiles.length,
                end: aTiles[mTileCluster.endIndex].end,
                start: oFirstTile.start,
                tileIndices: mTileCluster.indices
            };

            if (aClusteredTiles.length === 1) {
                mCluster.annotations = oFirstTile.annotations;
                mCluster.attributes = oFirstTile.attributes;
                mCluster.name = oFirstTile.name;
            } else {
                mCluster.name = sLaneTitle;
                mCluster.simpleDetails = ClusterTiles.getSimpleDetails(aClusteredTiles);
            }

            var aIndicatorClusters = Clustering.clusterOverlappingRangesLeftToRight(aClusteredTiles, fExtract, Tile.TIME_INDICATOR_MIN_WIDTH, Tile.TIME_INDICATOR_MIN_DISTANCE);
            mCluster.indicators = aIndicatorClusters.map(function (mIndicatorCluster) {
                return {
                    start: aClusteredTiles[mIndicatorCluster.indices[0]].start,
                    end: aClusteredTiles[mIndicatorCluster.endIndex].end
                };
            });

            return mCluster;
        });
    };

    return ClusterTiles;
});
