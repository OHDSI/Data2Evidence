jQuery.sap.declare("com.sap.it.spc.webui.mapping.core", false);
jQuery.sap.require("com.sap.it.spc.webui.mapping.library");
jQuery.sap.require("sap.ui.core.EventBus");
/**
 * Mapping Library - Definition - Start
 */
window.MappingLibrary = {};
window.MappingLibrary.EventBus = new sap.ui.core.EventBus();
window.MappingLibrary.Events = {};
/**
 * Event id used to notify an event of mapping creation along with arguments as
 *
 * <pre>
 * {
 * mapping: {@link com.sap.it.spc.webui.mapping.models.MappingModel}
 * }
 * </pre>
 */
window.MappingLibrary.Events.MAPPING_CREATED =
  "MAPPING_LIBRARY_EVENTS-MAPPING_CREATED";
/**
 * Event id used to notify an event of mapping updation after updated in model along with arguments as
 *
 * <pre>
 * {
 * mapping : {@link com.sap.it.spc.webui.mapping.models.MappingModel},
 * updateType : {@link window.MappingLibrary.MAPPING_UPDATE_TYPE},
 * xPath : xPath of the node,
 * messageType : type of the message in which node is part of. {@link window.MappingLibrary.ENTITY_TYPE}
 * }
 * </pre>
 */
window.MappingLibrary.Events.MAPPING_UPDATED =
  "MAPPING_LIBRARY_EVENTS-MAPPING_UPDATED";
/**
 * Event id used to notify an event of mapping updation after updated in model along with arguments as
 *
 * <pre>
 * {
 * mapping : {@link com.sap.it.spc.webui.mapping.models.MappingModel},
 * updateType : {@link window.MappingLibrary.MAPPING_UPDATE_TYPE},
 * xPath : xPath of the node,
 * messageType : type of the message in which node is part of. {@link window.MappingLibrary.ENTITY_TYPE}
 * }
 * </pre>
 */
window.MappingLibrary.Events.MAPPING_CREATE =
  "MAPPING_LIBRARY_EVENTS-MAPPING_CREATE";
/**
 * Event id used to notify an event of mapping updation along with arguments as
 *
 * <pre>
 * {
 * mapping : {@link com.sap.it.spc.webui.mapping.models.MappingModel},
 * updateType : {@link window.MappingLibrary.MAPPING_UPDATE_TYPE},
 * xPath : xPath of the node,
 * messageType : type of the message in which node is part of. {@link window.MappingLibrary.ENTITY_TYPE}
 * }
 * </pre>
 */
window.MappingLibrary.Events.MAPPING_UPDATE =
  "MAPPING_LIBRARY_EVENTS-MAPPING_UPDATE";
/**
 * Event id used to notify an event of mapping deletion along with arguments as
 *
 * <pre>
 * {
 * mapping : {@link com.sap.it.spc.webui.mapping.models.MappingModel},
 * }
 * </pre>
 */
window.MappingLibrary.Events.MAPPING_DELETE =
  "MAPPING_LIBRARY_EVENTS-MAPPING_DELETE";
/**
 * Event id used to notify an event of mapping creation after created in model along with arguments as
 *
 * <pre>
 * {
 * mapping: {@link com.sap.it.spc.webui.mapping.models.MappingModel}
 * }
 * </pre>
 */
window.MappingLibrary.Events.MAPPING_CREATED =
  "MAPPING_LIBRARY_EVENTS-MAPPING_CREATED";
/**
 * Event id used to notify an event of mapping updation after updated in model along with arguments as
 *
 * <pre>
 * {
 * mapping : {@link com.sap.it.spc.webui.mapping.models.MappingModel},
 * updateType : {@link window.MappingLibrary.MAPPING_UPDATE_TYPE},
 * xPath : xPath of the node,
 * messageType : type of the message in which node is part of. {@link window.MappingLibrary.ENTITY_TYPE}
 * }
 * </pre>
 */
window.MappingLibrary.Events.MAPPING_UPDATED =
  "MAPPING_LIBRARY_EVENTS-MAPPING_UPDATED";
/**
 * Event id used to notify an event of mapping deletion after deleted in model along with arguments as
 *
 * <pre>
 * {
 * mapping : {@link com.sap.it.spc.webui.mapping.models.MappingModel},
 * }
 * </pre>
 */
window.MappingLibrary.Events.MAPPING_DELETED =
  "MAPPING_LIBRARY_EVENTS-MAPPING_DELETED";
