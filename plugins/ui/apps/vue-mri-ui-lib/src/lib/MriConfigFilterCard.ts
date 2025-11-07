// tslint:disable:variable-name
import TextUtils from '../utils/TextUtils'

/**
 * Constructor for a new MriConfigFilterCard.
 * @constructor
 * @param {string}                                 sConfigPath               Path to the attribute
 * @param {object}                                 oInternalConfigFilterCard FilterCard object
 * @param {hc.mri.pa.ui.lib.MriConfigAttribute[]} aFilterCardAttributes
 * List of MriConfigAttribute
 *
 * @classdesc
 * MriConfigFilterCard Class.
 * @alias hc.mri.pa.ui.lib.MriConfigFilterCard
 */
const MriConfigFilterCard = function (sConfigPath, oInternalConfigFilterCard, aFilterCardAttributes) {
  this.sConfigPath = sConfigPath
  this.oInternalConfigFilterCard = oInternalConfigFilterCard

  this.aFilterAttributes = []
  this.aMeasureAttributes = []
  this.aCategoryAttributes = []
  this.aAllAttributes = []
  this.mAllAttributes = {}

  for (let i = 0; i < aFilterCardAttributes.length; i += 1) {
    if (aFilterCardAttributes[i].isVisibleInFilterCard()) {
      this.aFilterAttributes.push(aFilterCardAttributes[i])
      this.aAllAttributes.push(aFilterCardAttributes[i])
      this.mAllAttributes[aFilterCardAttributes[i].getConfigPath()] = aFilterCardAttributes[i]
    } else if (aFilterCardAttributes[i].isMeasure() || aFilterCardAttributes[i].isCategory()) {
      this.aAllAttributes.push(aFilterCardAttributes[i])
      this.mAllAttributes[aFilterCardAttributes[i].getConfigPath()] = aFilterCardAttributes[i]
    }
    aFilterCardAttributes[i].setParentFilterCard(this)
  }

  // sort the attributes by the order
  this.aFilterAttributes.sort((a1, a2) => a1.getOrderInFilterCard() - a2.getOrderInFilterCard())

  this.aAllAttributes.sort((a1, a2) => a1.getOrderInFilterCard() - a2.getOrderInFilterCard())
}

MriConfigFilterCard.prototype.getName = function () {
  if (this.sConfigPath === 'patient') {
    return TextUtils.getText('MRI_PA_MENUITEM_INTERACTIONS_GENERAL')
  }
  return this.oInternalConfigFilterCard.name
}

MriConfigFilterCard.prototype.getOrder = function () {
  if (this.sConfigPath === 'patient') {
    return -1
  }
  return this.oInternalConfigFilterCard.order
}

MriConfigFilterCard.prototype.getConfigPath = function () {
  return this.sConfigPath
}

MriConfigFilterCard.prototype.getFilterAttributes = function () {
  return this.aFilterAttributes
}

MriConfigFilterCard.prototype.getMeasureAttributes = function () {
  return this.aMeasureAttributes
}

MriConfigFilterCard.prototype.getCategoryAttributes = function () {
  return this.aCategoryAttributes
}

MriConfigFilterCard.prototype.getAllAttributes = function () {
  return this.aAllAttributes
}

MriConfigFilterCard.prototype.getAttributeByRelativeKey = function (key) {
  return this.mAllAttributes[`${this.sConfigPath}.attributes.${key}`]
}

MriConfigFilterCard.prototype.isBasicData = function () {
  return this.sConfigPath === 'patient'
}

/**
 * Checks if any of the contained attributes have the specified annotation.
 * Checks all the attributes, not only the enabled ones
 * @param   {string}  sAnnotation Annotation name
 * @returns {boolean} True, if annotation is found
 */
MriConfigFilterCard.prototype.hasAnnotation = function (sAnnotation) {
  return (
    Object.keys(this.oInternalConfigFilterCard.attributes).findIndex(
      attr =>
        this.oInternalConfigFilterCard.attributes[attr].annotations &&
        this.oInternalConfigFilterCard.attributes[attr].annotations.indexOf(sAnnotation) !== -1
    ) > -1
  )
}

/**
 * Returns the paths of the attributes having a specific annotation
 * @param   {string}   sAnnotation Annotation name
 * @returns {object[]} List of attributes with annotation
 */
MriConfigFilterCard.prototype.getAttributesWithAnnotation = function (sAnnotation) {
  const aAttrs: any[] = []

  Object.keys(this.oInternalConfigFilterCard.attributes).forEach(attr => {
    if (
      this.oInternalConfigFilterCard.attributes[attr].annotations &&
      this.oInternalConfigFilterCard.attributes[attr].annotations.indexOf(sAnnotation) !== -1
    ) {
      aAttrs.push(attr)
    }
  })
  return aAttrs
}

MriConfigFilterCard.prototype.isInitial = function () {
  return (
    this.sConfigPath === 'patient' ||
    (this.oInternalConfigFilterCard.filtercard && this.oInternalConfigFilterCard.filtercard.initial)
  )
}

export default MriConfigFilterCard
