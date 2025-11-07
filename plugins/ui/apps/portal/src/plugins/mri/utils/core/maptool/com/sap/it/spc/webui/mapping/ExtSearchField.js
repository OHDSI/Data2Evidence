/* ----------------------------------------------------------------------------------
 * Hint: This is a derived (generated) file. Changes should be done in the underlying
 * source files only (*.control, *.js) or they will be lost after the next generation.
 * ---------------------------------------------------------------------------------- */
// Provides control com.sap.it.spc.webui.mapping.ExtSearchField.
jQuery.sap.declare("com.sap.it.spc.webui.mapping.ExtSearchField");
jQuery.sap.require("com.sap.it.spc.webui.mapping.library");
jQuery.sap.require("sap.ui.commons.SearchField");
/**
 * Constructor for a new ExtSearchField. Accepts an object literal <code>mSettings</code> that defines initial property values, aggregated
 * and associated objects as well as event handlers. If the name of a setting is ambiguous (e.g. a property has the same name as an event),
 * then the framework assumes property, aggregation, association, event in that order. To override this automatic resolution, one of the
 * prefixes "aggregation:", "association:" or "event:" can be added to the name of the setting (such a prefixed name must be enclosed in
 * single or double quotes). The supported settings are:
 * <ul>
 * <li>Properties
 * <ul>
 * <li>{@link #getShowNavigationButtons showNavigationButtons} : boolean</li>
 * <li>{@link #getInfoText infoText} : string (default: 'null')</li>
 * </ul>
 * </li>
 * <li>Aggregations
 * <ul>
 * </ul>
 * </li>
 * <li>Associations
 * <ul>
 * </ul>
 * </li>
 * <li>Events
 * <ul>
 * <li>{@link com.sap.it.spc.webui.mapping.ExtSearchField#event:next next} : fnListenerFunction or [fnListenerFunction, oListenerObject] or
 * [oData, fnListenerFunction, oListenerObject]</li>
 * <li>{@link com.sap.it.spc.webui.mapping.ExtSearchField#event:prev prev} : fnListenerFunction or [fnListenerFunction, oListenerObject] or
 * [oData, fnListenerFunction, oListenerObject]</li>
 * <li>{@link com.sap.it.spc.webui.mapping.ExtSearchField#event:clear clear} : fnListenerFunction or [fnListenerFunction, oListenerObject]
 * or [oData, fnListenerFunction, oListenerObject]</li>
 * </ul>
 * </li>
 * </ul>
 * In addition, all settings applicable to the base type {@link sap.ui.commons.SearchField#constructor sap.ui.commons.SearchField} can be
 * used as well.
 *
 * @param {string} [sId] id for the new control, generated automatically if no id is given
 * @param {object} [mSettings] initial settings for the new control
 * @class Provides extra buttons which will fire events for navigation
 * @extends sap.ui.commons.SearchField
 * @author Mouli Kalakota
 * @constructor
 * @public
 * @name com.sap.it.spc.webui.mapping.ExtSearchField
 */
sap.ui.commons.SearchField.extend(
  "com.sap.it.spc.webui.mapping.ExtSearchField",
  {
    metadata: {
      // ---- object ----
      // ---- control specific ----
      library: "com.sap.it.spc.webui.mapping",
      properties: {
        showNavigationButtons: {
          type: "boolean",
          group: "Behavior",
          defaultValue: null,
        },
        infoText: {
          type: "string",
          group: "Appearance",
          defaultValue: "null",
        },
      },
      events: {
        next: {},
        prev: {},
        clear: {},
      },
    },
  }
);
/**
 * Creates a new subclass of class com.sap.it.spc.webui.mapping.ExtSearchField with name <code>sClassName</code> and enriches it with the
 * information contained in <code>oClassInfo</code>. <code>oClassInfo</code> might contain the same kind of informations as described
 * in {@link sap.ui.core.Element.extend Element.extend}.
 *
 * @param {string} sClassName name of the class to be created
 * @param {object} [oClassInfo] object literal with informations about the class
 * @param {function} [FNMetaImpl] constructor function for the metadata object. If not given, it defaults to sap.ui.core.ElementMetadata.
 * @return {function} the created class / constructor function
 * @public
 * @static
 * @name com.sap.it.spc.webui.mapping.ExtSearchField.extend
 * @function
 */
