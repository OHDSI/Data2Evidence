/* ----------------------------------------------------------------------------------
 * Hint: This is a derived (generated) file. Changes should be done in the underlying
 * source files only (*.control, *.js) or they will be lost after the next generation.
 * ---------------------------------------------------------------------------------- */
// Provides control com.sap.it.spc.webui.mapping.MappingControl.
jQuery.sap.declare("com.sap.it.spc.webui.mapping.MappingControl");
jQuery.sap.require("com.sap.it.spc.webui.mapping.library");
jQuery.sap.require("com.sap.it.spc.webui.mapping.core");
jQuery.sap.require("com.sap.it.spc.webui.mapping.internal");
jQuery.sap.require("com.sap.it.spc.webui.mapping.InformationTable");
jQuery.sap.require("com.sap.it.spc.webui.mapping.MessageTreeTable");
jQuery.sap.require("sap.ui.commons.Image");
jQuery.sap.require("sap.ui.commons.Splitter");
jQuery.sap.require("sap.ui.commons.TextView");
jQuery.sap.require("sap.m.IconTabBar");
jQuery.sap.require("sap.ui.commons.layout.BorderLayout");
jQuery.sap.require("sap.ui.commons.layout.HorizontalLayout");
jQuery.sap.require("sap.ui.commons.layout.VerticalLayout");
jQuery.sap.require("sap.ui.core.Control");
jQuery.sap.require("sap.ui.core.EventBus");
jQuery.sap.require("sap.ui.model.json.JSONModel");
jQuery.sap.require("sap.m.MessageBox");
/**
 * Constructor for a new Mapping. Accepts an object literal <code>mSettings</code> that defines initial property values, aggregated and associated objects as
 * well as event handlers. If the name of a setting is ambiguous (e.g. a property has the same name as an event), then the framework assumes property,
 * aggregation, association, event in that order. To override this automatic resolution, one of the prefixes "aggregation:", "association:" or "event:" can be
 * added to the name of the setting (such a prefixed name must be enclosed in single or double quotes). The supported settings are:
 * <ul>
 * <li>Properties
 * <ul>
 * <li>{@link #getSourceMessageTitle sourceMessageTitle} : string</li>
 * <li>{@link #getTargetMessageTitle targetMessageTitle} : string</li>
 * <li>{@link #getTransformation transformation} : object</li>
 * <li>{@link #getShowInfoSection showInfoSection} : boolean (default: true)</li>
 * <li>{@link #getInfoSectionSize infoSectionSize} : sap.ui.core.CSSSize (default: '45%')</li>
 * <li>{@link #getWidth width} : sap.ui.core.CSSSize (default: '100%')</li>
 * <li>{@link #getHeight height} : sap.ui.core.CSSSize (default: '100%')</li>
 * </ul>
 * </li>
 * <li>Aggregations
 * <ul>
 * <li>{@link #getSourceMessageColumns sourceMessageColumns} : sap.ui.table.Column[]</li>
 * <li>{@link #getTargetMessageColumns targetMessageColumns} : sap.ui.table.Column[]</li>
 * </ul>
 * </li>
 * <li>Associations
 * <ul>
 * </ul>
 * </li>
 * <li>Events
 * <ul>
 * </ul>
 * </li>
 * </ul>
 *
 * @param {string}
 *            [sId] id for the new control, generated automatically if no id is given
 * @param {object}
 *            [mSettings] initial settings for the new control
 * @class This is used for representing a mapping in a graphical format and informational format
 * @extends sap.ui.core.Control
 * @author Mouli Kalakota
 * @constructor
 * @public
 * @name com.sap.it.spc.webui.mapping.MappingControl
 * @comment
 */
sap.ui.core.Control.extend("com.sap.it.spc.webui.mapping.MappingControl", {
  metadata: {
    // ---- object ----
    // ---- control specific ----
    library: "com.sap.it.spc.webui.mapping",
    publicMethods: [
      "addSourceMessageColumns",
      "addTargetMessageColumns",
      "registerPresenter",
    ],
    properties: {
      showInfoSection: {
        type: "boolean",
        group: "Appearance",
        defaultValue: false,
      },
      infoSectionSize: {
        type: "sap.ui.core.Percentage",
        group: "Appearance",
        defaultValue: "45%",
      },
      width: {
        type: "sap.ui.core.CSSSize",
        group: "Appearance",
        defaultValue: "100%",
      },
      height: {
        type: "sap.ui.core.CSSSize",
        group: "Appearance",
        defaultValue: "100%",
      },
      enableSearchBox: {
        type: "boolean",
        group: "Appearance",
        defaultValue: false,
      },
      editMode: {
        type: "boolean",
        group: "Appearance",
        defaultValue: false,
      },
      enableConstantAssignment: {
        type: "boolean",
        defaultValue: false,
      },
      sourceMessagePath: {
        type: "string",
        defaultValue: "/",
      },
      targetMessagePath: {
        type: "string",
        defaultValue: "/",
      },
      eventChannelId: {
        type: "string",
        defaultValue: null,
      },
    },
    aggregations: {
      sourceMessageHeader: {
        type: "sap.ui.core.Control",
        multiple: false,
      },
      targetMessageHeader: {
        type: "sap.ui.core.Control",
        multiple: false,
      },
      infoTabs: {
        type: "sap.m.IconTabFilter",
        multiple: true,
        singularName: "infoTab",
        defaultValue: null,
      },
      _layout: {
        type: "sap.ui.core.Control",
        multiple: false,
        visibility: "hidden",
      },
      transformation: {
        type: "com.sap.it.spc.webui.mapping.models.TransformationModel",
        group: "Data",
        defaultValue: null,
        multiple: false,
      },
    },
    events: {
      sourceMouseover: {},
      targetMouseover: {},
      sourceMouseRightclick: {},
      targetMouseRightclick: {},
      nodeSelectionChange: { allowPreventDefault: true },
    },
  },
});
com.sap.it.spc.webui.mapping.MappingControl.M_EVENTS = {
  sourceMouseover: "sourceMouseover",
  targetMouseover: "targetMouseover",
  sourceMouseRightclick: "sourceMouseRightclick",
  targetMouseRightclick: "targetMouseRightclick",
};
/**
 * Creates a new subclass of class com.sap.it.spc.webui.mapping.MappingControl with name <code>sClassName</code> and enriches it with the information
 * contained in <code>oClassInfo</code>. <code>oClassInfo</code> might contain the same kind of informations as described in
 * {@link sap.ui.core.Element.extend Element.extend}.
 *
 * @param {string}
 *            sClassName name of the class to be created
 * @param {object}
 *            [oClassInfo] object literal with informations about the class
 * @param {function}
 *            [FNMetaImpl] constructor function for the metadata object. If not given, it defaults to sap.ui.core.ElementMetadata.
 * @return {function} the created class / constructor function
 * @public
 * @static
 * @name com.sap.it.spc.webui.mapping.MappingControl.extend
 * @function
 */
/**
 * Getter for property <code>sourceMessageTitle</code>. Default value is empty/<code>undefined</code>
 *
 * @return {string} the value of property <code>sourceMessageTitle</code>
 * @public
 * @name com.sap.it.spc.webui.mapping.MappingControl#getSourceMessageTitle
 * @function
 */
/**
 * Setter for property <code>sourceMessageTitle</code>. Default value is empty/<code>undefined</code>
 *
 * @param {string}
 *            sSourceMessageTitle new value for property <code>sourceMessageTitle</code>
 * @return {com.sap.it.spc.webui.mapping.MappingControl} <code>this</code> to allow method chaining
 * @public
 * @name com.sap.it.spc.webui.mapping.MappingControl#setSourceMessageTitle
 * @function
 */
/**
 * Getter for property <code>targetMessageTitle</code>. Default value is empty/<code>undefined</code>
 *
 * @return {string} the value of property <code>targetMessageTitle</code>
 * @public
 * @name com.sap.it.spc.webui.mapping.MappingControl#getTargetMessageTitle
 * @function
 */
/**
 * Setter for property <code>targetMessageTitle</code>. Default value is empty/<code>undefined</code>
 *
 * @param {string}
 *            sTargetMessageTitle new value for property <code>targetMessageTitle</code>
 * @return {com.sap.it.spc.webui.mapping.MappingControl} <code>this</code> to allow method chaining
 * @public
 * @name com.sap.it.spc.webui.mapping.MappingControl#setTargetMessageTitle
 * @function
 */
/**
 * Getter for property <code>transformation</code>. The data that needs to be set on this control. This should be an instance of the model object
 * "com.sap.it.spc.webui.models.Transformation" Default value is empty/<code>undefined</code>
 *
 * @return {object} the value of property <code>transformation</code>
 * @public
 * @name com.sap.it.spc.webui.mapping.MappingControl#getTransformation
 * @function
 */
/**
 * Setter for property <code>transformation</code>. Default value is empty/<code>undefined</code>
 *
 * @param {object}
 *            oTransformation new value for property <code>transformation</code>
 * @return {com.sap.it.spc.webui.mapping.MappingControl} <code>this</code> to allow method chaining
 * @public
 * @name com.sap.it.spc.webui.mapping.MappingControl#setTransformation
 * @function
 */
/**
 * Getter for property <code>showInfoSection</code>. To show/hide the information (lower) section Default value is <code>true</code>
 *
 * @return {boolean} the value of property <code>showInfoSection</code>
 * @public
 * @name com.sap.it.spc.webui.mapping.MappingControl#getShowInfoSection
 * @function
 */
/**
 * Setter for property <code>showInfoSection</code>. Default value is <code>true</code>
 *
 * @param {boolean}
 *            bShowInfoSection new value for property <code>showInfoSection</code>
 * @return {com.sap.it.spc.webui.mapping.MappingControl} <code>this</code> to allow method chaining
 * @public
 * @name com.sap.it.spc.webui.mapping.MappingControl#setShowInfoSection
 * @function
 */
/**
 * Getter for property <code>infoSectionSize</code>. The size of the information section to occupy the visible area Default value is <code>45%</code>
 *
 * @return {sap.ui.core.CSSSize} the value of property <code>infoSectionSize</code>
 * @public
 * @name com.sap.it.spc.webui.mapping.MappingControl#getInfoSectionSize
 * @function
 */
/**
 * Setter for property <code>infoSectionSize</code>. Default value is <code>45%</code>
 *
 * @param {sap.ui.core.CSSSize}
 *            sInfoSectionSize new value for property <code>infoSectionSize</code>
 * @return {com.sap.it.spc.webui.mapping.MappingControl} <code>this</code> to allow method chaining
 * @public
 * @name com.sap.it.spc.webui.mapping.MappingControl#setInfoSectionSize
 * @function
 */
/**
 * Getter for property <code>width</code>. Width of the control Default value is <code>100%</code>
 *
 * @return {sap.ui.core.CSSSize} the value of property <code>width</code>
 * @public
 * @name com.sap.it.spc.webui.mapping.MappingControl#getWidth
 * @function
 */
/**
 * Setter for property <code>width</code>. Default value is <code>100%</code>
 *
 * @param {sap.ui.core.CSSSize}
 *            sWidth new value for property <code>width</code>
 * @return {com.sap.it.spc.webui.mapping.MappingControl} <code>this</code> to allow method chaining
 * @public
 * @name com.sap.it.spc.webui.mapping.MappingControl#setWidth
 * @function
 */
/**
 * Getter for property <code>height</code>. Height of the control Default value is <code>100%</code>
 *
 * @return {sap.ui.core.CSSSize} the value of property <code>height</code>
 * @public
 * @name com.sap.it.spc.webui.mapping.MappingControl#getHeight
 * @function
 */
/**
 * Setter for property <code>height</code>. Default value is <code>100%</code>
 *
 * @param {sap.ui.core.CSSSize}
 *            sHeight new value for property <code>height</code>
 * @return {com.sap.it.spc.webui.mapping.MappingControl} <code>this</code> to allow method chaining
 * @public
 * @name com.sap.it.spc.webui.mapping.MappingControl#setHeight
 * @function
 */
/**
 * Getter for aggregation <code>sourceMessageColumns</code>.<br/> The columns for the source message
 *
 * @return {sap.ui.table.Column[]}
 * @public
 * @name com.sap.it.spc.webui.mapping.MappingControl#getSourceMessageColumns
 * @function
 */
/**
 * Inserts a sourceMessageColumn into the aggregation named <code>sourceMessageColumns</code>.
 *
 * @param {sap.ui.table.Column}
 *            oSourceMessageColumn the sourceMessageColumn to insert; if empty, nothing is inserted
 * @param {int}
 *            iIndex the <code>0</code>-based index the sourceMessageColumn should be inserted at; for a negative value of <code>iIndex</code>, the
 *            sourceMessageColumn is inserted at position 0; for a value greater than the current size of the aggregation, the sourceMessageColumn is inserted
 *            at the last position
 * @return {com.sap.it.spc.webui.mapping.MappingControl} <code>this</code> to allow method chaining
 * @public
 * @name com.sap.it.spc.webui.mapping.MappingControl#insertSourceMessageColumn
 * @function
 */
/**
 * Adds some sourceMessageColumn <code>oSourceMessageColumn</code> to the aggregation named <code>sourceMessageColumns</code>.
 *
 * @param {sap.ui.table.Column}
 *            oSourceMessageColumn the sourceMessageColumn to add; if empty, nothing is inserted
 * @return {com.sap.it.spc.webui.mapping.MappingControl} <code>this</code> to allow method chaining
 * @public
 * @name com.sap.it.spc.webui.mapping.MappingControl#addSourceMessageColumn
 * @function
 */
/**
 * Removes an sourceMessageColumn from the aggregation named <code>sourceMessageColumns</code>.
 *
 * @param {int |
 *            string | sap.ui.table.Column} vSourceMessageColumn the sourceMessageColumn to remove or its index or id
 * @return {sap.ui.table.Column} the removed sourceMessageColumn or null
 * @public
 * @name com.sap.it.spc.webui.mapping.MappingControl#removeSourceMessageColumn
 * @function
 */
/**
 * Removes all the controls in the aggregation named <code>sourceMessageColumns</code>.<br/> Additionally unregisters them from the hosting UIArea.
 *
 * @return {sap.ui.table.Column[]} an array of the removed elements (might be empty)
 * @public
 * @name com.sap.it.spc.webui.mapping.MappingControl#removeAllSourceMessageColumns
 * @function
 */
/**
 * Checks for the provided <code>sap.ui.table.Column</code> in the aggregation named <code>sourceMessageColumns</code> and returns its index if found or -1
 * otherwise.
 *
 * @param {sap.ui.table.Column}
 *            oSourceMessageColumn the sourceMessageColumn whose index is looked for.
 * @return {int} the index of the provided control in the aggregation if found, or -1 otherwise
 * @public
 * @name com.sap.it.spc.webui.mapping.MappingControl#indexOfSourceMessageColumn
 * @function
 */
/**
 * Destroys all the sourceMessageColumns in the aggregation named <code>sourceMessageColumns</code>.
 *
 * @return {com.sap.it.spc.webui.mapping.MappingControl} <code>this</code> to allow method chaining
 * @public
 * @name com.sap.it.spc.webui.mapping.MappingControl#destroySourceMessageColumns
 * @function
 */
/**
 * Getter for aggregation <code>targetMessageColumns</code>.<br/> The columns for target message
 *
 * @return {sap.ui.table.Column[]}
 * @public
 * @name com.sap.it.spc.webui.mapping.MappingControl#getTargetMessageColumns
 * @function
 */
/**
 * Inserts a targetMessageColumn into the aggregation named <code>targetMessageColumns</code>.
 *
 * @param {sap.ui.table.Column}
 *            oTargetMessageColumn the targetMessageColumn to insert; if empty, nothing is inserted
 * @param {int}
 *            iIndex the <code>0</code>-based index the targetMessageColumn should be inserted at; for a negative value of <code>iIndex</code>, the
 *            targetMessageColumn is inserted at position 0; for a value greater than the current size of the aggregation, the targetMessageColumn is inserted
 *            at the last position
 * @return {com.sap.it.spc.webui.mapping.MappingControl} <code>this</code> to allow method chaining
 * @public
 * @name com.sap.it.spc.webui.mapping.MappingControl#insertTargetMessageColumn
 * @function
 */