/**
 * Event id used to notify an event of mapping selection along with arguments as
 *
 * <pre>
 * {
 * mappingIds : an array of mapping IDs
 * }
 * </pre>
 */
window.MappingLibrary.Events.MAPPING_SELECT =
  "MAPPING_LIBRARY_EVENTS-MAPPING_SELECT";
/**
 * Event id used to notify an event of node selection along with arguments that are passed by the UI5 table selection change event
 */
window.MappingLibrary.Events.NODE_SELECT = "MAPPING_LIBRARY_EVENTS-NODE_SELECT";
window.MappingLibrary.ENTITY_TYPE = {};
window.MappingLibrary.ENTITY_TYPE.SOURCE = "MAPPING_LIBRARY-ENTITY_TYPE-SOURCE";
window.MappingLibrary.ENTITY_TYPE.TARGET = "MAPPING_LIBRARY-ENTITY_TYPE-TARGET";
window.MappingLibrary.ENTITY_TYPE.MAPPING =
  "MAPPING_LIBRARY-ENTITY_TYPE-MAPPING";
window.MappingLibrary.MAPPING_UPDATE_TYPE = {};
window.MappingLibrary.MAPPING_UPDATE_TYPE.ADD =
  "MAPPING_LIBRARY-MAPPING_UPDATE_TYPE-ADD";
window.MappingLibrary.MAPPING_UPDATE_TYPE.REMOVE =
  "MAPPING_LIBRARY-MAPPING_UPDATE_TYPE-REMOVE";
/**
 * Mapping Library - Definition - End
 */
/**
 * Mapping Utils - Definition - Start
 */
com.sap.it.spc.webui.mapping.utils = function () {};
com.sap.it.spc.webui.mapping.utils.prototype.addXPaths = function (
  oNode,
  sXPath
) {
  var xpath;
  if (!oNode) {
    return;
  }
  sXPath = sXPath || "";
  xpath = sXPath + "/" + oNode.tag;
  oNode.xpath = xpath;
  if (oNode.nodes) {
    oNode.nodes.forEach(function (oChild) {
      this.addXPaths(oChild, xpath);
    }, this);
  }
};
com.sap.it.spc.webui.mapping.utils.prototype.replacePrefix = function (
  sTag,
  oPrefixMap
) {
  var aTagElements;
  if (!oPrefixMap) {
    jQuery.sap.log.error(
      "No PrefixMap is available. Please set a prefix map before using this funtionality"
    );
    return sTag;
  }
  if (!sTag) {
    return "";
  }
  aTagElements = sTag.split(":");
  if (aTagElements.length === 2) {
    aTagElements[0] = oPrefixMap[aTagElements[0]];
    sTag = aTagElements.join(":");
  }
  return sTag;
};
com.sap.it.spc.webui.mapping.utils.prototype.replacePrefixes = function (
  sXPath,
  oPrefixMap
) {
  var i,
    aPathElements = sXPath.split("/");
  if (!oPrefixMap) {
    jQuery.sap.log.error(
      "No PrefixMap is available. Please set a prefix map before using this funtionality"
    );
    return sXPath;
  }
  if (aPathElements[0] === "") {
    aPathElements.shift();
  }
  for (i = 0; i < aPathElements.length; i++) {
    aPathElements[i] = this.replacePrefix(aPathElements[i], oPrefixMap);
  }
  return aPathElements.join("/");
};
com.sap.it.spc.webui.mapping.utils.prototype.getXPathsInMappings = function (
  sMessageType,
  aMappingIds,
  oTransformation
) {
  var aXPaths = [],
    oMapping;
  if (!sMessageType || !aMappingIds || !oTransformation) {
    return aXPaths;
  }
  aMappingIds.forEach(function (sMappingId) {
    oMapping = oTransformation.getMapping(sMappingId);
    if (oMapping) {
      oMapping[sMessageType.concat("Paths")].forEach(function (sXPath) {
        if (aXPaths.indexOf(sXPath) === -1) {
          aXPaths.push(sXPath);
        }
      }, this);
    }
  }, this);
  return aXPaths;
};
com.sap.it.spc.webui.mapping.utils.prototype._getXandY = function (mInfo) {
  var x = 0,
    y = 0,
    iRelativeIndex,
    iFirstRowTop,
    iRowHeight,
    iHeightRatio,
    diff,
    divider,
    iFirstRowIndex,
    iRows,
    iObjects;
  iFirstRowTop = mInfo.firstRowTop;
  iRowHeight = mInfo.rowHeight;
  iFirstRowIndex = mInfo.firstRowIndex;
  iRelativeIndex = mInfo.relativeIndex;
  iRows = mInfo.rowsLength;
  iObjects = mInfo.objectsLength;
  if (iRelativeIndex < 0) {
    iHeightRatio = Math.ceil((iFirstRowTop - mInfo.areaTop) / iRowHeight);
    iRelativeIndex = Math.abs(iRelativeIndex);
    if (iRelativeIndex <= iHeightRatio) {
      diff = divider = 0;
      y =
        iFirstRowTop -
        iRelativeIndex * iRowHeight +
        iRowHeight / 2 -
        mInfo.areaTop;
    } else {
      diff = iRelativeIndex - iHeightRatio;
      divider = iFirstRowIndex - iHeightRatio;
    }
  } else {
    y = mInfo.areaHeight;
    diff = iRelativeIndex - iRows + 1;
    divider = iObjects - iRows - iFirstRowIndex + 1;
  }
  x = divider ? (mInfo.areaWidth * diff) / (2 * divider) : 0;
  return {
    x: x,
    y: y,
  };
};
com.sap.it.spc.webui.mapping.utils = new com.sap.it.spc.webui.mapping.utils();
com.sap.it.spc.webui.mapping.models = {};
com.sap.it.spc.webui.mapping.models.TransformationModel = function (
  oSource,
  oTarget,
  aMappings,
  oPrefixMap,
  aDisabledFields
) {
  this.source = oSource;
  this.target = oTarget;
  this.mappings = aMappings;
  this.prefixMap = oPrefixMap;
  this.disabledFields = aDisabledFields;
};
com.sap.it.spc.webui.mapping.models.TransformationModel.prototype.setJSONData =
  function (json) {
    if (!json || $.isEmptyObject(json)) {
      throw "Invalid argument for setting JSON data to Transformation";
    }
    $.extend(this, json);
    if (json.source) {
      this.source = new com.sap.it.spc.webui.mapping.models.MessageModel();
      this.source.setJSONData(json.source);
    } else {
      throw "JSON data does not contain source message";
    }
    if (json.target) {
      this.target = new com.sap.it.spc.webui.mapping.models.MessageModel();
      this.target.setJSONData(json.target);
    } else {
      throw "JSON data does not contain target message";
    }
    if (json.mappings && json.mappings instanceof Array) {
      this.setJSONMappings(json.mappings);
    } else {
      throw "JSON data does not contain mappings";
    }
    if (json.prefixMap) {
      this.setJSONPrefixMap(json.prefixMap);
    }
    if (json.disabledFields && json.disabledFields instanceof Array) {
      this.setJSONDisabledFields(json.disabledFields);
    }
  };
