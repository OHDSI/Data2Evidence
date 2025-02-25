jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.GradientScaleLegend');
sap.ui.core.Control.extend('hc.hph.genomics.ui.lib.vb.GradientScaleLegend', {
    metadata: {
        properties: {
            //Size of values has to be equal to size of colors
            values: { type: 'float[]' },
            colors: { type: 'string[]' },
            name: { type: 'string' }
        }
    },
    init: function () {
        this.mWidth = 10;
        this.mHeight = 70;
    },
    renderer: {
        render: function (oRenderManager, oControl) {
            "use strict";
            oRenderManager.write('<svg');
            oRenderManager.addClass('legendTrack');
            oRenderManager.writeClasses();
            oRenderManager.writeControlData(oControl);
            oRenderManager.writeAttribute('height', 19 + oControl.mHeight + 'px');
            oRenderManager.addStyle('transform', 'translate(1.25em,0em)');
            oRenderManager.writeStyles();
            oRenderManager.write('></svg>');
        }
    },
    onAfterRendering: function () {
        if (this.getValues() && this.getColors() && this.getName()) {
            var oThis = this;
            //Create color scale for LD-Values
            var ldColorScale = d3.scale.linear().domain(this.getValues()).range(this.getColors());
            var oSVG = d3.select('#' + this.getId());
            //Adjust div height
            d3.select('#' + this.getId()).transition().duration(250).attr('height', 19 + this.mHeight + 'px').attr('width', '140px');
            //Define gradient
            var ldGradient = oSVG.select('lineargradient');
            if (ldGradient.empty()) {
                ldGradient = oSVG.append('defs').append('linearGradient').attr('id', this.getName().trim().split(' ').join('_') + '_gradient').attr('x1', '0').attr('x2', '0').attr('y1', '0').attr('y2', '1').attr("spreadMethod", "pad");
                ldGradient.selectAll('stop').data(this.getColors()).enter().append('stop').attr('offset', function (d, i) {
                    return i * (100 / oThis.getValues().length) + '%';
                }).attr('stop-color', function (d, i) {
                    return ldColorScale(oThis.getValues()[i]);
                }).attr('stop-opacity', 1);
            }
            var legendGroup = oSVG.selectAll('g.sapUiGen-GradientScaleLegend');
            if (legendGroup.empty()) {
                legendGroup = oSVG.append('g').attr('class', 'sapUiGen-GradientScaleLegend');
                legendGroup.append('rect').attr('class', 'ldLegendGradient').attr('width', this.mWidth).attr('height', this.mHeight).attr('fill', 'url(#' + this.getName().trim().split(' ').join('_') + '_gradient' + ')').attr('transform', 'translate(0, 10)');
                //Draw axis
                var ldLegendAxisScale = d3.scale.linear().domain([
                    d3.min(this.getValues()),
                    d3.max(this.getValues())
                ]).range([
                    0,
                    this.mHeight
                ]);
                var format = d3.format(".14f");
                var ldLegendAxis = d3.svg.axis().scale(ldLegendAxisScale).orient('right').ticks(3).tickFormat(format);
                legendGroup.append('g').attr('transform', 'translate(' + this.mWidth + ', 10)').attr('class', 'ldLegendAxis').call(ldLegendAxis);
            }
        }
    },
    //Stub function for rendering manager
    getUIArea: function () {
        return null;
    },
    //Stub function for updatable legends
    _update: function () {
    },
    setValues: function (valueArray) {
        valueArray.sort(function (a, b) {
            return a - b;
        });
        this.setProperty('values', valueArray, true);
        this.onAfterRendering();
    },
    setColors: function (colorArray) {
        this.setProperty('colors', colorArray, true);
        this.onAfterRendering();
    }
});