com.sap.it.spc.webui.mapping.ExtSearchField.M_EVENTS = {
  next: "next",
  prev: "prev",
  clear: "clear",
};
/**
 * Getter for property <code>showNavigationButtons</code>. To show nvaigation buttons along with the search field Default value is empty/<code>undefined</code>
 *
 * @return {boolean} the value of property <code>showNavigationButtons</code>
 * @public
 * @name com.sap.it.spc.webui.mapping.ExtSearchField#getShowNavigationButtons
 * @function
 */
/**
 * Setter for property <code>showNavigationButtons</code>. Default value is empty/<code>undefined</code>
 *
 * @param {boolean} bShowNavigationButtons new value for property <code>showNavigationButtons</code>
 * @return {com.sap.it.spc.webui.mapping.ExtSearchField} <code>this</code> to allow method chaining
 * @public
 * @name com.sap.it.spc.webui.mapping.ExtSearchField#setShowNavigationButtons
 * @function
 */
/**
 * Getter for property <code>infoText</code>. Info text to show on the search field Default value is <code>null</code>
 *
 * @return {string} the value of property <code>infoText</code>
 * @public
 * @name com.sap.it.spc.webui.mapping.ExtSearchField#getInfoText
 * @function
 */
/**
 * Setter for property <code>infoText</code>. Default value is <code>null</code>
 *
 * @param {string} sInfoText new value for property <code>infoText</code>
 * @return {com.sap.it.spc.webui.mapping.ExtSearchField} <code>this</code> to allow method chaining
 * @public
 * @name com.sap.it.spc.webui.mapping.ExtSearchField#setInfoText
 * @function
 */
/**
 * fired when navigation button "next" is pressed
 *
 * @name com.sap.it.spc.webui.mapping.ExtSearchField#next
 * @event
 * @param {sap.ui.base.Event} oControlEvent
 * @param {sap.ui.base.EventProvider} oControlEvent.getSource
 * @param {object} oControlEvent.getParameters
 * @public
 */
/**
 * Attach event handler <code>fnFunction</code> to the 'next' event of this <code>com.sap.it.spc.webui.mapping.ExtSearchField</code>.<br/>.
 * When called, the context of the event handler (its <code>this</code>) will be bound to <code>oListener<code> if specified
 * otherwise to this <code>com.sap.it.spc.webui.mapping.ExtSearchField</code>.<br/> itself.
 *
 * fired when navigation button "next" is pressed
 *
 * @param {object}
 *            [oData] An application specific payload object, that will be passed to the event handler along with the event object when firing the event.
 * @param {function}
 *            fnFunction The function to call, when the event occurs.
 * @param {object}
 *            [oListener=this] Context object to call the event handler with. Defaults to this <code>com.sap.it.spc.webui.mapping.ExtSearchField</code>.<br/> itself.
 *
 * @return {com.sap.it.spc.webui.mapping.ExtSearchField} <code>this</code> to allow method chaining
 * @public
 * @name com.sap.it.spc.webui.mapping.ExtSearchField#attachNext
 * @function
 */
/**
 * Detach event handler <code>fnFunction</code> from the 'next' event of this <code>com.sap.it.spc.webui.mapping.ExtSearchField</code>.<br/>
 * The passed function and listener object must match the ones used for event registration.
 *
 * @param {function} fnFunction The function to call, when the event occurs.
 * @param {object} oListener Context object on which the given function had to be called.
 * @return {com.sap.it.spc.webui.mapping.ExtSearchField} <code>this</code> to allow method chaining
 * @public
 * @name com.sap.it.spc.webui.mapping.ExtSearchField#detachNext
 * @function
 */
/**
 * Fire event next to attached listeners.
 *
 * @param {Map} [mArguments] the arguments to pass along with the event.
 * @return {com.sap.it.spc.webui.mapping.ExtSearchField} <code>this</code> to allow method chaining
 * @protected
 * @name com.sap.it.spc.webui.mapping.ExtSearchField#fireNext
 * @function
 */
