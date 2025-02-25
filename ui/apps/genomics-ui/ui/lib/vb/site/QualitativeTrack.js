jQuery.sap.require('hc.hph.genomics.ui.lib.vb.site.Track');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.site.QualitativeTrack');
hc.hph.genomics.ui.lib.vb.site.Track.extend('hc.hph.genomics.ui.lib.vb.site.QualitativeTrack', {
    metadata: {
        properties: {
            color: {
                type: 'string',
                defaultValue: '#aaaaaa'
            }
        },
        aggregations: {
            menu: {
                type: "hc.hph.genomics.ui.lib.vb.site.Menu",
                multiple: false
            },
            _menu: {
                type: "hc.hph.genomics.ui.lib.vb.site.Menu",
                multiple: false
            }
        },
        defaultAggregation: "menu"
    },
    init: function () {
        hc.hph.genomics.ui.lib.vb.site.Track.prototype.init.apply(this);
    },
    renderer: {
        render: function (oRenderManager, oControl) {
            var label = oControl.getAggregation("_label");
            var userTitle = oControl.getLabel();
            var oData = oControl.getModel().getData();
            var text;
            oData = oData.result ? oData.result : oData;
            if (oData.qualitativeData) {
                var qData = oData.qualitativeData;
                var name = oControl.getModel().getData().name ? oControl.getModel().getData().name : "";
                label.setText(userTitle + " " + name);
                label.addStyleClass('sapUiGen-TrackLabel');
                oRenderManager.writeClasses();
                oRenderManager.renderControl(label);
                if (qData.length === 0) {
                    text = new sap.m.Text({ text: '-' });
                    oRenderManager.renderControl(text);
                } else {
                    for (var qInfo in qData) {
                        var value = new sap.m.Text({
                            text: qData[qInfo].affectedCount + "/" + qData[qInfo].sampleCount + " (" + (qData[qInfo].affectedCount * 100 / qData[qInfo].sampleCount).toFixed(1) + "%)",
                            textAlign: "Right"
                        });
                        var icon = new sap.ui.core.Icon({
                            src: "sap-icon://person-placeholder",
                            color: "#666666"
                        });
                        icon.addStyleClass("patientIcon");
                        oRenderManager.write('<div>');
                        oRenderManager.write('<svg');
                        oRenderManager.addClass(oControl.getId() + "_group");
                        oRenderManager.addClass('sapUiGen-SitePopover');
                        oRenderManager.addClass('mutationBarChartAnnotation');
                        oRenderManager.writeClasses();
                        oRenderManager.writeAttribute('height', "1.2em");
                        oRenderManager.writeAttribute('width', '10em');
                        oRenderManager.write('><g');
                        oRenderManager.write('></g>');
                        oRenderManager.write('</svg>');
                        oRenderManager.renderControl(value);
                        oRenderManager.renderControl(icon);
                        oRenderManager.write('</div>');
                    }
                }
            } else {
                label.setText(userTitle);
                label.addStyleClass('sapUiGen-TrackLabel');
                oRenderManager.writeClasses();
                oRenderManager.renderControl(label);
                text = new sap.m.Text({ text: oControl.getModel("i18n.vb").getResourceBundle().getText(oData) });
                oRenderManager.renderControl(text);
            }
        }
    },
    onAfterRendering: function () {
        var oData = this.getModel().getData();
        oData = oData.result ? oData.result : oData;
        if (oData.qualitativeData) {
            var qData = oData.qualitativeData;
            var oBrowser = sap.ui.getCore().byId(this.getBrowser());
            var oThis = this;
            if (!$.isEmptyObject(qData)) {
                var oThis = this;
                var xScale = d3.scale.linear().domain([
                    0,
                    1
                ]).range([
                    0,
                    10
                ]);
                var widthScale = d3.scale.linear().domain([
                    0,
                    1
                ]).range([
                    0,
                    100
                ]);
                for (var qInfo in qData) {
                    var rectGroup = d3.select('svg.' + this.getId() + "_group" + ' g').data([qData[qInfo]]);
                    var oRects = rectGroup.selectAll('rect').data(function (data) {
                        return data.mutationData;
                    });
                    this.xScaleVal = 0.0;
                    oRects.enter().append('rect');
                    oRects.exit().remove();
                    oRects.attr("x", function (data) {
                        var x = oThis.xScaleVal;
                        oThis.xScaleVal += xScale(data.percent);
                        return x.toFixed(1) + "em";
                    }).attr("y", "5").attr("width", function (data) {
                        return widthScale(data.percent) + "%";
                    }).attr("height", "100%").style('fill', function (data) {
                        var color = oBrowser.getCategoryColor(data.type);
                        if (!color) {
                            color = oThis.getColor();
                        }
                        return color;
                    });
                }
            }
        }
    }
});