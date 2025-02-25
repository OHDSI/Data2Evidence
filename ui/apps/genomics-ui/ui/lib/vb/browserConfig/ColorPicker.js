jQuery.sap.require("sap.ui.core.Control");
sap.ui.define([], function () {
    "use-strict";
    var ColorPicker = sap.ui.core.Control.extend('hc.hph.genomics.ui.lib.vb.browserConfig.ColorPicker', {
        metadata: {
            properties: {
                color: {
                    type: 'string',
                    defaultValue: 'black'
                },
                enabled: {
                    type: 'boolean',
                    defaultValue: false
                },
                colorList: {
                    type: 'string[]',
                    defaultValue: []
                }
            }
        },
        renderer: {
            render: function (oRenderManager, oControl) {
                oRenderManager.write('<div');
                oRenderManager.writeControlData(oControl);
                oRenderManager.addClass('sapUiGen-ColorPicker');
                oRenderManager.writeClasses();
                oRenderManager.write('>');
                //Render color box
                oRenderManager.write('<div');
                oRenderManager.addClass('sapUiGen-ConfigColorDiv');
                if (oControl.getEnabled()) {
                    oRenderManager.addClass('enabled');
                } else {
                    oRenderManager.addClass('disabled');
                }
                oRenderManager.writeClasses();
                oRenderManager.addStyle('background-color', oControl.getColor());
                oRenderManager.addStyle('border-top-color', oControl.getEnabled() === true ? '#C0C0C0' : '#E0E0E0');
                oRenderManager.addStyle('border-left-color', oControl.getEnabled() === true ? '#C0C0C0' : '#E0E0E0');
                oRenderManager.addStyle('border-bottom-color', oControl.getEnabled() === true ? '#C0C0C0' : '#E0E0E0');
                oRenderManager.writeStyles();
                oRenderManager.write('/>');
                //End Control
                oRenderManager.write('</div>');
            }
        },
        onAfterRendering: function () {
            var oThis = this;
            var oColorDiv = d3.select('#' + this.getId() + ' div.sapUiGen-ConfigColorDiv');
            if (this.getEnabled()) {
                oColorDiv.on('click', function () {
                    var oColorPickerPopover = sap.ui.jsfragment('hc.hph.genomics.ui.lib.vb.browserConfig.ColorPickerPopover', oThis);
                    oColorPickerPopover.addStyleClass('sapUiGen-ColorPickerPopover');
                    oColorPickerPopover.openBy(this);
                });
            }
        }
    });
    return ColorPicker;
});