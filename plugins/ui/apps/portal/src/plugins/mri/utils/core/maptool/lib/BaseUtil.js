jQuery.sap.declare("hc.hph.core.ui.maptool.lib.BaseUtil");
jQuery.sap.require("com.sap.it.spc.webui.mapping.MappingControl");
jQuery.sap.require("com.sap.it.spc.webui.mapping.core");
/* This utility is used for creating a mapping control and set properties, This will also */
hc.hph.core.ui.maptool.lib.BaseUtil = {
  _oController: null,
  // Creates a new mapping control. Alternatively, mapping control can also be created using xml view
  newMappingControl: function (
    sSourceMessageTitle,
    sTargetMessageTitle,
    fEnableSeacrhBox,
    fShowInfoSection,
    sHeight
  ) {
    var oMappingControl = new com.sap.it.spc.webui.mapping.MappingControl({
      sourceMessageTitle: sSourceMessageTitle,
      targetMessageTitle: sTargetMessageTitle,
      enableSearchBox: fEnableSeacrhBox,
      showInfoSection: fShowInfoSection,
      height: sHeight,
    });
  },
  // Called to set mapping control properties. Must be called
  setMapControlProperties: function (oMappingControl, mapProperties) {
    var oController = this._oController;
    oController.sKey = mapProperties.sKey;
    oController.tabMappingString = mapProperties.tabMappingString;
    oController.sKey = mapProperties.sKey;
    oController.clearValue = mapProperties.clearValue;
    oController._bUserTrigger = true;
    oController._oVisitors = {
      getChild: new com.sap.it.spc.webui.mapping.models.GetChildVisitor(),
    };
    oController._AttachedLocalEvents = [];
    oMappingControl.setEditMode(true);
    oMappingControl.setEventChannelId(mapProperties.sChannel);
    oMappingControl.registerPresenter(function (oMapping, sType) {
      if (sType === window.MappingLibrary.ENTITY_TYPE.MAPPING) {
        return new com.sap.it.spc.webui.mapping.models.PresentationModel(
          oController._iconSrc
        );
      }
    }, oController);
    // declare a transformation object for the mapping
    var oTransformation =
      new com.sap.it.spc.webui.mapping.models.TransformationModel();
    oMappingControl.setTransformation(oTransformation);
  },
  // Called for attaching events to the controller. Calls BaseController implicitly
  attachAllEventsForController: function () {
    var that = this;
    var oController = this._oController;
    var aEntry, i;
    this.detachAllEventsForController();
    // call detach as a safe guard in case of multiple subscriptions
    for (i = 0; i < oController._AttachedLocalEvents.length; i++) {
      (function (i) {
        aEntry = oController._AttachedLocalEvents[i];
        oController._attachLocalEvent(aEntry[0], oController[aEntry[1]]);
      })(i);
    }
  },
  // Call for detaching events from the controller. Called implicitly
  detachAllEventsForController: function () {
    var aEntry, i;
    var that = this;
    var oController = this._oController;
    for (i = 0; i < oController._AttachedLocalEvents.length; i++) {
      (function (i) {
        aEntry = oController._AttachedLocalEvents[i];
        oController._detachLocalEvent(aEntry[0], oController[aEntry[1]]);
      })(i);
    }
  },
  // returns the count for mappings done.
  getMapCount: function (oTransformation) {
    var iMappings = oTransformation.getMappings();
    var iCount = 0;
    for (var i = 1; i < iMappings.length; i++) {
      iCount += iMappings[i].sourcePaths.length;
    }
    return iCount;
  },
  // function to set the size limit for source and target table
  setMappingTableSize: function () {
    var that = this._oController;
    // handle size limit for Mapping control Table list
    var oSourcetable = that.returnMapControlObject()._getSourceTable();
    var oTargettable = that.returnMapControlObject()._getTargetTable();
    var sourceData = oSourcetable.getModel().getData();
    var targetData = oTargettable.getModel().getData();
    var totalEntriesForTableSource = 1;
    var totalEntriesForTableTarget = 1;
    if (sourceData && sourceData.rootNode)
      totalEntriesForTableSource = this.recursiveDepth(
        sourceData.rootNode,
        totalEntriesForTableSource
      );
    if (targetData && targetData.rootNode)
      totalEntriesForTableTarget = this.recursiveDepth(
        targetData.rootNode,
        totalEntriesForTableTarget
      );
    oSourcetable.getModel().setSizeLimit(totalEntriesForTableSource);
    oTargettable.getModel().setSizeLimit(totalEntriesForTableTarget);
  },
  recursiveDepth: function (data, depth) {
    if (data.nodes) {
      for (var node in data.nodes) {
        depth = this.recursiveDepth(data.nodes[node], depth);
      }
    }
    depth = depth + data.nodes.length;
    return depth;
  },
  /*
   * function to add links to the table toolbar , i18n Text key is passed along with function pointer
   */
  setToolBarEntries: function (type) {
    var oController = this._oController;
    var aLinks = oController._oToolBarLinks[type];
    var i,
      aItems = [];
    for (i = 0; i < aLinks.length; i++) {
      (function (i) {
        var oLink = new sap.m.Link({
          text: aLinks[i][0],
          // text
          enabled: true, // aLinks[i][3]
        });
        var path = aLinks[i][2] === undefined ? oController : aLinks[i][2];
        var aParams = aLinks[i][3] === undefined ? [] : aLinks[i][3];
        var funcName = aLinks[i][1];
        oLink.attachPress(function (evt) {
          funcName.apply(path, aParams);
        });
        aItems.push(oLink);
        aItems.push(new sap.ui.commons.ToolbarSeparator());
      })(i);
    }
    aItems.pop();
    var oToolBar = new sap.ui.commons.Toolbar({ items: aItems });
    return oToolBar;
  },
  /* Generic Dialog function */
  showMapDialog: function (sErrorMsg, endBtnFlag, okFunc, cancelFunc, sState) {
    // remove oView and get it from the controller in baseUtil
    var oView = this._oController.getView();
    var title = {
      Warning: "WARNING",
      Error: "ERROR",
      Success: "SUCCESS",
      None: "NONE",
    };
    endBtnFlag = endBtnFlag === undefined ? false : endBtnFlag;
    sState = sState === undefined ? "Error" : sState;
    var sTitle = "";
    if (sState !== "None") {
      sTitle = oView.getModel("i18n").getProperty(title[sState]);
    } else {
      sTitle = oView.getModel("i18n").getProperty("CONFIRM");
    }
    var dialog = new sap.m.Dialog({
      title: sTitle,
      type: "Message",
      state: sState,
      content: new sap.m.Text({ text: sErrorMsg }),
      beginButton: new sap.m.Button({
        text: oView.getModel("i18n").getProperty("OK"),
        press: function () {
          if ($.isFunction(okFunc)) {
            okFunc();
          }
          dialog.close();
        },
      }),
      endButton: new sap.m.Button({
        text: oView.getModel("i18n").getProperty("CANCEL"),
        visible: endBtnFlag,
        press: function () {
          if ($.isFunction(cancelFunc)) {
            cancelFunc();
          }
          dialog.close();
        },
      }),
      beforeClose: function (oEvent) {
        if (typeof event !== "undefined") {
          if (event.keyCode === 27) {
            if (cancelFunc !== undefined) {
              cancelFunc();
            }
          }
        } else {
          document.addEventListener(
            "keypress",
            function handleEscapePress(event) {
              if (event.keyCode === 27 && cancelFunc !== undefined) {
                cancelFunc();
                document.removeEventListener("keypress", handleEscapePress);
              }
            },
            false
          );
        }
      },
      afterClose: function () {
        dialog.destroy();
      },
    });
    oView.addDependent(dialog);
    return dialog;
  },
  clearAllMappings: function (oController) {
    var oMapControl = oController.oMappingControl;
    var aMapArray = oMapControl.getTransformation().mappings;
    var firstVal = aMapArray[0];
    oMapControl.getTransformation().mappings = [];
    oMapControl.getTransformation().mappings.push(firstVal);
    oMapControl.refreshUI();
    oMapControl.clearSelection();
    // clear the json obj by calling save this also validates data import
    oController.saveMapData();
  },
  // returns pathId without the id
  returnWithoutId: function (sPath) {
    if (sPath !== undefined && sPath.indexOf("_id_") !== -1) {
      sPath = sPath.substring(0, sPath.lastIndexOf("_id_"));
    }
    return sPath;
  },
  // returns source and target nodes with their pathids
  returnMapPathsWithAllIds: function (oMappings) {
    var aSource = [],
      aTarget = [];
    var k;
    var soPath =
      oMappings.sourcePaths[oMappings.sourcePaths.length - 1].split("/");
    var sLength = soPath.length;
    for (k = 0; k < sLength - 1; k++) {
      aSource.push(soPath.pop());
    }
    var taPath = oMappings.targetPaths[0].split("/");
    var tLength = taPath.length;
    for (k = 0; k < tLength - 1; k++) {
      aTarget.push(taPath.pop());
    }
    return [aSource, aTarget];
  },
  // shift the fir object of the mapping object
  shiftFirstMap: function (aAllMappings, oController) {
    var oFirstMap = oController.oMappingControl.getTransformation().mappings[0];
    oController.oMappingControl.getTransformation().setMappings(aAllMappings);
    oController.oMappingControl.getTransformation().mappings.unshift(oFirstMap);
  },
  returnMapPathsWithoutIds: function (oMappings) {
    var aSource = [],
      aTarget = [];
    var k;
    var soPath =
      oMappings.sourcePaths[oMappings.sourcePaths.length - 1].split("/");
    for (k = 0; k < soPath.length; k++) {
      aSource.push(this.returnWithoutId(soPath.pop()));
    }
    var taPath = oMappings.targetPaths[0].split("/");
    for (k = 0; k < taPath.length; k++) {
      aTarget.push(this.returnWithoutId(soPath.pop()));
    }
    return [aSource, aTarget];
  },
  // Create a new mapping object with pre-filled data, to be directly usable for mapping control
  oMap: function () {
    this.obj = {
      source: {
        title: "sourceTitle",
        id: "s1",
        rootNode: {
          tag: "",
          type: "element",
          name: "sourceName",
          occ: "1..1",
          pathId: "",
          nodes: [],
        },
      },
      target: {
        title: "targetTitle",
        id: "s1",
        rootNode: {
          tag: "",
          type: "element",
          name: "targetName",
          occ: "1..1",
          pathId: "",
          nodes: [],
        },
      },
      prefixMap: {
        ns1: "http://xiTest.com/xi/test",
        ns0: "http://sap.com/xi/SAPGlobal20/Global",
        ns2: "http://sap.com/xi/XI/SplitAndMerge",
      },
      mappings: [
        {
          fn: {
            description: "",
            expression: "",
          },
          sourcePaths: [],
          targetPaths: [
            "/ns0:LeadReplicationBulkReplicateRequest/MessageHeader/ID",
          ],
          id: "__ia__mapping0",
        },
      ],
    };
  },
};
