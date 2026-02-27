/* eslint-env node */

var RequestBuilder = function (oConfig) {
  if (!oConfig) {
    oConfig = {}
  }
  this.sConfigId = oConfig.configId
  this.sConfigVersion = oConfig.configVersion
  this.sPatientId = ''
  this.aInteractionTypes = []
}
RequestBuilder.prototype.request = function (sPatientId) {
  this.sPatientId = sPatientId
  return this
}
RequestBuilder.prototype.masterData = function () {
  return this
}
RequestBuilder.prototype.interaction = function (sInteractionType) {
  if (this.aInteractionTypes.indexOf(sInteractionType) === -1) {
    this.aInteractionTypes.push(sInteractionType)
  }
  return this
}
RequestBuilder.prototype.buildJson = function () {
  var oRequest = {
    configData: {
      configId: this.sConfigId,
      configVersion: this.sConfigVersion
    },
    patientId: this.sPatientId,
    interactionTypes: this.aInteractionTypes
  }
  return oRequest
}
RequestBuilder.prototype.submit = function (oUserSession, sUrl, fCallback) {
  var setQuery = {
    method: 'POST',
    path: sUrl,
    body: JSON.stringify(this.buildJson())
  }
  oUserSession.request(setQuery, function (err, response, body) {
    fCallback(err, response, body)
  })
}
module.exports = RequestBuilder