/**
 * Adds some targetMessageColumn <code>oTargetMessageColumn</code> to the aggregation named <code>targetMessageColumns</code>.
 *
 * @param {sap.ui.table.Column}
 *            oTargetMessageColumn the targetMessageColumn to add; if empty, nothing is inserted
 * @return {com.sap.it.spc.webui.mapping.MappingControl} <code>this</code> to allow method chaining
 * @public
 * @name com.sap.it.spc.webui.mapping.MappingControl#addTargetMessageColumn
 * @function
 */
/**
 * Removes an targetMessageColumn from the aggregation named <code>targetMessageColumns</code>.
 *
 * @param {int |
 *            string | sap.ui.table.Column} vTargetMessageColumn the targetMessageColumn to remove or its index or id
 * @return {sap.ui.table.Column} the removed targetMessageColumn or null
 * @public
 * @name com.sap.it.spc.webui.mapping.MappingControl#removeTargetMessageColumn
 * @function
 */
/**
 * Removes all the controls in the aggregation named <code>targetMessageColumns</code>.<br/> Additionally unregisters them from the hosting UIArea.
 *
 * @return {sap.ui.table.Column[]} an array of the removed elements (might be empty)
 * @public
 * @name com.sap.it.spc.webui.mapping.MappingControl#removeAllTargetMessageColumns
 * @function
 */
/**
 * Checks for the provided <code>sap.ui.table.Column</code> in the aggregation named <code>targetMessageColumns</code> and returns its index if found or -1
 * otherwise.
 *
 * @param {sap.ui.table.Column}
 *            oTargetMessageColumn the targetMessageColumn whose index is looked for.
 * @return {int} the index of the provided control in the aggregation if found, or -1 otherwise
 * @public
 * @name com.sap.it.spc.webui.mapping.MappingControl#indexOfTargetMessageColumn
 * @function
 */
/**
 * Destroys all the targetMessageColumns in the aggregation named <code>targetMessageColumns</code>.
 *
 * @return {com.sap.it.spc.webui.mapping.MappingControl} <code>this</code> to allow method chaining
 * @public
 * @name com.sap.it.spc.webui.mapping.MappingControl#destroyTargetMessageColumns
 * @function
 */
// -----------------------------------------------------------------------------
// Begin of Control Behavior, copied from Mapping.js
// -----------------------------------------------------------------------------
/**
 * Initializes the necessary variables
 */
