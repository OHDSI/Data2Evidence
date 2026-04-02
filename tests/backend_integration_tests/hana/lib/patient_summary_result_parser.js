/* eslint-env node */

/**
 * Parse query result
 * @param {Object}          oResult         query result
 */
var ResultParser = function (oResult) {
  this.result = JSON.parse(JSON.stringify(oResult))
}

ResultParser.prototype._getEmptyResult = function () {
  return {
    masterData: {
      attributes: {}
    },
    interactionTypes: {}
  }
}
ResultParser.prototype._getMasterDataAttributes = function () {
  return Object.keys(this.result.masterData.attributes)
}
ResultParser.prototype._getInteractionAttributes = function () {
  var aAttributes = []
  var aInteractionTypes = this.getInteractionTypes()
  aInteractionTypes.forEach(function (sInteractionType) {
    var aInteractions = this.result.interactionTypes[sInteractionType]
    aInteractions.forEach(function (interaction) {
      aAttributes = aAttributes.concat(Object.keys(interaction.attributes))
    })
  }, this)
  return aAttributes
}

/**
 * Filter on patient master data.
 * @returns {ResultParser}                   Filtered result parser
 */
ResultParser.prototype.selectMasterData = function () {
  var oResult = this._getEmptyResult()
  oResult.masterData = this.result.masterData
  return new ResultParser(oResult)
}

/**
 * Get list of interaction types
 * @returns {String[]}                       List of interaction types in result
 */
ResultParser.prototype.getInteractionTypes = function () {
  return Object.keys(this.result.interactionTypes)
}

/**
 * Get interactions for interaction Type
 * @param {String} sInteractionType         Interaction type filter
 * @returns {ResultParser}                   Filtered result parser
 */
ResultParser.prototype.selectInteractionType = function (sInteractionType) {
  var oResult = this._getEmptyResult()
  var aInteractions = this.result.interactionTypes[sInteractionType]
  if (Array.isArray(aInteractions)) {
    oResult.interactionTypes[sInteractionType] = aInteractions
  }
  return new ResultParser(oResult)
}

/**
 * Get a instance by instance id (n-th occurence in the interaction type)
 * @param {String} sInstanceId              Interaction instance filter
 * @returns {ResultParser}                   Filtered result parser
 */
ResultParser.prototype.selectInteraction = function (sInstanceId) {
  var aInteractionTypes = this.getInteractionTypes()
  if (aInteractionTypes.length > 1) {
    throw new Error('Select interaction type first')
  }

  var oResult = this._getEmptyResult()
  if (aInteractionTypes.length === 1) {
    var aInteractions = this.result.interactionTypes[aInteractionTypes[0]]
    if (aInteractions.length <= sInstanceId) {
      throw new Error('Instance of interaction does not exist')
    }
    oResult.interactionTypes[aInteractionTypes[0]] = [aInteractions[sInstanceId]]
  }
  return new ResultParser(oResult)
}

/**
 * Get list of attributes
 * @returns {String[]}                       List of attributes
 */
ResultParser.prototype.getAttributes = function () {
  var aMasterDataAttributes = this._getMasterDataAttributes()
  var aInteractionAttributes = this._getInteractionAttributes()
  return aMasterDataAttributes.concat(aInteractionAttributes)
}

/**
 * Get values for attribute id
 * @param {String} sAttributeId             Attribute Id
 * @returns {Object[]}                       List of values
 */
ResultParser.prototype.getValues = function (sAttributeId) {
  if (this._getMasterDataAttributes().indexOf(sAttributeId) >= 0) {
    return this.result.masterData.attributes[sAttributeId]
  }
  var aValues = []
  var aInteractionTypes = this.getInteractionTypes()
  aInteractionTypes.forEach(function (sInteractionType) {
    var aInteractions = this.result.interactionTypes[sInteractionType]
    aInteractions.forEach(function (interaction) {
      if (interaction.attributes.hasOwnProperty(sAttributeId)) {
        aValues = aValues.concat(interaction.attributes[sAttributeId])
      }
    })
  }, this)
  return aValues
}

/**
 * Get number of interaction types in the result
 * @returns {Integer}           Number of interaction types
 */
ResultParser.prototype.countInteractionTypes = function () {
  return this.getInteractionTypes().length
}

/**
 * Get number of interactions in the result
 * @returns {Integer}           Number of interactions
 */
ResultParser.prototype.countInteractions = function () {
  var iCount = 0
  this.getInteractionTypes().forEach(function (sInteractionType) {
    iCount += this.result.interactionTypes[sInteractionType].length
  }, this)
  return iCount
}

/**
 * Get number of attributes in the result
 * @returns {Integer}           Number of attributes
 */
ResultParser.prototype.countAttributes = function () {
  return this.getAttributes().length
}

module.exports = ResultParser
