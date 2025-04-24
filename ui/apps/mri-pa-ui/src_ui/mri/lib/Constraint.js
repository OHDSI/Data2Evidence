sap.ui.define([
    "jquery.sap.global",
    "./ConstraintLayout",
    "./ifr/BooleanContainers",
    "./ifr/InternalFilterRepresentation",
    "./library",
    "sap/m/FlexItemData",
    "sap/m/HBox",
    "sap/m/Label"
], function (jQuery, ConstraintLayout, BooleanContainers, InternalFilterRepresentation, library, FlexItemData, HBox, Label) {
    "use strict";

    /**
     * Constructor for a new Constraint. To create a constraint, use the static method {@link createConstraint}.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * Abstract class for Contraints.
     * @abstract
     * @extends sap.hc.mri.pa.ui.lib.ConstraintLayout
     * @alias sap.hc.mri.pa.ui.lib.Constraint
     */
    var Constraint = ConstraintLayout.extend("sap.hc.mri.pa.ui.lib.Constraint", {
        metadata: {
            abstract: true,
            properties: {
                /**
                 * Display name for this constraint.
                 */
                name: {
                    type: "string"
                },
                /**
                 * Complete path to the attribute value.
                 */
                attributePath: {
                    type: "string"
                },
                /**
                 * Id of the Constraint.
                 */
                instanceID: {
                    type: "string"
                }
            },
            events: {
                changed: {},
                newDescriptionLabelAddedWithWidth: {}
            }
        },
        renderer: {}
    });

    Constraint.prototype.getIFR = function () {
        return new InternalFilterRepresentation.Attribute({
            configPath: this.getAttributePath(),
            instanceID: this.getInstanceID(),
            name: this.getName(),
            constraints: new BooleanContainers.Or(this._getIFRExpressions())
        });
    };

    /**
     * Add an expression to the Constraint.
     * Each Constraint subclass has to handle the operators and values it supports.
     * @throws {Error} Has to be implemented in subclass.
     */
    Constraint.prototype.addExpression = function () {
        throw new Error("addExpression must be implemented by Constraint subclass");
    };

    Constraint.prototype._getIFRExpressions = function () {
        throw new Error("_getIFRExpressions must be implemented by Constraint subclass");
    };

    Constraint.prototype.getAttrkey = function () {
        var attrPathComponents = this.getAttributePath().split(".");
        return attrPathComponents[attrPathComponents.length - 1];
    };

    // set name / title / label of this constraint
    Constraint.prototype.setName = function (name) {
        this.setProperty("name", name);
        this._label.setText(name);
        this._label.setTooltip(name);
    };

    Constraint.prototype.onSetConstraintToolTip = function (prefixString) { // eslint-disable-line no-unused-vars
        throw new Error("onSetConstraintToolTip must be implemented by Constraint subclass");
    };

    /**
     * Set some values to the constraint.
     * @abstract
     * @param {string[]} values    The values to be added.
     * @param {sap.hc.mri.pa.ui.Utils.valuesMergeMode} [mergeMode] The merge strategy between existing values
     *        and new values.
     */
    Constraint.prototype.setFilterValues = function (values, mergeMode) { // eslint-disable-line no-unused-vars
        throw new Error("setFilterValues must be implemented by Constraint subclass");
    };

    Constraint.prototype.setConstraintToolTip = function () {
        var prefixString = this.preparePrefixToolTipString();
        this.onSetConstraintToolTip(prefixString);
    };

    Constraint.prototype.preparePrefixToolTipString = function () {
        return this.parentName + " - " + this.getName();
    };

    /**
     * Check if the Constraint has any values.
     * @returns {boolean} True, if there is no filtering value in the Constraint.
     */
    Constraint.prototype.isEmpty = function () {
        return this._getIFRExpressions().length === 0;
    };

    /**
     * Removes all input on the constraint, i.e., resetting it to the initial state.
     */
    Constraint.prototype.clear = function () {
        throw new Error("clear must be implemented by Constraint subclass");
    };

    Constraint.prototype._createInputContent = function () { /* implemented by subclass */ };

    /**
     * Adds layout data to the given control to make it adjust to the available width in the layout of this constraint,
     * i.e. set the flex growFactor to 1.
     * @param {sap.ui.core.Control} oControl Control to add LayoutData
     */
    Constraint.prototype._setGrowingLayout = function (oControl) {
        oControl.setLayoutData(new FlexItemData({
            growFactor: 1
        }));
    };

    Constraint.prototype._createHelpContent = function () { /* implemented by subclass */ };

    Constraint.prototype._createLayout = function () {
        this._label = new Label({
            width: "100%",
            layoutData: new FlexItemData({
                shrinkFactor: 0
            })
        }).addStyleClass("sapMriPaConstraintLabel");

        this._label.addEventDelegate({
            onAfterRendering: this._emitNewDescriptionLabelAddedWithWidthEvent
        }, this);

        this.addItem(this._label);


        var oHelpContent = this._createHelpContent();
        if (oHelpContent) {
            this._attachMouseEvents(this, oHelpContent);
        } else {
            oHelpContent = new Label();
        }

        oHelpContent.addStyleClass("sapMriPaHelpWidth").addStyleClass("sapMriPaHidden");
        this.addItem(oHelpContent);

        var inputContent = this._createInputContent();

        // set the label for the input
        if (inputContent) {
            if (Array.isArray(inputContent)) {
                this._label.setLabelFor(inputContent[0]);
                for (var i = 0; i < inputContent.length; ++i) {
                    if (inputContent[i].addAriaLabelledBy) {
                        inputContent[i].addAriaLabelledBy(this._label);
                    }
                }
            } else {
                this._label.setLabelFor(inputContent);
                if (inputContent.addAriaLabelledBy) {
                    inputContent.addAriaLabelledBy(this._label);
                }
            }
        }

        var oInputContainer = new HBox({
            alignItems: sap.m.FlexAlignItems.Center
        });

        // add the input fields to the layout
        if (inputContent) {
            if (Array.isArray(inputContent)) {
                for (var j = 0; j < inputContent.length; ++j) {
                    oInputContainer.addItem(inputContent[j]);
                }
            } else {
                oInputContainer = inputContent;
            }
        }

        oInputContainer.setLayoutData(new FlexItemData({
            growFactor: 1
        }));

        this.addItem(oInputContainer);
    };

    Constraint.prototype._attachMouseEvents = function (oControl, oControlToShow) {
        oControl.addEventDelegate({
            onmouseover: function () {
                oControlToShow.removeStyleClass("sapMriPaHidden");
            },
            onmouseout: function () {
                oControlToShow.addStyleClass("sapMriPaHidden");
            }
        });
    };

    Constraint.prototype._emitNewDescriptionLabelAddedWithWidthEvent = function () {
        var $label = this._label.$();
        if ($label.length > 0) {
            var nRequiredWidth = this._getWidthOfHtmlLabel($label.get(0));
            this.fireNewDescriptionLabelAddedWithWidth({
                width: nRequiredWidth
            });
        }
    };

    Constraint.prototype._getWidthOfHtmlLabel = function (oLabel) {
        oLabel.style.textOverflow = "initial";
        oLabel.style.width = "auto";
        var nWidth = oLabel.getBoundingClientRect().width;
        oLabel.style.textOverflow = "";
        oLabel.style.width = "100%";

        return nWidth;
    };

    /**
     * Set the new width of the label column.
     * @param {number} nDescriptionColumnWidth Width in pixel
     */
    Constraint.prototype.setDescriptionColumnWidth = function (nDescriptionColumnWidth) {
        this.setFirstColumnWidth(nDescriptionColumnWidth + "px");
    };

    Constraint.prototype.init = function () {
        ConstraintLayout.prototype.init.apply(this, arguments);
        this.addStyleClass("sapMriPaConstraint");
        this.setAlignItems(sap.m.FlexAlignItems.Center);

        // TODO: This will indirectly call methods that are being overriden by subclasses.
        // Doing this in a constructor is dangerous because the methods will run before the subclass is initialized.
        // Therefore, refactor and avoid the call to methods that should be overriden.
        this._createLayout();
    };

    /**
     * Create a new concrete Constraint Object.
     * The class of the new object depends on the given config.type:
     * - text, freetextTags: FreetextConstraint
     * - text: DomainConstraing
     * - num: RangeConstraint
     * - time: AbsTimeConstraint
     * - relation: SingleSelectionConstraint
     * @param   {String}                       key        Attribute key, is used in the attribute path.
     * @param   {Object}                       params     Preset Values for the Constraint
     * @param   {String}                       parentKey  Key, used in the attribute path.
     * @param   {String}                       parentName ParentName of the constraint.
     * @returns {sap.hc.mri.pa.ui.lib.Constraint} Object of one of the concrete subclasses.
     */
    Constraint.createConstraint = function (key, params, parentKey, parentName) {
        var newconstr = null;
        if (!params) {
            params = {};
        }

        var mSettings = {
            attributePath: parentKey + ".attributes." + key,
            name: params.name,
            instanceID: params.cardID + ".attributes." + key
        };

        if (params.type === sap.hc.mri.pa.ui.lib.CDMAttrType.Freetext) {
            newconstr = new sap.hc.mri.pa.ui.lib.FreetextConstraint(mSettings);
        } else if (params.type === sap.hc.mri.pa.ui.lib.CDMAttrType.Text) {
            newconstr = new sap.hc.mri.pa.ui.lib.DomainConstraint(mSettings);

            if (params.values) {
                newconstr.setValues(params.values);
            }
        } else if (params.type === sap.hc.mri.pa.ui.lib.CDMAttrType.Number) {
            newconstr = new sap.hc.mri.pa.ui.lib.RangeConstraint(mSettings);

            var oFilterObject;
            if (params.lower || params.upper) {
                if (params.lower && params.upper) {
                    oFilterObject = {
                        and: [{
                            op: ">=",
                            value: params.lower
                        }, {
                            op: "<=",
                            value: params.upper
                        }]
                    };
                } else if (params.lower) {
                    oFilterObject = {
                        op: ">=",
                        value: params.lower
                    };
                } else {
                    oFilterObject = {
                        op: "<=",
                        value: params.upper
                    };
                }

                newconstr.applyFilterObject({
                    filter: [oFilterObject]
                });
            }
        } else if (params.type === "legacy-num") {
            newconstr = new sap.hc.mri.pa.ui.lib.LegacyRangeConstraint(mSettings);

            if (params.lower) {
                newconstr.setLower(params.lower);
            }
            if (params.upper) {
                newconstr.setUpper(params.upper);
            }
        } else if (params.type === sap.hc.mri.pa.ui.lib.CDMAttrType.Datetime) {
            newconstr = new sap.hc.mri.pa.ui.lib.DateTimeConstraint(mSettings);

            if (params.lower) {
                newconstr.setLower(params.lower);
            }
            if (params.upper) {
                newconstr.setUpper(params.upper);
            }
        } else if (params.type === sap.hc.mri.pa.ui.lib.CDMAttrType.Date) {
            newconstr = new sap.hc.mri.pa.ui.lib.DateConstraint(mSettings);

            if (params.lower) {
                newconstr.setLower(params.lower);
            }
            if (params.upper) {
                newconstr.setUpper(params.upper);
            }
        } else if (params.type === "relation") {
            newconstr = new sap.hc.mri.pa.ui.lib.SingleSelectionConstraint(mSettings);
        } else if (params.type === "parentInteraction") {
            newconstr = new sap.hc.mri.pa.ui.lib.SingleSelectionConstraint(mSettings);
        } else {
            throw new Error("Attribute type " + params.type + " is not supported");
        }

        newconstr.parentName = parentName;

        if (parentKey === "patient") {
            newconstr.attributeId = parentKey + ".attributes." + key;
        } else {
            newconstr.attributeId = parentKey + ".1.attributes." + key;
        }

        newconstr.setConstraintToolTip();

        return newconstr;
    };

    return Constraint;
});
