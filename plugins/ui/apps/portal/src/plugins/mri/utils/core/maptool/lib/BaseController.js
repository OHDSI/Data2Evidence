jQuery.sap.declare("hc.hph.core.ui.maptool.lib.BaseController");
sap.ui.define(
  [
    "jquery.sap.global",
    "hc/hph/core/ui/maptool/lib/BaseUtil",
    "sap/ui/core/mvc/Controller",
  ],
  function (jQuery, baseLib, Controller) {
    "use strict";
    /*
     * This base functions will be present by default for the controller. Define functions in their specific controller to override them
     */
    return Controller.extend("hc.hph.core.ui.maptool.lib.BaseController", {
      _attachLocalEvent: function (sEventId, fnFunction) {
        var that = this;
        if (sEventId && fnFunction) {
          window.MappingLibrary.EventBus.unsubscribe(
            that.oMappingControl.getEventChannelId(),
            sEventId,
            fnFunction,
            this
          );
          window.MappingLibrary.EventBus.subscribe(
            that.oMappingControl.getEventChannelId(),
            sEventId,
            fnFunction,
            this
          );
        }
      },
      _attachGlobalEvent: function (sChannelId, sEventId, fnFunction) {
        if (sEventId && fnFunction) {
          window.MappingLibrary.EventBus.unsubscribe(
            sChannelId,
            sEventId,
            fnFunction,
            this
          );
          window.MappingLibrary.EventBus.subscribe(
            sChannelId,
            sEventId,
            fnFunction,
            this
          );
        }
      },
      _onInfoTableContentUpdate: function (oEvent) {
        var firstVisibleRow = oEvent.getSource().getFirstVisibleRow();
        var dataRowLength = 0;
        if (
          this.oMappingInfoTable.getModel().getData().length <
          oEvent.getSource().getRows().length
        ) {
          dataRowLength = this.oMappingInfoTable.getModel().getData().length;
        } else {
          dataRowLength = oEvent.getSource().getRows().length;
        }
        for (
          var i = firstVisibleRow;
          i < dataRowLength + firstVisibleRow - 1;
          i++
        ) {
          if (oEvent.getSource().getRows().length > i - firstVisibleRow) {
            var mappingId = oEvent
              .getSource()
              .getContextByIndex(i)
              .getObject().id;
            if (
              mappingId ===
              oEvent
                .getSource()
                .getContextByIndex(i + 1)
                .getObject().id
            ) {
              oEvent
                .getSource()
                .getRows()
                [i - firstVisibleRow].$()
                .children()
                .css({ borderBottom: "none" });
            } else {
              oEvent
                .getSource()
                .getRows()
                [i - firstVisibleRow].$()
                .children()
                .css({ borderBottom: "1px solid #cccccc" });
            }
          }
        }
      },
      _detachLocalEvent: function (sEventId, fnFunction) {
        var that = this;
        if (sEventId && fnFunction) {
          window.MappingLibrary.EventBus.unsubscribe(
            that.oMappingControl.getEventChannelId(),
            sEventId,
            fnFunction,
            this
          );
        }
      },
      _updateMappingInfo: function (sChannelId, sEventId, oData) {
        var oSource,
          aIndices = [],
          oMappingInfoTable,
          aContexts;
        if (!this._bUserTrigger) {
          return this;
        }
        this._bUserTrigger = false;
        oSource = oData.source;
        this._bUserTrigger = true;
      },
      _fireLocalEvent: function (sEventId, oData) {
        window.MappingLibrary.EventBus.publish(sEventId, oData);
      },
      _onMappingRowSelectionChange: function (oEvent) {
        var oData, oMappingInfoTable, iIndex, sMappingId, oContext;
        oMappingInfoTable = this.oMappingInfoTable;
        iIndex = oEvent.getParameter("rowIndex");
        var deSelectall = false;
        oContext = oMappingInfoTable.getContextByIndex(iIndex);
        if (!this.mappingRowSelected) {
          this.mappingRowSelected = [];
        }
        for (var i = 0; i < this.mappingRowSelected.length; i++) {
          if (
            iIndex === this.mappingRowSelected[i] &&
            this._bUserTrigger === true
          ) {
            deSelectall = true;
          }
        }
        if (!deSelectall) {
          if (oContext && this._bUserTrigger) {
            sMappingId = oContext.getProperty("id");
            oData = {};
            oData.source = oMappingInfoTable;
            this._aSelectedMappingIDs = oData.mappingIds = [sMappingId];
            this._fireLocalEvent(
              window.MappingLibrary.Events.MAPPING_SELECT,
              oData
            );
          }
        }
      },
      /*
       * this base functions that will be present by default for the controller.
       *
       */
      resetDocumentsMapping: function () {
        var that = this;
        var tabMappings = that.tabMappingString;
        var oView = that.getView();
        var clearVal = that.clearValue;
        var outJSON = oView.getModel("oOutModel").getData();
        var idx;
        for (idx in outJSON.documents) {
          outJSON.documents[idx][tabMappings] = clearVal; // clearObj;
        }
        outJSON = JSON.parse(JSON.stringify(outJSON));
        oView.getModel("oOutModel").setData(outJSON);
      },
      returnMapControlObject: function () {
        var that = this;
        var mapControlID = that.mapProperties.mapControlID;
        that.oMappingControl = that.getView().byId(mapControlID);
        return that.oMappingControl;
      },
    });
  }
);
