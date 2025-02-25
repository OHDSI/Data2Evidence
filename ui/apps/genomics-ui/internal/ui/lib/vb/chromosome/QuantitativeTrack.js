jQuery.sap.require('hc.hph.genomics.ui.lib.vb.chromosome.Track');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.chromosome.QuantitativeTrack');
hc.hph.genomics.ui.lib.vb.chromosome.Track.extend('hc.hph.genomics.ui.lib.vb.chromosome.QuantitativeTrack', {
    metadata: {
        properties: {
            type: {
                type: 'string',
                defaultValue: 'quantitative'
            },
            name: {
                type: 'string',
                defaultValue: 'Quantitative'
            },
            height: {
                type: 'int',
                defaultValue: 32
            },
            className: {
                type: 'string',
                defaultValue: 'onco_Score'
            }
        }
    },
    init: function () {
        this.setModel(new sap.ui.model.json.JSONModel());
        this.mShowBase = false;
        this.mShowValues = false;
    },
    renderer: {},
    pan: function (oParameters) {
        var oData = this.getModel().getData();
        //Only execute if there is a variant to show
        if (oData.length > 0) {
            if (this.mBegin < this.mFirstBPLoaded + 0.5 * this.mWidth || this.mBegin > this.mFirstBPLoaded + 1.5 * this.mWidth) {
                this._fullReload();
            }
        }
    },
    rescale: function (oParameters) {
        this.mShowValues = this.mPxPerBp >= 20;
        this.mShowBase = this.mPxPerBp >= 3;
        this._fullReload();
    },
    _fullReload: function () {
        this.binCount = Math.ceil(this.mWidth / Math.max(1, this.mPxPerBp) * this.mPxPerBp * 3);
        this.mFirstBPLoaded = Math.floor(this.mBegin - this.mWidth);
        //Set sampleid/groupid
        var id = this.getParameters();
        if (!$.isEmptyObject(id)) {
            if (this.isGroup()) {
                this.groupId = id.id;
                this.sampleId = '';
            } else if (this.isSample()) {
                this.sampleId = id.id;
                this.groupId = '';
            }
        } else {
            if (sap.ui.getCore().byId(this.getBrowser()).isGroup()) {
                this.groupId = sap.ui.getCore().byId(this.getBrowser()).getParameters().id;
                this.sampleId = '';
            } else if (sap.ui.getCore().byId(this.getBrowser()).isSample()) {
                this.sampleId = sap.ui.getCore().byId(this.getBrowser()).getParameters().id;
                this.groupId = '';
            }
        }
        if (!this.mShowBase) {
            this.request('/sap/hhp/gen/xs/getQuantitativeDataBins.xsjs?chrom=' + this.mChromosomeIndex + '&begin=' + Math.floor(this.mBegin - this.mWidth) + '&end=' + Math.ceil(this.mBegin + 2 * this.mWidth) + '&binCount=' + this.binCount + '&sampleId=' + encodeURIComponent(this.sampleId) + '&class=' + encodeURIComponent(this.getClassName()) + '&groupId=' + encodeURIComponent(this.groupId));
        } else {
            this.request('/sap/hhp/gen/xs/getQuantitativeData.xsjs?chrom=' + this.mChromosomeIndex + '&begin=' + Math.floor(this.mBegin - this.mWidth) + '&end=' + Math.ceil(this.mBegin + 2 * this.mWidth) + '&sampleId=' + encodeURIComponent(this.sampleId) + '&class=' + encodeURIComponent(this.getClassName()) + '&groupId=' + encodeURIComponent(this.groupId));
        }
    },
    _redraw: function (oParameters) {
        var oThis = this;
        var oData = this.getModel().getData();
        if (!this.mShowBase) {
            //Remove drawn basepair text
            this.mDynamicContent.selectAll('.fg').remove();
            //Remove drawn basepair rectangles
            this.mDynamicContent.selectAll('.bg').remove();
            //Create y-scale
            var dataYScale = d3.scale.linear().domain(d3.extent(oData)).range([
                this.getHeight(),
                0
            ]);
            //Create area function
            var oVariantDensityArea = d3.svg.area().x(function (d, i) {
                return oThis.mPositionScale(oThis.mBegin + (i * 3 / oThis.binCount - 1) * oThis.mWidth + 1);
            }).y0(this.getHeight()).y1(function (d) {
                return dataYScale(d);
            }).interpolate("step-after");
            var oDataAreaPath = this.mDynamicContent.selectAll('path.quantitativeArea').data([oData]);
            oDataAreaPath.enter().append('path').attr('class', 'quantitativeArea').style('pointer-events', 'none').style('fill', oThis.getColor()).style('stroke', oThis.getColor());
            oDataAreaPath.attr('d', oVariantDensityArea);
            oDataAreaPath.exit().remove();
        } else {
            //Remove drawn density area
            this.mDynamicContent.select('.quantitativeArea').remove();
            //Create value groups for background (rectangles)
            var oRectGroup = this.mDynamicContent.select('g.bg');
            if (oRectGroup.empty()) {
                oRectGroup = this.mDynamicContent.append('g').attr('class', 'bg');
            }
            //Create rectangle
            var oRect = oRectGroup.selectAll('rect').data(oData);
            oRect.enter().append('rect').attr('height', this.getHeight()).style('fill', oThis.getColor());
            oRect.exit().remove();
            oRect.attr('value', function (data) {
                return data.POSITION;
            })    /*.attr( 'x', function ( data, index ) { return oThis.mPositionScale( data.POSITION ); } )*/.attr('transform', function (variant) {
                return 'translate(' + oThis.mPositionScale(variant.POSITION) + ')';
            }).attr('width', this.mPxPerBp);
            //Create chromosome groups for foreground (text)
            var oTextGroup = this.mDynamicContent.select('g.fg');
            if (oTextGroup.empty()) {
                oTextGroup = this.mDynamicContent.append('g').attr('class', 'fg');
            }
            //Create text
            if (this.mShowValues) {
                var oText = oTextGroup.selectAll('text').data(oData);
                oText.enter().append('text').attr('y', this.getHeight() * 0.5);
                oText.exit().remove();
                oText.attr('x', function (data, index) {
                    return oThis.mPositionScale(data.POSITION + 0.5);
                }).text(function (data) {
                    return data.VALUE;
                });
            } else {
                oTextGroup.selectAll('text').remove();
            }
        }
    }
});