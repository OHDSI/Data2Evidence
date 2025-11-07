/* eslint no-use-before-define: [2, "nofunc"] */
sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/lib/BoolContainer",
    "sap/hc/mri/pa/ui/lib/MriFrontendConfig",
    "sap/hc/mri/pa/ui/lib/BoolFilterContainer",
    "sap/hc/mri/pa/ui/Utils"
], function (jQuery, BoolContainer, MriFrontendConfig, BoolFilterContainer, Utils) {
    "use strict";

    /**
     * Create a new ControlGenerator.
     * @constructor
     *
     * @classdesc
     * Visitor to traverse the IFR and create the corresponding Controls.
     * @alias sap.hc.mri.pa.ui.lib.ifr.ControlGenerator
     */
    function ControlGenerator() {
        this.oControls = null;
        this.oCurrent = null;
        this.bIsExcluded = false;
    }

    /**
     * Visit the top level filter and create a BooolContainer as root Control.
     * @param {object}                                                      mConfigMetadata Config metadata for the
     *                                                                                      following Controls
     * @param {sap.hc.mri.pa.ui.lib.ifr.BooleanContainers.BooleanContainer} oCards          BooleanContainer with
     *                                                                                      eventually FilterCards
     */
    ControlGenerator.prototype.visitFilter = function (mConfigMetadata, oCards) {
        if (!this.oControls) {
            this.oControls = new BoolContainer();
        }
        oCards.accept(this);
    };

    /**
     * Visit an And BooleanContainer.
     * As there are exactly two Ands before reaching the FilterCards, create a BoolFilterContainer on the second
     * and visit each content.
     * @param {sap.hc.mri.pa.ui.lib.ifr.BooleanContainers.BooleanContainer[]} aAndContent List of BooleanContainers
     */
    ControlGenerator.prototype.visitAnd = function (aAndContent) {
        if (!this.oCurrent) {
            this.oCurrent = this.oControls;
            aAndContent.forEach(function (oBooleanContainer) {
                oBooleanContainer.accept(this);
            }, this);
        } else {
            var oBoolFilterContainer = new BoolFilterContainer({
                allContainer: true,
                headerText: Utils.getText("MRI_PA_MATCH_ALL")
            });
            this.oCurrent.addContent(oBoolFilterContainer);
            this.oCurrent = oBoolFilterContainer;
            aAndContent.forEach(function (oIFRFilterCard) {
                oIFRFilterCard.accept(this);
            }, this);
            this.oCurrent = this.oCurrent.getParent();
        }
    };

    /**
     * Visit an Or BooleanContainer.
     * Create a BoolFilterContainer and visit each content.
     * @param {sap.hc.mri.pa.ui.lib.ifr.BooleanContainers.BooleanContainer[]} aOrContent List of BooleanContainers
     */
    ControlGenerator.prototype.visitOr = function (aOrContent) {
        var oBoolFilterContainer = new BoolFilterContainer({
            headerText: Utils.getText("MRI_PA_MATCH_ANY"),
            separatorText: Utils.getText("MRI_PA_BOOLEAN_AND"),
            visible: false
        });
        this.oCurrent.addContent(oBoolFilterContainer);
        this.oCurrent = oBoolFilterContainer;
        aOrContent.forEach(function (oIFRFilterCard) {
            oIFRFilterCard.accept(this);
        }, this);
        this.oCurrent = this.oCurrent.getParent();
    };

    /**
     * Visit a Not BooleanContainer.
     * Set a flag for the next FilterCard to be excluded.
     * @param {sap.hc.mri.pa.ui.lib.ifr.BooleanContainers.BooleanContainer} oNotContent BooleanContainer
     */
    ControlGenerator.prototype.visitNot = function (oNotContent) {
        this.bIsExcluded = true;
        oNotContent[0].accept(this);
    };

    /**
     * Visit a FilterCard.
     * Create an AttributeVisitor to visit each Attribute.
     * @param {string}                                                                  sConfigPath        Config path of the FilterCard
     * @param {number}                                                                  iInstanceNumber    Instance number of the FilterCard
     * @param {string}                                                                  sInstanceID        Instance Id, currently a combination of config path and instance number
     * @param {string}                                                                  sName              FilterCard name
     * @param {sap.hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.Successor}         oSuccessor         Successor object
     * @param {sap.hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.AdvancedTimeFilter} oAdvanceTimeFilter Advanced time filter object
     * @param {sap.hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.ParentInteraction} oParentInteraction ParentInteraction object
     * @param {sap.hc.mri.pa.ui.lib.ifr.BooleanContainers.BooleanContainer}             oAttributes        FilterCard attributes.
     */
    ControlGenerator.prototype.visitFilterCard = function (sConfigPath, iInstanceNumber, sInstanceID, sName, oSuccessor, oAdvanceTimeFilter, oParentInteraction, oAttributes) {
        var oFilterCard = this.oCurrent.createFilterCard(sConfigPath, iInstanceNumber, sName);
        if (this.bIsExcluded && oFilterCard.getAllowExcludeOption()) {
            oFilterCard.setExcludeFilter(this.bIsExcluded);
            this.bIsExcluded = false;
        }
        if (oSuccessor) {
            var oConstraint = oFilterCard._createConstraintForAttribute("_succ");
            oConstraint.addExpression("=", oSuccessor.id);
            oFilterCard._addConstraint(oConstraint, 2, true);

            oConstraint = oFilterCard._createConstraintForAttribute("_relTime");
            oConstraint.addExpression(">=", oSuccessor.minDaysBetween);
            oConstraint.addExpression("<=", oSuccessor.maxDaysBetween);
            oFilterCard._addConstraint(oConstraint, 2, true);
        }

        if (oParentInteraction) {
            var oParentConstraint = oFilterCard._createConstraintForAttribute("_parentInteraction");
            oParentConstraint.addExpression("=", oParentInteraction);
            oFilterCard._addConstraint(oParentConstraint, null, true);
        }

        if (oAdvanceTimeFilter) {
            oFilterCard.setAdvancedTimeFilterModel(oAdvanceTimeFilter);
        }

        this.oCurrent.addFilterCard(oFilterCard);
        oAttributes.accept(new AttributeVisitor(oFilterCard));
    };

    /**
     * Create a new AttributeVisitor.
     * @constructor
     * @param {sap.hc.mri.pa.ui.lib.FilterCard} oFilterCard FilterCard control whose attributes are visited
     *
     * @classdesc
     * Visitor to traverse the IFR of a FilterCard and create the corresponding Contraints.
     * @alias sap.hc.mri.pa.ui.lib.ifr.ControlGenerator.AttributeVisitor
     */
    function AttributeVisitor(oFilterCard) {
        this.oFilterCard = oFilterCard;
    }

    /**
     * Visit an And BooleanContainer.
     * Pass on to visiting the content.
     * @param {sap.hc.mri.pa.ui.lib.ifr.BooleanContainers.BooleanContainer[]} aAndContent List of BooleanContainers
     */
    AttributeVisitor.prototype.visitAnd = function (aAndContent) {
        aAndContent.forEach(function (visitable) {
            visitable.accept(this);
        }, this);
    };

    /**
     * Visit an Or BooleanContainer.
     * Pass on to visiting the content.
     * @param {sap.hc.mri.pa.ui.lib.ifr.BooleanContainers.BooleanContainer[]} aOrContent List of BooleanContainers
     */
    AttributeVisitor.prototype.visitOr = function (aOrContent) {
        aOrContent.forEach(function (visitable) {
            visitable.accept(this);
        }, this);
    };

    /**
     * Visit an Attribute.
     * Let the FilterCard create a Constraint and create a ConstraintVisitor to add expressions to the Constraint.
     * @param {string}                                                      sConfigPath  Constraint config path
     * @param {string}                                                      sInstanceID  Constraint instance id
     * @param {sap.hc.mri.pa.ui.lib.ifr.BooleanContainers.BooleanContainer} oConstraints BooleanContainer
     */
    AttributeVisitor.prototype.visitAttribute = function (sConfigPath, sInstanceID, oConstraints) {
        this.oFilterCard.addConstraintForAttribute(sConfigPath);
        oConstraints.accept(new ConstraintVisitor(this.oFilterCard.getConstraintForAttribute(sConfigPath)));
    };

    /**
     * Create a new ConstraintVisitor.
     * @constructor
     * @param {sap.hc.mri.pa.ui.lib.Constraint} oAttribute Constraint control whose expressions are visited
     *
     * @classdesc
     * Visitor to traverse the IFR of a Constraint and add the corresponding expressions.
     * @alias sap.hc.mri.pa.ui.lib.ifr.ControlGenerator.ConstraintVisitor
     */
    function ConstraintVisitor(oAttribute) {
        this.oAttribute = oAttribute;
    }

    /**
     * Visit an Or BooleanContainer.
     * Pass on to visiting the content.
     * @param {sap.hc.mri.pa.ui.lib.ifr.BooleanContainers.BooleanContainer[]} aOrContent List of BooleanContainers
     */
    ConstraintVisitor.prototype.visitOr = function (aOrContent) {
        aOrContent.forEach(function (visitable) {
            visitable.accept(this);
        }, this);
    };

    /**
     * Visit an And BooleanContainer.
     * Create an AndConstraintVisitor to proceed as the Expression is evaluated at this level.
     * @param {sap.hc.mri.pa.ui.lib.ifr.BooleanContainers.BooleanContainer[]} aAndContent List of BooleanContainers
     */
    ConstraintVisitor.prototype.visitAnd = function (aAndContent) {
        var oAndConstraintVisitor = new AndConstraintVisitor();
        aAndContent.forEach(function (oExpression) {
            oExpression.accept(oAndConstraintVisitor);
        });
        this.oAttribute.addBooleanExpression(oAndConstraintVisitor.aAndContent);
    };

    /**
     * Visit an Expression and add it to the Constraint.
     * @param {string}        sOperator Operator, for example "="
     * @param {string|number} vValue    Value of the Expression
     */
    ConstraintVisitor.prototype.visitExpression = function (sOperator, vValue) {
        this.oAttribute.addExpression(sOperator, vValue);
    };

    /**
     * Create a new AndConstraintVisitor.
     * @constructor
     *
     * @classdesc
     * Visitor to traverse the IFR of an Expression and return a list of operator-value objects.
     * @alias sap.hc.mri.pa.ui.lib.ifr.ControlGenerator.AndConstraintVisitor
     */
    function AndConstraintVisitor() {
        this.aAndContent = [];
    }

    /**
     * Visit an Expression and add it to the list.
     * @param {string}        sOperator Operator, for example "="
     * @param {string|number} vValue    Value of the Expression
     */
    AndConstraintVisitor.prototype.visitExpression = function (sOperator, vValue) {
        this.aAndContent.push({
            operator: sOperator,
            value: vValue
        });
    };

    /**
     * Static shorthand method for creating a Generator, visiting the IFR and returning the Controls.
     * @static
     * @param   {sap.hc.mri.ui.pa.lib.ifr.InternalFilterRepresentation.Filter} oIFR           IFR to visit
     * @param   {sap.hc.mri.pa.ui.lib.BoolContainer}                           [oRootControl] Optional root control
     * @returns {sap.hc.mri.pa.ui.lib.BoolContainer}                           Generated Control
     */
    ControlGenerator.generate = function (oIFR, oRootControl) {
        var oControlGenerator = new ControlGenerator();
        if (oRootControl) {
            oControlGenerator.oControls = oRootControl;
        }
        oIFR.accept(oControlGenerator);
        return oControlGenerator.oControls;
    };

    return ControlGenerator;
});