com.sap.it.spc.webui.mapping.MappingControl.prototype.init = function () {
  this._oLayout = null;
  this._oMessageTables = {
    source: null,
    target: null,
  };
  this._oInformationTables = {
    mapping: null,
    search: {
      source: null,
      target: null,
      tab: {
        source: null,
        target: null,
      },
    },
  };
  this._oAreas = {
    graphical: null,
    informational: null,
    full: null,
  };
  this._oVisitors = {
    getChild: new com.sap.it.spc.webui.mapping.models.GetChildVisitor(),
    suggest: new com.sap.it.spc.webui.mapping.models.SuggestVisitor(),
    search: new com.sap.it.spc.webui.mapping.models.SearchVisitor(),
  };
  this._oSearchResults = {
    paths: {
      source: null,
      target: null,
    },
    focusedIndex: {
      source: null,
      target: null,
    },
  };
  this._oMinMaxIcon = null;
  this._sLibraryName = "com.sap.it.spc.webui.mapping";
  this._oResourceBundle = sap.ui
    .getCore()
    .getLibraryResourceBundle(this._sLibraryName);
  this._sDefaultImageSize = "8px";
  this._sDefaultCSSSize = "100%";
  this._sDefaultMessageSize = "40%";
  this._sDefaultMaxInfoSize = this.getInfoSectionSize();
  this._sDefaultMinInfoSize = "5%";
  this._bUserTrigger = true;
  this._sResizeListenerId = null;
  this.sourceRowSelected = [];
  this.targetRowSelected = [];
  this.mappingRowSelected = [];
  this.dirtyMappingId = [];
  this._oAreas.full = this._createFullArea();
  this.setAggregation("_layout", this._oAreas.full);
  this._oGraphicRenderer =
    new com.sap.it.spc.webui.mapping.internal.SVGRenderer();
};
com.sap.it.spc.webui.mapping.MappingControl.prototype.expandSourceStructure =
  function (expand) {
    this._expandMessageNodes(expand, "source");
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype.expandTargetStructure =
  function (expand) {
    this._expandMessageNodes(expand, "target");
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._expandMessageNodes =
  function (expand, tableType) {
    var oTable,
      i,
      aResult = [];
    if (tableType === "source") {
      oTable = this._getSourceTable();
    } else if (tableType === "target") {
      oTable = this._getTargetTable();
    } else {
      return;
    }
    if (expand !== true && expand !== false) {
      throw "Illegal Argument Error";
    }
    var oBinding = oTable.getBinding();
    var aContext = oBinding.getRootContexts();
    if (oBinding) {
      var fnLookup = function (aContext, oBinding) {
        $.each(aContext, function (i, oCtx) {
          fnLookup(oBinding.getNodeContexts(oCtx), oBinding);
          aResult.push(oCtx);
        });
      };
      fnLookup(aContext, oBinding);
    }
    if (!aResult) {
      return;
    }
    if (expand) {
      for (i = 0; i < aResult.length; i++) {
        oTable.expand(i);
      }
    } else {
      for (i = 0; i < aResult.length; i++) {
        oBinding.collapseContext(aContext[i]);
      }
    }
  };
/*
 * com.sap.it.spc.webui.mapping.MappingControl.prototype._subscribeLibraryEvents = function() {
 * window.MappingLibrary.EventBus.subscribe(window.MappingLibrary.Events.MAPPING_SELECT, this._highlightMappings, this);
 * window.MappingLibrary.EventBus.subscribe(window.MappingLibrary.Events.MAPPING_SELECT, this._updateSourceTable, this);
 * window.MappingLibrary.EventBus.subscribe(window.MappingLibrary.Events.MAPPING_SELECT, this._updateTargetTable, this);
 * window.MappingLibrary.EventBus.subscribe(window.MappingLibrary.Events.MAPPING_CREATE, this._onMappingCreate, this);
 * window.MappingLibrary.EventBus.subscribe(this.getEventChannelId(),window.MappingLibrary.Events.MAPPING_CREATE, this._onMappingCreateMine, this);
 *
 *
 * window.MappingLibrary.EventBus.subscribe(window.MappingLibrary.Events.MAPPING_UPDATE, this._onMappingUpdate, this);
 * window.MappingLibrary.EventBus.subscribe(window.MappingLibrary.Events.MAPPING_DELETE, this._onMappingDelete, this); //
 * this._attachLocalEvent(this._oLocalEvents.contentUpdate, // this._onContentUpdate); };
 */
com.sap.it.spc.webui.mapping.MappingControl.prototype._subscribeLibraryEvents =
  function () {
    window.MappingLibrary.EventBus.subscribe(
      this.getEventChannelId(),
      window.MappingLibrary.Events.MAPPING_SELECT,
      this._highlightMappings,
      this
    );
    window.MappingLibrary.EventBus.subscribe(
      this.getEventChannelId(),
      window.MappingLibrary.Events.MAPPING_SELECT,
      this._updateSourceTable,
      this
    );
    window.MappingLibrary.EventBus.subscribe(
      this.getEventChannelId(),
      window.MappingLibrary.Events.MAPPING_SELECT,
      this._updateTargetTable,
      this
    );
    window.MappingLibrary.EventBus.subscribe(
      this.getEventChannelId(),
      window.MappingLibrary.Events.MAPPING_CREATE,
      this._onMappingCreate,
      this
    );
    // window.MappingLibrary.EventBus.subscribe(this.getEventChannelId(),window.MappingLibrary.Events.MAPPING_CREATE, this._onMappingCreateMine, this);
    window.MappingLibrary.EventBus.subscribe(
      this.getEventChannelId(),
      window.MappingLibrary.Events.MAPPING_UPDATE,
      this._onMappingUpdate,
      this
    );
    window.MappingLibrary.EventBus.subscribe(
      this.getEventChannelId(),
      window.MappingLibrary.Events.MAPPING_DELETE,
      this._onMappingDelete,
      this
    ); // this._attachLocalEvent(this._oLocalEvents.contentUpdate,
    // this._onContentUpdate);
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._onMappingCreate =
  function (chId, evId, oData) {
    var oMapping, oTransformation;
    if (!oData || !oData.mapping) {
      return;
    }
    oMapping = oData.mapping;
    oTransformation = this.getTransformation();
    oTransformation.addMapping(oMapping);
    // fire mapping created event
    this._fireLibraryEvent(window.MappingLibrary.Events.MAPPING_CREATED, oData);
    // update UI
    this._drawMappings();
    this._setSelectedMapping(oMapping.id);
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._onMappingUpdate =
  function (chId, evId, oData) {
    var aPaths, sTableType, i, sQualifiedPath, sPath, oTransformation, oMapping;
    if (!oData || !oData.mapping) {
      return;
    }
    oMapping = oData.mapping;
    if (oData.xPath && oData.messageType && oData.updateType) {
      if (window.MappingLibrary.ENTITY_TYPE.SOURCE === oData.messageType) {
        sTableType = "source";
      } else if (
        window.MappingLibrary.ENTITY_TYPE.TARGET === oData.messageType
      ) {
        sTableType = "target";
      } else {
        return;
      }
      oTransformation = this.getTransformation();
      aPaths = oMapping[sTableType + "Paths"];
      if (
        window.MappingLibrary.MAPPING_UPDATE_TYPE.REMOVE === oData.updateType
      ) {
        sQualifiedPath = com.sap.it.spc.webui.mapping.utils.replacePrefixes(
          oData.xPath,
          oTransformation.getPrefixMap()
        );
        if (aPaths && aPaths.length === 1) {
          sPath = com.sap.it.spc.webui.mapping.utils.replacePrefixes(
            aPaths[0],
            oTransformation.getPrefixMap()
          );
          if (sPath === sQualifiedPath) {
            this._onMappingDelete.apply(this, arguments);
          }
          return;
        }
        for (i = aPaths.length - 1; i > -1; i--) {
          sPath = com.sap.it.spc.webui.mapping.utils.replacePrefixes(
            aPaths[i],
            oTransformation.getPrefixMap()
          );
          if (sPath === sQualifiedPath) {
            aPaths.splice(i, 1);
            break;
          }
        }
      } else if (
        window.MappingLibrary.MAPPING_UPDATE_TYPE.ADD === oData.updateType
      ) {
        aPaths = oMapping[sTableType + "Paths"];
        aPaths.push(oData.xPath);
      }
    }
    // fire mapping updated event
    this._fireLibraryEvent(window.MappingLibrary.Events.MAPPING_UPDATED, oData);
    // update UI
    this._drawMappings();
    this._setSelectedMapping(oMapping.id);
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._onMappingDelete =
  function (chId, evId, oData) {
    var aMappings, oMapping, iMappingIndex;
    if (!oData || !oData.mapping) {
      return;
    }
    oMapping = oData.mapping;
    iMappingIndex = this.getTransformation().indexOfMapping(oMapping.id);
    aMappings = this.getTransformation().getMappings();
    aMappings.splice(iMappingIndex, 1);
    // fire mapping deleted event
    this._fireLibraryEvent(window.MappingLibrary.Events.MAPPING_DELETED, oData);
    // update UI
    this.clearSelection();
    this._drawMappings();
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype.getInfoSectionSize =
  function () {
    var size,
      oLayout = this.getAggregation("_layout");
    if (oLayout && this.getShowInfoSection()) {
      size = oLayout.getSplitterPosition();
      return 100 - parseInt(size, 10) + "%";
    } else {
      return this.getProperty("infoSectionSize");
    }
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype.setInfoSectionSize =
  function (pSize) {
    var size, oLayout;
    this.setProperty("infoSectionSize", pSize);
    if (this.getShowInfoSection()) {
      size = 100 - parseInt(pSize, 10);
      oLayout = this.getAggregation("_layout");
      if (size !== parseInt(oLayout.getSplitterPosition(), 10)) {
        oLayout.setSplitterPosition(size + "%");
      }
    }
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype.setEnableConstantAssignment =
  function (bValue) {
    var bPrevValue = this.getEnableConstantAssignment();
    this.setProperty("enableConstantAssignment", bValue);
    if (bValue !== bPrevValue) {
      this._oConstantTextField.setVisible(bValue);
    }
  };
/**
 * @param sImageName
 * @returns source of the image
 */
com.sap.it.spc.webui.mapping.MappingControl.prototype._getImageSource =
  function (sImageName) {
    var sThemeName = sap.ui.getCore().getConfiguration().getTheme();
    var oImageSource = jQuery.sap.getModulePath(
      this._sLibraryName,
      "/themes/" + sThemeName + "/img/" + sImageName
    );
    return oImageSource;
  };
/**
 * Creates the message structure (ui)
 *
 * @returns
 */
com.sap.it.spc.webui.mapping.MappingControl.prototype._createMessageTable =
  function () {
    var oMessageTable,
      oMappingInfoIcon,
      oTagText,
      oSearchField,
      oHierarchyColumn;
    var oResourceBundle = this._oResourceBundle;
    oMappingInfoIcon = new sap.ui.commons.Image({
      width: this._sDefaultImageSize,
      height: this._sDefaultImageSize,
    });
    oMappingInfoIcon.addStyleClass("webuiMappingInfoIcon");
    jQuery.sap.require("sap.ui.commons.TextView");
    oTagText = new sap.ui.commons.TextView({
      width: this._sDefaultCSSSize,
      text: "{tag}",
    });
    jQuery.sap.require("sap.ui.commons.layout.HorizontalLayout");
    oHierarchyColumn = new sap.ui.commons.layout.HorizontalLayout({
      width: this._sDefaultCSSSize,
      content: [oMappingInfoIcon, oTagText],
    });
    oHierarchyColumn.addStyleClass("webuiTagInfo");
    oMessageTable = new com.sap.it.spc.webui.mapping.MessageTreeTable({
      visibleRowCountMode: "Auto",
      selectionBehavior: "RowOnly",
      expandFirstLevel: true,
      enableColumnReordering: false,
    });
    var oTagColumn = new sap.ui.table.Column({
      label: oResourceBundle.getText("MC_MESSAGE_TAG"),
      template: oHierarchyColumn,
    });
    oMessageTable.addColumn(oTagColumn);
    if (this.getEnableSearchBox()) {
      jQuery.sap.require("com.sap.it.spc.webui.mapping.ExtSearchField");
      oSearchField = new com.sap.it.spc.webui.mapping.ExtSearchField({
        width: this._sDefaultCSSSize,
        showListExpander: false,
        enableClear: true,
        enableCache: false,
        showNavigationButtons: false,
      });
      // oSearchField.attachSuggest(this._onSuggest, this);
      oSearchField.attachSearch(this._onSearch, this);
      oSearchField.attachNext(this._onSearchNext, this);
      oSearchField.attachPrev(this._onSearchPrev, this);
      oSearchField.attachClear(this._onClearSearch, this);
      oSearchField.addStyleClass("webuiSearchField");
      oMessageTable.addExtension(oSearchField);
    }
    oMessageTable.addStyleClass("webuiMessage");
    oMessageTable.setModel(this._createModel(null));
    // oMessageTable.bindRows("/");
    oMessageTable.attachRowSelectionChange(
      this._onMessageRowSelectionChange,
      this
    );
    oMessageTable.attachContentUpdate(this._onContentUpdate, this);
    oMessageTable.addDelegate(
      { onBeforeRendering: this._adjustMessageColumnsForFirstTime },
      oMessageTable
    );
    oMessageTable.addDelegate(
      { onAfterRendering: this._onMouseOverMessageTableRow },
      this
    );
    oMessageTable.addDelegate(
      { onAfterRendering: this._onRightClickMessageTableRow },
      this
    );
    return oMessageTable;
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._adjustMessageColumnsForFirstTime =
  function () {
    var aColumns = this.getColumns(),
      givenSum = 0,
      givenCount = 0,
      remainingForEachCol,
      i,
      sColWidth;
    if (!!aColumns[0].data("width")) {
      return;
    }
    for (i = aColumns.length - 1; i > -1; i--) {
      sColWidth = aColumns[i].data("width");
      if (!!sColWidth) {
        givenCount++;
        givenSum += parseInt(sColWidth, 10);
      }
    }
    remainingForEachCol = (100 - givenSum) / (aColumns.length - givenCount);
    for (i = aColumns.length - 1; i > -1; i--) {
      sColWidth = aColumns[i].data("width");
      if (!sColWidth) {
        aColumns[i].setWidth(remainingForEachCol + "%");
        aColumns[i].data("width", remainingForEachCol);
      } else {
        aColumns[i].setWidth(sColWidth);
        aColumns[i].data("width", sColWidth);
      }
    }
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._onMessageRowSelectionChange =
  function (oEvent) {
    var i,
      oData,
      oMessageTable,
      sMessageType,
      iCurrentIndex,
      sXPath,
      oContext,
      aSelectedIndices,
      bSelected,
      aChangedIndices,
      aSelectedNodes,
      bExecuteDefault,
      selectedIndicesSource,
      selectedIndicesTarget;
    this._fireLibraryEvent(window.MappingLibrary.Events.NODE_SELECT, oEvent);
    if (this._bUserTrigger) {
      oMessageTable = oEvent.getSource();
      sMessageType = oMessageTable.data("messageType");
      iCurrentIndex = oEvent.mParameters.rowIndex;
      aChangedIndices = oEvent.mParameters.rowIndices;
      aSelectedIndices = oMessageTable.getSelectedIndices();
      bSelected =
        aChangedIndices.indexOf(iCurrentIndex) !== -1 &&
        aSelectedIndices.indexOf(iCurrentIndex) !== -1;
      if (bSelected) {
        oContext = oEvent.mParameters.rowContext;
        if (oContext) {
          aSelectedNodes = [];
          selectedIndicesSource = this._getSourceTable().getSelectedIndices();
          selectedIndicesTarget = this._getTargetTable().getSelectedIndices();
          for (i = 0; i < selectedIndicesSource.length; i++) {
            aSelectedNodes.push(
              this._getSourceTable()
                .getContextByIndex(selectedIndicesSource[i])
                .getObject()
            );
          }
          for (i = 0; i < selectedIndicesTarget.length; i++) {
            aSelectedNodes.push(
              this._getTargetTable()
                .getContextByIndex(selectedIndicesTarget[i])
                .getObject()
            );
          }
          bExecuteDefault = this.fireNodeSelectionChange({
            entityType:
              sMessageType === "source"
                ? window.MappingLibrary.ENTITY_TYPE.SOURCE
                : window.MappingLibrary.ENTITY_TYPE.TARGET,
            node: oContext.getObject(),
            selectedNodes: aSelectedNodes,
          });
          if (bExecuteDefault) {
            oData = {};
            oData.source = oMessageTable;
            sXPath = oContext.getProperty("xpath");
            this._aSelectedMappingIDs = oData.mappingIds = this._getMappingIds(
              sXPath,
              sMessageType
            );
            this._fireLibraryEvent(
              window.MappingLibrary.Events.MAPPING_SELECT,
              oData
            );
          }
        }
      } else {
        this._fireLibraryEvent(window.MappingLibrary.Events.MAPPING_SELECT, {});
      }
    }
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._getMappingIds =
  function (sXPath, sMessageType) {
    var oTransformation = this.getTransformation(),
      aMappings = [],
      aMappingIds = [];
    aMappings = oTransformation.getMappings(sXPath, sMessageType);
    aMappings.forEach(function (oMapping) {
      if (aMappingIds.indexOf(oMapping.getId()) === -1) {
        aMappingIds.push(oMapping.getId());
      }
    }, this);
    return aMappingIds;
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._createModel = function (
  data
) {
  var oModel;
  oModel = new sap.ui.model.json.JSONModel();
  oModel.setData(data);
  return oModel;
};
com.sap.it.spc.webui.mapping.MappingControl.prototype._getSourceTable =
  function () {
    var oSourceTable;
    if (!this._oMessageTables.source) {
      oSourceTable = this._createMessageTable();
      oSourceTable.bindRows(this.getSourceMessagePath());
      oSourceTable.addStyleClass("webuiSourceMessage");
      oSourceTable.data("messageType", "source");
    } else {
      oSourceTable = this._oMessageTables.source;
    }
    this._oMessageTables.source = oSourceTable;
    return oSourceTable;
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype.removeSourceMessageFilter =
  function () {
    this._getSourceTable().getBinding().filter([]);
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype.removeTargetMessageFilter =
  function () {
    this._getTargetTable().getBinding().filter([]);
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype.setSourceMessageFilter =
  function (aFilters, bAnd) {
    if (aFilters.length !== 0) {
      this._getSourceTable()
        .getBinding()
        .filter([
          new sap.ui.model.Filter({
            aFilters: aFilters,
            bAnd: bAnd,
          }),
        ]);
    }
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype.setTargetMessageFilter =
  function (aFilters, bAnd) {
    if (aFilters.length !== 0) {
      this._getTargetTable()
        .getBinding()
        .filter(
          new sap.ui.model.Filter({
            aFilters: aFilters,
            bAnd: bAnd,
          })
        );
    }
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype.addSourceMessageColumns =
  function (aColumns) {
    var oMessage, i, oColumn;
    oMessage = this._getSourceTable();
    if (aColumns instanceof Array) {
      for (i = 0; i < aColumns.length; i++) {
        if (aColumns[i].filterProperty) {
          oColumn = new sap.ui.table.Column({
            label: aColumns[i].label,
            template: aColumns[i].template,
            filterProperty: aColumns[i].filterProperty,
          });
        } else {
          oColumn = new sap.ui.table.Column({
            label: aColumns[i].label,
            template: aColumns[i].template,
          });
        }
        oColumn.data("width", aColumns[i].width);
        oMessage.addColumn(oColumn);
      }
    } else {
      if (aColumns.filterProperty) {
        oColumn = new sap.ui.table.Column({
          label: aColumns.label,
          template: aColumns.template,
          filterProperty: aColumns.filterProperty,
        });
      } else {
        oColumn = new sap.ui.table.Column({
          label: aColumns.label,
          template: aColumns.template,
        });
      }
      oColumn.data("width", aColumns.width);
      oMessage.addColumn(oColumn);
    }
    return this;
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype.addTargetMessageColumns =
  function (aColumns) {
    var oMessage, i, oColumn;
    oMessage = this._getTargetTable();
    if (aColumns instanceof Array) {
      for (i = 0; i < aColumns.length; i++) {
        if (aColumns[i].filterProperty) {
          oColumn = new sap.ui.table.Column({
            label: aColumns[i].label,
            template: aColumns[i].template,
            filterProperty: aColumns[i].filterProperty,
          });
        } else {
          oColumn = new sap.ui.table.Column({
            label: aColumns[i].label,
            template: aColumns[i].template,
          });
        }
        oColumn.data("width", aColumns[i].width);
        oMessage.addColumn(oColumn);
      }
    } else {
      if (aColumns.filterProperty) {
        oColumn = new sap.ui.table.Column({
          label: aColumns.label,
          template: aColumns.template,
          filterProperty: aColumns.filterProperty,
        });
      } else {
        oColumn = new sap.ui.table.Column({
          label: aColumns.label,
          template: aColumns.template,
        });
      }
      oColumn.data("width", aColumns.width);
      oMessage.addColumn(oColumn);
    }
    return this;
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._getTargetTable =
  function () {
    var oTargetTable;
    if (!this._oMessageTables.target) {
      oTargetTable = this._createMessageTable();
      oTargetTable.bindRows(this.getTargetMessagePath());
      oTargetTable.addStyleClass("webuiTargetMessage");
      oTargetTable.data("messageType", "target");
      oTargetTable.addDelegate(
        { onAfterRendering: this._attachTargetRowContextMenu },
        this
      );
    } else {
      oTargetTable = this._oMessageTables.target;
    }
    this._oMessageTables.target = oTargetTable;
    return oTargetTable;
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._attachTargetRowContextMenu =
  function () {
    var that = this,
      oAssignConstant,
      oContextMenu,
      oTable;
    if (this.getEnableConstantAssignment()) {
      oAssignConstant = new sap.ui.commons.MenuItem({
        text: this._oResourceBundle.getText("MENU_ITEM_ASSIGN_CONSTANT"),
      });
      oContextMenu = new sap.ui.commons.Menu({
        ariaDescription: "Context Menu",
        items: oAssignConstant,
      });
      oTable = this._getTargetTable();
      this.$()
        .find(".webuiTargetMessage tr")
        .contextmenu(function (event) {
          var targetXPath, eDock, iRowIndex, oRowContext;
          if (that.getEnableConstantAssignment()) {
            event.preventDefault();
            event.stopImmediatePropagation();
            iRowIndex = parseInt(this.getAttribute("data-sap-ui-rowindex"), 10);
            iRowIndex += oTable.getFirstVisibleRow();
            oRowContext = oTable.getContextByIndex(iRowIndex);
            if (!oRowContext) {
              return;
            }
            targetXPath = that
              ._getTargetTable()
              .getContextByIndex(iRowIndex)
              .getProperty("xpath");
            if (
              that._isXPathPartOfMapping(
                targetXPath,
                oTable.data("messageType")
              )
            ) {
              return;
            }
            eDock = sap.ui.core.Popup.Dock;
            oAssignConstant.detachSelect(that._onAssignConstantFunction, that);
            oAssignConstant.attachSelect(
              {
                y: event.clientY,
                x: event.clientX,
                targetXPath: targetXPath,
              },
              that._onAssignConstantFunction,
              that
            );
            oContextMenu.open(false, null, eDock.RightTop, eDock.LeftTop, this);
            oContextMenu.$().css({
              left: event.clientX + "px",
              top: event.clientY + "px",
              width: "120px",
            });
          }
        });
    }
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._onAssignConstantFunction =
  function (oEvent, data) {
    // var computed;
    // to get the height from canvas start
    // $drawArea = this._getGraphicalArea().getCenter().$();
    // $drawArea.height()
    // computed = data.y - 90;
    // var $constantField = this._oConstantTextField.$();
    // $constantField.css({
    // "visibility" : "visible",
    // "top" : computed + "px",
    // "left" : "210px"
    // });
    // this._oConstantTextField.data("targetXPath", data.targetXpath);
    this._createConstantMapping("", data.targetXPath);
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._createConstantMapping =
  function (sValue, sTargetXPath) {
    var mapping;
    sValue = sValue || this._oConstantTextField.getValue();
    sTargetXPath = sTargetXPath || this._oConstantTextField.data("targetXPath");
    mapping = new com.sap.it.spc.webui.mapping.models.MappingModel(
      "_new_constant_mapping" + Math.ceil(Math.random() * Math.pow(10, 10))
    );
    mapping.addTargetPath(sTargetXPath);
    mapping.setConstantValue(sValue);
    mapping.fn = { expression: 'const("' + sValue + '")' };
    this._fireLibraryEvent(window.MappingLibrary.Events.MAPPING_CREATE, {
      mapping: mapping,
    });
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._createGraphicalArea =
  function () {
    // INFO: Graphical area contains: A source message, a target message and the
    // connection area
    var oGraphicalArea, oSourceTable, oTargetTable;
    // Get the source and target message structures
    oSourceTable = this._getSourceTable();
    oTargetTable = this._getTargetTable();
    this._oConstantTextField = new sap.ui.commons.TextField({
      visible: this.getEnableConstantAssignment() && this.getEditMode(),
    }).addStyleClass("webuiConstantField");
    this._oConstantTextField.attachChange(this._createConstantMapping, this);
    oGraphicalArea = new sap.ui.commons.layout.BorderLayout({
      width: this._sDefaultCSSSize,
      height: this._sDefaultCSSSize,
      begin: new sap.ui.commons.layout.BorderLayoutArea({
        size: this._sDefaultMessageSize,
        content: oSourceTable,
      }),
      center: new sap.ui.commons.layout.BorderLayoutArea({
        content: this._oConstantTextField,
      }),
      end: new sap.ui.commons.layout.BorderLayoutArea({
        size: this._sDefaultMessageSize,
        content: oTargetTable,
      }),
    });
    oGraphicalArea.addStyleClass("webuiGraphicalArea");
    return oGraphicalArea;
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._getGraphicalArea =
  function () {
    if (!this._oAreas.graphical) {
      this._oAreas.graphical = this._createGraphicalArea();
    }
    return this._oAreas.graphical;
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._createInfoArea =
  function () {
    // INFO: Informational area contains a strip of tabs about mapping
    // information, search results of both source and target message
    // structures
    // INFO: The tabs containing search results appear only when a query happens
    // in respective structures and disappears once the query is
    // cleared
    this.oInfoArea = new sap.m.IconTabBar({
      width: this._sDefaultCSSSize,
      height: this._sDefaultCSSSize,
      expandable: false,
      expanded: true,
    });
    this.oInfoArea.addStyleClass("webuiInfoArea");
    return this.oInfoArea;
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._getInfoArea =
  function () {
    if (!this._oAreas.informational) {
      this._oAreas.informational = this._createInfoArea();
    }
    return this._oAreas.informational;
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._createFullArea =
  function () {
    var oFullArea, oGraphicalArea, oInfoArea, oMinMaxIcon, that;
    oGraphicalArea = this._getGraphicalArea();
    oInfoArea = this._getInfoArea();
    oMinMaxIcon = new sap.ui.commons.Image();
    oMinMaxIcon.addStyleClass("webuiMinMaxIcon");
    oMinMaxIcon.attachPress(this._toggleInfoSectionSize, this);
    // oMinMaxIcon.setSrc(this._getImageSource("maximize.png"));
    oMinMaxIcon.setTooltip(this._oResourceBundle.getText("MC_MAXIMIZE"));
    that = this;
    this._sResizeListenerId = sap.ui.core.ResizeHandler.register(
      oInfoArea,
      function () {
        var pSize = that.getInfoSectionSize();
        if (parseInt(pSize, 10) <= 5) {
          // that._oMinMaxIcon.setSrc(that._getImageSource("maximize.png"));
          that._oMinMaxIcon.setTooltip(
            that._oResourceBundle.getText("MC_MAXIMIZE")
          );
        } else {
          // that._oMinMaxIcon.setSrc(that._getImageSource(""));
          // that._oMinMaxIcon.setSrc(that._getImageSource("minimize.png"));
          that._oMinMaxIcon.setTooltip(
            that._oResourceBundle.getText("MC_MINIMIZE")
          );
        }
      }
    );
    this._oMinMaxIcon = oMinMaxIcon;
    oFullArea = new sap.ui.commons.Splitter({
      height: this._sDefaultCSSSize,
      splitterOrientation: "Horizontal",
      splitterPosition: "100%",
      minSizeFirstPane: "100%",
      firstPaneContent: oGraphicalArea,
      secondPaneContent: [oInfoArea, oMinMaxIcon],
      showScrollBars: false,
      splitterBarVisible: false,
    });
    return oFullArea;
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._getFullArea =
  function () {
    if (!this._oAreas.full) {
      this._oAreas.full = this._createFullArea();
    }
    return this._oAreas.full;
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype.setShowInfoSection =
  function (bShowInfoSection) {
    var oFullArea;
    if (bShowInfoSection !== this.getShowInfoSection()) {
      oFullArea = this._getFullArea();
      if (bShowInfoSection) {
        oFullArea.setSplitterPosition(
          100 - parseInt(this.getInfoSectionSize(), 10) + "%"
        );
        oFullArea.setMinSizeFirstPane("0%");
        oFullArea.setMinSizeSecondPane("5%");
      } else {
        oFullArea.setSplitterPosition("100%");
        oFullArea.setMinSizeFirstPane("100%");
      }
      oFullArea.setSplitterBarVisible(bShowInfoSection);
    }
    this.setProperty("showInfoSection", bShowInfoSection);
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype.setTransformation =
  function (oTransformation) {
    var oMessageData,
      oSourceRootNode = null,
      oTargetRootNode = null;
    this.setAggregation("transformation", oTransformation);
    oMessageData = oTransformation.getSourceMessage();
    if (oMessageData) {
      oSourceRootNode = oMessageData.getRootNode();
      if (oSourceRootNode && !oSourceRootNode.xpath) {
        com.sap.it.spc.webui.mapping.utils.addXPaths(oSourceRootNode);
      }
    }
    oMessageData = oTransformation.getTargetMessage();
    if (oMessageData) {
      oTargetRootNode = oMessageData.getRootNode();
      if (oTargetRootNode && !oTargetRootNode.xpath) {
        com.sap.it.spc.webui.mapping.utils.addXPaths(oTargetRootNode);
      }
    }
    this._oVisitors.getChild.setPrefixMap(oTransformation.getPrefixMap());
    this.refreshUI();
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype.refreshUI = function () {
  var oMessageTable, oTransformation;
  oTransformation = this.getTransformation();
  oMessageTable = this._getSourceTable();
  oMessageTable.getModel().setData(oTransformation.getSourceMessage());
  oMessageTable = this._getTargetTable();
  oMessageTable.getModel().setData(oTransformation.getTargetMessage());
  this._drawMappings();
};
com.sap.it.spc.webui.mapping.MappingControl.prototype.onBeforeRendering =
  function () {
    this._bRendered = false;
    this._unsubscribeLibraryEvents();
    this._subscribeLibraryEvents(); // Change default model binding size from 100 to 1000
    /*
     * if (!!this._getSourceTable()) {
     *
     * this._getSourceTable().getBinding("rows").getModel().setSizeLimit(1000); }
     *
     * if (!!this._getTargetTable()) {
     *
     * this._getTargetTable().getBinding("rows").getModel().setSizeLimit(1000); }
     *  // Expand rows to first child [if present] by default this._expandToFirstChild(this._getSourceTable());
     * this._expandToFirstChild(this._getTargetTable());
     */
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._expandToFirstChild =
  function (table) {
    var rootContext, i, context, oBinding;
    oBinding = table.getBinding();
    if (oBinding) {
      rootContext = oBinding.getRootContexts();
      for (i = 0; i < rootContext.length; i++) {
        context = rootContext[i];
        if (context) {
          oBinding.expandContext(context);
        }
      }
    }
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._getRowIndex = function (
  oMessageTable,
  sXPath
) {
  var iLevel = 0,
    i,
    sTemp,
    oContext,
    iTemp,
    oBinding,
    oPrefixMap;
  oBinding = oMessageTable.getBinding("rows");
  oPrefixMap = this.getTransformation().getPrefixMap();
  sXPath = com.sap.it.spc.webui.mapping.utils.replacePrefixes(
    sXPath,
    oPrefixMap
  );
  for (i = 0; i < oBinding.getLength(); i++) {
    oContext = oMessageTable.getContextByIndex(i);
    sTemp = com.sap.it.spc.webui.mapping.utils.replacePrefixes(
      oContext.getProperty("xpath"),
      oPrefixMap
    );
    if (sXPath === sTemp) {
      return i;
    } else if (sXPath.indexOf(sTemp) !== -1) {
      //iTemp = oBinding.getLevel(oContext);
      if (!oBinding.isExpanded(i)) {
        //iLevel = iTemp;
        oBinding.expand(i);
      }
    }
  }
};
com.sap.it.spc.webui.mapping.MappingControl.prototype._getRowIndices =
  function (oMessageTable, aXPaths) {
    var aRowIndices = [],
      iRowIndex;
    if (!aXPaths) {
      return aRowIndices;
    }
    aXPaths.forEach(function (sXPath) {
      iRowIndex = this._getRowIndex(oMessageTable, sXPath);
      if (
        iRowIndex !== undefined &&
        jQuery.inArray(iRowIndex, aRowIndices) === -1
      ) {
        aRowIndices.push(iRowIndex);
      }
    }, this);
    return aRowIndices;
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._setFirstVisibleRow =
  function (oMessageTable, aRowIndices) {
    var i,
      iStartIndex,
      iEndIndex,
      iNoOfRows = oMessageTable.getVisibleRowCount();
    var sum = 0,
      average,
      divider = 0;
    if (!aRowIndices || aRowIndices.length === 0) {
      return;
    }
    if (typeof aRowIndices === "number") {
      average = aRowIndices;
    } else if (aRowIndices instanceof Array) {
      if (aRowIndices.length === 0) {
        return;
      }
      iEndIndex = aRowIndices[0] + iNoOfRows;
      for (i = 0; i < aRowIndices.length; i++) {
        if (aRowIndices[i] < iEndIndex) {
          sum += aRowIndices[i];
          divider++;
        }
      }
      average = sum / divider;
    } else {
      return;
    }
    // Vertically center the rows
    iStartIndex = Math.floor(average - iNoOfRows / 2);
    oMessageTable.setFirstVisibleRow(iStartIndex);
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._updateTable = function (
  oTable,
  oData
) {
  var oSource,
    aRowIndices,
    aXPaths,
    isVisible = false,
    i;
  var iFirstVisibleIndex, iLastVisibleIndex;
  if (!this._bUserTrigger) {
    return this;
  }
  this._bUserTrigger = false;
  oSource = oData.source;
  this._aSelectedMappingIDs = oData.mappingIds;
  if (!oData.mappingIds || oData.mappingIds.length === 0) {
    if (oSource !== oTable) {
      oTable.clearSelection();
    }
    this._bUserTrigger = true;
    return;
  }
  iFirstVisibleIndex = oTable.getFirstVisibleRow();
  iLastVisibleIndex = iFirstVisibleIndex + oTable.getRows().length - 1;
  aXPaths = com.sap.it.spc.webui.mapping.utils.getXPathsInMappings(
    oTable.data("messageType"),
    oData.mappingIds,
    this.getTransformation()
  );
  aRowIndices = this._getRowIndices(oTable, aXPaths, true);
  if (aRowIndices.length !== 0 || oSource !== oTable) {
    oTable.clearSelection();
  }
  for (i = 0; i < aRowIndices.length; i++) {
    oTable.addSelectionInterval(aRowIndices[i], aRowIndices[i]);
    if (
      aRowIndices[i] >= iFirstVisibleIndex &&
      aRowIndices[i] <= iLastVisibleIndex
    ) {
      isVisible = true;
    }
  }
  if (oSource !== oTable && !isVisible) {
    this._setFirstVisibleRow(oTable, aRowIndices);
  }
  this._highlightMappings();
  this._bUserTrigger = true;
};
com.sap.it.spc.webui.mapping.MappingControl.prototype._updateSourceTable =
  function (sChannelId, sEventId, oData) {
    this._updateTable(this._getSourceTable(), oData);
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._updateTargetTable =
  function (sChannelId, sEventId, oData) {
    this._updateTable(this._getTargetTable(), oData);
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._getInfoIndices =
  function (sXPath, sMessageType, oInfo) {
    var oBinding,
      aContexts,
      aIndices = [],
      sPath,
      oPrefixMap;
    oPrefixMap = this.getTransformation().getPrefixMap();
    sXPath = com.sap.it.spc.webui.mapping.utils.replacePrefixes(
      sXPath,
      oPrefixMap
    );
    oBinding = oInfo.getBinding("rows");
    if (!oBinding) {
      return aIndices;
    }
    aContexts = oBinding.getContexts();
    aContexts.forEach(function (oContext, iIndex) {
      oContext.getProperty(sMessageType).forEach(function (oNode) {
        sPath = com.sap.it.spc.webui.mapping.utils.replacePrefixes(
          oNode.xpath,
          oPrefixMap
        );
        if (sPath === sXPath) {
          aIndices.push(iIndex);
        }
      }, this);
    }, this);
    return aIndices;
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._updateSearchInfoVisibility =
  function (oMessageTable) {
    var sMessageType,
      oSearchInfoTable,
      aIndices,
      $SearchInfo,
      iFocusedIndex,
      oContext,
      sXPath,
      oInfoArea,
      iTabIndex,
      iStartIndex;
    sMessageType = oMessageTable.data("messageType");
    oSearchInfoTable = this._getSearchInfoTable(sMessageType);
    iStartIndex = oSearchInfoTable.getFirstVisibleRow();
    $SearchInfo = oSearchInfoTable.$();
    iFocusedIndex = this._getFocusedSearchResult(sMessageType);
    oContext = oMessageTable.getContextByIndex(iFocusedIndex);
    if (!oContext) {
      return;
    }
    sXPath = oContext.getProperty("xpath");
    aIndices = this._getInfoIndices(sXPath, sMessageType, oSearchInfoTable);
    if (aIndices.length > 0) {
      $SearchInfo.find(".sapUiTableTr").each(function (iIndex, oElement) {
        var iRowIndex;
        $(this).removeClass("webuiSearchResultFocusedInfo");
        iRowIndex = iStartIndex + iIndex;
        if ($.inArray(iRowIndex, aIndices) !== -1) {
          $(this).addClass("webuiSearchResultFocusedInfo");
        }
      });
    }
    oInfoArea = this._getInfoArea();
    iTabIndex = oInfoArea.indexOfTab(oSearchInfoTable.getParent());
    oInfoArea.setSelectedIndex(iTabIndex);
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._updateSearchResultsVisibility =
  function (oMessageTable) {
    var sMessageType, iStartIndex, iFocusedIndex, iRowIndex, aIndices, $Table;
    sMessageType = oMessageTable.data("messageType");
    iStartIndex = oMessageTable.getFirstVisibleRow();
    iFocusedIndex = this._getFocusedSearchResult(sMessageType);
    $Table = oMessageTable.$();
    aIndices = this._getRowIndices(
      oMessageTable,
      this._oSearchResults.paths[sMessageType]
    );
    if (aIndices.length > 0) {
      $Table.find(".sapUiTableTr").each(function (iIndex, oElement) {
        $(this).removeClass("webuiSearchResult");
        $(this).removeClass("webuiSearchResultFocused");
        iRowIndex = iStartIndex + iIndex;
        if ($.inArray(iRowIndex, aIndices) !== -1) {
          $(this).addClass("webuiSearchResult");
        }
        if (iRowIndex === iFocusedIndex) {
          $(this).addClass("webuiSearchResultFocused");
        }
      });
    }
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._deleteSelectedMapping =
  function () {
    this._confirmDelete("deleteMapping");
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._getSelectedMapping =
  function () {
    var sMappingId = null;
    if (this._aSelectedMappingIDs && this._aSelectedMappingIDs.length > 0) {
      sMappingId = this._aSelectedMappingIDs[0];
    }
    if (sMappingId) {
      return this.getTransformation().getMapping(sMappingId);
    }
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._onContentUpdate =
  function (oEvent) {
    var oTable,
      oSourceTable,
      iStartIndex,
      aRows,
      i,
      aUserClasses,
      oContext,
      oPresentation,
      oBinding;
    oTable = oEvent.oSource || oEvent.source;
    if (this.getEnableSearchBox()) {
      this._updateSearchResultsVisibility(oTable);
      this._updateSearchInfoVisibility(oTable);
    }
    oSourceTable = this._getSourceTable();
    // handling for presentation
    if (this._mPresenterRegistry && this._mPresenterRegistry.listener) {
      iStartIndex = oTable.getFirstVisibleRow();
      oBinding = oTable.getBinding();
      aRows = oTable.getRows();
      for (i = aRows.length - 1; i > -1; i--) {
        aUserClasses = aRows[i].data("_user-classes");
        if (aUserClasses && aUserClasses.length > 0) {
          aRows[i].$().removeClass(aUserClasses.join(" "));
        }
        aRows[i].$().find(".webuiMappingInfoIcon").css("visibility", "hidden");
        aRows[i].$().attr("title", "");
        oContext = oTable.getContextByIndex(i + iStartIndex);
        if (oContext) {
          oPresentation = this._mPresenterRegistry.listener.call(
            this._mPresenterRegistry.context || this,
            oContext.getObject(),
            oTable === oSourceTable
              ? window.MappingLibrary.ENTITY_TYPE.SOURCE
              : window.MappingLibrary.ENTITY_TYPE.TARGET,
            { expanded: oBinding.isExpanded(i + iStartIndex) }
          );
          if (
            oPresentation instanceof
            com.sap.it.spc.webui.mapping.models.PresentationModel
          ) {
            aUserClasses = oPresentation.getClasses();
            aRows[i].data("_user-classes", aUserClasses);
            if (aUserClasses && aUserClasses.length > 0) {
              aRows[i].$().addClass(aUserClasses.join(" "));
            }
            if (oPresentation.getIconSrc()) {
              aRows[i]
                .$()
                .find(".webuiMappingInfoIcon")
                .attr({
                  src: oPresentation.getIconSrc(),
                  title: oPresentation.getIconTooltip() || "",
                })
                .css("visibility", "visible");
            }
            if (oPresentation.getTooltip()) {
              aRows[i].$().attr("title", oPresentation.getTooltip());
            }
          } else if (oPresentation) {
            jQuery.sap.log.error(
              oPresentation,
              "is not an instance of com.sap.it.spc.webui.mapping.models.PresentationModel"
            ); // throw exception
          }
        }
      }
    }
    if (this._bRendered !== true) {
      return;
    }
    this._drawMappings();
    this._highlightMappings();
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._highlightMappings =
  function (chId, evId, data) {
    var aMappingIds = null;
    this._oSelectedConnection = null;
    if (data) {
      aMappingIds = data.mappingIds;
    } else {
      aMappingIds = this._aSelectedMappingIDs;
    }
    this._oGraphicRenderer.clearHighlight();
    if (!aMappingIds || aMappingIds.length === 0) {
      return;
    }
    this._aSelectedMappingIDs = aMappingIds;
    this._oGraphicRenderer.highlight(aMappingIds);
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._setupKeyPressActions =
  function () {
    var that = this,
      $ga;
    $ga = this._getGraphicalArea().getCenter().$();
    $ga.attr("tabindex", 0);
    $ga.keyup(function (e) {
      if (!!that.getEditMode()) {
        if (e.keyCode === 46) {
          // Delete
          e.stopImmediatePropagation();
          if (that._oSelectedConnection) {
            that._confirmDelete(null, "connection");
          } else if (that._aSelectedMappingIDs) {
            that._confirmDelete(null, "mapping");
          }
        }
      }
    });
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype.scrollDown = function (
  oEvent
) {
  var that = this,
    previewPoint = {},
    $this = this.$();
  var $ga,
    $source,
    $target,
    $canvas,
    iSourceStart,
    iSourceEnd,
    iTragetStart,
    iTargetEnd;
  $ga = $this.find(".webuiGraphicalArea");
  $source = $ga.find(".sapUiBorderLayoutBegin");
  $target = $ga.find(".sapUiBorderLayoutEnd");
  $canvas = $ga.find(".sapUiBorderLayoutCenter");
  iSourceStart = $source.offset().left;
  iSourceEnd = iSourceStart + $source.width();
  iTragetStart = $target.offset().left;
  iTargetEnd = iTragetStart + $target.width();
  previewPoint.y = $ga.height() - parseInt($canvas.css("top"), 10);
  if (oEvent.clientX >= iSourceStart && oEvent.clientX <= iSourceEnd) {
    that
      ._getSourceTable()
      .setFirstVisibleRow(that._getSourceTable().getFirstVisibleRow() + 1);
    previewPoint.x = 0;
  }
  if (oEvent.clientX >= iTragetStart && oEvent.clientX <= iTargetEnd) {
    that
      ._getTargetTable()
      .setFirstVisibleRow(that._getTargetTable().getFirstVisibleRow() + 1);
    previewPoint.x = $canvas.outerWidth();
  }
  this._oGraphicRenderer.cancelPreview();
  this._oGraphicRenderer.showPreview(
    that._dragStart.x,
    that._dragStart.y,
    previewPoint.x,
    previewPoint.y
  );
  setTimeout(function () {
    if (that._dragStart && that.scrollable) {
      that.scrollDown(oEvent);
    }
  }, 50);
};
com.sap.it.spc.webui.mapping.MappingControl.prototype.scrollUp = function (
  oEvent,
  type
) {
  var that = this,
    oTable = null;
  if (type === "source") {
    oTable = that._getSourceTable();
  } else if (type === "target") {
    oTable = that._getTargetTable();
  }
  if (oTable.getFirstVisibleRow() > 0) {
    oTable.setFirstVisibleRow(oTable.getFirstVisibleRow() - 1);
    setTimeout(function () {
      if (!!that._dragStart && that.scrollable === true) {
        that._oGraphicRenderer().cancelPreview();
        that.scrollUp(oEvent, type);
        that
          ._oGraphicRenderer()
          .showPreview(
            that._dragStart.x,
            that._dragStart.y,
            oEvent.clientX,
            oEvent.clientY
          );
      }
    }, 50);
  }
};
/**
 * Function to ask confirmation and then delete the mapping.
 */
com.sap.it.spc.webui.mapping.MappingControl.prototype._confirmDelete =
  function (oEvent, sAction) {
    var oRb,
      that,
      oConnection,
      oMapping,
      aPaths,
      sQualifiedPath,
      sPath,
      oTransformation;
    that = this;
    oRb = this._oResourceBundle;
    if (sAction === "mapping") {
      sap.m.MessageBox.confirm(oRb.getText("MC_CONFIRM_DELETE_MAP"), {
        onClose: function (sResponse) {
          if (sResponse === "OK") {
            that._deleteMapping();
          }
        },
        styleClass: "mem-m-messageBox",
        title: oRb.getText("MC_CONFIRM_DELETE_HEAD"),
      });
    } else if (sAction === "connection") {
      oConnection = this._oSelectedConnection;
      oTransformation = this.getTransformation();
      oMapping = oTransformation.getMapping(oConnection.mappingId);
      if (!oConnection.xpath) {
        sap.m.MessageBox.confirm(oRb.getText("MC_CONFIRM_DELETE_MAP"), {
          onClose: function (sResponse) {
            if (sResponse === "OK") {
              that._deleteMapping(oMapping);
            }
          },
          styleClass: "mem-m-messageBox",
          title: oRb.getText("MC_CONFIRM_DELETE_HEAD"),
        });
        return;
      }
      aPaths = oMapping[oConnection.type + "Paths"];
      sQualifiedPath = com.sap.it.spc.webui.mapping.utils.replacePrefixes(
        oConnection.xpath,
        oTransformation.getPrefixMap()
      );
      if (aPaths.length === 1) {
        sPath = com.sap.it.spc.webui.mapping.utils.replacePrefixes(
          aPaths[0],
          oTransformation.getPrefixMap()
        );
        if (sPath === sQualifiedPath) {
          sap.m.MessageBox.confirm(oRb.getText("MC_CONFIRM_DELETE_MAP"), {
            onClose: function (sResponse) {
              if (sResponse === "OK") {
                that._deleteMapping(oMapping);
              }
            },
            styleClass: "mem-m-messageBox",
            title: oRb.getText("MC_CONFIRM_DELETE_HEAD"),
          });
        }
        return;
      }
      sap.m.MessageBox.confirm(oRb.getText("MC_CONFIRM_DELETE_CONNECTION"), {
        onClose: function (sResponse) {
          if (sResponse === "OK") {
            that._deleteConnection(
              oConnection.type,
              oConnection.xpath,
              oConnection.mappingId
            );
            that._oSelectedConnection = null;
          }
        },
        title: oRb.getText("MC_CONFIRM_DELETE_HEAD"),
        styleClass: "mem-m-messageBox",
      });
    }
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._deleteConnection =
  function (sMessageType, sXPath, sMappingId) {
    var oTransformation, oMapping;
    oTransformation = this.getTransformation();
    oMapping = oTransformation.getMapping(sMappingId);
    this._fireLibraryEvent(window.MappingLibrary.Events.MAPPING_UPDATE, {
      mapping: oMapping,
      updateType: window.MappingLibrary.MAPPING_UPDATE_TYPE.REMOVE,
      messageType:
        window.MappingLibrary.ENTITY_TYPE[sMessageType.toUpperCase()],
      xPath: sXPath,
    });
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._deleteMapping =
  function (oMapping) {
    oMapping = oMapping || this._getSelectedMapping();
    if (this.dirtyMappingId.indexOf(oMapping.id) !== -1) {
      this.dirtyMappingId.splice(this.dirtyMappingId.indexOf(oMapping.id), 1);
    }
    this._fireLibraryEvent(window.MappingLibrary.Events.MAPPING_DELETE, {
      mapping: oMapping,
    });
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._createPathInfo =
  function (sXPath, oMessageTable) {
    var oInfo,
      oBinding,
      oContext,
      oPrefixMap,
      i,
      sPath,
      aRows,
      iStartIndex,
      oDrawArea,
      sQPath;
    if (!sXPath || !oMessageTable) {
      return null;
    }
    oPrefixMap = this.getTransformation().getPrefixMap();
    sQPath = com.sap.it.spc.webui.mapping.utils.replacePrefixes(
      sXPath,
      oPrefixMap
    );
    oBinding = oMessageTable.getBinding();
    aRows = oMessageTable.getRows();
    iStartIndex = oMessageTable.getFirstVisibleRow();
    oDrawArea = this._getDrawAreaInfo();
    for (i = 0; i < oBinding.getLength(); i++) {
      oContext = oMessageTable.getContextByIndex(i);
      sPath = com.sap.it.spc.webui.mapping.utils.replacePrefixes(
        oContext.getProperty("xpath"),
        oPrefixMap
      );
      if (
        (sQPath === sPath ||
          (!oBinding.isExpanded(i) &&
            sQPath.indexOf(sPath) !== -1 &&
            sQPath.charAt(sPath.length) === "/")) &&
        aRows.length !== 0
      ) {
        oInfo = {};
        oInfo.xpath = sXPath;
        oInfo.isParent = sQPath !== sPath;
        if (aRows[i - iStartIndex]) {
          oInfo.id = aRows[i - iStartIndex].getId();
        } else {
          oInfo.point = com.sap.it.spc.webui.mapping.utils._getXandY({
            firstRowTop: aRows[0].$().offset().top,
            rowHeight: aRows[0].$().height(),
            firstRowIndex: iStartIndex,
            relativeIndex: i - iStartIndex,
            rowsLength: aRows.length,
            objectsLength: oBinding.getLength(),
            areaTop: oDrawArea.top,
            areaHeight: oDrawArea.height,
            areaWidth: oDrawArea.width,
          });
        }
        return oInfo;
      }
    }
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._drawMappings =
  function () {
    var oTransformation,
      aMappings,
      i,
      j,
      aPaths,
      aConnectionInfos,
      oPathInfo,
      bConnectionVisible,
      oConnectionInfo;
    var oPresentation;
    if (this._bRendered) {
      this._oGraphicRenderer.removeGraphics();
      oTransformation = this.getTransformation();
      if (oTransformation) {
        aMappings = oTransformation.getMappings();
        if (aMappings && aMappings.length > 0) {
          aConnectionInfos = [];
          for (i = 0; i < aMappings.length; i++) {
            oConnectionInfo = {};
            oConnectionInfo.mapping = aMappings[i];
            bConnectionVisible = false;
            aPaths = aMappings[i].getSourcePaths();
            oConnectionInfo.source = [];
            if (aPaths && aPaths.length > 0) {
              for (j = 0; j < aPaths.length; j++) {
                oPathInfo = this._createPathInfo(
                  aPaths[j],
                  this._getSourceTable()
                );
                if (oPathInfo) {
                  if (oPathInfo.id) {
                    bConnectionVisible = true;
                  }
                  oConnectionInfo.source.push(oPathInfo);
                }
              }
            }
            aPaths = aMappings[i].getTargetPaths();
            oConnectionInfo.target = [];
            if (aPaths && aPaths.length > 0) {
              for (j = 0; j < aPaths.length; j++) {
                oPathInfo = this._createPathInfo(
                  aPaths[j],
                  this._getTargetTable()
                );
                if (oPathInfo) {
                  if (oPathInfo.id) {
                    bConnectionVisible = true;
                  }
                  oConnectionInfo.target.push(oPathInfo);
                }
              }
            }
            if (bConnectionVisible) {
              if (
                this._mPresenterRegistry &&
                this._mPresenterRegistry.listener
              ) {
                oPresentation = this._mPresenterRegistry.listener.call(
                  this._mPresenterRegistry.context || this,
                  aMappings[i],
                  window.MappingLibrary.ENTITY_TYPE.MAPPING
                );
                if (
                  oPresentation instanceof
                  com.sap.it.spc.webui.mapping.models.PresentationModel
                ) {
                  oConnectionInfo.presentation = oPresentation;
                } else if (oPresentation) {
                  jQuery.sap.log.error(
                    oPresentation,
                    "is not an instance of com.sap.it.spc.webui.mapping.models.PresentationModel"
                  ); // throw exception
                }
              }
              aConnectionInfos.push(oConnectionInfo);
            }
          }
          this._oGraphicRenderer.renderGraphics(aConnectionInfos);
        }
      }
    }
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype.clearSelection =
  function () {
    this._oGraphicRenderer.clearHighlight();
    this._getTargetTable().clearSelection();
    this._getSourceTable().clearSelection();
    this.mappingRowSelected = [];
    this.targetRowSelected = [];
    this.sourceRowSelected = [];
    this._bUserTrigger = true;
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._getDrawAreaInfo =
  function () {
    var $drawArea;
    $drawArea = this._getGraphicalArea().getCenter().$();
    if ($drawArea.length === 0) {
      return null;
    }
    return {
      width:
        this._getTargetTable().$().offset().left -
        this._getSourceTable().$().offset().left -
        this._getSourceTable().$().width(),
      top: $drawArea.offset().top,
      height: $drawArea.height(),
    };
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._getSuggestions =
  function (oTable, sValue) {
    var oSV, oRoot;
    oSV = this._oVisitors.suggest;
    oSV.setValue(sValue);
    oRoot = oTable.getModel().getData().getRootNode();
    oRoot.acceptVisitor(oSV);
    return oSV.getSuggestions();
  };
// com.sap.it.spc.webui.mapping.MappingControl.prototype._onSuggest =
// function(oEvent) {
// var oSource, oTable, sValue, aSuggestions;
// oSource = oEvent.getSource();
// oTable = oSource.getParent();
// sValue = oEvent.getParameter("value");
//
// aSuggestions = this._getSuggestions(oTable, sValue);
// if (aSuggestions && aSuggestions.length > 0) {
// oSource.suggest(sValue, aSuggestions);
// } else {
// oSource.suggest(sValue, []);
// if (!oSource._ctrl.oPopup.isOpen()) {
// oSource._ctrl.oPopup.attachOpened.call(oSource._ctrl,
// oSource._ctrl._handleOpened, this);
//
// var eDock = sap.ui.core.Popup.Dock;
// oSource._ctrl.oPopup.open(0, eDock.BeginTop, eDock.BeginBottom,
// oSource._ctrl, null, null, true);
// var oListBox = oSource._ctrl._getListBox(true);
// jQuery(oListBox.getFocusDomRef()).attr("tabIndex", "-1");
//
// jQuery(oSource._ctrl.getDomRef()).attr("aria-expanded", true);
// }
// }
// };
com.sap.it.spc.webui.mapping.MappingControl.prototype._constructSearchInfoData =
  function (sMessageType) {
    var aResultPaths,
      oTable,
      oRootNode,
      aRowIndices,
      sXPath,
      aMappingInfoObjects,
      tmp,
      aData = [];
    aResultPaths = this._oSearchResults.paths[sMessageType];
    if (!aResultPaths) {
      return null;
    }
    oTable =
      sMessageType === "source"
        ? this._getSourceTable()
        : this._getTargetTable();
    oRootNode = oTable.getModel().getData().getRootNode();
    aRowIndices = this._getRowIndices(oTable, aResultPaths);
    aRowIndices.forEach(function (iIndex) {
      sXPath = oTable.getContextByIndex(iIndex).getProperty("xpath");
      aMappingInfoObjects = this._getMappingInfoTableObjects(
        sXPath,
        sMessageType
      );
      if (aMappingInfoObjects.length) {
        aData = aData.concat(aMappingInfoObjects);
      } else {
        tmp = {};
        this._oVisitors.getChild.setXPath(sXPath);
        tmp[sMessageType] = [
          oRootNode.acceptVisitor(this._oVisitors.getChild).getChildNode(),
        ];
        aData.push(tmp);
      }
    }, this);
    return aData;
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._onSearchInfoRowSelection =
  function (oEvent) {
    var oSource, sMessageType, oMessageTable, sXPath, iIndex;
    oSource = oEvent.getSource();
    sMessageType = oSource.data("messageType");
    oMessageTable =
      sMessageType === "source"
        ? this._getSourceTable()
        : this._getTargetTable();
    sXPath = oEvent
      .getParameter("rowContext")
      .getProperty(sMessageType)[0].xpath;
    iIndex = this._getRowIndex(oMessageTable, sXPath);
    this._setFocusedSearchResult(iIndex, oMessageTable, true);
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._onSearchInfoContentUpdate =
  function (oEvent) {
    var oSource, sMessageType, oMessageTable;
    oSource = oEvent.getSource();
    sMessageType = oSource.data("messageType");
    oMessageTable =
      sMessageType === "source"
        ? this._getSourceTable()
        : this._getTargetTable();
    this._updateSearchResultsVisibility(oMessageTable);
    this._updateSearchInfoVisibility(oMessageTable);
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._getSearchInfoTable =
  function (sMessageType) {
    var oSearchInfoTable;
    if (!this._oInformationTables.search[sMessageType]) {
      oSearchInfoTable = this._createInformationTable();
      oSearchInfoTable.data("messageType", sMessageType);
      oSearchInfoTable.addStyleClass("webuiSearchResultsInfo");
      oSearchInfoTable.setModel(this._createModel(null));
      oSearchInfoTable.attachRowSelectionChange(
        this._onSearchInfoRowSelection,
        this
      );
      oSearchInfoTable.attachContentUpdate(
        this._onSearchInfoContentUpdate,
        this
      );
    } else {
      oSearchInfoTable = this._oInformationTables.search[sMessageType];
    }
    this._oInformationTables.search[sMessageType] = oSearchInfoTable;
    return oSearchInfoTable;
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._createSearchTab =
  function (sMessageType) {
    var oResultInfo, oTab, sTitle, oRB;
    oResultInfo = this._getSearchInfoTable(sMessageType);
    oRB = this._oResourceBundle;
    sTitle =
      sMessageType === "source"
        ? oRB.getText("MC_SEARCH_SOURCE_TITLE")
        : oRB.getText("MC_SEARCH_TARGET_TITLE");
    oTab = new sap.ui.commons.Tab({
      text: sTitle,
      content: oResultInfo,
    });
    return oTab;
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._getSearchTab = function (
  sMessageType
) {
  var oTab;
  if (!this._oInformationTables.search.tab[sMessageType]) {
    oTab = this._createSearchTab(sMessageType);
    this._getInfoArea().addTab(oTab);
  } else {
    oTab = this._oInformationTables.search.tab[sMessageType];
  }
  this._oInformationTables.search.tab[sMessageType] = oTab;
  return oTab;
};
com.sap.it.spc.webui.mapping.MappingControl.prototype._updateSearchInfoData =
  function (sMessageType) {
    var oSearchInfoTable, aData;
    oSearchInfoTable = this._getSearchInfoTable(sMessageType);
    aData = this._constructSearchInfoData(sMessageType);
    oSearchInfoTable.getModel().setData(aData);
    oSearchInfoTable.bindRows("/");
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._showSearchResults =
  function (sMessageType) {
    var oTab, iIndex, oInfoArea;
    oTab = this._getSearchTab(sMessageType);
    oInfoArea = this._getInfoArea();
    iIndex = oInfoArea.indexOfTab(oTab);
    oInfoArea.setSelectedIndex(iIndex);
    this._updateSearchInfoData(sMessageType);
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._clearFocusedSearchResult =
  function (sMessageType) {
    this._oSearchResults.focusedIndex[sMessageType] = null;
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._getFocusedSearchResult =
  function (sMessageType) {
    var iIndex = this._oSearchResults.focusedIndex[sMessageType];
    return iIndex || -1;
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._updateSearchInfo =
  function (sMessageType, sXPath, bSuppressInfoScroll) {
    var oSearchInfoTable, aIndices;
    oSearchInfoTable = this._getSearchInfoTable(sMessageType);
    oSearchInfoTable.clearSelection();
    aIndices = this._getInfoIndices(sXPath, sMessageType, oSearchInfoTable);
    if (!bSuppressInfoScroll) {
      if (aIndices && aIndices.length > 0) {
        oSearchInfoTable.setFirstVisibleRow(aIndices[0]);
      }
    }
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._setFocusedSearchResult =
  function (iIndex, oMessageTable, bSuppressInfoScroll) {
    var sMessageType, aMessageIndices, sXPath;
    if (!oMessageTable) {
      return;
    }
    sMessageType = oMessageTable.data("messageType");
    aMessageIndices = this._getRowIndices(
      oMessageTable,
      this._oSearchResults.paths[sMessageType]
    );
    if (aMessageIndices && aMessageIndices.length > 0) {
      iIndex = iIndex === -1 ? aMessageIndices[0] : iIndex;
      if (aMessageIndices.indexOf(iIndex) !== -1) {
        this._setFirstVisibleRow(oMessageTable, iIndex);
        sXPath = oMessageTable.getContextByIndex(iIndex).getProperty("xpath");
        this._updateSearchInfo(sMessageType, sXPath, bSuppressInfoScroll);
      }
    }
    this._oSearchResults.focusedIndex[sMessageType] = iIndex;
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._getResultPaths =
  function (sQuery, oMessageTable) {
    var sMessageType,
      aPaths,
      aQueryParams,
      oRootNode,
      bTag = false,
      bName = false;
    sQuery = sQuery.trim();
    if (sQuery === "") {
      return;
    }
    oRootNode = oMessageTable.getModel().getData().getRootNode();
    if (/.*\//.test(sQuery)) {
      this._oVisitors.search.setQuery(sQuery);
      oRootNode.acceptVisitor(this._oVisitors.search);
      aPaths = this._oVisitors.search.getResultPaths();
    } else {
      aQueryParams = sQuery.split("|");
      aPaths = this._oVisitors.search.getResultPaths();
      switch (aQueryParams.length) {
        case 1:
          this._oVisitors.search.setQuery(aQueryParams[0]);
          oRootNode.acceptVisitor(this._oVisitors.search);
          aPaths = this._oVisitors.search.getResultPaths();
          break;
        case 2:
          aQueryParams[0] = aQueryParams[0].trim();
          aQueryParams[1] = aQueryParams[1].trim();
          if (aQueryParams[0] === "tag") {
            bTag = true;
          } else {
            bName = true;
          }
          this._oVisitors.search.setQuery(aQueryParams[1], bTag, bName);
          oRootNode.acceptVisitor(this._oVisitors.search);
          aPaths = this._oVisitors.search.getResultPaths();
          break;
        default:
          break;
      }
    }
    sMessageType = oMessageTable.data("messageType");
    this._oSearchResults.paths[sMessageType] = aPaths;
    return aPaths;
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._onSearch = function (
  oEvent
) {
  var oSource,
    oMessageTable,
    sQuery,
    pSize,
    aPaths,
    iFocusedIndex,
    sMessageType;
  oSource = oEvent.getSource();
  oMessageTable = oSource.getParent();
  sQuery = oEvent.getParameter("query");
  aPaths = this._getResultPaths(sQuery, oMessageTable);
  this._bUserSelected = false;
  if (aPaths && aPaths.length) {
    sMessageType = oMessageTable.data("messageType");
    this._showSearchResults(sMessageType);
    this._clearFocusedSearchResult(sMessageType);
    iFocusedIndex = this._getFocusedSearchResult(sMessageType);
    this._setFocusedSearchResult(iFocusedIndex, oMessageTable);
    oSource.setShowNavigationButtons(true);
    if (!this.getShowInfoSection()) {
      this.setShowInfoSection(true);
    }
    pSize = this.getInfoSectionSize();
    if (parseInt(pSize, 10) <= 5) {
      this._toggleInfoSectionSize();
    }
  }
  this._updateSearchResultsVisibility(oMessageTable);
  this._bUserSelected = true;
};
com.sap.it.spc.webui.mapping.MappingControl.prototype._onSearchPrev = function (
  oEvent
) {
  var oSource, oMessageTable, sMessageType, aIndices, iCurr, iPrev;
  oSource = oEvent.getSource();
  oMessageTable = oSource.getParent();
  sMessageType = oMessageTable.data("messageType");
  aIndices = this._getRowIndices(
    oMessageTable,
    this._oSearchResults.paths[sMessageType]
  );
  iCurr = this._getFocusedSearchResult(sMessageType);
  iPrev = aIndices[aIndices.indexOf(iCurr) - 1];
  this._setFocusedSearchResult(iPrev, oMessageTable);
};
com.sap.it.spc.webui.mapping.MappingControl.prototype._onSearchNext = function (
  oEvent
) {
  var oSource, oMessageTable, sMessageType, aIndices, iCurr, iNext;
  oSource = oEvent.getSource();
  oMessageTable = oSource.getParent();
  sMessageType = oMessageTable.data("messageType");
  aIndices = this._getRowIndices(
    oMessageTable,
    this._oSearchResults.paths[sMessageType]
  );
  iCurr = this._getFocusedSearchResult(sMessageType);
  iNext = aIndices[aIndices.indexOf(iCurr) + 1];
  this._setFocusedSearchResult(iNext, oMessageTable);
};
com.sap.it.spc.webui.mapping.MappingControl.prototype._onClearSearch =
  function (oEvent) {
    var oSource,
      oMessageTable,
      sMessageType,
      oInfoArea,
      oSearchTab,
      iTabIndex,
      $Message;
    oSource = oEvent.getSource();
    oMessageTable = oSource.getParent();
    sMessageType = oMessageTable.data("messageType");
    oInfoArea = this._getInfoArea();
    oSearchTab = this._getSearchTab(sMessageType);
    iTabIndex = oInfoArea.indexOfTab(oSearchTab);
    oInfoArea.closeTab(iTabIndex);
    oSearchTab.destroy();
    $Message = oMessageTable.$();
    $Message.find(".webuiSearchResult").removeClass("webuiSearchResult");
    $Message
      .find(".webuiSearchResultFocused")
      .removeClass("webuiSearchResultFocused");
    this._oSearchResults.paths[sMessageType] = null;
    this._oInformationTables.search[sMessageType] = null;
    this._oInformationTables.search.tab[sMessageType] = null;
    this._setFocusedSearchResult(null, oMessageTable);
    oSource.setShowNavigationButtons(false);
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._toggleInfoSectionSize =
  function () {
    var pCurrSize, pNewSize;
    pCurrSize = this.getInfoSectionSize();
    if (pCurrSize.replace("%", "") <= 5) {
      if (
        !this._oAreas.prevSize ||
        this._oAreas.prevSize.replace("%", "") <= 5
      ) {
        pNewSize = this._sDefaultMaxInfoSize;
      } else {
        pNewSize = this._oAreas.prevSize;
      }
      this._oAreas.prevSize = pNewSize;
    } else {
      pNewSize = this._sDefaultMinInfoSize;
    }
    this._oAreas.prevSize = pNewSize;
    this.setInfoSectionSize(pNewSize);
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._fireLibraryEvent =
  function (sEventId, oData) {
    window.MappingLibrary.EventBus.publish(
      this.getEventChannelId(),
      sEventId,
      oData
    );
  };
/*
 * com.sap.it.spc.webui.mapping.MappingControl.prototype._fireLibraryEvent = function(sEventId, oData) { window.MappingLibrary.EventBus.publish(sEventId,
 * oData); };
 */
com.sap.it.spc.webui.mapping.MappingControl.prototype.onclick = function (
  oEvent
) {
  this._oGraphicRenderer.clearSelection();
};
com.sap.it.spc.webui.mapping.MappingControl.prototype._onSolidCurveClick =
  function (sMessageType, sXPath, sMappingId) {
    var oTransformation, oMapping, aPaths, sQualifiedPath, sPath;
    if (
      !this._aSelectedMappingIDs ||
      this._aSelectedMappingIDs.indexOf(sMappingId) === -1
    ) {
      this._onDottedCurveClick(sMessageType, sXPath, sMappingId);
      return;
    }
    oTransformation = this.getTransformation();
    oMapping = oTransformation.getMapping(sMappingId);
    aPaths = oMapping[sMessageType + "Paths"];
    sQualifiedPath = com.sap.it.spc.webui.mapping.utils.replacePrefixes(
      sXPath,
      oTransformation.getPrefixMap()
    );
    if (aPaths.length === 1) {
      sPath = com.sap.it.spc.webui.mapping.utils.replacePrefixes(
        aPaths[0],
        oTransformation.getPrefixMap()
      );
      if (sPath === sQualifiedPath) {
        this._oGraphicRenderer.toggleSelection(sMappingId);
        if (
          this._sHighlightedMappingId &&
          this._sHighlightedMappingId === sMappingId
        ) {
          this._sHighlightedMappingId = null;
        } else {
          this._sHighlightedMappingId = sMappingId;
        }
      }
      return;
    }
    this._oGraphicRenderer.toggleSelection(sMappingId, sMessageType, sXPath);
    if (
      this._oSelectedConnection &&
      this._oSelectedConnection.type === sMessageType &&
      this._oSelectedConnection.xpath === sXPath &&
      this._oSelectedConnection.mappingId === sMappingId
    ) {
      this._oSelectedConnection = null;
    } else {
      this._oSelectedConnection = {
        type: sMessageType,
        xpath: sXPath,
        mappingId: sMappingId,
      };
    }
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._onCurveDoubleClick =
  function (sMessageType, sXPath, sMappingId) {
    this._onDottedCurveClick(sMessageType, sXPath, sMappingId);
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._onDottedCurveClick =
  function (sMessageType, sXPath, sMappingId) {
    var oData = {};
    oData.source = "";
    oData.xpath = sXPath;
    oData.curveClick = sMessageType;
    this._aSelectedMappingIDs = oData.mappingIds = [sMappingId];
    this._fireLibraryEvent(window.MappingLibrary.Events.MAPPING_SELECT, oData);
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._onCurveRightClick =
  function (sMessageType, sXPath, sMappingId, event) {
    if (this.getEditMode()) {
      if (
        this._aSelectedMappingIDs &&
        this._aSelectedMappingIDs.indexOf(sMappingId) !== -1
      ) {
        event.preventDefault();
        if (!this._oConnectionMenu) {
          this._oConnectionMenu = new sap.ui.commons.Menu({
            items: new sap.ui.commons.MenuItem({
              text: this._oResourceBundle.getText("MC_CONTEXT_MENU_DELETE"),
              icon: this._getImageSource("Delete.png"),
            }).attachSelect("connection", this._confirmDelete, this),
          });
        }
        this._oSelectedConnection = {
          type: sMessageType,
          xpath: sXPath,
          mappingId: sMappingId,
        };
        this._oConnectionMenu.open(false, null, "begin bottom", "begin bottom");
        this._oConnectionMenu.$().css({
          left: event.clientX + "px",
          top: event.clientY + "px",
        });
      }
    }
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._onFunctionClick =
  function (sMessageType, sXPath, sMappingId) {
    this._oSelectedConnection = null;
    this._sHighlightedMappingId = null;
    this._setSelectedMapping(sMappingId);
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._setSelectedMapping =
  function (sMappingId) {
    var oData = {};
    oData.source = "user-action";
    this._aSelectedMappingIDs = oData.mappingIds = [sMappingId];
    this._fireLibraryEvent(window.MappingLibrary.Events.MAPPING_SELECT, oData);
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._onFunctionDoubleClick =
  function (sMessageType, sXPath, sMappingId) {
    this._onFunctionClick(sMessageType, sXPath, sMappingId);
    if (this.getEditMode()) {
      this._showFunctionExpression(sMappingId);
    }
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._onFunctionRightClick =
  function (sMessageType, sXPath, sMappingId, event) {
    if (this.getEditMode()) {
      if (
        this._aSelectedMappingIDs &&
        this._aSelectedMappingIDs.indexOf(sMappingId) !== -1
      ) {
        this._setSelectedMapping(sMappingId);
        event.preventDefault();
        if (!this._oFunctionMenu) {
          this._oFunctionMenu = new sap.ui.commons.Menu({
            items: new sap.ui.commons.MenuItem({
              text: this._oResourceBundle.getText("MC_CONTEXT_MENU_DELETE"),
              icon: this._getImageSource("Delete.png"),
            }).attachSelect("mapping", this._confirmDelete, this),
          });
        }
        this._oFunctionMenu.open(false, null, "begin bottom", "begin bottom");
        this._oFunctionMenu.$().css({
          left: event.clientX + "px",
          top: event.clientY + "px",
        });
      }
    }
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._showFunctionExpression =
  function (sMappingId) {
    var mappingObject = this.getTransformation().getMapping(sMappingId),
      oFirstDialog,
      okBtn,
      oText;
    var oRb = this._oResourceBundle;
    oFirstDialog = new sap.ui.commons.Dialog({ modal: true });
    oFirstDialog.setTitle(oRb.getText("MC_FUNC_EPR_VIEW"));
    okBtn = new sap.ui.commons.Button({ text: oRb.getText("MC_BTN_OK") });
    okBtn.attachPress(function (oEvent) {
      oFirstDialog.close();
    }, this);
    if (
      !(
        mappingObject.fn.expression === undefined ||
        mappingObject.fn.expression === "" ||
        mappingObject.fn.expression === null
      )
    ) {
      oText = new sap.ui.commons.TextView({
        text: mappingObject.fn.expression,
      });
      oFirstDialog.addContent(oText);
      oFirstDialog.addButton(okBtn);
      oFirstDialog.open();
    }
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype.onAfterRendering =
  function () {
    var oGR, drawArea;
    oGR = this._oGraphicRenderer;
    drawArea = this._getGraphicalArea().getCenter();
    oGR.placeAt(drawArea.getId(), drawArea.getId());
    oGR.registerExecution(
      oGR.executions.solidCurveClick,
      this._onSolidCurveClick,
      this
    );
    oGR.registerExecution(
      oGR.executions.dottedCurveClick,
      this._onDottedCurveClick,
      this
    );
    oGR.registerExecution(
      oGR.executions.functionClick,
      this._onFunctionClick,
      this
    );
    oGR.registerExecution(
      oGR.executions.curveDoubleClick,
      this._onCurveDoubleClick,
      this
    );
    oGR.registerExecution(
      oGR.executions.functionDoubleClick,
      this._onFunctionDoubleClick,
      this
    );
    if (this.getEditMode()) {
      oGR.registerExecution(
        oGR.executions.curveRightClick,
        this._onCurveRightClick,
        this
      );
      oGR.registerExecution(
        oGR.executions.functionRightClick,
        this._onFunctionRightClick,
        this
      );
    }
    // On edit mode, enable drag and drop and delete
    if (this.getEditMode()) {
      this._setupDragAndDrop();
      this._setupKeyPressActions();
    }
    this._bRendered = true;
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._getDragInfo = function (
  element,
  type
) {
  var x = null,
    y,
    $tableRow,
    oTable = null,
    oContext,
    xPath = "",
    bIsLeaf = false;
  $tableRow = $(element).parents(".sapUiTableTr");
  var ofvalArray = $(".webuiGraphicalArea .sapUiBorderLayoutCenter");
  var ofval = ofvalArray[ofvalArray.length - 1];
  if ($(ofval).offset().top < 0) {
    ofval = ofvalArray[0];
  }
  // $(".webuiGraphicalArea .sapUiBorderLayoutCenter")
  y =
    $tableRow.offset().top +
    $tableRow.outerHeight() / 2 -
    $(ofval).offset().top;
  switch (type) {
    case "source":
      x = 0;
      oTable = this._getSourceTable();
      break;
    case "target":
      // x = $(".webuiGraphicalArea .sapUiBorderLayoutCenter").outerWidth();
      x = $(ofval).outerWidth();
      oTable = this._getTargetTable();
      break;
  }
  oContext = this._getRowContextFromElement(element, oTable);
  if (oContext !== undefined) {
    xPath = oContext.getProperty("xpath");
    bIsLeaf = oTable.getBinding().getNodeContexts(oContext).length > 0;
  }
  return {
    x: x,
    y: y,
    xPath: xPath,
    startElement: element,
    isMapped: this._isMapped(element, oTable),
    isLeaf: bIsLeaf,
  };
};
com.sap.it.spc.webui.mapping.MappingControl.prototype._getRowContextFromElement =
  function (element, oTable) {
    var iRelativeRowIndex = $(element)
      .parents(".sapUiTableTr")
      .attr("data-sap-ui-rowindex");
    var iAbsoluteRowIndex =
      oTable.getFirstVisibleRow() + parseInt(iRelativeRowIndex, 10);
    return oTable.getContextByIndex(iAbsoluteRowIndex);
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._expandRow = function (
  element,
  oTable
) {
  var iRelativeRowIndex = $(element)
    .parents(".sapUiTableTr")
    .attr("data-sap-ui-rowindex");
  var iAbsoluteRowIndex =
    oTable.getFirstVisibleRow() + parseInt(iRelativeRowIndex, 10);
  var oContext = oTable.getContextByIndex(iAbsoluteRowIndex);
  if (!!oContext) {
    if (!oTable.isExpanded(iAbsoluteRowIndex)) {
      oTable.expand(iAbsoluteRowIndex);
    }
  }
};
com.sap.it.spc.webui.mapping.MappingControl.prototype._isValidRowElement =
  function (element, oTable) {
    return !!this._getRowContextFromElement(element, oTable);
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._isXPathPartOfMapping =
  function (sXPath, sMessageType) {
    var oTransformation, aMappings, i, aPaths, j, sPath;
    if (!sXPath || !sMessageType) {
      return;
    }
    oTransformation = this.getTransformation();
    sXPath = com.sap.it.spc.webui.mapping.utils.replacePrefixes(
      sXPath,
      oTransformation.getPrefixMap()
    );
    aMappings = oTransformation.getMappings();
    if (aMappings && aMappings.length > 0) {
      for (i = 0; i < aMappings.length; i++) {
        aPaths = aMappings[i][sMessageType + "Paths"];
        if (aPaths && aPaths.length > 0) {
          for (j = 0; j < aPaths.length; j++) {
            sPath = com.sap.it.spc.webui.mapping.utils.replacePrefixes(
              aPaths[j],
              oTransformation.getPrefixMap()
            );
            if (sXPath === sPath) {
              return true;
            }
          }
        }
      }
    }
    return false;
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._isMapped = function (
  element,
  oTable
) {
  var oContext = this._getRowContextFromElement(element, oTable),
    isMapped = false;
  if (oContext && oContext.getProperty("xpath")) {
    isMapped = this._isXPathPartOfMapping(
      oContext.getProperty("xpath"),
      oTable.data("messageType")
    );
  }
  return isMapped;
};
com.sap.it.spc.webui.mapping.MappingControl.prototype._canDrag = function (
  element,
  oTable
) {
  var oContext = this._getRowContextFromElement(element, oTable),
    isMapped;
  if (!!oContext) {
    if (oContext.getProperty("state") === undefined) {
      isMapped = false;
    } else {
      isMapped = oContext.getProperty("state").indexOf("MAPPED") !== -1;
    }
    if (!isMapped) {
      return true;
    }
  }
  return false;
};
com.sap.it.spc.webui.mapping.MappingControl.prototype._addNewConnectionToMapping =
  function (sMappingId, sXPath, sTableType) {
    var oTransformation, oMapping, aPaths, i, sPath, sQualifiedPath;
    if (!sMappingId || !sXPath || !sTableType) {
      return;
    }
    oTransformation = this.getTransformation();
    oMapping = oTransformation.getMapping(sMappingId);
    if (!oMapping) {
      return;
    }
    if (sTableType === "source") {
      aPaths = oMapping.getSourcePaths();
    } else {
      aPaths = oMapping.getTargetPaths();
    }
    sQualifiedPath = com.sap.it.spc.webui.mapping.utils.replacePrefixes(
      sXPath,
      oTransformation.getPrefixMap()
    );
    for (i = 0; i < aPaths.length; i++) {
      sPath = com.sap.it.spc.webui.mapping.utils.replacePrefixes(
        aPaths[i],
        oTransformation.getPrefixMap()
      );
      if (sPath === sQualifiedPath) {
        return;
      }
    }
    this._fireLibraryEvent(window.MappingLibrary.Events.MAPPING_UPDATE, {
      mapping: oMapping,
      updateType: window.MappingLibrary.MAPPING_UPDATE_TYPE.ADD,
      messageType: window.MappingLibrary.ENTITY_TYPE[sTableType.toUpperCase()],
      xPath: sXPath,
    });
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._createMapping =
  function (element, sTableType, sXPath) {
    var oContext, mapping;
    mapping = new com.sap.it.spc.webui.mapping.models.MappingModel(
      "_new_mapping" + Math.ceil(Math.random() * Math.pow(10, 10))
    );
    if (sTableType === "source") {
      oContext = this._getRowContextFromElement(
        element,
        this._getSourceTable()
      );
      mapping.sourcePaths = [oContext.getProperty("xpath")];
      mapping.targetPaths = [sXPath];
    } else {
      oContext = this._getRowContextFromElement(
        element,
        this._getTargetTable()
      );
      mapping.sourcePaths = [sXPath];
      mapping.targetPaths = [oContext.getProperty("xpath")];
    }
    mapping.fn = {};
    mapping.fn.expression = mapping.sourcePaths[0];
    mapping.fn.description = "";
    this._fireLibraryEvent(window.MappingLibrary.Events.MAPPING_CREATE, {
      mapping: mapping,
    });
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._createDefaultMapping =
  function (element, sTableType, sXPath) {
    var oContext, mapping;
    mapping = new com.sap.it.spc.webui.mapping.models.MappingModel(
      "_new_mapping" + Math.ceil(Math.random() * Math.pow(10, 10))
    );
    if (sTableType === "source") {
      oContext = this._getRowContextFromElement(
        element,
        this._getSourceTable()
      );
      mapping.sourcePaths = [oContext.getProperty("xpath")];
      mapping.targetPaths = [sXPath];
    } else {
      oContext = this._getRowContextFromElement(
        element,
        this._getTargetTable()
      );
      mapping.sourcePaths = [sXPath];
      mapping.targetPaths = [oContext.getProperty("xpath")];
    }
    mapping.fn = {};
    mapping.fn.expression = mapping.sourcePaths[0];
    mapping.fn.description = "";
    this._fireLibraryEvent(window.MappingLibrary.Events.MAPPING_CREATE, {
      mapping: mapping,
    });
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._unbindJQueryEvents =
  function () {
    // unbind exisiting mouse events on exit
    var $this = this.$();
    $this.find(".sapUiHorizontalSplitterBar").unbind();
    $this.find(".webuiGraphicalArea").unbind();
    $this.find(".webuiSourceMessage sapUiTableTr").unbind();
    $this.find(".webuiTargetMessage sapUiTableTr").unbind();
    $this.find(".webuiGraphicalArea .sapUiBorderLayoutCenter").unbind();
    $(document).unbind("mouseup");
    $(document).unbind("mousemove");
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype.setEditMode = function (
  bType
) {
  if (!bType && this.getEditMode()) {
    this._unbindJQueryEvents();
  }
  this.setProperty("editMode", bType);
};
com.sap.it.spc.webui.mapping.MappingControl.prototype.setSourceMessageHeader =
  function (oTitle) {
    this._getSourceTable().setTitle(oTitle);
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype.getSourceMessageHeader =
  function () {
    return this._getSourceTable().getTitle();
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype.setTargetMessageHeader =
  function (oTitle) {
    this._getTargetTable().setTitle(oTitle);
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype.getTargetMessageHeader =
  function () {
    return this._getTargetTable().getTitle();
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._setupDragAndDrop =
  function () {
    var that = this,
      oGR = this._oGraphicRenderer,
      $this = this.$();
    // handle auto scroll down
    $this
      .find(".sapUiHorizontalSplitterBar")
      .mouseover(function (oEvent) {
        if (!!that._dragStart) {
          that.scrollable = true;
          // move this to dragstart
          that.scrollDown(oEvent);
        }
      })
      .mouseout(function () {
        that.scrollable = false;
      });
    // Handle start of drag
    $this.find(".webuiGraphicalArea").mousedown(function (oEvent) {
      var currentElement = this.ownerDocument.elementFromPoint(
          oEvent.clientX,
          oEvent.clientY
        ),
        bDraggable;
      $this = that.$();
      that._dragStart = null;
      if (
        $this.find(".webuiSourceMessage table").find($(currentElement)).length >
        0
      ) {
        bDraggable = that._isValidRowElement(
          currentElement,
          that._getSourceTable()
        );
        if (bDraggable) {
          that._dragStart = that._getDragInfo(currentElement, "source");
          that._dragStart.isSourceTable = true;
        } else {
          document.body.style.cursor = "not-allowed";
        }
      } else if (
        $this.find(".webuiTargetMessage table").find($(currentElement)).length >
        0
      ) {
        bDraggable =
          that._isValidRowElement(currentElement, that._getTargetTable()) &&
          !that._isMapped(currentElement, that._getTargetTable());
        if (bDraggable) {
          that._dragStart = that._getDragInfo(currentElement, "target");
          that._dragStart.isTargetTable = true;
        } else {
          document.body.style.cursor = "not-allowed";
        }
      }
    });
    // Handle connection line previews
    $this.find(".webuiGraphicalArea").mousemove(function (oEvent) {
      var ce, pp, canvas, bDraggable;
      $this = that.$();
      if (!!that._dragStart) {
        ce = this.ownerDocument.elementFromPoint(
          oEvent.clientX,
          oEvent.clientY
        );
        document.body.style.cursor = "auto";
        oGR.cancelPreview();
        if (
          $this.find(".webuiSourceMessage table").find($(ce)).length > 0 &&
          !that._dragStart.isSourceTable
        ) {
          bDraggable = that._isValidMapping(ce, that._getSourceTable());
          document.body.style.cursor = bDraggable ? "auto" : "not-allowed";
          pp = that._getDragInfo(ce, "source");
          document.body.style.cursor = "auto";
          oGR.showPreview(that._dragStart.x, that._dragStart.y, pp.x, pp.y);
        } else if (
          $this.find(".webuiSourceMessage table").find($(ce)).length > 0 &&
          that._dragStart.isSourceTable
        ) {
          if (ce.contains(that._dragStart.startElement)) {
            document.body.style.cursor = "auto";
          } else {
            document.body.style.cursor = "not-allowed";
          }
        } else if (
          $this.find(".webuiTargetMessage table").find($(ce)).length > 0 &&
          !that._dragStart.isTargetTable
        ) {
          bDraggable = that._isValidRowElement(ce, that._getTargetTable());
          document.body.style.cursor = bDraggable ? "auto" : "not-allowed";
          pp = that._getDragInfo(ce, "target");
          document.body.style.cursor = "auto";
          oGR.showPreview(that._dragStart.x, that._dragStart.y, pp.x, pp.y);
        } else if (
          $this.find(".webuiTargetMessage table").find($(ce)).length > 0 &&
          that._dragStart.isTargetTable
        ) {
          if (ce.contains(that._dragStart.startElement)) {
            document.body.style.cursor = "auto";
          } else {
            document.body.style.cursor = "not-allowed";
          }
        } else if (
          ce.className &&
          ce.className.baseVal &&
          ce.className.baseVal.indexOf("functionIcon") !== -1
        ) {
          document.body.style.cursor = "not-allowed";
          canvas = $this.find(".sapUiBorderLayoutCenter");
          oGR.showPreview(
            that._dragStart.x,
            that._dragStart.y,
            oEvent.clientX - canvas.offset().left,
            oEvent.clientY - canvas.offset().top
          );
        } else if (
          $this.find(".webuiTargetMessage .sapUiTableCnt").find($(ce)).length >
            0 &&
          $this
            .find(".webuiTargetMessage .sapUiTableCnt .sapUiTableCCnt")
            .find($(ce)).length === 0 && // if drag and drop is on target table
          // header
          !that._dragStart.isTargetTable
        ) {
          bDraggable = that._isValidMapping(ce);
          document.body.style.cursor = bDraggable ? "auto" : "not-allowed";
          canvas = $(".webuiTargetMessage .sapUiTableCol");
          oGR.showPreview(
            that._dragStart.x,
            that._dragStart.y,
            $(".webuiGraphicalArea .sapUiBorderLayoutCenter").outerWidth(),
            canvas.outerHeight(true) / 2
          );
        } else {
          canvas = $this.find(".sapUiBorderLayoutCenter");
          oGR.showPreview(
            that._dragStart.x,
            that._dragStart.y,
            oEvent.clientX - canvas.offset().left,
            oEvent.clientY - canvas.offset().top
          );
        }
        oEvent.stopPropagation();
      }
    });
    // Handle drop
    $this.find(".webuiGraphicalArea").mouseup(function (oEvent) {
      document.body.style.cursor = "auto";
      var currentElement, bDroppable, oTable;
      $this = that.$();
      if (!!that._dragStart) {
        oGR.cancelPreview();
        currentElement = this.ownerDocument.elementFromPoint(
          oEvent.clientX,
          oEvent.clientY
        );
        if (
          $this.find(".webuiSourceMessage table").find($(currentElement))
            .length > 0 &&
          !that._dragStart.isSourceTable
        ) {
          bDroppable = that._isValidMapping(
            currentElement,
            that._getSourceTable()
          );
          if (bDroppable) {
            // dropPoint =
            // that._getDragInfo(currentElement,
            // "source");
            // that._createDefaultMapping(currentElement,
            // "source", that._dragStart.xPath);
            that._createMapping(currentElement, "source");
          }
        } else if (
          $this.find(".webuiTargetMessage table").find($(currentElement))
            .length > 0 &&
          !that._dragStart.isTargetTable
        ) {
          oTable = that._getTargetTable();
          bDroppable = that._isValidMapping(currentElement, oTable);
          if (bDroppable) {
            that._createMapping(currentElement, "target");
          }
        } else if (
          $this
            .find(".webuiTargetMessage .sapUiTableCnt")
            .find($(currentElement)).length > 0 &&
          $this
            .find(".webuiTargetMessage .sapUiTableCnt .sapUiTableCCnt")
            .find($(currentElement)).length === 0 && // if drag and drop is on target table
          // header
          !that._dragStart.isTargetTable
        ) {
          bDroppable = that._isValidMapping(currentElement);
          if (bDroppable) {
            // oSourceContext =
            // that._getRowContextFromElement(that._dragStart.startElement,
            // that._getSourceTable());
            that._createMapping(currentElement, "target");
          }
        }
        oEvent.stopPropagation();
      }
      that._dragStart = null;
    });
    // handle auto expand and auto scroll up
    $this
      .find(".webuiGraphicalArea")
      .mouseover(function (oEvent) {
        var currentElement, previewPoint;
        $this = that.$();
        if (!!that._dragStart) {
          oGR.cancelPreview();
          currentElement = this.ownerDocument.elementFromPoint(
            oEvent.clientX,
            oEvent.clientY
          );
          if (
            $this
              .find(".webuiSourceMessage .sapUiTableTr")
              .find($(currentElement)).length > 0 &&
            !that._dragStart.isSourceTable
          ) {
            that._expandRow(currentElement, that._getSourceTable());
            previewPoint = that._getDragInfo(currentElement, "source");
            oGR.showPreview(
              that._dragStart.x,
              that._dragStart.y,
              previewPoint.x,
              previewPoint.y
            );
          } else if (
            $this
              .find(".webuiTargetMessage .sapUiTableTr")
              .find($(currentElement)).length > 0 &&
            !that._dragStart.isTargetTable
          ) {
            that._expandRow(currentElement, that._getTargetTable());
            previewPoint = that._getDragInfo(currentElement, "target");
            oGR.showPreview(
              that._dragStart.x,
              that._dragStart.y,
              previewPoint.x,
              previewPoint.y
            );
          } else if (
            $this
              .find(".webuiSourceMessage .sapUiTableCol")
              .find($(currentElement)).length > 0 &&
            !that._dragStart.isSourceTable
          ) {
            that.scrollable = true;
            that.scrollUp(oEvent, "source");
            oGR.showPreview(
              that._dragStart.x,
              that._dragStart.y,
              oEvent.clientX,
              oEvent.clientY
            );
          } else if (
            $this
              .find(".webuiTargetMessage .sapUiTableCol")
              .find($(currentElement)).length > 0 &&
            !that._dragStart.isTargetTable
          ) {
            that.scrollable = true;
            that.scrollUp(oEvent, "target");
            oGR.showPreview(
              that._dragStart.x,
              that._dragStart.y,
              oEvent.clientX,
              oEvent.clientY
            );
          }
        }
      })
      .mouseout(function () {
        that.scrollable = false;
      });
    // Handle events on document
    $(document).mousemove(function (oEvent) {
      if (!!that._dragStart) {
        $this = that.$();
        document.body.style.cursor = "not-allowed";
        var canvas = $this.find(".sapUiBorderLayoutCenter");
        oGR.cancelPreview();
        oGR.showPreview(
          that._dragStart.x,
          that._dragStart.y,
          oEvent.clientX - canvas.offset().left,
          oEvent.clientY - canvas.offset().top
        );
      }
    });
    $(document).mouseup(function (oEvent) {
      if (!!that._dragStart) {
        oGR.cancelPreview();
        document.body.style.cursor = "auto";
        that._dragStart = null;
      }
    });
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._onMouseOverMessageTableRow =
  function (oEvent) {
    if (this._bRendered) {
      var oTable = oEvent.srcControl;
      oTable
        .$()
        .find("tr")
        .mouseover(
          $.proxy(
            function (oTable, oEvent) {
              var rowObject = "",
                row = "";
              if ($(oEvent.target).parents("tr").length !== 0) {
                row = $(oEvent.target).parents("tr");
              } else {
                row = oEvent.target;
              }
              var rowCtrl = $(row).control(0);
              if (!!oTable.getContextByIndex(oTable.indexOfRow(rowCtrl))) {
                rowObject = oTable
                  .getContextByIndex(oTable.indexOfRow(rowCtrl))
                  .getObject();
              }
              if (oTable === this._getSourceTable()) {
                this.fireSourceMouseover({
                  nodeData: rowObject,
                  nodeRow: rowCtrl,
                });
              } else if (oTable === this._getTargetTable()) {
                this.fireTargetMouseover({
                  nodeData: rowObject,
                  nodeRow: rowCtrl,
                });
              }
            },
            this,
            oTable
          )
        );
    }
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._onRightClickMessageTableRow =
  function (oEvent) {
    if (this._bRendered) {
      var oTable = oEvent.srcControl;
      oTable
        .$()
        .find("tr")
        .contextmenu(
          $.proxy(
            function (oTable, oEvent) {
              var rowObject = "",
                row = "";
              if ($(oEvent.target).parents("tr").length !== 0) {
                row = $(oEvent.target).parents("tr");
              } else {
                row = oEvent.target;
              }
              var rowCtrl = $(row).control(0);
              if (!!oTable.getContextByIndex(oTable.indexOfRow(rowCtrl))) {
                rowObject = oTable
                  .getContextByIndex(oTable.indexOfRow(rowCtrl))
                  .getObject();
              }
              if (oTable === this._getSourceTable()) {
                this.fireSourceMouseRightclick({
                  nodeObject: rowObject,
                  node: rowCtrl,
                });
              } else if (oTable === this._getTargetTable()) {
                this.fireTargetMouseRightclick({
                  nodeObject: rowObject,
                  node: rowCtrl,
                });
              }
            },
            this,
            oTable
          )
        );
    }
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._adjustInformationColumnsForTheFirstTime =
  function (oInfoTable) {
    var aColumns,
      iFnColIndex,
      widthPerCol,
      widthForFirstCol,
      iGiven = 0,
      i,
      remaining = 100,
      colWidth,
      iNoOfColsForChange;
    if (!oInfoTable instanceof com.sap.it.spc.webui.mapping.InformationTable) {
      jQuery.sap.log.error(
        oInfoTable.getId() +
          " is not an information table (like mapping info, search info etc.,)"
      );
      return;
    }
    aColumns = oInfoTable.getColumns();
    if (!!aColumns[0].data("width")) {
      return;
    }
    iFnColIndex = oInfoTable.indexOfColumn(oInfoTable.data("functionColumn"));
    // For source side
    for (i = 1; i < iFnColIndex; i++) {
      colWidth = aColumns[i].data("width");
      if (!!colWidth) {
        iGiven++;
        remaining -= parseInt(colWidth, 10);
      }
    }
    if (remaining !== 0) {
      iNoOfColsForChange = iFnColIndex - iGiven;
      widthPerCol = Math.round(remaining / iNoOfColsForChange);
      widthForFirstCol = widthPerCol;
      widthForFirstCol += remaining - widthPerCol * iNoOfColsForChange;
      aColumns[0].data("width", widthForFirstCol);
      for (i = 1; i < iFnColIndex; i++) {
        colWidth = aColumns[i].data("width");
        if (!colWidth) {
          aColumns[i].data("width", widthPerCol);
        }
      }
    }
    // For target side
    remaining = 100;
    iGiven = 0;
    for (i = iFnColIndex + 2; i < aColumns.length; i++) {
      colWidth = aColumns[i].data("width");
      if (!!colWidth) {
        iGiven++;
        remaining -= parseInt(colWidth, 10);
      }
    }
    if (remaining !== 0) {
      iNoOfColsForChange = aColumns.length - iFnColIndex - 1 - iGiven;
      widthPerCol = Math.round(remaining / iNoOfColsForChange);
      widthForFirstCol = widthPerCol;
      widthForFirstCol += remaining - widthPerCol * iNoOfColsForChange;
      aColumns[iFnColIndex + 1].data("width", widthForFirstCol);
      for (i = iFnColIndex + 2; i < aColumns.length; i++) {
        colWidth = aColumns[i].data("width");
        if (!colWidth) {
          aColumns[i].data("width", widthPerCol);
        }
      }
    }
  };
/*
 * com.sap.it.spc.webui.mapping.MappingControl.prototype._unsubscribeLibraryEvents = function() {
 * window.MappingLibrary.EventBus.unsubscribe(window.MappingLibrary.Events.MAPPING_SELECT, this._updateSourceTable, this);
 * window.MappingLibrary.EventBus.unsubscribe(window.MappingLibrary.Events.MAPPING_SELECT, this._updateTargetTable, this);
 * window.MappingLibrary.EventBus.unsubscribe(window.MappingLibrary.Events.MAPPING_SELECT, this._highlightMappings, this);
 * window.MappingLibrary.EventBus.unsubscribe(window.MappingLibrary.Events.MAPPING_CREATE, this._onMappingCreate, this);
 * window.MappingLibrary.EventBus.unsubscribe(window.MappingLibrary.Events.MAPPING_UPDATE, this._onMappingUpdate, this);
 * window.MappingLibrary.EventBus.unsubscribe(window.MappingLibrary.Events.MAPPING_DELETE, this._onMappingDelete, this); //
 * window.MappingLibrary.EventBus.unsubscribe(this._oLocalEvents.contentUpdate, // this._onContentUpdate, this); };
 */
com.sap.it.spc.webui.mapping.MappingControl.prototype._unsubscribeLibraryEvents =
  function () {
    window.MappingLibrary.EventBus.unsubscribe(
      this.getEventChannelId(),
      window.MappingLibrary.Events.MAPPING_SELECT,
      this._updateSourceTable,
      this
    );
    window.MappingLibrary.EventBus.unsubscribe(
      this.getEventChannelId(),
      window.MappingLibrary.Events.MAPPING_SELECT,
      this._updateTargetTable,
      this
    );
    window.MappingLibrary.EventBus.unsubscribe(
      this.getEventChannelId(),
      window.MappingLibrary.Events.MAPPING_SELECT,
      this._highlightMappings,
      this
    );
    window.MappingLibrary.EventBus.unsubscribe(
      this.getEventChannelId(),
      window.MappingLibrary.Events.MAPPING_CREATE,
      this._onMappingCreate,
      this
    );
    window.MappingLibrary.EventBus.unsubscribe(
      this.getEventChannelId(),
      window.MappingLibrary.Events.MAPPING_UPDATE,
      this._onMappingUpdate,
      this
    );
    window.MappingLibrary.EventBus.unsubscribe(
      this.getEventChannelId(),
      window.MappingLibrary.Events.MAPPING_DELETE,
      this._onMappingDelete,
      this
    ); // window.MappingLibrary.EventBus.unsubscribe(this._oLocalEvents.contentUpdate,
    // this._onContentUpdate, this);
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._detachEvents =
  function () {
    var oSourceTable = this._getSourceTable();
    var oTargetTable = this._getTargetTable();
    var sMessageType;
    oSourceTable.detachRowSelectionChange(
      this._onMessageRowSelectionChange,
      this
    );
    oTargetTable.detachRowSelectionChange(
      this._onMessageRowSelectionChange,
      this
    );
    oSourceTable.detachContentUpdate(this._onContentUpdate, this);
    oTargetTable.detachContentUpdate(this._onContentUpdate, this);
    if (this.getShowInfoSection()) {
      if (this._sResizeListenerId) {
        sap.ui.core.ResizeHandler.deregister(this._sResizeListenerId);
        this._sResizeListenerId = null;
      }
      this._oMinMaxIcon.detachPress(this._toggleInfoSectionSize, this);
      sMessageType = oSourceTable.data("messageType");
      if (this._oInformationTables.search[sMessageType]) {
        this._oInformationTables.search[sMessageType].detachRowSelectionChange(
          this._onSearchInfoRowSelection,
          this
        );
        this._oInformationTables.search[sMessageType].detachContentUpdate(
          this._onSearchInfoContentUpdate,
          this
        );
      }
      sMessageType = oTargetTable.data("messageType");
      if (this._oInformationTables.search[oTargetTable.data("messageType")]) {
        this._oInformationTables.search[sMessageType].detachRowSelectionChange(
          this._onSearchInfoRowSelection,
          this
        );
        this._oInformationTables.search[sMessageType].detachContentUpdate(
          this._onSearchInfoContentUpdate,
          this
        );
      }
    }
    this._unsubscribeLibraryEvents();
    this._unbindJQueryEvents();
    return this;
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype.exit = function () {
  var oGR = this._oGraphicRenderer;
  // detach events
  this._detachEvents();
  // Destroy the layout
  if (this._oLayout) {
    this._oLayout.destroy();
  }
  // De-register executions with graphic renderer
  if (!!oGR) {
    oGR.deregisterExecution(oGR.executions.solidCurveClick);
    oGR.deregisterExecution(oGR.executions.dottedCurveClick);
    oGR.deregisterExecution(oGR.executions.functionIconClick);
    oGR.deregisterExecution(oGR.executions.curveDoubleClick);
    oGR.deregisterExecution(oGR.executions.functionIconDoubleClick);
  }
  // Delete the variables
  this._oLayout = null;
  this._oMessageTables = null;
  this._oInformationTables = null;
  this._oAreas = null;
  this._oVisitors = null;
  this._oSearchResults = null;
  this._oMinMaxIcon = null;
  this._sLibraryName = null;
  this._oResourceBundle = null;
  this._sDefaultImageSize = null;
  this._sDefaultCSSSize = null;
  this._sDefaultMessageSize = null;
  this._sDefaultMaxInfoSize = null;
  this._sDefaultMinInfoSize = null;
  this._bUserTrigger = null;
  this._bRendered = null;
  this._sResizeListenerId = null;
  this._dragStart = null;
  this.scrollable = null;
};
com.sap.it.spc.webui.mapping.MappingControl.prototype.addInfoTab = function (
  oTab
) {
  this._getInfoArea().addItem(oTab);
  return this;
};
com.sap.it.spc.webui.mapping.MappingControl.prototype.insertInfoTab = function (
  oTab,
  iIndex
) {
  this._getInfoArea().insertItem(oTab, iIndex);
  return this;
};
com.sap.it.spc.webui.mapping.MappingControl.prototype.destroyInfoTabs =
  function (oTab) {
    this._getInfoArea().destroyItems();
    return this;
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype.removeInfoTab = function (
  value
) {
  this._getInfoArea().removeItem(value);
  return this;
};
com.sap.it.spc.webui.mapping.MappingControl.prototype.getInfoTabs =
  function () {
    return this.oInfoArea.getItems();
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype.setSelectedInfoTabKey =
  function (sKey) {
    this._getInfoArea().setSelectedKey(sKey);
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype.setSourceMessagePath =
  function (sPath) {
    this._getSourceTable().bindRows(sPath);
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype.setTargetMessagePath =
  function (sPath) {
    this._getTargetTable().bindRows(sPath);
  };
/**
 * Presentation code -- Start
 */
com.sap.it.spc.webui.mapping.MappingControl.prototype.registerPresenter =
  function (fnPresenter, oContext) {
    this._mPresenterRegistry = {
      listener: fnPresenter,
      context: oContext,
    };
    return this;
  };
/**
 * Presentation code -- End
 */
com.sap.it.spc.webui.mapping.MappingControl.prototype.registerCustomMappingValidator =
  function (fCallback) {
    if (typeof fCallback === "function") {
      this._mappingValidatorCallback = fCallback;
    } else {
      this._mappingValidatorCallback = null;
    }
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype.unregisterCustomMappingValidator =
  function () {
    this._mappingValidatorCallback = null;
  };
/**
 * Called by _setupDragAndDrop
 *
 * @param element
 * @returns
 */
com.sap.it.spc.webui.mapping.MappingControl.prototype._validateMapping =
  function (element) {
    var oTargetContext, oSourceContext, oSource, oTarget;
    if (this._dragStart.isSourceTable) {
      oTargetContext = this._getRowContextFromElement(
        element,
        this._getTargetTable()
      );
      oSourceContext = this._getRowContextFromElement(
        this._dragStart.startElement,
        this._getSourceTable()
      );
    } else {
      oSourceContext = this._getRowContextFromElement(
        element,
        this._getSourceTable()
      );
      oTargetContext = this._getRowContextFromElement(
        this._dragStart.startElement,
        this._getTargetTable()
      );
    }
    oSource = oSourceContext.getObject();
    oTarget = null;
    if (oTargetContext) {
      oTarget = oTargetContext.getObject();
    }
    if (typeof this._mappingValidatorCallback === "function") {
      return this._mappingValidatorCallback([oSource], oTarget);
    } else {
      return false;
    }
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype.registerCustomMappingCreator =
  function (fCallback) {
    if (typeof fCallback === "function") {
      this._mappingCreatorCallback = fCallback;
    } else {
      this._mappingCreatorCallback = null;
    }
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype.unregisterCustomMappingCreator =
  function () {
    this._mappingCreatorCallback = null;
  };
/**
 * @returns true if callback handled mapping creation. false if default implementation should take care of it.
 */
com.sap.it.spc.webui.mapping.MappingControl.prototype._createCustomMapping =
  function (oMappingData) {
    // var sMappingId, dropPoint;
    if (typeof this._mappingCreatorCallback === "function") {
      return this._mappingCreatorCallback(oMappingData);
    } else {
      /*
       * if (this._isMapped(currentElement, oTable)) { sMappingId = this._getMappingIds(dropPoint.xPath, "target")[0]; dropPoint =
       * oGR.getFunctionXY(sMappingId); this._addNewConnectionToMapping(sMappingId, this._dragStart.xPath, "source"); } else if (oTargetContext) { // drop
       * onto existing element this._createDefaultMapping(currentElement, "target", this._dragStart.xPath); }
       */
      return false;
    }
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._isValidMapping =
  function (currentElement, oTable) {
    var result;
    if (typeof this._mappingValidatorCallback === "function") {
      result = this._validateMapping(currentElement);
    } else {
      result = this._isValidRowElement(currentElement, oTable);
    }
    return result;
  };
com.sap.it.spc.webui.mapping.MappingControl.prototype._createMapping =
  function (currentElement, sType) {
    var sCounterType,
      oTable,
      dropPoint,
      oTargetContext = null,
      oSourceContext,
      sMappingId;
    oTargetContext = this._getRowContextFromElement(
      currentElement,
      this._getTargetTable()
    );
    oSourceContext = this._getRowContextFromElement(
      this._dragStart.startElement,
      this._getSourceTable()
    );
    if (typeof this._mappingCreatorCallback === "function") {
      this._createCustomMapping({
        sourceObject: oSourceContext ? oSourceContext.getObject() : null,
        targetObject: oTargetContext ? oTargetContext.getObject() : null,
      });
    } else {
      sCounterType = sType === "target" ? "source" : "target";
      dropPoint = this._getDragInfo(currentElement, sType);
      oTable = this._getTargetTable();
      if (this._isMapped(currentElement, oTable)) {
        sMappingId = this._getMappingIds(dropPoint.xPath, sType)[0];
        // dropPoint = oGR.getFunctionXY(sMappingId);
        this._addNewConnectionToMapping(
          sMappingId,
          this._dragStart.xPath,
          sCounterType
        );
      } else {
        if (oTargetContext) {
          // drop onto existing element
          this._createDefaultMapping(
            currentElement,
            sType,
            this._dragStart.xPath
          );
        }
      }
    }
  };
