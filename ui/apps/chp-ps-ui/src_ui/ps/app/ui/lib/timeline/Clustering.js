sap.ui.define([], function () {
    "use strict";

    var Clustering = {};

    /**
     * Cluster 1-dimensional ranges that might overlap. Compared coordinates (left, right, width) are in pixels, hence
     * the clustering of tiles is zoom-dependent.
     *
     * @param   {array}    aData Array of the raw input objects whose outlines will be extracted by fExtractOutline.
     *                     This array must be arranged such that the extracted start values are ascending.
     * @param   {function} fExtractOutline Functor which returns for each object in aData the outline as an array [start, end] or null, if it should be ignored.
     * @param   {number}   iMinWidth The minimum width each object will have.
     * @param   {number}   iMinDistance The minimum distance to start a new cluster.
     * @param   {number}   iLeft Left cut-off. Clusters left of this boundary will be filtered.
     * @param   {number}   iRight Right cut-off. Clusters right of this boundary will be filtered.
     * @param   {bool}     bOneExtra Includes the first clusters left and right of the cut-off boundaries.
     *                     The extra clusters are required to tab-navigate from a tile to its next neighbour, which might be outside of the viewport.
     * @returns {array}    Array of arrays of indices into the aTiles array.
     *                     Example: [[1, 2], [3, 4, 5], [6, 7]]
     * @private
     */
    Clustering.clusterOverlappingRangesLeftToRight = function (aData, fExtractOutline, iMinWidth, iMinDistance, iLeft, iRight, bOneExtra) {
        var aClusters = [];
        var mCurrentCluster = {
            end: Number.NEGATIVE_INFINITY // the first data object will start a new cluster
        };
        var maxEnd = Number.NEGATIVE_INFINITY;

        if (isNaN(iLeft)) {
            iLeft = Number.NEGATIVE_INFINITY;
        }
        if (isNaN(iRight)) {
            iRight = Number.POSITIVE_INFINITY;
        }

        for (var index = 0; index < aData.length; ++index) {
            var oDataObject = aData[index];
            var mTileOutline = fExtractOutline(oDataObject);
            if (mTileOutline) {
                // Always start new visible tile cluster from first tile
                // Iterate over rest of tiles, adding them to current cluster OR starting a new
                // cluster based on their overlap with the current cluster
                if (aClusters.length === 0 || mCurrentCluster.end + iMinDistance <= mTileOutline[0]) {
                    // remove already pushed clusters that end left of iLeft
                    if (mCurrentCluster.end <= iLeft && (!bOneExtra || aClusters.length > 1)) {
                        aClusters.shift(); // silently works for aClusters === [] too
                    }
                    // stop clustering if all following clusters would start right of or at iRight
                    if (mTileOutline[0] >= iRight) {
                        if (!bOneExtra) {
                            break;
                        } else {
                            bOneExtra = false;
                        }
                    }
                    // start new tile cluster
                    mCurrentCluster = {
                        start: mTileOutline[0],
                        end: Math.max(mTileOutline[1], mTileOutline[0] + iMinWidth),
                        endIndex: index,
                        indices: [index]
                    };
                    maxEnd = mTileOutline[1];
                    aClusters.push(mCurrentCluster);
                } else {
                    // add tile to current tile cluster
                    mCurrentCluster.indices.push(index);
                    // update the right boundary of the cluster
                    mCurrentCluster.end = Math.max(mCurrentCluster.end, mTileOutline[1]);
                    // record the index of the object with the rightmost boundary in the cluster
                    if (maxEnd < mTileOutline[1]) {
                        maxEnd = mTileOutline[1];
                        mCurrentCluster.endIndex = index;
                    }
                }
            }
        }

        return aClusters;
    };

    return Clustering;
});
