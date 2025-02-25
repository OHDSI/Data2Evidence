// tslint:disable:max-classes-per-file
import BoolContainerModel from '../models/BoolContainerModel'
import BoolFilterContainerModel from '../models/BoolFilterContainerModel'
import FilterCardModel from '../models/FilterCardModel'
import MriFrontendConfig from '../MriFrontEndConfig'

/**
 * Create a new AndConstraintVisitor.
 * @constructor
 *
 * @classdesc
 * Visitor to traverse the IFR of an Expression and return a list of operator-value objects.
 * @alias hc.mri.pa.ui.lib.ifr.ControlGenerator.AndConstraintVisitor
 */
class AndConstraintVisitor {
  public aAndContent: any[]
  constructor() {
    this.aAndContent = []
  }

  /**
   * Visit an Expression and add it to the list.
   * @param {string}        sOperator Operator, for example "="
   * @param {string|number} vValue    Value of the Expression
   */
  public visitExpression(sOperator, vValue) {
    this.aAndContent.push({
      operator: sOperator,
      value: vValue,
    })
  }
}

/**
 * Create a new ConstraintVisitor.
 * @constructor
 * @param {hc.mri.pa.ui.lib.Constraint} oAttribute Constraint control whose expressions are visited
 *
 * @classdesc
 * Visitor to traverse the IFR of a Constraint and add the corresponding expressions.
 * @alias hc.mri.pa.ui.lib.ifr.ControlGenerator.ConstraintVisitor
 */
function ConstraintVisitor(oAttribute) {
  this.oAttribute = oAttribute
}

/**
 * Visit an Or BooleanContainer.
 * Pass on to visiting the content.
 * @param {hc.mri.pa.ui.lib.ifr.BooleanContainers.BooleanContainer[]} aOrContent List of BooleanContainers
 */
ConstraintVisitor.prototype.visitOr = function (aOrContent) {
  aOrContent.forEach(function (visitable) {
    visitable.accept(this)
  }, this)
}

/**
 * Visit an And BooleanContainer.
 * Create an AndConstraintVisitor to proceed as the Expression is evaluated at this level.
 * @param {hc.mri.pa.ui.lib.ifr.BooleanContainers.BooleanContainer[]} aAndContent List of BooleanContainers
 */
ConstraintVisitor.prototype.visitAnd = function (aAndContent) {
  const oAndConstraintVisitor = new AndConstraintVisitor()
  aAndContent.forEach(oExpression => {
    oExpression.accept(oAndConstraintVisitor)
  })
  this.oAttribute.addBooleanExpression(oAndConstraintVisitor.aAndContent)
}

/**
 * Visit an Expression and add it to the Constraint.
 * @param {string}        sOperator Operator, for example "="
 * @param {string|number} vValue    Value of the Expression
 */
ConstraintVisitor.prototype.visitExpression = function (sOperator, vValue) {
  this.oAttribute.addExpression(sOperator, vValue)
}

/**
 * Create a new AttributeVisitor.
 * @constructor
 * @param {hc.mri.pa.ui.lib.FilterCard} oFilterCard FilterCard control whose attributes are visited
 *
 * @classdesc
 * Visitor to traverse the IFR of a FilterCard and create the corresponding Contraints.
 * @alias hc.mri.pa.ui.lib.ifr.ControlGenerator.AttributeVisitor
 */
function AttributeVisitor(oFilterCard) {
  this.oFilterCard = oFilterCard
}

/**
 * Visit an And BooleanContainer.
 * Pass on to visiting the content.
 * @param {hc.mri.pa.ui.lib.ifr.BooleanContainers.BooleanContainer[]} aAndContent List of BooleanContainers
 */
AttributeVisitor.prototype.visitAnd = function (aAndContent) {
  aAndContent.forEach(function (visitable) {
    visitable.accept(this)
  }, this)
}

/**
 * Visit an Or BooleanContainer.
 * Pass on to visiting the content.
 * @param {hc.mri.pa.ui.lib.ifr.BooleanContainers.BooleanContainer[]} aOrContent List of BooleanContainers
 */