com.sap.it.spc.webui.mapping.models.TransformationModel.prototype.setSourceMessage =
  function (oMessage) {
    this.source = oMessage;
  };
com.sap.it.spc.webui.mapping.models.TransformationModel.prototype.setSourceMessageJSON =
  function (json) {
    if (json) {
      this.source = new com.sap.it.spc.webui.mapping.models.MessageModel();
      this.source.setJSONData(json);
    }
  };
com.sap.it.spc.webui.mapping.models.TransformationModel.prototype.setTargetMessage =
  function (oMessage) {
    this.target = oMessage;
  };
com.sap.it.spc.webui.mapping.models.TransformationModel.prototype.setTargetMessageJSON =
  function (json) {
    if (json) {
      this.target = new com.sap.it.spc.webui.mapping.models.MessageModel();
      this.target.setJSONData(json);
    }
  };
com.sap.it.spc.webui.mapping.models.TransformationModel.prototype.getSourceMessage =
  function () {
    return this.source;
  };
com.sap.it.spc.webui.mapping.models.TransformationModel.prototype.getTargetMessage =
  function () {
    return this.target;
  };
com.sap.it.spc.webui.mapping.models.TransformationModel.prototype.addMapping =
  function (oMapping) {
    if (!this.mappings) {
      this.mappings = [];
    }
    this.mappings.push(oMapping);
  };
com.sap.it.spc.webui.mapping.models.TransformationModel.prototype.setMappings =
  function (aMappings) {
    this.mappings = aMappings;
  };
