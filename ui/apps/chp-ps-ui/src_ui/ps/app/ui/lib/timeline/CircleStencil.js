sap.ui.define([
    "sap/ui/base/Object"
], function (Object) {
    "use strict";

    /**
     * Constructor for a new CircleStencil.
     * @constructor
     * @param {object} [mSettings] Settings for the stencil
     *
     * @classdesc
     * The CircleStencil is an image of a filled circle with outline.
     * It can be used to quickly draw circles of the same size at different positions into a canvas.
     * @extends sap.ui.base.Object
     *
     * @alias sap.hc.hph.patient.app.ui.lib.timeline.CircleStencil
     */
    var CircleStencil = Object.extend("sap.hc.hph.patient.app.ui.lib.timeline.CircleStencil", {
        constructor: function (mSettings) {
            this.radius = 4;
            this.padding = 2;
            this.density = 2;

            if (mSettings) {
                this.radius = mSettings.radius || this.radius;
                this.padding = mSettings.padding || this.padding;
                this.density = mSettings.density || this.density;
            }

            // Create stencil buffer
            this.canvas = document.createElement("canvas");
            this.canvas.width = this.canvas.height = 2 * (this.radius + this.padding) * this.density;
            this.canvas.getContext("2d").scale(this.density, this.density);
        },

        prepareStencil: function (nRadius, sStrokeColor, sFillColor) {
            var oCtx = this.canvas.getContext("2d");
            var nCenter = this.padding + this.radius;

            oCtx.lineWidth = 3 * (nRadius / this.radius);

            // We reduce the radius to get the same look like like in the SVG
            nRadius -= 0.5 * (nRadius / this.radius);

            // Set stroke and fill style
            oCtx.strokeStyle = sStrokeColor;
            oCtx.fillStyle = sFillColor;

            // Clear canvas
            oCtx.clearRect(0, 0, 2 * nCenter, 2 * nCenter);

            // Draw circle with outline
            oCtx.beginPath();
            oCtx.moveTo(nCenter + nRadius, nCenter);
            oCtx.arc(nCenter, nCenter, nRadius, 0, 2 * Math.PI);
            oCtx.stroke();
            oCtx.lineWidth = 0;
            oCtx.fill();
        },

        getCanvas: function () {
            return this.canvas;
        },

        getWidth: function () {
            return 2 * (this.padding + this.radius);
        },

        getHeight: function () {
            return 2 * (this.padding + this.radius);
        },

        getCenter: function () {
            return [this.padding + this.radius, this.padding + this.radius];
        }
    });

    return CircleStencil;
});
