jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.VariantDensityLegend');
hc.hph.genomics.ui.lib.vb.StandardLegend.extend('hc.hph.genomics.ui.lib.vb.VariantDensityLegend', {
    metadata: {
        properties: {
            min: { type: 'float' },
            max: { type: 'float' },
            minTotal: { type: 'float' },
            maxTotal: { type: 'float' },
            med: { type: 'float' },
            lowerQuart: { type: 'float' },
            upperQuart: { type: 'float' },
            name: { type: 'string' }
        }
    },
    init: function () {
        this.mWidth = 150;
        this.mHeight = 15;
    },
    renderer: {
        render: function (oRenderManager, oControl) {
            "use strict";
            oRenderManager.write('<svg');
            oRenderManager.addClass('legendTrack');
            oRenderManager.writeClasses();
            oRenderManager.writeControlData(oControl);
            oRenderManager.addStyle('height', 19 + oControl.mHeight + 'px');
            oRenderManager.addStyle('width', oControl.mWidth + 50 + 'px');
            oRenderManager.writeStyles();
            oRenderManager.write('></svg>');
        }
    },
    //Stub function for rendering manager
    getUIArea: function () {
        return null;
    },
    _appendTo: function (oDivToAppend, oMessage) {
        if (this.getMinTotal() !== undefined && this.getMaxTotal() !== undefined && this.getMin() !== undefined && this.getMax() !== undefined && this.getMed() !== undefined && this.getLowerQuart() !== undefined && this.getUpperQuart() !== undefined && !oMessage) {
            if (d3.select('#' + this.getId()).node()) {
                d3.select(d3.select('#' + this.getId()).node().parentNode).select(' span.sapUiGen-LegendText ').text(this.getName());
            }
            var oSVG;
            if (oDivToAppend === null) {
                oSVG = d3.select('#' + this.getId());
                oSVG.style('height', 19 + this.mHeight + 'px');
                oSVG.style('width', this.mWidth + 50 + 'px');
            } else {
                oSVG = d3.select(oDivToAppend).append('svg').attr('class', 'legendTrack').attr('id', this.getId()).style('height', 19 + this.mHeight + 'px').style('width', '200px');
            }
            if (oSVG.select('g.plotGroup').empty()) {
                var plotGroup = oSVG.append('g').attr('class', 'plotGroup').attr('transform', 'translate(19, 0)');
                plotGroup.append('rect').attr('width', this.mWidth).attr('height', this.mHeight).attr('fill', 'white').attr('stroke', 'black').attr('stroke-width', '1px');
                var xScale = d3.scale.linear().domain([
                    this.getMinTotal(),
                    this.getMaxTotal()
                ]).range([
                    0,
                    this.mWidth
                ]);
                var xAxis = d3.svg.axis().scale(xScale).orient('bottom').ticks(3).tickFormat(d3.format('.1g')).tickValues([
                    0,
                    this.getMaxTotal()
                ]);
                plotGroup = oSVG.append('g').attr('transform', 'translate(19, ' + this.mHeight + ')').attr('class', 'boxPlotAxis').call(xAxis);
                //Left antenna
                var leftWhisker = plotGroup.append('g').attr('class', 'leftWhisker');
                leftWhisker.append('rect').attr('width', '1px').attr('height', this.mHeight / 2).attr('fill', 'black').attr('transform', 'translate(' + xScale(this.getMin()) + ',' + (-this.mHeight + this.mHeight / 4) + ')');
                //Connector
                plotGroup.append('rect').attr('width', xScale(this.getMax()) - xScale(this.getMin())).attr('height', '1px').attr('fill', 'black').attr('transform', 'translate(' + xScale(this.getMin()) + ',' + (-this.mHeight + this.mHeight / 2) + ')');
                //Right whisker
                var rightWhisker = plotGroup.append('g').attr('class', 'rightWhisker');
                rightWhisker.append('rect').attr('width', '1px').attr('height', this.mHeight / 2).attr('fill', 'black').attr('transform', 'translate(' + (xScale(this.getMax()) - 1) + ',' + (-this.mHeight + this.mHeight / 4) + ')');
                //Create box
                var boxWidth = xScale(this.getUpperQuart()) - xScale(this.getLowerQuart());
                plotGroup.append('rect').attr('width', boxWidth + 'px').attr('height', this.mHeight).attr('fill', 'red').attr('transform', 'translate(' + xScale(this.getMed() - this.getLowerQuart()) + ',' + -this.mHeight + ')');
                //Median
                plotGroup.append('rect').attr('width', '1px').attr('height', this.mHeight).attr('fill', 'white').attr('transform', 'translate(' + xScale(this.getMed()) + ',' + -this.mHeight + ')');
            }
        } else if (oMessage) {
            d3.select(d3.select('#' + this.getId()).node().parentNode).select(' span.sapUiGen-LegendText ').text(this.getName() + ': ' + oMessage);
            d3.select('#' + this.getId()).style('height', '0px').style('width', '0px');
            d3.select('#' + this.getId() + ' *').remove();
        }
    },
    _update: function (oMessage) {
        this._appendTo(null, oMessage);
    }
});