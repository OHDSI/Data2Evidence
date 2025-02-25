jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.chromosome.Track');
jQuery.sap.declare('hc.hph.genomics.internal.ui.lib.vb.chromosome.PValues');
hc.hph.genomics.ui.lib.vb.chromosome.Track.extend('hc.hph.genomics.internal.ui.lib.vb.chromosome.PValues', {
    metadata: {
        properties: {
            type: {
                type: 'string',
                defaultValue: 'pval'
            },
            name: {
                type: 'string',
                defaultValue: 'P-Values'
            },
            height: {
                type: 'int',
                defaultValue: 80
            },
            count: {
                type: 'int',
                defaultValue: 1000
            }
        }
    },
    renderer: {},
    redraw: function () {
        var oContent = d3.select("#" + this.getId() + " > g.content");
        var aValues = this.getModel().getData();
    },
    getInitRequest: function () {
        return this.getUpdateRequest();
    },
    getUpdateRequest: function () {
        return {
            pluginFunction: this.getDataPlugin(),
            parameters: {
                count: this.getCount(),
                begin: Math.max(Math.floor(this.mBegin - 2 * this.mWidth), 0),
                end: Math.ceil(this.mBegin + 3 * this.mWidth)
            },
            merge: false
        };
    },
    _clear: function () {
        d3.selectAll("#" + this.getId() + " > g.content > *").remove();
        this.getModel().setData([]);
    }
});