AttributeVisitor.prototype.visitOr = function (aOrContent) {
  aOrContent.forEach(function (visitable) {
    visitable.accept(this)
  }, this)
}

/**
 * Visit an Attribute.
 * Let the FilterCard create a Constraint and create a ConstraintVisitor to add expressions to the Constraint.
 * @param {string}                                                      sConfigPath  Constraint config path
 * @param {string}                                                      sInstanceID  Constraint instance id
 * @param {hc.mri.pa.ui.lib.ifr.BooleanContainers.BooleanContainer} oConstraints BooleanContainer
 */
AttributeVisitor.prototype.visitAttribute = function (sConfigPath, sInstanceID, oConstraints) {
  this.oFilterCard.addConstraintForAttribute(sConfigPath)
  oConstraints.accept(
    new ConstraintVisitor(FilterCardModel.getConstraintForAttribute(this.oFilterCard.props, sConfigPath))
  )
}

/**
 * Create a new ControlGenerator.
 * @constructor
 *
 * @classdesc
 * Visitor to traverse the IFR and create the corresponding Controls.
 * @alias hc.mri.pa.ui.lib.ifr.ControlGenerator
 */

export default class ControlGenerator {
  /**
   * Static shorthand method for creating a Generator, visiting the IFR and returning the Controls.
   * @static
   * @param   {hc.mri.ui.pa.lib.ifr.InternalFilterRepresentation.Filter} oIFR           IFR to visit
   * @param   {hc.mri.pa.ui.lib.BoolContainer}                           [oRootControl] Optional root control
   * @returns {hc.mri.pa.ui.lib.BoolContainer}                           Generated Control
   */
  public static generate(oIFR, oRootControl) {
    const oControlGenerator = new ControlGenerator()
    if (oRootControl) {
      oControlGenerator.oControls = oRootControl
    }
    oIFR.accept(oControlGenerator)
    return oControlGenerator.oControls
  }
  public oControls = null
  public oCurrent = null
  public bIsExcluded = false

  constructor() {
    this.oControls = null
  }

  /**
   * Visit the top level filter and create a BooolContainer as root Control.
   * @param {object}                                                      mConfigMetadata Config metadata for the
   *                                                                                      following Controls
   * @param {hc.mri.pa.ui.lib.ifr.BooleanContainers.BooleanContainer} oCards          BooleanContainer with
   *                                                                                      eventually FilterCards
   */
  public visitFilter(mConfigMetadata, oCards) {
    if (!this.oControls) {
      this.oControls = new BoolContainerModel()
    }
    oCards.accept(this)
  }

  /**
   * Visit an And BooleanContainer.
   * As there are exactly two Ands before reaching the FilterCards, create a BoolFilterContainer on the second
   * and visit each content.
   * @param {hc.mri.pa.ui.lib.ifr.BooleanContainers.BooleanContainer[]} aAndContent List of BooleanContainers
   */
  public visitAnd = function (aAndContent) {
    if (!this.oCurrent) {
      this.oCurrent = this.oControls
      aAndContent.forEach(function (oBooleanContainer) {
        oBooleanContainer.accept(this)
      }, this)
    } else {
      const oBoolFilterContainer = new BoolFilterContainerModel(this.oCurrent.mriFrontendConfig, {
        type: 'boolfiltercontainer',
        allContainer: true,
        filterCards: [],
      })
      this.oCurrent.addContent(oBoolFilterContainer)
      this.oCurrent = oBoolFilterContainer
      aAndContent.forEach(function (oIFRFilterCard) {
        oIFRFilterCard.accept(this)
      }, this)
      this.oCurrent = this.oControls
    }
  }

