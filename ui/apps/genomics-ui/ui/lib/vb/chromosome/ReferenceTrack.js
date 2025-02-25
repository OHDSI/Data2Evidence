jQuery.sap.require('hc.hph.genomics.ui.lib.vb.chromosome.Track');
jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.chromosome.ReferenceTrack');
hc.hph.genomics.ui.lib.vb.chromosome.Track.extend('hc.hph.genomics.ui.lib.vb.chromosome.ReferenceTrack', {
    metadata: {
        properties: {
            type: {
                type: 'string',
                defaultValue: 'reference'
            },
            name: {
                type: 'string',
                defaultValue: 'Reference'
            },
            height: {
                type: 'int',
                defaultValue: 20
            }
        }
    },
    init: function () {
        hc.hph.genomics.ui.lib.vb.chromosome.Track.prototype.init.call(this);
    },
    renderer: {},
    getUpdateRequest: function () {
        if (this.mPxPerBp >= 12) {
            return {
                pluginFunction: this.getDataPlugin(),
                merge: false
            };
        } else {
            return { defaultData: { message: this.getModel("i18n.vb").getResourceBundle().getText("info.ZoomInForDetails") } };
        }
    },
    getInitRequest: function () {
        if (this.mPxPerBp >= 12) {
            return {
                pluginFunction: this.getDataPlugin(),
                merge: false,
                defaultData: { message: this.getModel("i18n.vb").getResourceBundle().getText("info.ZoomInForDetails") }
            };
        } else {
            return { defaultData: { message: this.getModel("i18n.vb").getResourceBundle().getText("info.ZoomInForDetails") } };
        }
    },
    redraw: function () {
        var oThis = this;
        var oData;
        if (this.getModel().getData().data) {
            oData = this.getModel().getData().data;
        } else {
            oData = this.getModel().getData();
        }
        //Handle empty data
        if (oData.hasOwnProperty('message')) {
            this.mDynamicContent.selectAll('g.bg rect').remove();
            this.mDynamicContent.selectAll('g.fg text').remove();
            this.mForegroundContent.selectAll('*').remove();
            if (this.mBackgroundContent.select('rect').empty()) {
                this.mBackgroundContent.append('rect').attr('x', 0).attr('y', 0).attr('width', '100%').attr('height', this.getHeight());
            }
            var oText = this.mForegroundContent.selectAll('text.message').data([this.getModel().getData().message]);
            oText.enter().append('text').attr('class', 'message').attr('y', this.getHeight() / 2 + 1).attr('text-anchor', 'middle');
            oText.exit().remove();
            oText.attr('x', this.mWidth * this.mPxPerBp / 2).text(function (data) {
                return data;
            });
        } else if (oData.sequence) {
            this.mForegroundContent.selectAll('*').remove();
            var oRectGroup = this.mDynamicContent.select('g.bg');
            if (oRectGroup.empty()) {
                oRectGroup = this.mDynamicContent.append('g').attr('class', 'bg');
            }
            var oRect = oRectGroup.selectAll('rect').data(oData.sequence);
            oRect.enter().append('rect').attr('height', this.getHeight());
            oRect.exit().remove();
            oRect.classed('n', function (data) {
                return data == 'N' || data == 'n';
            }).attr('value', function (data, index) {
                return oData.begin + index;
            }).attr('x', function (data, index) {
                return oThis.mPositionScale(oData.begin + index) + 1;
            }).attr('width', this.mPxPerBp > 2 ? this.mPxPerBp - 2 : this.mPxPerBp).style('fill', oThis.getColor());
            var oTextGroup = this.mDynamicContent.select('g.fg');
            if (oTextGroup.empty()) {
                oTextGroup = this.mDynamicContent.append('g').attr('class', 'fg');
            }
            var oText = oTextGroup.selectAll('text').data(oData.sequence);
            oText.enter().append('text').attr('y', this.getHeight() / 2 + 1).attr('text-anchor', 'middle');
            oText.exit().remove();
            oText.attr('x', function (data, index) {
                return oThis.mPositionScale(oData.begin + index + 0.5);
            }).text(function (data) {
                return data;
            });
        }
    }
});