/**
 * fired when navigation button "prev" is pressed
 *
 * @name com.sap.it.spc.webui.mapping.ExtSearchField#prev
 * @event
 * @param {sap.ui.base.Event} oControlEvent
 * @param {sap.ui.base.EventProvider} oControlEvent.getSource
 * @param {object} oControlEvent.getParameters
 * @public
 */
/**
 * Attach event handler <code>fnFunction</code> to the 'prev' event of this <code>com.sap.it.spc.webui.mapping.ExtSearchField</code>.<br/>.
 * When called, the context of the event handler (its <code>this</code>) will be bound to <code>oListener<code> if specified
 * otherwise to this <code>com.sap.it.spc.webui.mapping.ExtSearchField</code>.<br/> itself.
 *
 * fired when navigation button "prev" is pressed
 *
 * @param {object}
 *            [oData] An application specific payload object, that will be passed to the event handler along with the event object when firing the event.
 * @param {function}
 *            fnFunction The function to call, when the event occurs.
 * @param {object}
 *            [oListener=this] Context object to call the event handler with. Defaults to this <code>com.sap.it.spc.webui.mapping.ExtSearchField</code>.<br/> itself.
 *
 * @return {com.sap.it.spc.webui.mapping.ExtSearchField} <code>this</code> to allow method chaining
 * @public
 * @name com.sap.it.spc.webui.mapping.ExtSearchField#attachPrev
 * @function
 */
/**
 * Detach event handler <code>fnFunction</code> from the 'prev' event of this <code>com.sap.it.spc.webui.mapping.ExtSearchField</code>.<br/>
 * The passed function and listener object must match the ones used for event registration.
 *
 * @param {function} fnFunction The function to call, when the event occurs.
 * @param {object} oListener Context object on which the given function had to be called.
 * @return {com.sap.it.spc.webui.mapping.ExtSearchField} <code>this</code> to allow method chaining
 * @public
 * @name com.sap.it.spc.webui.mapping.ExtSearchField#detachPrev
 * @function
 */
/**
 * Fire event prev to attached listeners.
 *
 * @param {Map} [mArguments] the arguments to pass along with the event.
 * @return {com.sap.it.spc.webui.mapping.ExtSearchField} <code>this</code> to allow method chaining
 * @protected
 * @name com.sap.it.spc.webui.mapping.ExtSearchField#firePrev
 * @function
 */
/**
 * fired when button "clear" is pressed
 *
 * @name com.sap.it.spc.webui.mapping.ExtSearchField#clear
 * @event
 * @param {sap.ui.base.Event} oControlEvent
 * @param {sap.ui.base.EventProvider} oControlEvent.getSource
 * @param {object} oControlEvent.getParameters
 * @public
 */
/**
 * Attach event handler <code>fnFunction</code> to the 'clear' event of this <code>com.sap.it.spc.webui.mapping.ExtSearchField</code>.<br/>.
 * When called, the context of the event handler (its <code>this</code>) will be bound to <code>oListener<code> if specified
 * otherwise to this <code>com.sap.it.spc.webui.mapping.ExtSearchField</code>.<br/> itself.
 *
 * fired when button "clear" is pressed
 *
 * @param {object}
 *            [oData] An application specific payload object, that will be passed to the event handler along with the event object when firing the event.
 * @param {function}
 *            fnFunction The function to call, when the event occurs.
 * @param {object}
 *            [oListener=this] Context object to call the event handler with. Defaults to this <code>com.sap.it.spc.webui.mapping.ExtSearchField</code>.<br/> itself.
 *
 * @return {com.sap.it.spc.webui.mapping.ExtSearchField} <code>this</code> to allow method chaining
 * @public
 * @name com.sap.it.spc.webui.mapping.ExtSearchField#attachClear
 * @function
 */
