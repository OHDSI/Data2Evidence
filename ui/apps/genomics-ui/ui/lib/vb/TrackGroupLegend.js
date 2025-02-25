jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.TrackGroupLegend');
hc.hph.genomics.ui.lib.vb.StandardLegend.extend('hc.hph.genomics.ui.lib.vb.TrackGroupLegend', {
    metadata: {
        properties: {
            //Size of values has to be equal to size of colors
            values: { type: 'float[]' },
            colors: { type: 'string[]' },
            name: { type: 'string' }
        }
    },
    init: function () {
        this.mTrackGroup = null;
        this.mTrackLegends = [];
        this.mRectWidth = 16;
    },
    renderer: {
        render: function (oRenderManager, oControl) {
            //DIV
            oRenderManager.write('<div');
            oRenderManager.writeControlData(oControl);
            oRenderManager.addStyle('transition', 'height 0.25s ease-out');
            oRenderManager.addStyle('position', 'relative');
            oRenderManager.addStyle('float', 'left');
            oRenderManager.addStyle('height', '0px');
            oRenderManager.addStyle('width', '100%');
            oRenderManager.writeStyles();
            oRenderManager.write('>');
            //Connectors
            oRenderManager.write('<div');
            oRenderManager.addClass('connectors');
            oRenderManager.writeClasses();
            oRenderManager.addStyle('float', 'left');
            oRenderManager.addStyle('z-index', '1');
            oRenderManager.addStyle('visibility', 'hidden');
            oRenderManager.addStyle('width', oControl.mRectWidth + 'px');
            oRenderManager.addStyle('height', '0px');
            oRenderManager.writeStyles();
            oRenderManager.write('>');
            oRenderManager.write('<div');
            oRenderManager.addStyle('height', oControl._getConnectorHeight() + 'px');
            oRenderManager.addStyle('width', '2px');
            oRenderManager.addStyle('z-index', '1');
            oRenderManager.addStyle('left', '4.5px');
            oRenderManager.addStyle('position', 'absolute');
            oRenderManager.addStyle('background-color', '#aaaaaa');
            oRenderManager.writeStyles();
            oRenderManager.write('></div>');
            oRenderManager.write('<div');
            oRenderManager.addStyle('height', oControl._getConnectorHeight() + 'px');
            oRenderManager.addStyle('width', '2px');
            oRenderManager.addStyle('z-index', '1');
            oRenderManager.addStyle('left', '9.5px');
            oRenderManager.addStyle('position', 'absolute');
            oRenderManager.addStyle('background-color', '#aaaaaa');
            oRenderManager.writeStyles();
            oRenderManager.write('></div>');
            //End connectors
            oRenderManager.write('</div>');
            //End DIV
            oRenderManager.write('</div>');
        }
    },
    onAfterRendering: function () {
    },
    _update: function () {
        var oDIV = d3.select('#' + this.getId());
        var oThis = this;
        this.mTrackLegends = [];
        if (!$.isEmptyObject(this.mTrackGroup.getAggregation('_tracks')) && this.mTrackGroup.mTracksDisplayable === true) {
            $.each(this.mTrackGroup.getAggregation('_tracks'), function (i, oTrack) {
                if (oTrack.getLegends()) {
                    $.each(oTrack.getLegends(), function (y, oLegend) {
                        oThis.mTrackLegends.push(oLegend);
                    });
                }
            });
            oDIV.selectAll('div.legendErrorDiv').remove();
            var aNames = this.mTrackGroup.getAggregation('_tracks').map(function (oTrack) {
                return oTrack.getName();
            });
            var subTracks = oDIV.selectAll('div.legendTrack');
            var subGroupElem = subTracks.data(aNames, function (d, i) {
                return d + '' + i;
            });
            if (oDIV.selectAll('#' + this.getId() + ' > div.connectors div').empty()) {
                //Connectors
                var connectorDiv = oDIV.append('div').attr('class', 'connectors').style('float', 'left').style('width', this.mRectWidth + 'px').style('z-index', '1').style('visibility', 'visible').style('position', 'absolute').style('height', this.mRectWidth + 'px');
                connectorDiv.append('div').style('height', aNames.length + 'em').style('width', '2px').style('left', '4.5px').style('position', 'absolute').style('background-color', '#aaaaaa');
                connectorDiv.append('div').style('height', aNames.length + 'em').style('width', '2px').style('left', '9.5px').style('position', 'absolute').style('background-color', '#aaaaaa');
            } else {
                oDIV.selectAll('#' + this.getId() + ' > div.connectors div').style('visibility', 'visible');
            }
            //Legend tracks
            var outerDiv = subGroupElem.enter().append('div').attr('class', 'legendTrack').style('position', 'relative');
            subGroupElem.exit().remove();
            var flexDiv = outerDiv.append('div').style('display', 'inline-flex');
            //Rect   
            flexDiv.append('div').attr('class', 'rect stdLegendRect').style('height', this.mRectWidth + 'px').style('z-index', '2').style('width', this.mRectWidth + 'px').style('position', 'relative').style('float', 'left');
            //Color them
            oDIV.selectAll('#' + this.getId() + ' div.rect.stdLegendRect').style('background', function (d, i) {
                if (oThis.mTrackGroup.getColor(i) instanceof Array) {
                    //Create linear gradient if an array of colors was returned
                    var sGradientString = 'linear-gradient( 180deg';
                    var iFraction = oThis.mRectWidth / oThis.mTrackGroup.getColor(i).length;
                    oThis.mTrackGroup.getColor(i).forEach(function (color, index) {
                        sGradientString += ', ' + color + ' ' + index * iFraction + 'px';
                        sGradientString += ', ' + color + ' ' + (index + 1) * iFraction + 'px';
                    });
                    sGradientString += ')';
                    return sGradientString;
                } else {
                    var oColor = oThis.mTrackGroup.mAggregations._tracks[i].mProperties.color;
                    if (oColor instanceof Array) {
                        return oColor[0];
                    } else {
                        return oColor;
                    }
                }
            });
            //Text   
            flexDiv.append('span').text(function (name) {
                return name;
            }).attr('class', 'sapUiGen-LegendText').text(function (d) {
                return d;
            }).style('position', 'relative').style('padding-left', '0.25em').style('white-space', 'nowrap');
            subGroupElem.exit().remove();
            if (!$.isEmptyObject(this.mTrackLegends)) {
                //Draw sub legends
                outerDiv.each(function (name, index) {
                    oThis.mTrackLegends[index]._appendTo(this);
                });
            }
            //Adjust connectors height
            oDIV.selectAll('div.connectors div').style('height', this._getConnectorHeight() + 'px');
            //Adjust div height
            var lastLegendTrack = $('#' + this.getId() + ' div.legendTrack:last-child');
            var totalHeight = lastLegendTrack.position().top + lastLegendTrack.height();
            oDIV.style('height', totalHeight + 'px');
        } else if (this.mTrackGroup.mMessage !== undefined) {
            //Set div height to auto
            oDIV.style('height', '40px');
            //Connectors
            oDIV.selectAll('div.connectors div').style('height', this.mRectWidth + 'px');
            subTracks = oDIV.selectAll('div.legendTrack');
            var oMessageTrack = oDIV.selectAll('div.messageTrack');
            oMessageTrack.remove();
            oMessageTrack = oDIV.append('div').classed('legendTrack', true).classed('messageTrack', true).style('height', '19px').attr('position', 'relative').append('div').style('display', 'inline-flex');
            var oConnectors = oMessageTrack.append('div').attr('class', 'connectors').style('float', 'left').style('width', this.mRectWidth + 'px').style('height', this.mRectWidth + 'px').style('visibility', 'visible');
            oConnectors.append('div').style('width', '2px').style('height', this.mRectWidth + 'px').style('left', '4.5px').style('position', 'absolute').style('background-color', '#aaaaaa');
            oConnectors.append('div').style('width', '2px').style('height', this.mRectWidth + 'px').style('left', '9.5px').style('position', 'absolute').style('background-color', '#aaaaaa');
            oMessageTrack.append('span').attr('class', 'sapUiGen-LegendText').text(this.mTrackGroup.getTitlePrefix()).style('position', 'relative').style('line-height', '1em').style('vertical-align', 'middle').style('padding-left', '0.25em').style('white-space', 'nowrap');
            //Add icon and text 
            oDIV.selectAll('div.legendErrorDiv').remove();
            var oIconInfo = sap.ui.core.IconPool.getIconInfo('message-information');
            this.mErrorDiv = oDIV.append('div').attr('class', 'legendErrorDiv').style('display', 'inline-flex').style('width', '100%');
            this.mErrorDiv.append('text').style('font-family', oIconInfo.fontFamily).text(oIconInfo.content);
            this.mErrorDiv.append('span').text(function (name) {
                return name;
            }).attr('class', 'sapUiGen-LegendText').text(this.mTrackGroup.mMessage).style('position', 'relative').style('padding-left', '0.25em').style('line-height', '1.5em').style('white-space', 'nowrap');
            if (!subTracks.empty()) {
                subTracks.selectAll('span').remove();
                subTracks.transition().duration(250).style('height', '0px').remove();
            }
        }
    },
    _getConnectorHeight: function () {
        //Select last legendTrack in group
        var oLastRect = $('#' + this.getId() + ' div.legendTrack:last-child');
        if (oLastRect.position()) {
            return oLastRect.position().top;
        } else {
            return 0;
        }
    }
});