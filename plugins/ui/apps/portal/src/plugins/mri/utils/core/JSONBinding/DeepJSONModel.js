sap.ui.define(
  [
    "hc/hph/core/ui/JSONBinding/DeepJSONPropertyBinding",
    "sap/ui/model/json/JSONModel",
  ],
  function (DeepJSONPropertyBinding, JSONModel) {
    "use strict";

    /**
     * @namespace
     * @classdesc JSON model with deep JSON property bindings.
     * @extends sap.ui.model.json.JSONModel
     * @alias hc.hph.patient.app.ui.lib.utils.DeepJSONModel
     */
    var DeepJSONModel = JSONModel.extend(
      "hc.hph.core.ui.JSONBinding.DeepJSONModel",
      {
        metadata: {
          library: "hc.hph.core.ui",
        },
      }
    );

    DeepJSONModel.prototype.bindProperty = function (
      sPath,
      oContext,
      mParameters
    ) {
      return new DeepJSONPropertyBinding(this, sPath, oContext, mParameters);
    };

    return DeepJSONModel;
  },
  true
);