/**
 * Detach event handler <code>fnFunction</code> from the 'clear' event of this <code>com.sap.it.spc.webui.mapping.ExtSearchField</code>.<br/>
 * The passed function and listener object must match the ones used for event registration.
 *
 * @param {function} fnFunction The function to call, when the event occurs.
 * @param {object} oListener Context object on which the given function had to be called.
 * @return {com.sap.it.spc.webui.mapping.ExtSearchField} <code>this</code> to allow method chaining
 * @public
 * @name com.sap.it.spc.webui.mapping.ExtSearchField#detachClear
 * @function
 */
/**
 * Fire event clear to attached listeners.
 *
 * @param {Map} [mArguments] the arguments to pass along with the event.
 * @return {com.sap.it.spc.webui.mapping.ExtSearchField} <code>this</code> to allow method chaining
 * @protected
 * @name com.sap.it.spc.webui.mapping.ExtSearchField#fireClear
 * @function
 */
// -----------------------------------------------------------------------------
// Begin of Control Behavior, copied from ExtSearch.js
// -----------------------------------------------------------------------------
com.sap.it.spc.webui.mapping.ExtSearchField.prototype.init = function () {
  sap.ui.commons.SearchField.prototype.init.apply(this, arguments);
};
com.sap.it.spc.webui.mapping.ExtSearchField.prototype._createNavButtons =
  function () {
    var sTheme, sModuleName;
    jQuery.sap.require("sap.ui.commons.Image");
    sModuleName = "com.sap.it.spc.webui.mapping";
    sTheme = sap.ui.getCore().getConfiguration().getTheme();
    this._btnNext = new sap.ui.commons.Image({
      src: jQuery.sap.getModulePath(
        sModuleName,
        "/themes/" + sTheme + "/img/sort_down.png"
      ),
      enabled: this.getEnabled() && this.getEditable(),
    });
    this._btnNext.addStyleClass("webuiExtSearchNavBtnNext");
    this._btnNext.attachPress(function () {
      if (this.getEnabled()) {
        this.fireNext();
      }
    }, this);
    this._btnNext.setParent(this);
    this._btnPrev = new sap.ui.commons.Image({
      src: jQuery.sap.getModulePath(
        sModuleName,
        "/themes/" + sTheme + "/img/sort_up.png"
      ),
      enabled: this.getEnabled() && this.getEditable(),
    });
    this._btnPrev.addStyleClass("webuiExtSearchNavBtnPrev");
    this._btnPrev.attachPress(function () {
      if (this.getEnabled()) {
        this.firePrev();
      }
    }, this);
    this._btnPrev.setParent(this);
  };
com.sap.it.spc.webui.mapping.ExtSearchField.prototype.setShowNavigationButtons =
  function (bShowNavigationButtons) {
    if (this.getShowNavigationButtons() !== bShowNavigationButtons) {
      if (bShowNavigationButtons) {
        this._createNavButtons();
      } else {
        this._btnNext.destroy();
        this._btnNext = null;
        this._btnPrev.destroy();
        this._btnPrev = null;
      }
    }
    this.setProperty("showNavigationButtons", bShowNavigationButtons);
  };
com.sap.it.spc.webui.mapping.ExtSearchField.prototype.setInfoText = function (
  sText
) {
  if (sText && sText.trim()) {
    sText = sText.trim();
    if (!this._infoTV) {
      this._infoTV = new sap.ui.commons.TextView();
      this._infoTV.addStyleClass("webuiExtSearchInfoView");
    }
    this._infoTV.setText(sText);
    this.setProperty("infoText", sText);
  }
};
com.sap.it.spc.webui.mapping.ExtSearchField.prototype.onclick = function (
  oEvent
) {
  if (oEvent.target === jQuery.sap.domById(this._ctrl.getId() + "-searchico")) {
    if (this.getEnableClear()) {
      this.fireClear();
    }
  }
};
com.sap.it.spc.webui.mapping.ExtSearchField.prototype.exit = function () {
  sap.ui.commons.SearchField.prototype.exit.apply(this, arguments);
  if (this._btnNext) {
    this._btnNext.destroy();
    this._btnNext = null;
  }
  if (this._btnPrev) {
    this._btnPrev.destroy();
    this._btnPrev = null;
  }
  if (this._infoTV) {
    this._infoTV.destroy();
    this._infoTV = null;
  }
};
