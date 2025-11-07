sap.ui.define(
  ["hc/hph/core/ui/TimeoutHandler", "sap/ui/model/odata/v2/ODataModel"],
  function (TimeoutHandler, V2oDataModel) {
    "use strict";
    /**
     * Creates a new ODataModel with integrated TimeoutHandler.
     * @constructor
     *
     * @classdesc
     * An extension of sap.ui.model.odata.v2.ODataModel done specially for HPH application
     * for the purpose of hooking all the OData requests and to handle the session timeout
     * from the client side.
     * @extends sap.ui.model.odata.v2.ODataModel
     * @alias hc.hph.core.odata.ODataModel
     */
    var ODataModel = V2oDataModel.extend("hc.hph.core.odata.ODataModel", {
      constructor: function (
        sServiceUrl,
        bJSON,
        sUser,
        sPassword,
        mHeaders,
        bTokenHandling,
        bWithCredentials,
        bLoadMetadataAsync,
        annotationURI,
        loadAnnotationsJoined
      ) {
        var oModel = new V2oDataModel(
          sServiceUrl,
          bJSON,
          sUser,
          sPassword,
          mHeaders,
          bTokenHandling,
          bWithCredentials,
          bLoadMetadataAsync,
          annotationURI,
          loadAnnotationsJoined
        );
        function resetSessionCountDown() {
          TimeoutHandler.resetTimer();
        }
        oModel.attachRequestCompleted(resetSessionCountDown);
        oModel.attachBatchRequestCompleted(resetSessionCountDown);
        return oModel;
      },
    });
    return ODataModel;
  }
);