com.sap.it.spc.webui.mapping.models.TransformationModel.prototype.getMappings =
  function (sXPath, sMessageType) {
    var aXPaths,
      aMappings = [],
      i,
      j,
      sPath;
    if (!sXPath && !sMessageType) {
      if (this.mappings) {
        return this.mappings;
      } else {
        return aMappings;
      }
    }
    sXPath = com.sap.it.spc.webui.mapping.utils.replacePrefixes(
      sXPath,
      this.getPrefixMap()
    );
    for (i = this.mappings.length - 1; i > -1; i--) {
      aXPaths = this.mappings[i][sMessageType + "Paths"];
      for (j = aXPaths.length - 1; j > -1; j--) {
        sPath = com.sap.it.spc.webui.mapping.utils.replacePrefixes(
          aXPaths[j],
          this.getPrefixMap()
        );
        if (sXPath === sPath) {
          aMappings.push(this.mappings[i]);
          break;
        }
      }
    }
    return aMappings;
  };
com.sap.it.spc.webui.mapping.models.TransformationModel.prototype.getMapping =
  function (sId) {
    var i;
    if (!this.mappings || this.mappings.length === 0) {
      return null;
    }
    for (i = 0; i < this.mappings.length; i++) {
      if (this.mappings[i].getId() === sId) {
        return this.mappings[i];
      }
    }
    return null;
  };
com.sap.it.spc.webui.mapping.models.TransformationModel.prototype.indexOfMapping =
  function (sId) {
    var i;
    if (!this.mappings || this.mappings.length === 0) {
      return -1;
    }
    for (i = 0; i < this.mappings.length; i++) {
      if (this.mappings[i].getId() === sId) {
        return i;
      }
    }
    return -1;
  };
com.sap.it.spc.webui.mapping.models.TransformationModel.prototype.setJSONMappings =
  function (aJSONMappings) {
    var oMapping, i;
    this.mappings = [];
    if (!aJSONMappings instanceof Array) {
      throw "JSON data containing mappings is not an array";
    }
    for (i = 0; i < aJSONMappings.length; i++) {
      oMapping = new com.sap.it.spc.webui.mapping.models.MappingModel();
      oMapping.setJSONData(aJSONMappings[i]);
      this.mappings.push(oMapping);
    }
  };
com.sap.it.spc.webui.mapping.models.TransformationModel.prototype.setPrefixMap =
  function (oPrefixMap) {
    this.prefixMap = oPrefixMap;
  };
com.sap.it.spc.webui.mapping.models.TransformationModel.prototype.getPrefixMap =
  function () {
    return this.prefixMap;
  };
com.sap.it.spc.webui.mapping.models.TransformationModel.prototype.setJSONPrefixMap =
  function (aJSONPrefixMap) {
    var prefix = null,
      oPrefixMap = new com.sap.it.spc.webui.mapping.models.PrefixMapModel();
    if (aJSONPrefixMap instanceof Array) {
      aJSONPrefixMap.forEach(function (oEntry) {
        oPrefixMap.addPrefixEntry(oEntry.prefix, oEntry.namespace);
      });
    } else {
      for (prefix in aJSONPrefixMap) {
        if (aJSONPrefixMap.hasOwnProperty(prefix)) {
          oPrefixMap.addPrefixEntry(prefix, aJSONPrefixMap[prefix]);
        }
      }
    }
    this.setPrefixMap(oPrefixMap);
  };
com.sap.it.spc.webui.mapping.models.TransformationModel.prototype.setJSONDisabledFields =
  function (aJSONDisabledFields) {
    this.disabledFields = [];
    if (!aJSONDisabledFields instanceof Array) {
      throw "JSON data containing disabled fields is not an array";
    }
    this.disabledFields = aJSONDisabledFields;
  };
com.sap.it.spc.webui.mapping.models.TransformationModel.prototype.getDisabledFields =
  function () {
    return this.disabledFields;
  };
com.sap.it.spc.webui.mapping.models.MessageModel = function (
  sTitle,
  sId,
  oRootNode
) {
  this.title = sTitle;
  this.id = sId;
  this.rootNode = oRootNode;
};
com.sap.it.spc.webui.mapping.models.MessageModel.prototype.setJSONData =
  function (json) {
    if (!json) {
      return;
    }
    $.extend(this, json);
    this.title = json.title;
    this.id = json.id;
    if (json.rootNode) {
      this.setRootNodeJSON(json.rootNode);
    }
  };
