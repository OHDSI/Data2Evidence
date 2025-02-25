jQuery.sap.declare('hc.hph.genomics.ui.lib.vb.StandardLegend');
sap.ui.core.Control.extend('hc.hph.genomics.ui.lib.vb.StandardLegend', {
    metadata: {
        properties: {
            name: { type: 'string' },
            color: {
                type: 'string[]',
                defaultValue: ['#aaaaaa']
            }
        }
    },
    init: function () {
        this.mWidth = 150;
        this.mHeight = 15;
        this.mRectWidth = 16;
    },
    renderer: {
        render: function (oRenderManager, oControl) {
            // Legend Track
            oRenderManager.write('<div');
            oRenderManager.writeControlData(oControl);
            oRenderManager.addClass('legendTrack');
            oRenderManager.writeClasses();
            oRenderManager.addStyle('position', 'relative');
            oRenderManager.addStyle('display', 'inline-block');
            oRenderManager.addStyle('float', 'left');
            oRenderManager.writeStyles();
            oRenderManager.write('>');
            // Flex Div
            oRenderManager.write('<div');
            oRenderManager.addClass('flexDiv');
            oRenderManager.writeClasses();
            oRenderManager.addStyle('display', 'inline-flex');
            oRenderManager.addStyle('width', '100%');
            oRenderManager.writeStyles();
            oRenderManager.write('>');
            // Rect
            oRenderManager.write('<div');
            oRenderManager.addStyle('width', oControl.mRectWidth + 'px');
            oRenderManager.addStyle('height', oControl.mRectWidth + 'px');
            oRenderManager.addStyle('position', 'relative');
            oRenderManager.addStyle('float', 'left');
            //Determine color
            var sColorString = '';
            if (oControl.getColor() instanceof Array) {
                //Create linear gradient if an array of colors was returned
                var sGradientString = 'linear-gradient( 180deg';
                var iFraction = oControl.mRectWidth / oControl.getColor().length;
                oControl.getColor().forEach(function (color, index) {
                    sGradientString += ', ' + color + ' ' + index * iFraction + 'px';
                    sGradientString += ', ' + color + ' ' + (index + 1) * iFraction + 'px';
                });
                sGradientString += ')';
                sColorString = sGradientString;
            } else {
                sColorString = oControl.getColor();
            }
            oRenderManager.addStyle('background', sColorString);
            oRenderManager.writeStyles();
            oRenderManager.write('></div>');
            // Text
            oRenderManager.write('<span');
            oRenderManager.addStyle('position', 'relative');
            oRenderManager.addStyle('padding-left', '0.25em');
            oRenderManager.addStyle('white-space', 'nowrap');
            oRenderManager.writeStyles();
            oRenderManager.addClass('sapUiGen-LegendText');
            oRenderManager.writeClasses();
            oRenderManager.write('>');
            oRenderManager.write(oControl.getName());
            oRenderManager.write('</span>');
            // End flex div
            oRenderManager.write('</div>');
            //End Legend Track
            oRenderManager.write('</div>');
        }
    },
    onAfterRendering: function () {
        this._update(this.mMessage);
    },
    //Stub function for rendering manager
    getUIArea: function () {
        return null;
    },
    _update: function (sMessage) {
        this.mMessage = sMessage;
        if (sMessage) {
            var oDiv = d3.select('#' + this.getId());
            var oIconInfo = sap.ui.core.IconPool.getIconInfo('message-information');
            oDiv.selectAll('div.legendErrorDiv').remove();
            this.mErrorDiv = oDiv.selectAll('div.legendErrorDiv').data([sMessage]);
            this.mErrorDiv.enter().append('div').attr('class', 'legendErrorDiv').style('display', 'inline-flex').style('width', '100%').append('text').style('font-family', oIconInfo.fontFamily).text(oIconInfo.content);
            this.mErrorDiv.exit().remove();
            //Add Message
            this.mErrorDiv.append('span').text(function (name) {
                return name;
            }).attr('class', 'sapUiGen-LegendText').text(sMessage).style('position', 'relative').style('padding-left', '0.25em').style('line-height', '1.5em').style('white-space', 'nowrap');
        } else {
            d3.select('#' + this.getId()).selectAll('div.legendErrorDiv').remove();
        }
    }
});