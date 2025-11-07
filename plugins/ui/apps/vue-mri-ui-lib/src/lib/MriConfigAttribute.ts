// tslint:disable:variable-name
/**
 * Constructor for a new MriConfigAttribute.
 * @constructor
 * @param {string} sConfigPath              Path to the attribute
 * @param {object} oInternalConfigAttribute Attribute object
 * @param {string} sParentPath              Path to the parent
 *
 * @classdesc
 * MriConfigAttribute Class.
 * @alias hc.mri.pa.ui.lib.MriConfigAttribute
 */
const MriConfigAttribute = function (sConfigPath, oInternalConfigAttribute, sParentPath) {
  this.sConfigPath = sConfigPath
  this.oInternalConfigAttribute = oInternalConfigAttribute
  // this will be set from outside if the attribute is part of a filter card
  this.oParentFilterCard = null
  this.sParentPath = sParentPath
}

MriConfigAttribute.prototype.getName = function () {
  return this.oInternalConfigAttribute.name
}

MriConfigAttribute.prototype.getOrderInFilterCard = function () {
  return this.oInternalConfigAttribute.filtercard ? this.oInternalConfigAttribute.filtercard.order : null
}

MriConfigAttribute.prototype.getType = function () {
  return this.oInternalConfigAttribute.type
}

MriConfigAttribute.prototype.getSuggestionsCached = function () {
  return this.oInternalConfigAttribute.cached
}

MriConfigAttribute.prototype.getConfigPath = function () {
  return this.sConfigPath
}

MriConfigAttribute.prototype.getParentConfigPath = function () {
  return this.sParentPath
}

MriConfigAttribute.prototype.isVisibleInFilterCard = function () {
  return this.oInternalConfigAttribute.filtercard && this.oInternalConfigAttribute.filtercard.visible
}

MriConfigAttribute.prototype.isBasicDataAttribute = function () {
  return this.sConfigPath.indexOf('patient.attributes') === 0
}

MriConfigAttribute.prototype.isInitialInFilterCard = function () {
  return (
    this.oInternalConfigAttribute.hasOwnProperty('filtercard') &&
    this.oInternalConfigAttribute.filtercard.initial === true
  )
}

MriConfigAttribute.prototype.getConfigKey = function () {
  return this.sConfigPath.split('.').pop()
}

MriConfigAttribute.prototype.isInitialInPatientList = function () {
  if (this.isVisibleInPatientList() === true) {
    return (
      this.oInternalConfigAttribute.hasOwnProperty('patientlist') &&
      this.oInternalConfigAttribute.patientlist.initial === true
    )
  }
  return false
}

MriConfigAttribute.prototype.isVisibleInPatientList = function () {
  return (
    this.oInternalConfigAttribute.hasOwnProperty('patientlist') &&
    this.oInternalConfigAttribute.patientlist.visible === true
  )
}

// MriConfigAttribute.prototype.isLinkColumn = function () {
//   return this.oInternalConfigAttribute.hasOwnProperty('patientlist')
// }

MriConfigAttribute.prototype.getOrderInPatientList = function () {
  let order = null

  if (this.oInternalConfigAttribute.hasOwnProperty('patientlist')) {
    order = this.oInternalConfigAttribute.patientlist.order
  }
  return order
}

MriConfigAttribute.prototype.setParentFilterCard = function (oParent) {
  this.oParentFilterCard = oParent
}

MriConfigAttribute.prototype.getParentFilterCard = function () {
  return this.oParentFilterCard
}

MriConfigAttribute.prototype.isMeasure = function () {
  return this.oInternalConfigAttribute.measure
}

MriConfigAttribute.prototype.isCategory = function () {
  return this.oInternalConfigAttribute.category
}

MriConfigAttribute.prototype.getDefaultBinSize = function () {
  return this.oInternalConfigAttribute.defaultBinSize
}

MriConfigAttribute.prototype.isBinnable = function () {
  return this.oInternalConfigAttribute.ordered && this.getType() === 'num'
}

MriConfigAttribute.prototype.hasAnnotation = function (sAnnotation) {
  return (
    this.oInternalConfigAttribute.annotations && this.oInternalConfigAttribute.annotations.indexOf(sAnnotation) !== -1
  )
}

MriConfigAttribute.prototype.getAnnotations = function () {
  return this.oInternalConfigAttribute.annotations
}

MriConfigAttribute.prototype.getDomainFilter = function () {
  return this.oInternalConfigAttribute.domainFilter
}

MriConfigAttribute.prototype.getStandardConceptCodeFilter = function () {
  return this.oInternalConfigAttribute.standardConceptCodeFilter
}

/**
 * Returns true if the attribute is configured to be used as catalog attribute in MRI
 * @returns {boolean} True if cataloge attribute
 */
MriConfigAttribute.prototype.isCatalogAttribute = function () {
  return this.oInternalConfigAttribute.useRefValue
}

export default MriConfigAttribute
