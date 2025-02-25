jQuery.sap.require('hc.hph.genomics.ui.lib.vb.site.Track');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.site.QualitativeAnnotationTrack');
hc.hph.genomics.ui.lib.vb.site.Track.extend('hc.hph.genomics.ui.lib.vb.site.QualitativeAnnotationTrack', {
    metadata: {
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
            var oThis = this;
            var label = oControl.getParent().getAggregation("_label");
            var userTitle = oControl.getParent().getLabel();
            var oData = oControl.getModel().getData();
            var qData = oData.result.qualitativeData;
            label.setText(userTitle + " " + oData.name);
            label.addStyleClass('sapUiGen-TrackLabel');
            oRenderManager.writeClasses();
            oRenderManager.renderControl(label);
            if (qData.length === 0) {
                var text = new sap.m.Text({ text: '-' });
                oRenderManager.renderControl(text);
            } else {
                for (var qInfo in qData) {
                    var value = new sap.m.Text({
                        text: qData[qInfo].percent + '%',
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
        }
    },
    onAfterRendering: function () {
        var oData = this.getModel().getData();
        var qData = oData.result.qualitativeData;
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
                    if (!color && oBrowser.mAggregations.chromosomeTracks) {
                        for (var i = 0; i < oBrowser.mAggregations.chromosomeTracks.length; i++) {
                            var oTrack = oBrowser.mAggregations.chromosomeTracks[i];
                            if (oTrack.mAggregations && oTrack.mAggregations._tracks) {
                                var id = oThis.getId();
                                var siteTrack = oThis.getParent().mAggregations._tracks;
                                for (var j = 0; j < siteTrack.length; j++) {
                                    if (id === siteTrack[j].getId()) {
                                        break;
                                    }
                                }
                                if (oTrack.mAggregations._tracks[j] instanceof hc.hph.genomics.ui.lib.vb.chromosome.QualitativeTrack) {
                                    color = oTrack.mAggregations._tracks[j].getColor();
                                    break;
                                }
                            }
                        }
                    }
                    return color;
                });
            }
        }
    }
});