com.sap.it.spc.webui.mapping.models.MessageModel.prototype.setRootNodeJSON =
  function (jsonObject) {
    this.rootNode = new com.sap.it.spc.webui.mapping.models.NodeModel();
    if (!jsonObject.xpath) {
      jsonObject.xpath = "/" + jsonObject.tag + jsonObject.pathId;
    }
    this.rootNode.setJSONData(jsonObject);
  };
com.sap.it.spc.webui.mapping.models.MessageModel.prototype.setRootNode =
  function (oNode) {
    this.rootNode = oNode;
  };
com.sap.it.spc.webui.mapping.models.MessageModel.prototype.getRootNode =
  function () {
    return this.rootNode;
  };
com.sap.it.spc.webui.mapping.models.MessageModel.prototype.getTitle =
  function () {
    return this.title;
  };
com.sap.it.spc.webui.mapping.models.NodeModel = function (
  sTag,
  sName,
  sOccurence,
  aNodes,
  sKind
) {
  this.tag = sTag;
  this.name = sName;
  this.occ = sOccurence;
  this.nodes = aNodes;
};
com.sap.it.spc.webui.mapping.models.NodeModel.prototype.acceptVisitor =
  function (oVisitor) {
    var bProcessChildren = oVisitor.processNode(this);
    bProcessChildren = bProcessChildren === undefined ? true : bProcessChildren;
    if (bProcessChildren && this.nodes && this.nodes instanceof Array) {
      this.nodes.forEach(function (oChild) {
        oChild.acceptVisitor(oVisitor);
      }, this);
    }
    return oVisitor;
  };
/**
 * Constructs the node from passed json object
 *
 * @param json
 */
com.sap.it.spc.webui.mapping.models.NodeModel.prototype.setJSONData = function (
  json
) {
  var oChildNode, i;
  $.extend(this, json);
  this.tag = json.tag;
  if (json.nodes) {
    this.nodes = [];
    for (i = 0; i < json.nodes.length; i++) {
      if (!json.nodes[i].xpath) {
        json.nodes[i].xpath =
          this.xpath + "/" + json.nodes[i].tag + json.nodes[i].pathId;
      }
      oChildNode = new com.sap.it.spc.webui.mapping.models.NodeModel();
      oChildNode.setJSONData(json.nodes[i]);
      this.addChildNode(oChildNode);
    }
  }
};
/**
 * Adds a child node to the current node from passed json object
 *
 * @param json
 */
com.sap.it.spc.webui.mapping.models.NodeModel.prototype.addChildNodeJSON =
  function (json) {
    var oChildNode = new com.sap.it.spc.webui.mapping.models.NodeModel();
    oChildNode.setJSONData(json);
    if (!this.nodes) {
      this.nodes = [];
    }
    this.addChildNode(oChildNode);
  };
/**
 * Adds the given node to the collection of child nodes of the current node
 *
 * @param oChildNode
 */
com.sap.it.spc.webui.mapping.models.NodeModel.prototype.addChildNode =
  function (oChildNode) {
    if (!this.nodes) {
      this.nodes = [];
    }
    if (this.xpath && !oChildNode.xpath) {
      oChildNode.xpath = this.xpath + "/" + oChildNode.tag + oChildNode.pathId;
    }
    this.nodes.push(oChildNode);
  };
com.sap.it.spc.webui.mapping.models.NodeModel.prototype.getKind = function () {
  return this.kind;
};
com.sap.it.spc.webui.mapping.models.MappingModel = function (
  sUID,
  aSourcePaths,
  aTargetPaths,
  sFunctionOrExpression
) {
  /*
   * if (!sUID || sUID === "") { throw "A mapping should have an unique id"; }
   */
  this.id = sUID;
  this.sourcePaths = aSourcePaths;
  this.targetPaths = aTargetPaths;
  this.fn = sFunctionOrExpression;
};
com.sap.it.spc.webui.mapping.models.MappingModel.prototype.getId = function () {
  return this.id;
};
com.sap.it.spc.webui.mapping.models.MappingModel.prototype.setJSONData =
  function (json) {
    if (!json) {
      return;
    }
    $.extend(this, json);
    if (!json.id || json.id === "") {
      throw "A mapping should have an unique id";
    }
    if (!json.targetPaths || json.targetPaths.length === 0) {
      throw "A mapping should have a Target";
    }
    this.id = json.id;
    this.sourcePaths = json.sourcePaths;
    this.targetPaths = json.targetPaths;
    this.fn = {};
    this.fn.description = json.fn.description;
    this.fn.expression = json.fn.expression;
  };
