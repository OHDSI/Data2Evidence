jQuery.sap.declare("com.sap.it.spc.webui.mapping.internal");
/**
 * @author Mouli Kalakota
 */
com.sap.it.spc.webui.mapping.internal = {};
com.sap.it.spc.webui.mapping.internal.IGraphicRenderer = function (mMethods) {
  var sMethodName = null;
  if (!mMethods || $.isEmptyObject(mMethods)) {
    throw "No methods defined, invalid arguments for IGraphicRenderer";
  }
  for (sMethodName in mMethods) {
    if (mMethods.hasOwnProperty(sMethodName)) {
      if (typeof mMethods[sMethodName] !== "function") {
        jQuery.sap.log.warning(sMethodName.concat(" is not a function"));
      }
      if (mMethods[sMethodName] === undefined) {
        jQuery.sap.log.warning(sMethodName.concat(" is undefined"));
      }
    }
  }
  if (
    (!!mMethods.placeAt && typeof mMethods.placeAt === "function") === false ||
    (!!mMethods.drawCurve && typeof mMethods.drawCurve === "function") ===
      false ||
    (!!mMethods.deleteCurve && typeof mMethods.deleteCurve === "function") ===
      false ||
    (!!mMethods.renderGraphics &&
      typeof mMethods.renderGraphics === "function") === false ||
    (!!mMethods.removeGraphics &&
      typeof mMethods.removeGraphics === "function") === false ||
    (!!mMethods.highlight &&
      (typeof mMethods.highlight === "function") === false) ||
    (!!mMethods.clearHighlight &&
      typeof mMethods.clearHighlight === "function") === false ||
    (!!mMethods.toggleSelection &&
      typeof mMethods.toggleSelection === "function") === false ||
    (!!mMethods.clearSelection &&
      typeof mMethods.clearSelection === "function") === false ||
    (!!mMethods.registerExecution &&
      typeof mMethods.registerExecution === "function") === false ||
    (!!mMethods.deregisterExecution &&
      typeof mMethods.deregisterExecution === "function") === false ||
    (!!mMethods.cancelPreview &&
      typeof mMethods.cancelPreview === "function") === false ||
    (!!mMethods.showPreview && typeof mMethods.showPreview === "function") ===
      false ||
    (!!mMethods.getFunctionXY &&
      typeof mMethods.getFunctionXY === "function") === false
  ) {
    throw "The class does not implement the required functions of IGraphicRenderer";
  }
  for (sMethodName in mMethods) {
    if (mMethods.hasOwnProperty(sMethodName)) {
      this[sMethodName] = mMethods[sMethodName];
    }
  }
  this.executions = {
    solidCurveClick: "solidCurveClick",
    dottedCurveClick: "dottedCurveClick",
    functionClick: "functionClick",
    curveDoubleClick: "curveDoubleClick",
    functionDoubleClick: "functionDoubleClick",
    curveRightClick: "curveRightClick",
    functionRightClick: "functionRightClick",
  };
};
com.sap.it.spc.webui.mapping.internal.SVGRenderer = function () {};
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype.placeAt = function (
  sContainerId,
  sAreaId
) {
  var $Container, sCanvasId, oTmpDiv, oCanvas;
  sAreaId = sAreaId || sContainerId;
  $Container = $("#" + sContainerId);
  sCanvasId = sContainerId + "-svgCanvas";
  oTmpDiv = $("<div/>");
  oTmpDiv.html(
    '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" id="' +
      sCanvasId +
      '" class="webuiCanvas"><path id="' +
      sCanvasId +
      '-cnctncurve" class="webuiCurve" style="display:none;"/><image id="' +
      sCanvasId +
      '-fnico" width="16px" height="16px" class="functionIcon" style="display:none;"/><rect rx="4" ry="4" id="' +
      sCanvasId +
      '-icToolTipRect" class="functionToolTipRect" style="fill:#FAF9F9;stroke:black;opacity:0;display:none;"/><text id="' +
      sCanvasId +
      '-icToolTip" class="functionToolTip" style="opacity:0;display:none;"/></svg>'
  );
  $Container.css("top", parseInt($Container.css("top"), 10) + 27 + "px");
  oCanvas = oTmpDiv[0].firstChild;
  if ($Container.css("position") === "static") {
    $Container.css("position", "relative");
  }
  $Container.append($(oCanvas));
  this._oCanvas = oCanvas;
  this._oCurveTemplate = oCanvas.childNodes[0];
  this._oIconTemplate = oCanvas.childNodes[1];
  this._oRectangleTemplate = oCanvas.childNodes[2];
  this._oTextTemplate = oCanvas.childNodes[3];
  this._aCurves = [];
  this._aIcons = [];
  this._sAreaId = sAreaId;
  this._sContainerId = sContainerId;
};
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype.drawCurve =
  function (from, to, oAttrMap, aClasses) {
    var sPathDef,
      oCurve,
      sAttrName = null,
      qX;
    if (!this._oCanvas || !this._oCurveTemplate || !this._aCurves) {
      jQuery.sap.log.error(
        "No Canvas/Template of curve is found. Create canvas before using this"
      );
      return;
    }
    qX = from.x + (to.x - from.x) / 4;
    sPathDef =
      "M" +
      from.x +
      " " +
      from.y +
      " Q" +
      qX +
      " " +
      from.y +
      " " +
      (from.x + to.x) / 2 +
      " " +
      (from.y + to.y) / 2 +
      " T" +
      to.x +
      " " +
      to.y;
    oCurve = this._oCurveTemplate.cloneNode(true);
    oCurve.style.display = "";
    for (sAttrName in oAttrMap) {
      if (oAttrMap.hasOwnProperty(sAttrName)) {
        oCurve.setAttribute(sAttrName, oAttrMap[sAttrName]);
      }
    }
    oCurve.setAttribute("d", sPathDef);
    if (aClasses && aClasses.length > 0) {
      oCurve.setAttribute(
        "class",
        oCurve.getAttribute("class").concat(" ").concat(aClasses.join(" "))
      );
    }
    oCurve.onclick = $.proxy(this._onCurveClick, this);
    oCurve.ondblclick = $.proxy(this._onCurveDoubleClick, this);
    oCurve.oncontextmenu = $.proxy(this._onCurveRightClick, this);
    this._oCanvas.appendChild(oCurve);
    this._aCurves.push(oCurve);
    return oCurve;
  };
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype.deleteCurve =
  function () {};
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype._fnSort = function (
  a,
  b
) {
  return a - b;
};
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype.renderGraphics =
  function (aConnectionInfos) {
    var pIcon,
      oMargin,
      oConnection,
      oAttrMap,
      i,
      j,
      oConnectionInfo,
      aInfos,
      aCurves = [],
      aIcons = [],
      oCurve,
      oIcon;
    var isInCurves,
      isInIcons,
      areEqualPoints,
      oSourceConnection,
      oTargetConnection,
      oPresentation;
    areEqualPoints = function (a, b) {
      if (a.x === b.x && a.y === b.y) {
        return true;
      }
      return false;
    };
    isInCurves = function (o, a) {
      var i,
        className = null,
        sClassName;
      if (o.classes) {
        className = o.classes.join(" ");
      }
      for (i = a.length - 1; i > -1; i--) {
        sClassName = null;
        if (a[i].classes) {
          sClassName = a[i].classes.join(" ");
        }
        if (
          className === sClassName &&
          areEqualPoints(o.source, a[i].source) &&
          areEqualPoints(o.target, a[i].target)
        ) {
          return true;
        }
      }
      return false;
    };
    isInIcons = function (o, a) {
      var i;
      for (i = a.length - 1; i > -1; i--) {
        if (areEqualPoints(o.point, a[i].point)) {
          return true;
        }
      }
      return false;
    };
    this.removeGraphics();
    oMargin = this._getAreaMargin();
    for (i = 0; i < aConnectionInfos.length; i++) {
      oConnectionInfo = aConnectionInfos[i];
      oPresentation = oConnectionInfo.presentation;
      oAttrMap = {};
      oAttrMap["data-mapping-id"] = oConnectionInfo.mapping.getId();
      if (
        oConnectionInfo.source.length === 1 &&
        oConnectionInfo.target.length === 1 &&
        (!oConnectionInfo.mapping.fn ||
          !oConnectionInfo.mapping.fn.expression ||
          (oPresentation && !oPresentation.getIconSrc()))
      ) {
        oSourceConnection = this._getConnection(
          oConnectionInfo.source[0],
          oMargin,
          "source"
        );
        oTargetConnection = this._getConnection(
          oConnectionInfo.target[0],
          oMargin,
          "target"
        );
        oCurve = {
          source: oSourceConnection.point,
          target: oTargetConnection.point,
          attributes: oAttrMap,
        };
        if (
          oTargetConnection.connectionType ||
          oSourceConnection.connectionType
        ) {
          oCurve.classes = [this._mCurveTypes.dotted];
        }
        if (oPresentation && oPresentation.getClasses().length > 0) {
          oCurve.classes = oCurve.classes || [];
          oCurve.classes = oCurve.classes.concat(oPresentation.getClasses());
        }
        if (oCurve.classes) {
          oCurve.classes.sort(this._fnSort);
        }
        if (!isInCurves(oCurve, aCurves)) {
          aCurves.push(oCurve);
        }
      } else {
        pIcon = this._getIconLocation(oConnectionInfo, oMargin);
        if (pIcon) {
          aInfos = oConnectionInfo.source;
          for (j = aInfos.length - 1; j > -1; j--) {
            oAttrMap = {};
            oAttrMap["data-mapping-id"] = oConnectionInfo.mapping.getId();
            oAttrMap["data-message-type"] = "source";
            oAttrMap["data-xpath"] = aInfos[j].xpath;
            oConnection = this._getConnection(aInfos[j], oMargin, "source");
            oCurve = {
              source: oConnection.point,
              target: pIcon,
              attributes: oAttrMap,
              classes: [oConnection.connectionType],
            };
            if (oPresentation && oPresentation.getClasses().length > 0) {
              oCurve.classes = oCurve.classes.concat(
                oPresentation.getClasses()
              );
            }
            if (oCurve.classes) {
              oCurve.classes.sort(this._fnSort);
            }
            if (!isInCurves(oCurve, aCurves)) {
              aCurves.push(oCurve);
            }
          }
          if (oPresentation && oPresentation.getIconSrc()) {
            oIcon = {
              src: oPresentation.getIconSrc(),
              point: pIcon,
              id: oConnectionInfo.mapping.id,
              tooltip: oPresentation.getTooltip(),
            };
            if (oConnectionInfo.mapping.fn) {
              oIcon.fn = oConnectionInfo.mapping.fn.expression;
            }
            oIcon.classes = oPresentation.getClasses();
            if (oIcon.classes) {
              oIcon.classes.sort(this._fnSort);
            }
            if (!isInIcons(oIcon, aIcons)) {
              aIcons.push(oIcon);
            }
          }
          aInfos = oConnectionInfo.target;
          for (j = aInfos.length - 1; j > -1; j--) {
            oAttrMap = {};
            oAttrMap["data-mapping-id"] = oConnectionInfo.mapping.getId();
            oAttrMap["data-message-type"] = "target";
            oAttrMap["data-xpath"] = aInfos[j].xpath;
            oConnection = this._getConnection(aInfos[j], oMargin, "target");
            oCurve = {
              source: pIcon,
              target: oConnection.point,
              attributes: oAttrMap,
              classes: [oConnection.connectionType],
            };
            if (oPresentation && oPresentation.getClasses().length > 0) {
              oCurve.classes = oCurve.classes.concat(
                oPresentation.getClasses()
              );
            }
            if (oCurve.classes) {
              oCurve.classes.sort(this._fnSort);
            }
            if (!isInCurves(oCurve, aCurves)) {
              aCurves.push(oCurve);
            }
          }
        }
      }
    }
    for (i = aCurves.length - 1; i > -1; i--) {
      this.drawCurve(
        aCurves[i].source,
        aCurves[i].target,
        aCurves[i].attributes,
        aCurves[i].classes
      );
    }
    for (i = aIcons.length - 1; i > -1; i--) {
      this._placeIcon(
        aIcons[i].src,
        aIcons[i].point,
        aIcons[i].fn,
        aIcons[i].id,
        aIcons[i].classes,
        aIcons[i].tooltip
      );
    }
  };
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype.removeGraphics =
  function () {
    var aTemp;
    aTemp = this._aCurves;
    aTemp.forEach(function (oCurve) {
      this._oCanvas.removeChild(oCurve);
    }, this);
    this._aCurves.length = 0;
    aTemp = this._aIcons;
    aTemp.forEach(function (oIcon) {
      this._oCanvas.removeChild(oIcon);
    }, this);
    this._aIcons.length = 0;
  };
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype.highlight =
  function (aMappingIds) {
    var that = this;
    if (!aMappingIds || aMappingIds.length === 0) {
      return;
    }
    aMappingIds.forEach(function (sId) {
      $("path[data-mapping-id='" + sId + "']").each(function () {
        this.setAttribute(
          "class",
          this.getAttribute("class")
            .concat(" ")
            .concat(that._mCurveTypes.highlighted)
        );
      });
    }, this);
  };
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype.clearHighlight =
  function () {
    var that = this;
    $("." + this._mCurveTypes.highlighted).each(function () {
      var className;
      className = this.getAttribute("class").replace(
        that._mCurveTypes.highlighted,
        ""
      );
      className = className.replace(/\s+/g, " ");
      this.setAttribute("class", className);
    });
    $("." + this._mCurveTypes.selected).each(function () {
      var className;
      className = this.getAttribute("class").replace(
        that._mCurveTypes.selected,
        ""
      );
      className = className.replace(/\s+/g, " ");
      this.setAttribute("class", className);
    });
  };
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype.toggleSelection =
  function (sMappingId, sMessageType, sXPath) {
    var that = this,
      filter;
    filter = "[data-mapping-id='".concat(sMappingId).concat("']");
    if (!!sXPath) {
      filter = filter.concat("[data-xpath='".concat(sXPath).concat("']"));
    }
    if (!!sMessageType) {
      filter = filter.concat(
        "[data-message-type='".concat(sMessageType).concat("']")
      );
    }
    $("path".concat(filter)).each(function () {
      var className;
      if (
        this.getAttribute("class").indexOf(that._mCurveTypes.selected) === -1
      ) {
        this.setAttribute(
          "class",
          this.getAttribute("class")
            .concat(" ")
            .concat(that._mCurveTypes.selected)
        );
      } else {
        className = this.getAttribute("class").replace(
          that._mCurveTypes.selected,
          ""
        );
        className = className.replace(/\s+/g, " ");
        this.setAttribute("class", className);
      }
    });
  };
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype.clearSelection =
  function () {
    var that = this;
    $("." + this._mCurveTypes.selected).each(function () {
      var className;
      className = this.getAttribute("class").replace(
        that._mCurveTypes.selected,
        ""
      );
      className = className.replace(/\s+/g, " ");
      this.setAttribute("class", className);
    });
  };
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype.registerExecution =
  function (sExecutionId, fnFunction, oContext) {
    if (!sExecutionId) {
      throw "Invalid execution Id";
    }
    if (typeof fnFunction !== "function") {
      throw fnFunction.concat(" is not a function");
    }
    if (!this._oExecutions) {
      this._oExecutions = {};
    }
    this._oExecutions[sExecutionId] = {
      handler: fnFunction,
      context: oContext,
    };
  };
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype.deregisterExecution =
  function (sExecutionId) {
    if (this._oExecutions) {
      this._oExecutions[sExecutionId] = undefined;
    }
  };
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype.cancelPreview =
  function () {
    var curvePreview = this._curvePreview;
    if (!!this._curvePreview) {
      this._curvePreview = null;
      if ($(this._oCanvas).find($(curvePreview)).length > 0) {
        this._oCanvas.removeChild(curvePreview);
        this._aCurves.pop();
      }
    }
  };
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype.showPreview =
  function (startX, startY, endX, endY) {
    this._curvePreview = this.drawCurve(
      {
        x: startX,
        y: startY,
      },
      {
        x: endX,
        y: endY,
      }
    );
  };
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype._getAreaMargin =
  function () {
    var $Area, $Canvas, oCanvasOffset, oAreaOffset;
    $Area = $("#" + this._sAreaId);
    $Canvas = $(this._oCanvas);
    oCanvasOffset = $Canvas.offset();
    oAreaOffset = $Area.offset();
    return {
      top: oAreaOffset.top - oCanvasOffset.top,
      left: oAreaOffset.left - oCanvasOffset.left,
      width: $Area.width(),
      height: $Area.height(),
      canvasTop: oCanvasOffset.top,
      canvasLeft: oCanvasOffset.left,
    };
  };
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype._mCurveTypes = {
  dotted: "webuiCurveDotted",
  highlighted: "webuiCurveHighlighted",
  selected: "webuiCurveSelected",
};
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype._getPoint =
  function (oInfo, oMargin, sPointType) {
    var x, y, $Dom;
    x = oMargin.left;
    y = oMargin.top;
    if (oInfo.id) {
      $Dom = $("#" + oInfo.id);
      y = $Dom.offset().top + $Dom.height() / 2 - oMargin.canvasTop;
      if (sPointType === "target") {
        x += oMargin.width;
      }
    } else {
      if (sPointType === "target") {
        x += oMargin.width - oInfo.point.x;
      } else {
        x += oInfo.point.x;
      }
      y += oInfo.point.y;
    }
    return {
      x: x,
      y: y,
    };
  };
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype._getConnection =
  function (oInfo, oMargin, sPointType) {
    var oPoint,
      cType = "";
    oPoint = this._getPoint(oInfo, oMargin, sPointType);
    if (!oInfo.id || (oInfo.id && oInfo.isParent)) {
      cType = this._mCurveTypes.dotted;
    }
    return {
      point: oPoint,
      connectionType: cType,
    };
  };
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype._getYAvg =
  function (aInfos, iCanvasTop) {
    var y = 0,
      $Dom,
      iRowsVisible = 0,
      i;
    if (!aInfos) {
      return;
    }
    for (i = aInfos.length - 1; i >= 0; i--) {
      if (aInfos[i].id) {
        $Dom = $("#" + aInfos[i].id);
        y += $Dom.offset().top + $Dom.height() / 2;
        iRowsVisible++;
      }
    }
    y = iRowsVisible ? y / iRowsVisible - iCanvasTop : null;
    return y;
  };
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype._getIconLocation =
  function (oInfo, oMargin) {
    var x, y;
    x = oMargin.left;
    // Always check with target first
    y = this._getYAvg(oInfo.target, oMargin.canvasTop);
    if (y) {
      if (oInfo.target.length === 1) {
        x += oMargin.width - oMargin.width / 8;
      } else {
        x += oMargin.width / 2;
      }
    } else {
      // If target rows are not visible, then go for source
      y = this._getYAvg(oInfo.source, oMargin.canvasTop);
      if (y) {
        if (oInfo.source.length === 1) {
          x += oMargin.width / 8;
        } else {
          x += oMargin.width / 2;
        }
      }
    }
    // Return only if both x,y have some values apart from 'null' or '0'
    if (x && y) {
      return {
        x: x,
        y: y,
      };
    }
  };
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype._showTooltip =
  function (sTooltipText, oPoint) {
    var oRectangle = this._oRectangleTemplate;
    var oTooltipText = this._oTextTemplate;
    oRectangle.style.display = "";
    oTooltipText.style.display = "";
    oTooltipText.innerHTML = sTooltipText;
    var wordLengthInPixels = oTooltipText.getComputedTextLength();
    oTooltipText.innerHTML = this._wrapSVGText(
      sTooltipText,
      wordLengthInPixels
    );
    wordLengthInPixels = oTooltipText.children[0].getComputedTextLength();
    var oTooltipPoint = this._getToolTipPosition(oPoint, wordLengthInPixels);
    oTooltipText.setAttribute("x", oTooltipPoint.x);
    oTooltipText.setAttribute("y", oTooltipPoint.y);
    var rectangleHeight = 0;
    var i;
    for (i = 0; i < oTooltipText.children.length; i++) {
      oTooltipText.children[i].setAttribute("x", oTooltipPoint.x);
      rectangleHeight += 10;
    }
    oRectangle.setAttribute("x", oTooltipPoint.x - 5);
    oRectangle.setAttribute("y", oTooltipPoint.y - 5);
    oRectangle.setAttribute("width", wordLengthInPixels + 10);
    oRectangle.setAttribute("height", rectangleHeight + 10);
    oRectangle.style.display = "none";
    oTooltipText.style.display = "none";
    oRectangle.style.opacity = "1";
    oTooltipText.style.opacity = "1";
    this._oCanvas.appendChild(oRectangle);
    // bring tooltip to top
    this._oCanvas.appendChild(oTooltipText);
    // bring tooltip to top
    $(oRectangle).delay(800).fadeIn(400);
    $(oTooltipText).delay(800).fadeIn(400);
  };
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype._hideTooltip =
  function () {
    var oRectangle = this._oRectangleTemplate;
    var oTooltipText = this._oTextTemplate;
    oRectangle.style.display = "none";
    oTooltipText.style.display = "none";
    oRectangle.style.opacity = "0";
    oTooltipText.style.opacity = "0";
  };
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype._placeIcon =
  function (sIconSrc, oPoint, sFunctionInfo, sFunctionId, aClasses, sToolTip) {
    var oIcon, self;
    if (!this._oCanvas || !this._oIconTemplate || !this._aIcons) {
      jQuery.sap.log.error(
        "No Canvas/Template of function icon is found. Create canvas before using this"
      );
      return;
    }
    self = this;
    oIcon = this._oIconTemplate.cloneNode(true);
    oIcon.setAttributeNS(
      "http://www.w3.org/1999/xlink",
      "xlink:href",
      sIconSrc
    );
    oIcon.setAttribute("x", oPoint.x - 8);
    oIcon.setAttribute("y", oPoint.y - 8);
    oIcon.setAttribute("data-function", sFunctionInfo);
    oIcon.setAttribute("data-mapping-id", sFunctionId);
    if (sToolTip) {
      oIcon.setAttribute("title", sToolTip);
    }
    oIcon.style.display = "";
    if (aClasses && aClasses.length > 0) {
      oIcon.setAttribute(
        "class",
        oIcon.getAttribute("class").concat(" ").concat(aClasses.join(" "))
      );
    }
    $(oIcon).hover(
      function () {
        this.setAttribute("width", 24 + "px");
        this.setAttribute("height", 24 + "px");
        oIcon.setAttribute("x", oPoint.x - 12);
        oIcon.setAttribute("y", oPoint.y - 12);
        var sTooltipText = oIcon.getAttribute("title");
        if (sTooltipText) {
          self._showTooltip(sTooltipText, oPoint);
        }
      },
      function () {
        this.setAttribute("width", 16 + "px");
        this.setAttribute("height", 16 + "px");
        oIcon.setAttribute("x", oPoint.x - 8);
        oIcon.setAttribute("y", oPoint.y - 8);
        var sTooltipText = oIcon.getAttribute("title");
        if (sTooltipText) {
          self._hideTooltip();
        }
      }
    );
    oIcon.onclick = $.proxy(this._onFunctionClick, this);
    // oIcon.ondblclick = $.proxy(this._onFunctionDoubleClick, this);
    oIcon.oncontextmenu = $.proxy(this._onFunctionRightClick, this);
    this._oCanvas.appendChild(oIcon);
    this._aIcons.push(oIcon);
  };
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype._getToolTipPosition =
  function (oPoint, iWordLength) {
    var oToolTipPosition = {};
    var x = oPoint.x;
    var y = oPoint.y;
    var areaMargin = this._getAreaMargin();
    var width = areaMargin.width;
    if (x >= width / 2) {
      if (x - iWordLength > 0) {
        if (x + iWordLength + 20 < width) {
          // dx corrections, when rectangle length extends the graphical area
          oToolTipPosition.x = x - iWordLength;
        } else {
          oToolTipPosition.x = x - iWordLength - 10;
        }
      } else {
        oToolTipPosition.x = 5;
      }
      oToolTipPosition.y = y + 15;
    } else {
      if (x + iWordLength + 30 < width) {
        // dx corrections, when rectangle length extends the graphical area
        oToolTipPosition.x = x + 15;
      } else {
        oToolTipPosition.x = x;
      }
      oToolTipPosition.y = y + 15;
    }
    return oToolTipPosition;
  };
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype._wrapSVGText =
  function (sText, iTextLength) {
    var tspan = "";
    if (iTextLength > this._getAreaMargin().width / 2) {
      var aWords = sText.split(" ");
      var iAvgLengthPerLetter = iTextLength / sText.length;
      var text = "";
      var done = true;
      var i = 0;
      var spanLength = 0;
      while (aWords.length > 0) {
        var word = aWords.splice(0, 1);
        var wordLength =
          word[0].length * iAvgLengthPerLetter + iAvgLengthPerLetter;
        spanLength += wordLength;
        if (
          spanLength < this._getAreaMargin().width / 2 &&
          aWords.length >= 0
        ) {
          text += word + " ";
          if (aWords.length === 0) {
            tspan += '<tspan dy="10">' + text + "</tspan>";
          }
        } else {
          if (text === "") {
            tspan += '<tspan dy="10">' + word[0] + "</tspan>";
          } else {
            aWords.unshift(word[0]);
            tspan += '<tspan dy="10">' + text + "</tspan>";
          }
          text = "";
          spanLength = 0;
        }
      }
      if (tspan === "") {
        tspan = '<tspan dy="10">' + sText + "</tspan>";
      }
    } else {
      tspan = '<tspan dy="10">' + sText + "</tspan>";
    }
    return tspan;
  };
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype._onCurveClick =
  function (oEvent) {
    var oCurve, sXPath, sMessageType, sMappingId, oExecution, sClass;
    oCurve = oEvent.target;
    sMessageType = oCurve.getAttribute("data-message-type");
    sXPath = oCurve.getAttribute("data-xpath");
    if (sXPath === null) {
      sXPath = "W/OFn";
    }
    sMappingId = oCurve.getAttribute("data-mapping-id");
    sClass = oCurve.getAttribute("class");
    if (sClass.indexOf(this._mCurveTypes.dotted) !== -1) {
      oExecution = this._oExecutions[this.executions.dottedCurveClick];
    } else {
      oExecution = this._oExecutions[this.executions.solidCurveClick];
    }
    if (oExecution) {
      oExecution.context = oExecution.context || this;
      oExecution.handler.call(
        oExecution.context,
        sMessageType,
        sXPath,
        sMappingId,
        oEvent
      );
    }
    oEvent.cancelBubble = true;
  };
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype._onCurveDoubleClick =
  function (oEvent) {
    var oCurve, sXPath, sMessageType, sMappingId, oExecution;
    oCurve = oEvent.target;
    sMessageType = oCurve.getAttribute("data-message-type");
    sXPath = oCurve.getAttribute("data-xpath");
    if (sXPath === null) {
      sXPath = "W/OFn";
    }
    sMappingId = oCurve.getAttribute("data-mapping-id");
    oExecution = this._oExecutions[this.executions.curveDoubleClick];
    if (oExecution) {
      oExecution.context = oExecution.context || this;
      oExecution.handler.call(
        oExecution.context,
        sMessageType,
        sXPath,
        sMappingId,
        oEvent
      );
    }
    oEvent.cancelBubble = true;
  };
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype._onCurveRightClick =
  function (oEvent) {
    var oCurve, sXPath, sMessageType, sMappingId, oExecution;
    oCurve = oEvent.target;
    sMessageType = oCurve.getAttribute("data-message-type");
    sXPath = oCurve.getAttribute("data-xpath");
    sMappingId = oCurve.getAttribute("data-mapping-id");
    oExecution = this._oExecutions[this.executions.curveRightClick];
    if (oExecution) {
      oExecution.context = oExecution.context || this;
      oExecution.handler.call(
        oExecution.context,
        sMessageType,
        sXPath,
        sMappingId,
        oEvent
      );
    }
  };
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype._onFunctionClick =
  function (oEvent) {
    var oIcon = oEvent.target;
    var sMappingId = oIcon.getAttribute("data-mapping-id");
    var oExecution = this._oExecutions[this.executions.functionClick];
    if (oExecution) {
      oExecution.context = oExecution.context || this;
      oExecution.handler.call(
        oExecution.context,
        null,
        null,
        sMappingId,
        oEvent
      );
    }
  };
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype._onFunctionDoubleClick =
  function (oEvent) {
    var oIcon = oEvent.target;
    var sMappingId = oIcon.getAttribute("data-mapping-id");
    var oExecution = this._oExecutions[this.executions.functionDoubleClick];
    if (oExecution) {
      oExecution.context = oExecution.context || this;
      oExecution.handler.call(
        oExecution.context,
        null,
        null,
        sMappingId,
        oEvent
      );
    }
  };
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype._onFunctionRightClick =
  function (oEvent) {
    var oIcon = oEvent.target;
    var sMappingId = oIcon.getAttribute("data-mapping-id");
    var oExecution = this._oExecutions[this.executions.functionRightClick];
    if (oExecution) {
      oExecution.context = oExecution.context || this;
      oExecution.handler.call(
        oExecution.context,
        null,
        null,
        sMappingId,
        oEvent
      );
    }
  };
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype._delegateEvents =
  function (oCanvas) {
    var oEntered = null,
      d,
      oBelow;
    $(oCanvas)
      .off("mousemove")
      .on("mousemove", function (oEvent) {
        d = oCanvas.style.display;
        oCanvas.style.display = "none";
        oBelow = oCanvas.ownerDocument.elementFromPoint(
          oEvent.clientX,
          oEvent.clientY
        );
        oCanvas.style.display = d;
        if (oEntered !== oBelow) {
          if (oEntered) {
            $(oEntered).trigger("mouseleave");
          }
          if (oBelow) {
            $(oBelow).trigger("mouseenter");
          }
        }
        oEntered = oBelow;
      });
    $(oCanvas)
      .off("click")
      .on("click", function (oEvent) {
        d = oCanvas.style.display;
        oCanvas.style.display = "none";
        oBelow = oCanvas.ownerDocument.elementFromPoint(
          oEvent.clientX,
          oEvent.clientY
        );
        try {
          com.sap.it.spc.webui.mapping.SVGRenderer.fireMouseEvent(
            oBelow,
            "click",
            oEvent,
            true
          );
        } finally {
          oCanvas.style.display = d;
        }
      });
  };
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype.getFunctionXY =
  function (sMappingId) {
    var i,
      oIcon = null;
    if (!sMappingId || !this._aIcons) {
      return;
    }
    for (i = this._aIcons.length - 1; i > -1; i--) {
      if (this._aIcons[i].getAttribute("data-mapping-id") === sMappingId) {
        oIcon = this._aIcons[i];
        break;
      }
    }
    if (!oIcon) {
      return;
    }
    return {
      x: oIcon.getAttribute("x") + 8,
      y: oIcon.getAttribute("y") + 8,
    };
  };
com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype =
  new com.sap.it.spc.webui.mapping.internal.IGraphicRenderer(
    com.sap.it.spc.webui.mapping.internal.SVGRenderer.prototype
  );
com.sap.it.spc.webui.mapping.internal.SVGRenderer.fireMouseEvent = function (
  oDom,
  sEventName,
  oEvent,
  bCanBubble
) {
  var oNewEvent = oDom.ownerDocument.createEvent("MouseEvents");
  oNewEvent.initMouseEvent(
    sEventName,
    bCanBubble,
    true,
    oDom.ownerDocument.defaultView,
    1,
    oEvent.screenX,
    oEvent.screenY,
    oEvent.clientX,
    oEvent.clientY,
    false,
    false,
    false,
    false,
    0,
    oDom
  );
  oDom.dispatchEvent(oNewEvent);
};
