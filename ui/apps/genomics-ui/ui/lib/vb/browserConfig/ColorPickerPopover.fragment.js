sap.ui.define([], function () {
    "use strict";
    sap.ui.jsfragment("hc.hph.genomics.ui.lib.vb.browserConfig.ColorPickerPopover", {
        createContent: function (oColorPicker) {
            this.mColorPicker = oColorPicker;
            //Create Popover
            this.setModel(new sap.ui.model.resource.ResourceModel({
                bundleUrl: '/hc/hph/genomics/ui/i18n/vb/messagebundle.properties',
                bundleLocale: sap.ui.getCore().getConfiguration().getLanguage()
            }), 'i18n.vb');
            this.mPopover = new sap.m.Popover({ showHeader: false });
            this.mPopover.setModel(new sap.ui.model.json.JSONModel());
            this.mPopover.addContent(this.createGrid(oColorPicker));
            return this.mPopover;
        },
        createGrid: function (oColorPicker) {
            var oThis = this;
            var oGridTable = new sap.ui.layout.Grid();
            oGridTable.addStyleClass('sapUiGen-ColorGrid');
            for (var i = 0; i < oColorPicker.getColorList().length; i++) {
                var oHTMLDiv = new sap.ui.core.HTML({ content: '<div class="sapUiGen-ColorDiv" style="background-color: ' + oColorPicker.getColorList()[i] + '"/>' });
                oHTMLDiv.attachBrowserEvent('click', function () {
                    var sSelectedColor = $('#' + this.getId()).css('background-color');
                    oColorPicker.setColor(sSelectedColor);
                });
                oGridTable.addContent(oHTMLDiv);
            }
            //Create div which will change color based on input value
            this.mHTMLInputDiv = new sap.ui.core.HTML({ content: '<div class="sapUiGen-ColorDiv inputDiv" style="background-color: ' + this.mColorPicker.getColor() + '"/>' });
            //Create live change event function as member variable to reuse for detaching the browser event
            this.mInputLiveChangeEvent = function () {
                var sSelectedColor = $('#' + this.getId()).css('background-color');
                oThis.mColorPicker.setColor(sSelectedColor);
            };
            this.mHTMLInputDiv.attachBrowserEvent('click', this.mInputLiveChangeEvent);
            oGridTable.addContent(this.mHTMLInputDiv);
            oGridTable.addContent(this.createInput(this.mColorPicker.getColor()));
            return oGridTable;
        },
        createInput: function (sDefaultValue) {
            var oThis = this;
            var oInput = new sap.m.Input({ value: sDefaultValue });
            oInput.addStyleClass('sapUiGen-InheritWidth');
            //Change color of color div live
            oInput.attachLiveChange(function () {
                if (oThis.getColorCSS(this.getValue()) !== '') {
                    oThis.mHTMLInputDiv.attachBrowserEvent('click', oThis.mInputLiveChangeEvent);
                    $('#' + oThis.mPopover.getId() + ' div.sapUiGen-ColorDiv.inputDiv').removeClass('invalid');
                    $('#' + oThis.mPopover.getId() + ' div.sapUiGen-ColorDiv.inputDiv').css('background-color', this.getValue());
                } else {
                    oThis.mHTMLInputDiv.detachBrowserEvent('click', oThis.mInputLiveChangeEvent);
                    $('#' + oThis.mPopover.getId() + ' div.sapUiGen-ColorDiv.inputDiv').addClass('invalid');
                    $('#' + oThis.getId() + ' div.sapUiGen-ColorDiv.inputDiv').addClass('invalid');
                }
            });
            return oInput;
        },
        /**
         * Returns rgb color if sColor is valid.
         * Else return ''
         * @param {string} sColor any representation of an rgb color
         * @returns {string} with format rgb( red, green, blue )
         */
        getColorCSS: function (sColor) {
            var ele = document.createElement("div");
            ele.style.color = sColor;
            return ele.style.color.split(/\s+/).join('').toLowerCase();
        }
    });
});