com.sap.it.spc.webui.mapping.models.MappingModel.prototype.setId = function (
  sUID
) {
  this.id = sUID;
};
com.sap.it.spc.webui.mapping.models.MappingModel.prototype.setConstantValue =
  function (sValue) {
    this.constantValue = sValue;
  };
com.sap.it.spc.webui.mapping.models.MappingModel.prototype.getConstantValue =
  function () {
    return this.constantValue;
  };
com.sap.it.spc.webui.mapping.models.MappingModel.prototype.getSourcePaths =
  function () {
    if (!this.sourcePaths) {
      this.sourcePaths = [];
    }
    return this.sourcePaths;
  };
com.sap.it.spc.webui.mapping.models.MappingModel.prototype.getTargetPaths =
  function () {
    if (!this.targetPaths) {
      this.targetPaths = [];
    }
    return this.targetPaths;
  };
com.sap.it.spc.webui.mapping.models.MappingModel.prototype.addSourcePath =
  function (sXPath) {
    this.getSourcePaths().push(sXPath);
  };
com.sap.it.spc.webui.mapping.models.MappingModel.prototype.addTargetPath =
  function (sXPath) {
    this.getTargetPaths().push(sXPath);
  };
com.sap.it.spc.webui.mapping.models.PrefixMapModel = function () {};
com.sap.it.spc.webui.mapping.models.PrefixMapModel.prototype.addPrefixEntry =
  function (sPrefix, sNamespace) {
    this[sPrefix] = sNamespace;
  };
com.sap.it.spc.webui.mapping.models.PrefixMapModel.prototype.getPrefixEntry =
  function (sPrefix) {
    return this[sPrefix];
  };
com.sap.it.spc.webui.mapping.models.PrefixMapModel.prototype.getPrefixMap =
  function () {
    return this;
  };
/**
 * Presentation model -- Start
 */
com.sap.it.spc.webui.mapping.models.PresentationModel = function (
  sIconSrc,
  aClasses
) {
  this.iconSrc = sIconSrc;
  this.classes = aClasses;
};
com.sap.it.spc.webui.mapping.models.PresentationModel.prototype.setIconSrc =
  function (sIconSrc) {
    this.iconSrc = sIconSrc;
  };
com.sap.it.spc.webui.mapping.models.PresentationModel.prototype.getIconSrc =
  function () {
    return this.iconSrc;
  };
com.sap.it.spc.webui.mapping.models.PresentationModel.prototype.setTooltip =
  function (sTooltip) {
    this.tooltip = sTooltip;
  };
com.sap.it.spc.webui.mapping.models.PresentationModel.prototype.getTooltip =
  function () {
    return this.tooltip;
  };
com.sap.it.spc.webui.mapping.models.PresentationModel.prototype.setIconTooltip =
  function (sTooltip) {
    this.iconTooltip = sTooltip;
  };
com.sap.it.spc.webui.mapping.models.PresentationModel.prototype.getIconTooltip =
  function () {
    return this.iconTooltip;
  };
com.sap.it.spc.webui.mapping.models.PresentationModel.prototype.setClasses =
  function (aClasses) {
    this.classes = aClasses;
  };
com.sap.it.spc.webui.mapping.models.PresentationModel.prototype.getClasses =
  function () {
    if (!this.classes) {
      this.classes = [];
    }
    return this.classes;
  };
com.sap.it.spc.webui.mapping.models.PresentationModel.prototype.addClass =
  function (sClassName) {
    var index = this.getClasses().indexOf(sClassName);
    if (index === -1) {
      this.getClasses().push(sClassName);
    }
  };
com.sap.it.spc.webui.mapping.models.PresentationModel.prototype.removeClass =
  function (sClassName) {
    var index = this.getClasses().indexOf(sClassName);
    if (index !== -1) {
      this.getClasses().splice(index, 1);
    }
  };
/**
 * Presentation model -- End
 */
com.sap.it.spc.webui.mapping.models.AbstractVisitor = function () {};
com.sap.it.spc.webui.mapping.models.AbstractVisitor.prototype.processNode =
  function (oNode) {
    if (!oNode || $.isEmptyObject(oNode)) {
      return false;
    }
    return true;
  };
