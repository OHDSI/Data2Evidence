sap.ui.define(
	[
		"sap/ui/core/mvc/Controller",
		"sap/ui/model/json/JSONModel",
		"hc/hph/core/ui/AjaxUtils",
		"hc/hph/genomics/ui/lib/genetables/Matrix",
		"hc/hph/genomics/ui/lib/genetables/Circle",
		"sap/m/MessageToast"
	],
	function (Controller, JSONModel, AjaxUtils, Matrix, Circle, MessageToast) {
		"use strict";

		var CorrelationController = Controller.extend("hc.hph.genomics.ui.lib.genetables.Correlation", {
			onInit: function () {
				var oThis = this;
				this.getView().setModel(new JSONModel({
					upperLeft: false,
					lowerRight: true,
					min: null,
					max: null,
					threshold: 1.3,
					pValue: 0.05012,
					logPValueLimiter: 99,
					selected: "Matrix",
					filterCardSet: true,
					correlations: {}
				}));
			},

			handleUpdate: function (oData) {
				if (!oData) {
					oData = $.extend({}, this.getView().getModel().getData());
				}
				var aKeys = Object.keys(oData.correlations);
				oData.min = null;
				oData.max = null;
				aKeys.forEach(
					function (sKey, iKey) {
						if (oData.upperLeft) {
							Object.keys(oData.correlations[sKey].left).forEach(
								function (sValueKey) {
									oData.min = oData.min === null ? oData.correlations[sKey].left[sValueKey][0] : Math.min(oData.min, oData.correlations[sKey].left[sValueKey][0]);
									oData.max = oData.max === null ? oData.correlations[sKey].left[sValueKey][0] : Math.max(oData.max, oData.correlations[sKey].left[sValueKey][0]);
								}
							);
						}
						else {
							delete oData.correlations[sKey].left;
						}
						if (oData.lowerRight) {
							Object.keys(oData.correlations[sKey].right).forEach(
								function (sValueKey) {
									oData.min = oData.min === null ? oData.correlations[sKey].right[sValueKey][0] : Math.min(oData.min, oData.correlations[sKey].right[sValueKey][0]);
									oData.max = oData.max === null ? oData.correlations[sKey].right[sValueKey][0] : Math.max(oData.max, oData.correlations[sKey].right[sValueKey][0]);
								}
							);
						}
						else {
							delete oData.correlations[sKey].right;
						}
					}
				);
				// oData.threshold = Math.min( Math.max( oData.threshold, oData.min ), oData.max );
				oData.threshold = 1.3;
				this.getView().getModel().setData(oData);
				this.getView().getModel().refresh();
				this.getView().byId("correlationVizMat").update();
				this.getView().byId("correlationVizCcl").update();
			},

			handleLoad: function (tmp_oData, referenceId) {
				var sessionId = tmp_oData.SessionId;
				var filterCard = tmp_oData.geneticFilterCardConfig;

				var oThis = this;
				var oData = this.getView().getModel().getData();
				var oMainDiv = this.byId("correlationLayout");

				oData.error = null;
				var oIFRData = this.getView().getModel("oIFRModel").oData;
				if (!oIFRData.instance || oIFRData.instance == 'All') {
					oData.filterCardSet = false;
					this.getView().getModel().refresh();
					return;
				};
				oData.filterCardSet = true;
				this.getView().getModel().refresh();

				var bodyData = {
					"initRequests": [
						{
							"name": "mri.SessionSamples.prepareCohorts",
							"suppressResult": true,
							"exceptionsFatal": true
						}
					],
					"requests": [
						{
							"name": "genetables.GeneCorrelation.getGeneCorrelation",
							"parameters": {
								"filterCardQuery": filterCard
							},
							"exceptionsFatal": true
						}
					],
					"validationPlugin": "mri.SessionSamples",
					"validationParameters": {configData: {configId: filterCard.configMetadata.id, configVersion: filterCard.configMetadata.version}},
					"parameters": {
						"dataset": "session:*",
						"sessionId": sessionId,
						"reference": referenceId
					}
				};

				oMainDiv.setBusy(true);
				this.getView().getModel().refresh();
				oData.correlations = {};
				AjaxUtils.ajax({
					url: "hc/hph/genomics/services/",
					contentType: "application/json; charset=UTF-8",
					type: "POST",
					dataType: "json",
					data: JSON.stringify(bodyData)
				})
				.done(function (aResponses) {
					aResponses[0]["result"].forEach(
						function (sample) {
							if (sample) {
								if (!oData.correlations[sample["geneA"]]) {
									oData.correlations[sample["geneA"]] = { right: {} };
								}
								let tmp_pValue = -Math.log10(parseFloat(sample["BHadjustedPValue"]));
								oData.correlations[sample["geneA"]].right[sample["geneB"]] = [(isFinite(tmp_pValue) && tmp_pValue < 100) ? tmp_pValue : oData.logPValueLimiter, sample["association"], sample["logOddsRatio"], sample["pValue"], sample["BHadjustedPValue"], sample["BonfAdjustedPValue"]];
							}
						}
					);
					aResponses[0]["result"].forEach(
						function (sample) {
							if (!oData.correlations[sample["geneB"]]) {
								oData.correlations[sample["geneB"]] = { right: {} };
							}
						}
					);
					oMainDiv.setBusy(false);
					oThis.getView().getModel().refresh();
					oThis.handleUpdate(oData);
				})
				.fail(function (oResponse, sReason) {
					if (sReason !== 'abort') {
						try {
							oData.error = JSON.parse(oResponse.responseText);
						}
						catch (exception) {
							oData.error = {
								errorCode: 'error.HTTP',
								parameters: [oResponse.status, oResponse.statusText],
								message: oResponse.responseText
							};
						}
						oMainDiv.setBusy(false);
						oThis.getView().getModel().refresh();
						oThis.handleUpdate(oData);
					}
				});
			},

			handleThresholdChange: function () {
				var oData = this.getView().getModel().getData();
				oData.threshold = parseFloat(oData.threshold);
				oData.pValue = Math.round(Math.pow(10, -1 * oData.threshold) * 100000) / 100000;
			},

			handlePValueChange: function () {
				var oData = this.getView().getModel().getData();
				oData.pValue = parseFloat(oData.pValue);
				oData.threshold = Math.round(Math.log10(oData.pValue) * -10) / 10;
			}
		});

		return CorrelationController;
	});