  /**
   * Visit an Or BooleanContainer.
   * Create a BoolFilterContainer and visit each content.
   * @param {hc.mri.pa.ui.lib.ifr.BooleanContainers.BooleanContainer[]} aOrContent List of BooleanContainers
   */
  public visitOr = function (aOrContent) {
    if (!this.oCurrent) {
      this.oCurrent = this.oControls
      aOrContent.forEach(function (oBooleanContainer) {
        oBooleanContainer.accept(this)
      }, this)
    } else {
      const oBoolFilterContainer = new BoolFilterContainerModel(this.oControls.mriFrontendConfig, {
        type: 'boolfiltercontainer',
        visible: false,
        filterCards: [],
      })
      this.oCurrent.addContent(oBoolFilterContainer)
      this.oCurrent = oBoolFilterContainer
      aOrContent.forEach(function (oIFRFilterCard) {
        oIFRFilterCard.accept(this)
      }, this)
      this.oCurrent = this.oControls
    }
  }

  /**
   * Visit a Not BooleanContainer.
   * Set a flag for the next FilterCard to be excluded.
   * @param {hc.mri.pa.ui.lib.ifr.BooleanContainers.BooleanContainer} oNotContent BooleanContainer
   */
  public visitNot = function (oNotContent) {
    this.bIsExcluded = true
    oNotContent[0].accept(this)
  }

  /**
   * Visit a FilterCard.
   * Create an AttributeVisitor to visit each Attribute.
   * @param {string}                                                                  sConfigPath        Config path of the FilterCard
   * @param {number}                                                                  iInstanceNumber    Instance number of the FilterCard
   * @param {string}                                                                  sInstanceID        Instance Id, currently a combination of config path and instance number
   * @param {string}                                                                  sName              FilterCard name
   * @param {hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.Successor}         oSuccessor         Successor object
   * @param {hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.AdvancedTimeFilter} oAdvanceTimeFilter Advanced time filter object
   * @param {hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.ParentInteraction} oParentInteraction ParentInteraction object
   * @param {hc.mri.pa.ui.lib.ifr.BooleanContainers.BooleanContainer}             oAttributes        FilterCard attributes.
   */
  public visitFilterCard = function (
    sConfigPath,
    iInstanceNumber,
    sInstanceID,
    sName,
    oSuccessor,
    oAdvanceTimeFilter,
    oParentInteraction,
    oAttributes,
    oInactive,
    oIsEntry,
    oIsExit
  ) {
    const oFilterCard = BoolFilterContainerModel.createFilterCard({
      sName,
      sConfigPath,
      boolFilterContainerProps: this.oCurrent.props,
      mriFrontendConfig: this.oCurrent.mriFrontendConfig,
      iExternalIndex: iInstanceNumber,
      parentInteraction: oParentInteraction,
    })
    // const oFilterCard = this.oCurrent.createFilterCard(sConfigPath, iInstanceNumber, sName);
    // const oFilterCard = this.oControls.createFilterCard(sConfigPath, iInstanceNumber, sName);
    if (this.bIsExcluded) {
      oFilterCard.setExcludeFilter(this.bIsExcluded)
      this.bIsExcluded = false
    }
    if (oSuccessor) {
      let oConstraint = FilterCardModel.createConstraintForAttribute(oFilterCard.props, '_succ')
      oConstraint.addExpression('=', oSuccessor.id)
      oFilterCard.addConstraint(oConstraint, 2)

      oConstraint = FilterCardModel.createConstraintForAttribute(oFilterCard.props, '_relTime')
      oConstraint.addExpression('>=', oSuccessor.minDaysBetween)
      oConstraint.addExpression('<=', oSuccessor.maxDaysBetween)
      oFilterCard.addConstraint(oConstraint, 2)
    }

    if (oAdvanceTimeFilter) {
      oFilterCard.setAdvancedTimeFilterModel(oAdvanceTimeFilter)
    }

    if (oIsEntry) {
      oFilterCard.setIsEntry(oIsEntry)
    }

    if (oIsExit) {
      oFilterCard.setIsExit(oIsExit)
    }

    this.oCurrent.addFilterCard(oFilterCard)

    oAttributes.accept(new AttributeVisitor(oFilterCard))
  }
}