com.sap.it.spc.webui.mapping.models.GetChildVisitor = function (
  sXPath,
  oPrefixMap
) {
  com.sap.it.spc.webui.mapping.models.AbstractVisitor.apply(this, arguments);
  this.prefixMap = oPrefixMap;
  this.splitter = new RegExp(/[\/|\\]/);
  this.xpath = sXPath;
  this.child = null;
};
com.sap.it.spc.webui.mapping.models.GetChildVisitor.prototype = Object.create(
  com.sap.it.spc.webui.mapping.models.AbstractVisitor.prototype
);
com.sap.it.spc.webui.mapping.models.GetChildVisitor.prototype.getXPath =
  function () {
    return this.xpath;
  };
com.sap.it.spc.webui.mapping.models.GetChildVisitor.prototype.setXPath =
  function (sXPath) {
    this.xpath = sXPath;
  };
com.sap.it.spc.webui.mapping.models.GetChildVisitor.prototype.getPrefixMap =
  function () {
    return this.prefixMap;
  };
com.sap.it.spc.webui.mapping.models.GetChildVisitor.prototype.setPrefixMap =
  function (oPrefixMap) {
    this.prefixMap = oPrefixMap;
  };
com.sap.it.spc.webui.mapping.models.GetChildVisitor.prototype.processNode =
  function (oNode) {
    var sTag, aPathElements;
    com.sap.it.spc.webui.mapping.models.AbstractVisitor.prototype.processNode.apply(
      this,
      arguments
    );
    if (!oNode || $.isEmptyObject(oNode)) {
      return false;
    }
    if (!this.xpath) {
      return false;
    }
    sTag = com.sap.it.spc.webui.mapping.utils.replacePrefix(
      oNode.tag,
      this.prefixMap
    );
    aPathElements = this.xpath.split(this.splitter);
    if (!aPathElements[0]) {
      aPathElements.shift();
    }
    aPathElements[0] = com.sap.it.spc.webui.mapping.utils.replacePrefix(
      aPathElements[0],
      this.prefixMap
    );
    if (sTag === aPathElements[0]) {
      this.child = oNode;
      aPathElements.shift();
      this.xpath = aPathElements.join("/");
      if (aPathElements.length === 0) {
        return false;
      }
      return true;
    }
    this.child = null;
    return false;
  };
com.sap.it.spc.webui.mapping.models.GetChildVisitor.prototype.getChildNode =
  function () {
    return this.child;
  };
com.sap.it.spc.webui.mapping.models.SuggestVisitor = function (sValue) {
  com.sap.it.spc.webui.mapping.models.AbstractVisitor.apply(this, arguments);
  this._oRegExpValidator = new RegExp("[^A-Za-z ]");
  this.setValue(sValue);
};
com.sap.it.spc.webui.mapping.models.SuggestVisitor.prototype = Object.create(
  com.sap.it.spc.webui.mapping.models.AbstractVisitor.prototype
);
com.sap.it.spc.webui.mapping.models.SuggestVisitor.prototype.getValue =
  function () {
    return this.sValue;
  };
com.sap.it.spc.webui.mapping.models.SuggestVisitor.prototype.setValue =
  function (sValue) {
    if (!sValue) {
      return;
    }
    sValue = sValue.trim();
    if (sValue === "") {
      return;
    }
    this.isRegExp = this._oRegExpValidator.test(sValue);
    sValue = this.isRegExp ? sValue : sValue.toLowerCase();
    try {
      this.sValue = new RegExp(sValue);
      this._oSuggestions = [];
    } catch (e) {
      jQuery.sap.log.error(e.message);
      this.sValue = null;
      return;
    }
  };
com.sap.it.spc.webui.mapping.models.SuggestVisitor.prototype.processNode =
  function (oNode) {
    var tag, name, sSuggestion;
    if (!oNode || $.isEmptyObject(oNode)) {
      return false;
    }
    if (!this.sValue) {
      jQuery.sap.log.error("Cannot suggest as there is no value passed");
      return false;
    }
    tag = this.isRegExp ? oNode.tag : oNode.tag.toLowerCase();
    name = this.isRegExp ? oNode.name : oNode.name.toLowerCase();
    if (this.sValue.test(tag)) {
      sSuggestion = "tag | " + oNode.tag;
      if (this._oSuggestions.indexOf(sSuggestion) === -1) {
        this._oSuggestions.push(sSuggestion);
      }
    }
    if (this.sValue.test(name)) {
      sSuggestion = "name | " + oNode.name;
      if (this._oSuggestions.indexOf(sSuggestion) === -1) {
        this._oSuggestions.push(sSuggestion);
      }
    }
    com.sap.it.spc.webui.mapping.models.AbstractVisitor.prototype.processNode.apply(
      this,
      arguments
    );
  };
