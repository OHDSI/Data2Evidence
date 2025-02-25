jQuery.sap.require('hc.hph.genomics.ui.lib.vb.site.Track');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.site.BarChartTrack');
hc.hph.genomics.ui.lib.vb.site.Track.extend('hc.hph.genomics.ui.lib.vb.site.BarChartTrack', {
    init: function () {
        hc.hph.genomics.ui.lib.vb.site.Track.prototype.init.apply(this);
        this.height = '55px';
    },
    renderer: {
        _renderContent: function (oRenderManager, oControl) {
            var content = oControl.getPath() ? oControl.getModel().getProperty(oControl.getPath()) : oControl.getModel().getData();
            if (content instanceof Array) {
                oRenderManager.write('<svg');
                oRenderManager.addClass(oControl.getId());
                oRenderManager.addClass('sapUiGen-SiteBarChart');
                oRenderManager.writeClasses();
                oRenderManager.writeAttribute('height', oControl.height);
                oRenderManager.writeAttribute('width', '15em');
                //Write rect group
                oRenderManager.write('><g');
                oRenderManager.addClass('chartGroup');
                oRenderManager.writeClasses();
                oRenderManager.write('></g>');
                oRenderManager.write('</svg>');
            }
        }
    },
    onAfterRendering: function () {
        var oData;
        oData = this.getPath() ? this.getModel().getProperty(this.getPath()) : oData = this.getModel().getData();
        if (oData instanceof Array) {
            this.colors = d3.scale.category10();
            this.margin = {
                left: 20,
                top: 5
            };
            this.width = $('svg.' + this.getId()).width() - 2 * this.margin.left;
            this.maxVal = d3.max(oData.map(function (d) {
                return d.value;
            }));
            var oThis = this;
            var y = d3.scale.linear().domain([
                0,
                this.maxVal
            ]).range([
                parseInt(this.height, 10) / 1.5,
                0
            ]);
            var yAxis = d3.svg.axis().scale(y).orient('left').tickValues([
                0,
                this.maxVal / 2,
                this.maxVal
            ]).tickSize([0]);
            var x = d3.scale.ordinal().domain(oData.map(function (d) {
                return d.label;
            })).rangeBands([
                0,
                this.width
            ], .05);
            var xAxis = d3.svg.axis().scale(x).tickSize([0]).orient('bottom');
            var rectGroup = d3.select('svg.' + this.getId() + ' g.chartGroup');
            rectGroup.append('g').attr('class', 'yBarChartAxis').attr('transform', 'translate( ' + this.margin.left + ', ' + this.margin.top + ')').call(yAxis);
            rectGroup.append('g').attr('class', 'xBarChartAxis').attr('transform', 'translate( ' + this.margin.left + ', ' + (y(0) + this.margin.top) + ' )').call(xAxis);
            var rects = rectGroup.selectAll('rect').data(oData);
            rects.enter().append('rect').attr('width', x.rangeBand()).attr('height', function (d) {
                return y(d3.max(oData.map(function (d) {
                    return parseFloat(d.value);
                })) - parseFloat(d.value));
            }).attr('x', function (d) {
                return oThis.margin.left + x(d.label);
            }).attr('y', function (d) {
                return y(parseFloat(d.value)) + oThis.margin.top;
            }).style('fill', function (d, i) {
                return oThis.colors(i);
            });
            rects.enter().append('text').text(function (d) {
                (Math.round(parseFloat(d.value) * 100) / 100).toString();
                return d.value >= 100 ? parseFloat(d.value).toFixed(1) : parseFloat(d.value).toFixed(2);
            }).attr('x', function (d) {
                return oThis.margin.left + x(d.label) + x.rangeBand() / 2;
            }).attr('y', function (d) {
                return y(0);
            }).attr('text-anchor', 'middle').style('display', function (d) {
                return x.rangeBand() < 27 || oThis.maxVal > 999 ? 'none' : 'block';
            });
            //27px is the size of label 100.0 with 0.7em
            rects.exit().remove();
        }
    }
});