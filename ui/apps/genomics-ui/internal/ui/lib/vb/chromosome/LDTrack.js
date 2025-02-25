jQuery.sap.require('hc.hph.genomics.ui.lib.vb.chromosome.Track');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.chromosome.LDTrack');
hc.hph.genomics.ui.lib.vb.chromosome.Track.extend('hc.hph.genomics.ui.lib.vb.chromosome.LDTrack', {
    metadata: {
        properties: {
            type: {
                type: 'string',
                defaultValue: 'ld'
            },
            name: {
                type: 'string',
                defaultValue: 'Linkage Disequilibrium'
            },
            height: {
                type: 'int',
                defaultValue: 320
            },
            limit: {
                type: 'float',
                defaultValue: 1
            }
        }
    },
    init: function () {
        this.setModel(new sap.ui.model.json.JSONModel());
    },
    renderer: {},
    pan: function (oParameters) {
        //Full load everytime when panned by size of LDTile
        if (this.mBeginInPx - this.mBegin * this.mPxPerBp > this.rec_a || this.mBegin * this.mPxPerBp - this.mBeginInPx > this.rec_a) {
            this._fullReload();
        } else if (!this.getModel().getData().hasOwnProperty('message')) {
            this._drawConnectorLines(this.formatData(this.getModel().getData()));
        }
    },
    rescale: function (oParameters) {
        this._fullReload();
    },
    _clear: function () {
        this.cancelRequest();
        this.getModel().setData({ message: 'Too many variants to show. Zoom in to see variants.' });
        this.mForegroundContent.selectAll('*').remove();
        this.mBackgroundContent.selectAll('*').remove();
        this.mBackgroundContent.append('rect').attr('width', '100%').attr('height', '100%');
        var oText = this.mForegroundContent.selectAll('text.message').data([this.getModel().getData().message]);
        oText.enter().append('text').attr('class', 'message').attr('y', this.getHeight() / 2 + 1).attr('text-anchor', 'middle');
        oText.exit().remove();
        oText.attr('x', this.mWidth * this.mPxPerBp / 2).text(function (data) {
            return data;
        });
    },
    _fullReload: function () {
        var oThis = this;
        var url = '/sap/hhp/gen/xs/getLDData.xsjs?&posstart=' + Math.floor(this.mBegin) + '&posend=' + Math.ceil(this.mBegin + 1 * this.mWidth);
        this.request(url, function (oData) {
            if (oData[1][0] === 'empty') {
                this._clear();
            } else {
                this.mBeginInPx = this.mBegin * this.mPxPerBp;
                this.getModel().setData(oData);
                this.redrawContent();
            }
        });
    },
    formatData: function (rawdata) {
        var posDataUnique = rawdata[1].sort(function (a, b) {
            return a - b;
        });
        rawdata = rawdata[0];
        this.data = [];
        // For each positiona from the raw data, create a list of ld values
        var count = -1;
        var currentpos = -1;
        var ldCount = 0;
        for (var i = 0; i < rawdata.length; i++) {
            if (currentpos !== rawdata[i].positiona) {
                ldCount = 0;
                count++;
                currentpos = rawdata[i].positiona;
                this.data[count] = {
                    pos: currentpos,
                    ld: []
                };
            }
            this.data[count].ld[posDataUnique.indexOf(rawdata[i].positionb) - 1 - posDataUnique.indexOf(currentpos)] = rawdata[i].rvalues[0];
            ldCount++;
        }
        // To complete the list of positions, insert positionb if it didn't exist as positiona
        // (It is possible that a1 and b1 have an rvalue, but the position of b1 never appears as a1) an vice versa
        // And sort
        for (var i = 0; i < posDataUnique.length; i++) {
            var allPositions = this.data.map(function (d) {
                return d.pos;
            });
            if (allPositions.indexOf(posDataUnique[i]) == -1) {
                this.data[this.data.length] = {
                    pos: posDataUnique[i],
                    ld: []
                };
            }
        }
        this.data.sort(function (a, b) {
            return a.pos - b.pos;
        });
        return this.data;
    },
    _redraw: function () {
        var oThis = this;
        var oData = this.getModel().getData();
        this.oNewPositionScale = this.mWidth * this.mPxPerBp / 200;
        this.mUpperLimitRectSize = this.oNewPositionScale * 3;
        //set size of square depending on data size and screen size
        this.rec_a = Math.floor(this.mWidth * this.mPxPerBp) / oData[1].length / 5 / Math.sqrt(2);
        if (this.rec_a > this.mUpperLimitRectSize) {
            this.rec_a = this.mUpperLimitRectSize;
        }
        if (this.rec_a < this.oNewPositionScale) {
            this.rec_a = this.oNewPositionScale;
        }
        if (oData[1].length != 0) {
            //Delete zoom text
            this.mForegroundContent.selectAll('text.message').remove();
            //Calculate how many pixels the canvas has to be shifted
            this.mMoveFactor = this.mWidth * this.mPxPerBp / 2 - oData[1].length * ((this.rec_a + 1) * Math.sqrt(2)) / 2;
            //Create group for connection lines
            var oHeaderGroup = this.mForegroundContent.select('g.ldHeader');
            if (oHeaderGroup.empty()) {
                oHeaderGroup = this.mForegroundContent.append('g').attr('class', 'ldHeader').attr('transform', 'translate(0, -30)');
            }
            //Create group for the LD tiles
            var oCanvasGroup = this.mForegroundContent.select('g.ldCanvas');
            if (oCanvasGroup.empty()) {
                //Append canvas and shift it so it is drawn in the center
                oCanvasGroup = this.mForegroundContent.append('g').attr('class', 'ldCanvas').attr('transform', 'translate(' + this.mMoveFactor + ' , 35)');
            } else {
                //Shift canvas so it is drawn in the center
                oCanvasGroup.attr('transform', 'translate(' + this.mMoveFactor + ' , 35)');
            }
            var data = this.formatData(oData);
            //Draw rectangles
            this._drawLDTiles(oCanvasGroup, data);
            //Draw connector lines
            this._drawConnectorLines(data);
        } else {
            this.cancelRequest();
            this.getModel().setData({ message: 'Zoom out to see variants' });
            this.mForegroundContent.selectAll('*').remove();
            this.mBackgroundContent.selectAll('*').remove();
            this.mBackgroundContent.append('rect').attr('width', '100%').attr('height', '100%');
            var oText = this.mForegroundContent.selectAll('text.message').data([this.getModel().getData().message]);
            oText.enter().append('text').attr('class', 'message').attr('y', this.getHeight() / 2 + 1).attr('text-anchor', 'middle');
            oText.exit().remove();
            oText.attr('x', this.mWidth * this.mPxPerBp / 2).text(function (data) {
                return data;
            });
        }
    },
    _selectColor: function (ld, color, limit) {
        var rgbColor = d3.rgb(color);
        if (ld > limit) {
            return rgbColor.darker(2);
        } else {
            return rgbColor.brighter(1 / ld / 10).toString();
        }
    },
    _drawConnectorLines: function (data) {
        var oNewPositionScale = d3.scale.linear().domain([
            this.mBegin,
            this.mBegin + this.mWidth
        ]).range([
            0,
            this.mWidth * this.mPxPerBp
        ]);
        var indexLineY = 30;
        var verticalLineY = 40;
        var graphY = 65;
        var conSPsTemp = data.map(function (d) {
            return d.pos;
        });
        var conSPs = [];
        var conSPsFinal = [];
        for (var i = 0; i < conSPsTemp.length; i++) {
            conSPs.push({
                x: oNewPositionScale(conSPsTemp[i]),
                y: indexLineY
            });
            conSPs.push({
                x: oNewPositionScale(conSPsTemp[i]),
                y: verticalLineY
            });
            conSPs.push({
                x: this.mMoveFactor + (i * this.rec_a + this.rec_a / 2) * Math.sqrt(2),
                y: verticalLineY
            });
            conSPs.push({
                x: this.mMoveFactor + (i * this.rec_a + this.rec_a / 2) * Math.sqrt(2),
                y: graphY
            });
            conSPsFinal.push(conSPs);
            conSPs = [];
        }
        var lineFunction = d3.svg.line().x(function (d) {
            return d.x;
        }).y(function (d) {
            return d.y;
        }).interpolate("basis");
        var oHeader = this.mForegroundContent.select('g.ldHeader');
        var path = oHeader.selectAll('path').data(conSPsFinal);
        path.enter().append('path').attr("stroke", "black").attr("stroke-width", 1).attr("fill", "none").attr("d", lineFunction);
        path.exit().remove();
        path.attr("d", lineFunction);
    },
    _drawLDTiles: function (svg, data) {
        var oThis = this;
        var ldGroup = svg.selectAll('g.ld').data(data);
        ldGroup.enter().append('g')    // group
.attr('class', 'ld').attr('transform', function (row, index) {
            return 'translate(' + index * oThis.rec_a * Math.sqrt(2) + ') rotate(45)';
        });
        //horizontal space between columns/variants
        ldGroup.exit().remove();
        ldGroup.attr('transform', function (row, index) {
            return 'translate(' + index * oThis.rec_a * Math.sqrt(2) + ') rotate(45)';
        });
        var rectGroup = ldGroup.selectAll('rect').data(function (row) {
            return row.ld;
        });
        rectGroup.enter()    //draw rectangle
.append('rect').attr('x', function (element, index) {
            return index * oThis.rec_a + oThis.rec_a;
        }).attr('y', -oThis.rec_a).attr('fill', function (elem) {
            return oThis._selectColor(elem, oThis.getColor(), oThis.getLimit());
        }).attr('width', oThis.rec_a).attr('height', oThis.rec_a).classed('nonValue', function (elem) {
            return elem === null;
        }).style('stroke', 'black').style('stroke-width', 1).style('stroke-opacity', 0.1).style('opacity', 0).attr('value', function (elem) {
            return elem;
        }).transition().duration(150).style('opacity', 1);
        rectGroup.exit().transition().duration(150).style('opacity', 0).remove();
        rectGroup.attr('x', function (element, index) {
            return index * oThis.rec_a + oThis.rec_a;
        }).attr('y', -oThis.rec_a).attr('width', oThis.rec_a).attr('height', oThis.rec_a);
    }
});