com.sap.it.spc.webui.mapping.models.SuggestVisitor.prototype.getSuggestions =
  function () {
    return this._oSuggestions;
  };
com.sap.it.spc.webui.mapping.models.SearchVisitor = function (
  sQuery,
  bTag,
  bName
) {
  com.sap.it.spc.webui.mapping.models.AbstractVisitor.apply(this, arguments);
  this._oRegExpValidator = new RegExp(
    "[^A-Za-z\\d\\| \\(\\)_\\.,:=\\/\\\\\"\\']",
    "gi"
  );
  this.setQuery(sQuery, bTag, bName);
};
com.sap.it.spc.webui.mapping.models.SearchVisitor.prototype = Object.create(
  com.sap.it.spc.webui.mapping.models.AbstractVisitor.prototype
);
com.sap.it.spc.webui.mapping.models.SearchVisitor.prototype.getQuery =
  function () {
    return this.sQuery;
  };
com.sap.it.spc.webui.mapping.models.SearchVisitor.prototype.setQuery =
  function (sQuery, bTag, bName) {
    if (!sQuery) {
      return;
    }
    sQuery = sQuery.trim();
    if (sQuery === "") {
      return;
    }
    this.isRegExp = this._oRegExpValidator.test(sQuery);
    sQuery = this.isRegExp ? sQuery : sQuery.toLowerCase();
    try {
      this.sQuery = new RegExp(
        sQuery.replace(/[\[\]\\\^\$\.\|\?\*\+\(\)]/g, function (arg0) {
          return "\\".concat(arg0);
        })
      );
      this._oSearchResults = {
        tag: {},
        name: {},
      };
      this._checkInTag = bTag === undefined ? true : bTag;
      this._checkInName = bName === undefined ? true : bName;
    } catch (e) {
      jQuery.sap.log.error(e.message);
      this.sQuery = null;
      return;
    }
  };
com.sap.it.spc.webui.mapping.models.SearchVisitor.prototype.processNode =
  function (oNode) {
    var tag, name;
    if (!oNode || $.isEmptyObject(oNode)) {
      return false;
    }
    if (!this.sQuery) {
      jQuery.sap.log.error("Cannot search as there is no value passed");
      return false;
    }
    tag = this.isRegExp ? oNode.tag : oNode.tag.toLowerCase();
    name = this.isRegExp ? oNode.name : oNode.name.toLowerCase();
    if (this._checkInTag && this.sQuery.test(tag)) {
      if (!this._oSearchResults.tag[tag]) {
        this._oSearchResults.tag[tag] = [];
      }
      if (this._oSearchResults.tag[tag].indexOf(oNode.xpath) === -1) {
        this._oSearchResults.tag[tag].push(oNode.xpath);
      }
    }
    if (this._checkInName && this.sQuery.test(name)) {
      if (!this._oSearchResults.name[name]) {
        this._oSearchResults.name[name] = [];
      }
      if (this._oSearchResults.name[name].indexOf(oNode.xpath) === -1) {
        this._oSearchResults.name[name].push(oNode.xpath);
      }
    }
    com.sap.it.spc.webui.mapping.models.AbstractVisitor.prototype.processNode.apply(
      this,
      arguments
    );
  };
com.sap.it.spc.webui.mapping.models.SearchVisitor.prototype.getSearchResults =
  function () {
    return this._oSearchResults;
  };
com.sap.it.spc.webui.mapping.models.SearchVisitor.prototype.getResultPaths =
  function () {
    var aPaths = [],
      sPropertyName = "",
      sPropertyValue = "";
    if (
      !this._oSearchResults ||
      (jQuery.isEmptyObject(this._oSearchResults.tag) &&
        jQuery.isEmptyObject(this._oSearchResults.name))
    ) {
      return aPaths;
    }
    var searchResultsForProperty;
    var sFunction = function (sPath) {
      if (aPaths.indexOf(sPath) === -1) {
        aPaths.push(sPath);
      }
    };
    var sPath;
    for (sPropertyName in this._oSearchResults) {
      if (this._oSearchResults.hasOwnProperty(sPropertyName)) {
        searchResultsForProperty = this._oSearchResults[sPropertyName];
        for (sPropertyValue in searchResultsForProperty) {
          if (searchResultsForProperty.hasOwnProperty(sPropertyValue)) {
            aPaths = searchResultsForProperty[sPropertyValue];
            aPaths.forEach(sFunction, sPath);
          }
        }
      }
    }
    return aPaths;
  };
