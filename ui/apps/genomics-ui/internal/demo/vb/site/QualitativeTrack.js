/* DO NOT DELETE -- Rashmi */
jQuery.sap.require('hc.hph.genomics.ui.lib.vb.site.Track');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.site.QualitativeTrack');
hc.hph.genomics.ui.lib.vb.site.Track.extend('hc.hph.genomics.ui.lib.vb.site.QualitativeTrack', {
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
                    var geneName;
                    if (qData[qInfo].geneName === 'intergenic') {
                        geneName = new sap.m.Text({ text: oControl.getModel("i18n.vb").getResourceBundle().getText("info.IntergenicMutation") });
                    } else {
                        var oMenu = oControl.getAggregation("menu");
                        geneName = oMenu.clone();
                        geneName.setModel(new sap.ui.model.json.JSONModel());
                        geneName.getModel().setData(qData[qInfo]);
                    }
                    var value = new sap.m.Text({
                        text: qData[qInfo].percent + '%',
                        textAlign: "Right"
                    });
                    var icon = new sap.ui.core.Icon({
                        src: "sap-icon://person-placeholder",
                        color: "#666666"
                    });
                    icon.addStyleClass("patientIcon");
                    var hbox = new sap.m.HBox({
                        items: [
                            value,
                            icon
                        ]
                    });
                    var flexBox = new sap.m.FlexBox({
                        justifyContent: "SpaceBetween",
                        items: [
                            geneName,
                            hbox
                        ]
                    });
                    oRenderManager.renderControl(flexBox);
                    oRenderManager.write('<div>');
                    oRenderManager.write('<svg');
                    oRenderManager.addClass(oControl.getId() + "_" + qData[qInfo].geneName);
                    oRenderManager.addClass('sapUiGen-SitePopover');
                    oRenderManager.addClass('mutationBarChart');
                    oRenderManager.writeClasses();
                    oRenderManager.writeAttribute('height', "1.2em");
                    oRenderManager.writeAttribute('width', '14em');
                    //Write rect group
                    oRenderManager.write('><g');
                    oRenderManager.write('></g>');
                    oRenderManager.write('</svg>');
                    oRenderManager.write('</div>');
                }
            }
        }
    },
    onAfterRendering: function () {
        var oData = this.getModel().getData();
        var qData = oData.result.qualitativeData;
        if (!$.isEmptyObject(qData)) {
            var oThis = this;
            var xScale = d3.scale.linear().domain([
                0,
                1
            ]).range([
                0,
                14
            ]);
            var widthScale = d3.scale.linear().domain([
                0,
                1
            ]).range([
                0,
                100
            ]);
            var aColor = {
                "3_prime_UTR_variant": "#ff00ff",
                "5_prime_UTR_variant": "#339933",
                "intergenic_variant": "#0000ff",
                "intron_variant": "#ffff00",
                "missense_variant": "#ff0000",
                "splice_acceptor_variant": "#ff6600",
                "splice_donor_variant": "#99ccff",
                "start_lost": "#66ff66",
                "stop_retained_variant": "#993333",
                "stop_gained": "#00cc99",
                "stop_lost": "#33ccff",
                "synonymous_variant": "#990099"
            };
            for (var qInfo in qData) {
                var rectGroup = d3.select('svg.' + this.getId() + "_" + qData[qInfo].geneName + ' g').data([qData[qInfo]]);
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
                    var color = aColor[data.type];
                    if (!color) {
                        color = "#cccc00";
                    }
                    return color;
                });
            }
        }
    }
});