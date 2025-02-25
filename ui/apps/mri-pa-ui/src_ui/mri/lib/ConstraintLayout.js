sap.ui.define([
    "sap/m/HBox"
], function (HBox) {
    "use strict";

    /**
     * Constructor for a new ConstraintLayout.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * Convenience wrapper around an HBox layout that has a resizable first column.
     * @abstract
     * @extends sap.m.HBox
     * @alias sap.hc.mri.pa.ui.lib.ConstraintLayout
     */
    var ConstraintLayout = HBox.extend("sap.hc.mri.pa.ui.lib.ConstraintLayout", {
        metadata: {
            abstract: true,
            properties: {
                firstColumnWidth: {
                    type: "sap.ui.core.CSSSize",
                    defaultValue: "50px"
                }
            }
        },
        renderer: {}
    });

    /**
     * Applications must not call this hook method directly,
     * it is called by the framework while the constructor of an element is executed.
     * Subclasses of Element should override this hook to implement any necessary initialization.
     * @override
     * @protected
     */
    ConstraintLayout.prototype.init = function () {
        HBox.prototype.init.apply(this, arguments);

        this._attachColumnResizeToOnAfterRendering();
    };

    ConstraintLayout.prototype._attachColumnResizeToOnAfterRendering = function () {
        this.addEventDelegate({
            onAfterRendering: this._resizeFirstColumn
        }, this);
    };

    ConstraintLayout.prototype._resizeFirstColumn = function () {
        var oFirstContainer = this.$().children().get(0);
        if (oFirstContainer) {
            var sFirstColumnWidth = this.getProperty("firstColumnWidth");
            // FUTURE: Remove this after updating to SAPUI >= v1.32.0, when sap.m.FlexItemData allows to set flexBasis.
            oFirstContainer.style.flexBasis = sFirstColumnWidth;
        }
    };

    /**
     * @param  {sap.ui.core.CSSSize} sFirstColumnWidth Width of the first column as CSS size
     * @returns {sap.hc.mri.pa.ui.lib.ConstraintLayout} Reference to <code>this</code> in order to allow method chaining.
     */
    ConstraintLayout.prototype.setFirstColumnWidth = function (sFirstColumnWidth) {
        this.setProperty("firstColumnWidth", sFirstColumnWidth);
        this._resizeFirstColumn();

        return this;
    };

    return ConstraintLayout;
});
