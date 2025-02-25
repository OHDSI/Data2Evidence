sap.ui.define([
    "jquery.sap.global",
    "sap/ui/core/Control",
    "./Timeline",
    "sap/ui/thirdparty/d3",
    "sap/ui/thirdparty/jqueryui/jquery-ui-effect",
    "sap/ui/thirdparty/jqueryui/jquery-ui-core",
    "sap/ui/thirdparty/jqueryui/jquery-ui-widget",
    "sap/ui/thirdparty/jqueryui/jquery-ui-mouse",
    "sap/ui/thirdparty/jqueryui/jquery-ui-sortable"
], function (jQuery, Control, Timeline) {
    "use strict";
    /**
     * Constructor for a new LaneBase.
     *
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @class
     * The LaneBase control is base class of the Lane and ChartLane controls.
     * @extends sap.ui.core.Control
     *
     * @author SAP SE
     * @version 1.0.0
     *
     * @constructor
     * @alias sap.hc.hph.patient.app.ui.lib.timeline.LaneBase
     */

    var LaneBase = Control.extend("sap.hc.hph.patient.app.ui.lib.timeline.LaneBase", {
        metadata: {
            library: "sap.hc.hph.patient.app.ui.lib",
            properties: {
                /**
                 * Name of the Lane.
                 */
                title: {
                    type: "string",
                    group: "Data",
                    defaultValue: ""
                },
                /**
                 * Tooltip for the Lane title.
                 */
                titleTooltip: {
                    type: "string",
                    group: "Data",
                    defaultValue: ""
                },
                /**
                 * Main text shown in the lane header
                 */
                value: {
                    type: "string",
                    group: "Data",
                    defaultValue: ""
                },
                /**
                 * Tooltip for the Lane value.
                 */
                valueTooltip: {
                    type: "string",
                    group: "Data",
                    defaultValue: ""
                },
                /**
                 * Color of the Lane.
                 */
                color: {
                    type: "sap.hc.hph.patient.app.ui.lib.LaneColor",
                    group: "Appearance"
                },
                /**
                 * Whether the lane should be shown in minimized mode
                 */
                minimized: {
                    type: "boolean",
                    group: "Appearance",
                    defaultValue: false
                },
                /**
                 * D3 scale used to map dates to pixels.
                 */
                scale: {
                    type: "object",
                    group: "Data",
                    defaultValue: d3.time.scale()
                }
            },
            aggregations: {
                /**
                 * List of sublanes shown below this lane.
                 */
                subLanes: {
                    type: "sap.hc.hph.patient.app.ui.lib.timeline.LaneBase",
                    multiple: true
                },
                /**
                 * List of buttons shown on the top-right of the lane header.
                 */
                headerContent: {
                    type: "sap.ui.core.Control",
                    multiple: true
                },
                /**
                 * Additional content that is rendered at the right of the header.
                 */
                headerExtraContent: {
                    type: "sap.ui.core.Control",
                    multiple: true
                }
            }
        }
    });

    /**
     * Reevaluates whether drag'n'drop of sublanes should be enabled.
     */
    LaneBase.prototype.updateDragAndDrop = function () {
        var sIdSelector = "#" + this.getIdForLabel();
        var nVisibleSubLanes = this.getSubLanes().reduce(function (counter, oLane) {
            return oLane.getVisible() ? counter + 1 : counter;
        }, 0);
        jQuery(sIdSelector + " .sapTlTimelineSubLanes").sortable("option", "disabled", nVisibleSubLanes < 2);
    };

    /**
     * Enables support for reordering the sublanes via drag'n'drop.
     */
    LaneBase.prototype.onAfterRendering = function () {
        var sIdSelector = "#" + this.getIdForLabel();
        var that = this;

        function reorderLanes() {
            var oBinding = that.getBinding("subLanes");
            var aNewList = jQuery(sIdSelector + " .sapTlTimelineSubLanes").sortable("toArray")
                .map(function (sId) {
                    var oLane = sap.ui.getCore().byId(sId);
                    return oLane.getBindingContext().getObject();
                });
            oBinding.getModel().setProperty(oBinding.getPath(), aNewList, oBinding.getContext());
            that.rerender();
        }

        jQuery(sIdSelector + " .sapTlTimelineSubLanes").sortable({
            axis: "y",
            containment: "parent",
            delay: 200,
            distance: 0,
            handle: ".sapTlTimelineLaneHeader",
            items: "> .sapTlTimelineLaneFamily",
            tolerance: "pointer",
            update: reorderLanes,
            zIndex: 4
        }).disableSelection();
        this.updateDragAndDrop();
    };

    /**
     * Return the surrounding Timeline for this Lane.
     * @returns {sap.hc.hph.patient.app.ui.lib.timeline.Timeline|undefined} This Lane's Timeline
     */
    LaneBase.prototype.getTimeline = function () {
        var oParent = this.getParent();
        if (oParent instanceof Timeline) {
            return oParent;
        } else if (oParent instanceof LaneBase) {
            return oParent.getTimeline();
        }
    };

    /**
     * Changes the visibility of the Lane and induces a (potentially) pending scale update if Lane became visible.
     * @param {boolean} bVisible Indicates whether the Lane should become visible or not.
     */
    LaneBase.prototype.setVisible = function (bVisible) {
        var bTurnedVisible = !this.getVisible() && bVisible;
        Control.prototype.setVisible.call(this, bVisible);
        if (bTurnedVisible) {
            this.setScale(this.getScale());
        }
        if (this.getParent()) {
            // Parent is either a Timeline or a Lane, both implement updateDragAndDrop()
            this.getParent().updateDragAndDrop();
        }
    };

    /**
     * Update the underlying D3 scale that is used to map dates to pixels. Forwards the scale update to all sublanes.
     * @param {object} oScale D3 scale to map dates to pixels
     */
    LaneBase.prototype.setScale = function (oScale) {
        this.setProperty("scale", oScale.copy(), true);
        if (this.getVisible()) {
            this.getSubLanes().forEach(function (oSubLane) {
                oSubLane.setScale(oScale);
            });
        }
    };

    return LaneBase;
});
