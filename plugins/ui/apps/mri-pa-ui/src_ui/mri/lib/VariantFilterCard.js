sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "./FilterCard",
    "./MriFrontendConfig",
    "./VariantConstraint",
    "./HelpText",
    "sap/m/Popover",
    "sap/m/VBox",
    "sap/ui/core/Icon"
], function (jQuery, Utils, FilterCard, MriFrontendConfig, VariantConstraint, HelpText, Popover, VBox, Icon) {
    "use strict";

    /**
     * Constructor for a new VariantFilterCard.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * Extended FilterCard, that is only active when an attribute has been selected for filtering.
     * @extends sap.hc.mri.pa.ui.lib.FilterCard
     * @alias sap.hc.mri.pa.ui.lib.VariantFilterCard
     */
    var VariantFilterCard = FilterCard.extend("sap.hc.mri.pa.ui.lib.VariantFilterCard", {
        metadata: {
            properties: {
                status: {
                    type: "string",
                    defaultValue: "Disabled"
                }
            }
        },
        renderer: function (oRenderManager, oControl) {
            oRenderManager.write("<div");
            oRenderManager.addClass("sapMriPaFilterCard");
            oRenderManager.addClass("sapMriPaVariantFilterCard");
            if (oControl.getProperty("isNew")) {
                oRenderManager.addClass("sapMriPaFilterCardNew");
            }
            if (oControl.getProperty("excludeFilter")) {
                oRenderManager.addClass("sapMriPaFilterCardExclude");
            }
            oRenderManager.writeControlData(oControl);
            oRenderManager.writeClasses();
            oRenderManager.write(">");
            if (oControl.getProperty("excludeFilter")) {
                oRenderManager.write("<div class='sapMriPaFilterCardExcludeText'>");
                oRenderManager.write(Utils.getText("MRI_PA_LABEL_EXCLUDED"));
                oRenderManager.write("</div>");
            }
            oRenderManager.renderControl(oControl.getAggregation("layout"));
            oRenderManager.write("</div>");
        }
    });

    VariantFilterCard.prototype.init = function () {
        FilterCard.prototype.init.call(this);
        this._availableStatus = [
            "Disabled", "Enabled"
        ];
        this.addStyleClass("sapMriPaFilterCardDisabled");

        this._oHelpIcon = new Icon({
            src: "sap-icon://message-information",
            color: "#bbbbbb",
            hoverColor: "#666666",
            size: "1rem"
        });

        this._oHelpIcon.attachPress(function () {
            // create popover
            if (!this._oPopover) {
                this._oPopover = new Popover({
                    placement: sap.m.PlacementType.Bottom,
                    title: Utils.getText("MRI_PA_DISABLED_FC_HELP_HEADER"),
                    content: [new HelpText({
                        firstline: Utils.getText("MRI_PA_DISABLED_FC_HELP_TEXT")
                    })]
                });
                this._oPopover.addStyleClass(Utils.getContentDensityClass());
            }

            this._oPopover.openBy(this._oHelpIcon);
        }, this);
    };

    VariantFilterCard.prototype._getIFRSettings = function () {
        var mIFRSettings = FilterCard.prototype._getIFRSettings.call(this);
        mIFRSettings.inactive = !this.isEnabled();
        return mIFRSettings;
    };

    /**
     * Get the currently active Constraints of this FilterCard.
     * Constraints are considered active if they can currently be used to filter the result set.
     * Overrides the FilterCard method to add the special location Constraint.
     * @override
     * @private
     * @returns {sap.hc.mri.pa.ui.lib.Contstraint[]} List of Constraint controls.
     */
    VariantFilterCard.prototype._getConstraints = function () {
        return this._specificConstraintLayout.getItems().concat(FilterCard.prototype._getConstraints.apply(this));
    };

    VariantFilterCard.prototype._createHelpContent = function () {
        return this._oHelpIcon;
    };

    VariantFilterCard.prototype.setStatus = function (sNewStatus) {
        var that = this;
        this.setProperty("status", sNewStatus);
        this._availableStatus.forEach(function (sStatus) {
            that.removeStyleClass("sapMriPaFilterCard" + sStatus);
        });
        this.addStyleClass("sapMriPaFilterCard" + sNewStatus);
        this._oHelpIcon.setVisible(sNewStatus !== "Enabled");
    };

    // reinitialize: remove all constraints, rebuild menu etc.
    VariantFilterCard.prototype.reinit = function () {
        FilterCard.prototype.reinit.call(this);

        this._specificConstraintLayout = new VBox();

        this._addSpecificConstraint();
        this.getAggregation("layout").insertItem(this._specificConstraintLayout, 1);
    };


    VariantFilterCard.prototype._addSpecificConstraint = function () {
        var aLocationAttrs = this._getOwnConfig().getAttributesWithAnnotation("genomics_variant_location");

        // it shouldn't happen that no attribute with annotation is found, this is the condition for creating this card
        if (aLocationAttrs.length > 0) {
            // if multiple attributes with the same annotation, use the first one for the location constraint
            var sAttrPath = this._getOwnConfig().getConfigPath() + ".attributes." + aLocationAttrs[0];

            this._oLocationAttrConfig = MriFrontendConfig.getFrontendConfig().getAttributeByPath(sAttrPath);

            var newconstr = new VariantConstraint({
                attributePath: sAttrPath,
                name: this._oLocationAttrConfig.getName(),
                instanceID: this._getInstanceID() + ".attributes." + aLocationAttrs[0],
                changed: [this._onLocConstraintChanged, this]
            });

            newconstr.parentName = this.getName();
            var prefixString = newconstr.preparePrefixToolTipString();

            newconstr.onSetConstraintToolTip(prefixString);

            this._locationConstraint = newconstr;
            this._specificConstraintLayout.addItem(newconstr);
        }
    };

    VariantFilterCard.prototype._onLocConstraintChanged = function () {
        if (this._locationConstraint.isValid()) {
            this.setStatus("Enabled");
        } else {
            this.setStatus("Disabled");
        }
        this.fireChange();
    };

    VariantFilterCard.prototype.isEnabled = function () {
        return this.getStatus() === "Enabled";
    };

    /**
     * Removes all values from all attributes (=constraints) of a filter card, i.e., resetting
     * the filter card to its initial state.
     */
    VariantFilterCard.prototype.clearAllConstraints = function () {
        this._locationConstraint.clear();
        FilterCard.prototype.clearAllConstraints.call(this);
    };

    /**
     * Add a Constraint for the given attribute.
     * Override the FilterCard method to handle the Location Constraint correctly.
     * @override
     * @param {string} sAttributeKey The absolute attribute instance key.
     */
    VariantFilterCard.prototype.addConstraintForAttribute = function (sAttributeKey) {
        // Only add the Constraint if it is not the Location Constraint
        if (this._locationConstraint.getAttributePath() !== sAttributeKey) {
            FilterCard.prototype.addConstraintForAttribute.call(this, sAttributeKey);
        }
    };

    /**
     * Return a Constraint of this VariantFilterCard by absolute attribute key.
     * @override
     * @param   {string}                          sAttributeKey The absolute attribute instance key.
     * @returns {sap.hc.mri.pa.ui.lib.Constraint} The Constraint or null, if none was found.
     */
    VariantFilterCard.prototype.getConstraintForAttribute = function (sAttributeKey) {
        if (this._locationConstraint && this._locationConstraint.getAttributePath() === sAttributeKey) {
            return this._locationConstraint;
        } else {
            return FilterCard.prototype.getConstraintForAttribute.call(this, sAttributeKey);
        }
    };

    /**
     * Creates/modifies a constraint for the given attribute key. If some values are specified, they will
     * be set to the constraint.
     * @override
     * @param    {string} sAttributeKey         The key of an attribute in the filter card.
     *                                          If the corresponding constraint doesn't exist, it will be created.
     * @param    {string[]} aValues    An array of values to be added to the constraint.
     * @param    {sap.hc.mri.pa.ui.Utils.valuesMergeMode} [mergeMode] The merging strategy, specifying the way
     *              the new values should be merged with the existing ones. If no mergeMode is provided, the default
     *              merge mode of the constraint will be used.
     */
    VariantFilterCard.prototype.setFilterValues = function (sAttributeKey, aValues, mergeMode) {
        // only process here if the attribute is equal to the custom location constraint
        if (this._locationConstraint.getAttrkey() === sAttributeKey) {
            this._locationConstraint.setFilterValues(aValues, mergeMode);
            this.fireChange();
        } else {
            // call the parent method in other cases
            FilterCard.prototype.setFilterValues.call(this, sAttributeKey, aValues, mergeMode);
        }
    };


    VariantFilterCard.prototype.setDescriptionColumnsWidth = function (nColumnWidth) {
        FilterCard.prototype.setDescriptionColumnsWidth.call(this, nColumnWidth);

        this._specificConstraintLayout.getItems().forEach(function (constraint) {
            constraint.setDescriptionColumnWidth(nColumnWidth);
        });
    };

    return VariantFilterCard;
});
