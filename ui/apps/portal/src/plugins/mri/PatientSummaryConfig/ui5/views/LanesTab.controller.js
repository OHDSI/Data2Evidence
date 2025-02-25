sap.ui.define(
  [
    "jquery.sap.global",
    "hc/hph/patient/config/ui/lib/ConfigUtils",
    "sap/m/MessageBox",
    "sap/ui/unified/Menu",
    "hc/hph/patient/config/ui/views/MenuItem",
    "sap/ui/core/LocaleData",
    "sap/ui/core/mvc/Controller",
    "sap/ui/thirdparty/jqueryui/jquery-ui-effect",
    "sap/ui/thirdparty/jqueryui/jquery-ui-core",
    "sap/ui/thirdparty/jqueryui/jquery-ui-widget",
    "sap/ui/thirdparty/jqueryui/jquery-ui-mouse",
    "sap/ui/thirdparty/jqueryui/jquery-ui-sortable",
  ],
  function (jQuery, ConfigUtils, MessageBox, Menu, MenuItem, LocaleData, Controller) {
    "use strict";

    /**
     * Constructor for the LanesTab Controller.
     * @constructor
     *
     * @classdesc
     * Controller for the lanes tab.
     * @extends sap.ui.core.mvc.Controller
     * @alias hc.hph.patient.config.ui.views.LanesTab
     */
    var LanesTabController = Controller.extend("hc.hph.patient.config.ui.views.LanesTab");

    /**
     * Initialize the Controller.
     * @protected
     * @override
     */
    LanesTabController.prototype.onInit = function () {
      this._navContainer = this.byId("lanesTabNavCont");
      this._lanesOverviewPage = this.byId("lanesTabPage1");
      this._laneDetailsPage = this.byId("lanesTabPage2");
      this._lanesList = this.byId("lanesList");
      this._interactionsInLane = this.byId("interactionsList");
      this._attributeTableRowFragment = sap.ui.xmlfragment(
        "hc.hph.patient.config.ui.views.AttributeTableRow",
        this
      );
    };

    /**
     * Factory function for attribute rows in the interaction tables.
     * @private
     * @param {string} sId the suffix to be appended to the created element ID
     * @returns {hc.hph.patient.config.ui.views.AttributeTableRow} an xml fragment containing a table row
     */
    LanesTabController.prototype.createAttributeRow = function (sId) {
      return this._attributeTableRowFragment.clone(sId);
    };

    /**
     * Handler for the change event on the switch to make all attributes visible.
     * @param {sap.ui.base.Event} oEvent SAPUI5 change Event.
     */
    LanesTabController.prototype.onAllVisiblePressed = function (oEvent) {
      var newState = oEvent.getParameters().state;
      var oBindingContext = oEvent.getSource().getBindingContext("analyticsModel");
      var nbOfAttributes = oBindingContext.getProperty("attributes").length;
      var interactionPath = oBindingContext.getPath();
      var oAnalyticsModel = this.getView().getModel("analyticsModel");
      var oContext = oAnalyticsModel.getContext(interactionPath);

      for (var i = 0; i < nbOfAttributes; i++) {
        var sAttrPathVisible = "attributes/" + i + "/visible";
        oAnalyticsModel.setProperty(sAttrPathVisible, newState, oContext);

        if (!newState) {
          // set the visible on tile property to false
          oAnalyticsModel.setProperty("attributes/" + i + "/firstTileAttribute", false, oContext);
          oAnalyticsModel.setProperty("attributes/" + i + "/secondTileAttribute", false, oContext);
        }
      }
      // trigger refresh the binding of the text showing the number of visible elements
      var oDynamicBindingsModel = this.getView().getModel("dynamicBindingsModel");
      oDynamicBindingsModel.setProperty(
        "/attrVisibilityUpdateFlag",
        !oDynamicBindingsModel.getProperty("/attrVisibilityUpdateFlag")
      );
    };

    /**
     * Handler for the change event on the switch to make all attributes plottable.
     * @param {sap.ui.base.Event} oEvent SAPUI5 change Event.
     */
    LanesTabController.prototype.onAllPlottablePressed = function (oEvent) {
      var newState = oEvent.getParameters().state;
      var oBindingContext = oEvent.getSource().getBindingContext("analyticsModel");
      var nbOfAttributes = oBindingContext.getProperty("attributes").length;
      var interactionPath = oBindingContext.getPath();
      var oAnalyticsModel = this.getView().getModel("analyticsModel");

      for (var i = 0; i < nbOfAttributes; i++) {
        var sAttrPathNumerical = interactionPath + "/attributes/" + i + "/numerical";
        var sAttrNumerical = oAnalyticsModel.getProperty(sAttrPathNumerical);
        var sAttrPathPlottable = interactionPath + "/attributes/" + i + "/plottable";
        oAnalyticsModel.setProperty(sAttrPathPlottable, sAttrNumerical && newState);
      }
    };

    /**
     * Switch between the Lane list page and the single Lane page.
     * @param {string} sPageId Page Id
     */
    LanesTabController.prototype.goToPage = function (sPageId) {
      // manually reset the model to reflect all the changes done in the second page
      // some text are bound to the container instead of the property and don't get notified automatically
      this._lanesList.getBinding("items").refresh(true);
      if (sPageId === "lanesTabPage1") {
        this._navContainer.back();
      }
      if (sPageId === "lanesTabPage2") {
        this._navContainer.to(this._laneDetailsPage);
      }
    };

    /**
     * Handler for the back navigation.
     * Updates the bindings.
     */
    LanesTabController.prototype.onBackSelect = function () {
      // manually reset the model to reflect all the changes done in the second page
      // some text are bound to the container instead of the property and don't get notified automatically
      this._lanesList.getBinding("items").refresh(true);
      this._navContainer.back();
    };

    /**
     * Updates the model with order of the dom elements.
     * Used when changing the lane order via drag and drop.
     * @private
     */
    LanesTabController.prototype._applyDomOrderToModel = function () {
      var oModel = this._lanesList.getModel("analyticsModel");
      var oBinding = this._lanesList.getBinding("items");

      var aLanes = this._lanesList.getItems();
      aLanes.forEach(function (oLane) {
        var oLaneContext = oLane.getBindingContext("analyticsModel");
        var iOrder = oLane.$().index();
        oModel.setProperty("order", iOrder, oLaneContext);
      });
      oBinding.applySort();
    };

    /**
     * This functions replaces an internal jQuery function (jQuery.ui.sortable.prototype._intersectsWithPointer) to fix a bug
     * where first and last elements in a sortable list may not be reachable as the target of a drag-and-drop operation.
     * This is the the case when user clicks the top/bottom part of a large item and moves it down/up.
     *
     * The bug is fixed by replacing the current mouse position with the position of the helper object's top and
     * bottom border for vertical "up" and "down" movements, respectively. The function below was copied verbatim from
     * jQuery.ui.sortable.prototype._intersectsWithPointer (version: jQuery UI Sortable 1.10.4). The only line that was changed
     * is marked by a comment.
     *
     *   List      Original Implementation         Replacement Implementation
     *   -------
     *   |     |   Dragged Item  ("Helper")        Dragged Item ("Helper")
     *   |item |   -------                         -------  <-- upper border determines intersection
     *   |     |   |     |       mouse click       |     |      for "up" moves
     *   -------   | *   | <--   position          |     |
     *   |     |   |     |       determines        |     |
     *   |item |   -------       intersection      -------  <-- lower border determines intersection
     *   |     |                                                for "down" moves
     *   -------
     *   |     |
     *   |item |
     *   |     |
     *   -------
     *
     * @param {object} item sortable item that is checked for interaction with the current pointer
     * @returns {boolean} true if intersection found; otherwise false
     * @private
     */
    LanesTabController.prototype._jQuerySortableIntersectsWithPointer = function (item) {
      function isOverAxis(x, reference, size) {
        return x > reference && x < reference + size;
      }

      var verticalDirection = this._getDragVerticalDirection();
      var horizontalDirection = this._getDragHorizontalDirection();

      // the next line was patched to use helper elements upper/lower border position
      var isOverElementHeight =
        this.options.axis === "x" ||
        isOverAxis(
          this.positionAbs.top + (verticalDirection === "down" ? this.helperProportions.height : 0),
          item.top,
          item.height
        );
      var isOverElementWidth =
        this.options.axis === "y" || isOverAxis(this.positionAbs.left + this.offset.click.left, item.left, item.width);
      var isOverElement = isOverElementHeight && isOverElementWidth;

      if (!isOverElement) {
        return false;
      }

      if (this.floating) {
        return horizontalDirection === "right" || verticalDirection === "down" ? 2 : 1;
      } else {
        return verticalDirection && (verticalDirection === "down" ? 2 : 1);
      }
    };

    /**
     * Enables/Disables the up and down buttons for attributes based on their position in the table:
     * topmost up button, and lowest down buttons are disabled. All others enabled.
     * @param {sap.m.Table} oTableControl the control of the attribute table
     * @private
     */
    LanesTabController.prototype._updateAttributeMovementButtons = function (oTableControl) {
      var aUpButtons = oTableControl.$().find(".AttributeUpButton").control();
      var aDownButtons = oTableControl.$().find(".AttributeDownButton").control();
      aUpButtons.forEach(function (oUpButtonControl, index) {
        oUpButtonControl.setEnabled(index !== 0);
      });
      aDownButtons.forEach(function (oDownButtonControl, index) {
        oDownButtonControl.setEnabled(index !== aDownButtons.length - 1);
      });
    };

    /**
     * Updates the model with the dom order of the attribute elements.
     * Used when changing the attribute order via drag and drop.
     *
     * Note: The typical implementation would first update the order of attributes in the model,
     *       and then call oTableControl.getBinding("items").sort(...) to make the table reflect
     *       the new order in the model.
     *       In our implementation, we are updating the order of attributes in the model as usual,
     *       but do NOT trigger an update to the table control via oTableControl.getBinding("items").sort(...).
     *       We avoid calling sort() on the model binding because it would cause a re-rendering
     *       of the whole table which causes very ugly flickering and which is also unneccessary (!)
     *       as jQuery's sortable widget has already reordered the dom elements.
     *       One problem remains: In case of a re-rendering (triggered from somewhere else) the table
     *       would now display the attributes in wrong order because the "items" aggregation of attribute
     *       rows still reflects the old order. This is why we are also manually moving the attribute row
     *       control in the aggregation to its new position.
     *
     *    0. Before Drag-and-Drop
     *
     *           Model           "Items" Aggregation     Rendered DOM elements
     *
     *       A (Order: 1)   <-----+   Attribute    +--------->  "A"
     *
     *       B (Order: 2)   <-----+   Attribute    +--------->  "B"
     *
     *       C (Order: 3)   <-----+   Attribute    +--------->  "C"
     *
     *
     *    1. After Drag-and-Drop (DOM element "B" moved before "A")
     *
     *           Model           "Items" Aggregation     Rendered DOM elements
     *
     *       A (Order: 1)   <-----+   Attribute    +--XXXXX-->  "B"
     *
     *       B (Order: 2)   <-----+   Attribute    +--XXXXX-->  "A"
     *
     *       C (Order: 3)   <-----+   Attribute    +--------->  "C"
     *
     *
     *    2. After Model Update (Order of B is 1, Order of A is 2)
     *
     *           Model           "Items" Aggregation     Rendered DOM elements
     *
     *       A (Order: 2)   <-----+   Attribute    +--XXXXX-->  "B"
     *
     *       B (Order: 1)   <-----+   Attribute    +--XXXXX-->  "A"
     *
     *       C (Order: 3)   <-----+   Attribute    +--------->  "C"
     *
     *
     *    3. After Aggregation Update (Attribute bound to B in model is now first in aggregation)
     *
     *           Model           "Items" Aggregation     Rendered DOM elements
     *
     *       A (Order: 2)  <--. .-+   Attribute    +--------->  "B"
     *                         x
     *       B (Order: 1)  <--' '-+   Attribute    +--------->  "A"
     *
     *       C (Order: 3)  <------+   Attribute    +--------->  "C"
     *
     * @private
     * @param {object} event jQuery event that is triggered when the user stopped sorting and the DOM position has changed.
     * @param {object} ui jQuery helper objects
     * @param {object} ui.helper the jQuery object representing the helper being sorted.
     * @param {object} ui.item The jQuery object representing the current dragged element.
     * @param {object} ui.offset The current absolute position of the helper represented as { top, left }.
     * @param {object} ui.position The current position of the helper represented as { top, left }.
     * @param {object} ui.originalPosition The original position of the element represented as { top, left }.
     * @param {object} ui.sender The sortable that the item comes from if moving from one sortable to another.
     * @param {object} ui.placeholder The jQuery object representing the element being used as a placeholder.
     */
    LanesTabController.prototype._applyDomAttributeOrderToModel = function (event, ui) {
      var oTableControl = jQuery(event.target).control()[0];
      var oModel = oTableControl.getModel("analyticsModel");
      var oDroppedAttributeControl = ui.item.control()[0];
      var iDropIndex = ui.item[0].rowIndex - 1;

      // manually move control element in aggregation to its new position
      oTableControl.removeAggregation("items", oDroppedAttributeControl, true);
      oTableControl.insertAggregation("items", oDroppedAttributeControl, iDropIndex, true);

      // update order of attributes in the model
      var aAttributeItems = oTableControl.getItems();
      aAttributeItems.forEach(function (oAttribute) {
        var oAttributeContext = oAttribute.getBindingContext("analyticsModel");
        var iNewIndex = oAttribute.$()[0].rowIndex - 1;
        oModel.setProperty("order", iNewIndex, oAttributeContext, false);
      });

      this._updateAttributeMovementButtons(oTableControl);
    };

    /**
     * Uses jQuery sortable to allow changing the lane order via drag and drop.
     */
    LanesTabController.prototype._enableDragAndDrop = function () {
      var $LaneList = this._lanesList.$("listUl");

      $LaneList
        .sortable({
          axis: "y",
          containment: "parent",
          delay: 200,
          distance: 0,
          items: "> .lanesListItem",
          tolerance: "pointer",
          update: this._applyDomOrderToModel.bind(this),
        })
        .disableSelection();
    };

    /**
     * Uses jQuery sortable to allow changing the attribute order via drag and drop.
     */
    LanesTabController.prototype._enableAttributeDragAndDrop = function () {
      var that = this;
      jQuery(".attributeTable tbody")
        .sortable({
          axis: "y",
          containment: "parent",
          delay: 200,
          distance: 0,
          items: "> .columnListItem",
          tolerance: "pointer",
          forcePlaceholderSize: false,
          placeholder: "sortable-placeholder",
          update: this._applyDomAttributeOrderToModel.bind(this),
          start: function (e, ui) {
            // disable pointer events on all items so we do not trigger events when dragging over buttons
            ui.item.siblings().addBack().css("pointer-events", "none");
            ui.placeholder.height(ui.helper[0].scrollHeight);
          },
          stop: function (e, ui) {
            // reset pointer events
            ui.item.siblings().addBack().css("pointer-events", "");
          },
        })
        .each(function (index, element) {
          // overwrite internal jQuery function to fix bug (see replacement function's comment above)
          jQuery(element).data("uiSortable")._intersectsWithPointer = that._jQuerySortableIntersectsWithPointer;
        });
    };

    /**
     * Handler for the lane tab finishing the rendering.
     * Required to enable drag and drop after switching tabs.
     */
    LanesTabController.prototype.onAfterRendering = function () {
      this._enableDragAndDrop();
      this._enableAttributeDragAndDrop();
    };

    /**
     * Handler for the lane list finishing an update.
     * Required to enable drag and drop list updates without full rerendering.
     */
    LanesTabController.prototype.onLaneListUpdateFinished = function () {
      this._enableDragAndDrop();
    };

    /**
     * Handler for the lane list finishing an update.
     * Required to enable drag and drop list updates without full rerendering.
     * @param {sap.ui.base.Event} oEvent the update event
     */
    LanesTabController.prototype.onAttributeTableUpdateFinished = function (oEvent) {
      this._enableAttributeDragAndDrop();
      this._updateAttributeMovementButtons(oEvent.getSource());
    };

    /**
     * Handler for the move lane up button.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press event
     */
    LanesTabController.prototype.onMoveLaneUp = function (oEvent) {
      this._moveLane(oEvent, true);
    };

    /**
     * Handler for the move lane down button.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press event
     */
    LanesTabController.prototype.onMoveLaneDown = function (oEvent) {
      this._moveLane(oEvent, false);
    };

    /**
     * Move a lane up or down.
     * @private
     * @param   {sap.ui.base.Event} oEvent  SAPUI5 press event
     * @param   {boolean}           bMoveUp True, to move upwards
     */
    LanesTabController.prototype._moveLane = function (oEvent, bMoveUp) {
      var iShiftDirection = bMoveUp ? -1 : 1;
      var iShiftInverse = bMoveUp ? 1 : -1;
      var sElemPath = oEvent.getSource().getBindingContext("analyticsModel").getPath();
      var aPathParts = sElemPath.split("/");
      var iElemOrder = this.getView()
        .getModel("analyticsModel")
        .getProperty(sElemPath + "/order");
      aPathParts.splice(aPathParts.length - 1, 1);
      var sParentPath = aPathParts.join("/");
      var aAllLanes = this.getView().getModel("analyticsModel").getProperty(sParentPath);

      // show the list item as selected
      this._lanesList.setSelectedItemById(this._lanesList.getItems()[iElemOrder].getId());

      // check that moving the element doesn't take it out of the array borders
      if (iElemOrder + iShiftDirection >= 0 && iElemOrder + iShiftDirection <= aAllLanes.length - 1) {
        var iNeighbourElemOrder = iElemOrder + iShiftDirection;

        var aNewAllLanes = aAllLanes.map(function (oLane) {
          if (oLane.order === iElemOrder) {
            oLane.order += iShiftDirection;
          } else if (oLane.order === iNeighbourElemOrder) {
            oLane.order += iShiftInverse;
          }
          return oLane;
        });
        this.getView().getModel("analyticsModel").setProperty(sParentPath, aNewAllLanes);

        var itemsBinding = this._lanesList.getBinding("items");
        itemsBinding.sort(itemsBinding.aSorters[0]);
      }
    };

    /**
     * Handler for the selection of a lane.
     * Navigate to the lane details page.
     * @param {sap.ui.base.Event} oEvent SAPUI5 Button press event
     */
    LanesTabController.prototype.onLanesItemPress = function (oEvent) {
      // manually select the item emiting the event for the case the event was programmatically sent
      // (the item was not clicked)
      oEvent.getParameters().listItem.setSelected(true);
      var sPath = oEvent.getParameters().listItem.getBindingContext("analyticsModel").getPath();
      this._laneDetailsPage.bindContext("analyticsModel>" + sPath);
      this._navContainer.to(this._laneDetailsPage);
      this._enableAttributeDragAndDrop();
    };

    /**
     * Handler for the move attribute up button.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press event
     */
    LanesTabController.prototype.onMoveAttributeUp = function (oEvent) {
      this._moveAttribute(oEvent, true);
    };

    /**
     * Handler for the move attribute down button.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press event
     */
    LanesTabController.prototype.onMoveAttributeDown = function (oEvent) {
      this._moveAttribute(oEvent, false);
    };

    /**
     * Move an attribute up or down.
     *
     * Note: The implementation is different from what you would expect. We are manually
     *       updating the model, the table's "items" aggregation of attribute row controls,
     *       and the dom elements. We follow this approach in order to avoid an ugly
     *       flickering due to re-rendering of the whole table. For more information, read
     *       the comment for the _applyDomAttributeOrderToModel function above.
     *
     * @private
     * @param   {sap.ui.base.Event} oEvent  SAPUI5 press event
     * @param   {boolean}           bMoveUp True, to move upwards
     */
    LanesTabController.prototype._moveAttribute = function (oEvent, bMoveUp) {
      var oTableControl = oEvent.getSource().getParent().getParent().getParent();
      var oModel = oEvent.getSource().getModel("analyticsModel");
      var oSourceAttribute = oEvent.getSource();
      var aItems = oTableControl.getItems();
      var sInteractionPath = oSourceAttribute.getBindingContext("analyticsModel").getPath().split("/attributes/")[0];
      var aAttributes = oModel.getProperty(sInteractionPath + "/attributes/");
      var iSourceOrder = oModel.getProperty("order", oSourceAttribute.getBindingContext("analyticsModel"));
      var iLowerAttributeOrder = bMoveUp ? iSourceOrder - 1 : iSourceOrder;
      var iUpperAttributeOrder = bMoveUp ? iSourceOrder : iSourceOrder + 1;

      if (iLowerAttributeOrder >= 0 && iUpperAttributeOrder < aAttributes.length) {
        var oLowerAttributeControl = aItems[iLowerAttributeOrder];
        var oUpperAttributeControl = aItems[iUpperAttributeOrder];

        // switch order in model
        oModel.setProperty(
          "order",
          iLowerAttributeOrder,
          oUpperAttributeControl.getBindingContext("analyticsModel"),
          false
        );
        oModel.setProperty(
          "order",
          iUpperAttributeOrder,
          oLowerAttributeControl.getBindingContext("analyticsModel"),
          false
        );

        // manually switch control elements in aggregation
        oTableControl.removeAggregation("items", oUpperAttributeControl, true);
        oTableControl.insertAggregation("items", oUpperAttributeControl, iLowerAttributeOrder, true);

        // manually switch dom elements
        oUpperAttributeControl.$().insertBefore(oLowerAttributeControl.$());

        this._updateAttributeMovementButtons(oTableControl);
      }
    };

    /**
     * Format the interaction name to include a count of visible and total attributes.
     * @param   {string}   sInterName  Interaction name
     * @param   {object[]} aAttributes List of attributes
     * @param   {boolean}  bGrouped Is grouped interaction
     * @returns {string}   Formatted string including counts.
     */
    LanesTabController.prototype.interTextFormatter = function (sInterName, aAttributes, bGrouped) {
      var iTotalAttr = aAttributes.length;
      var iVisibleAttributes = aAttributes.reduce(function (iPrevSum, oCurrentElem) {
        return iPrevSum + (oCurrentElem.visible ? 1 : 0);
      }, 0);
      return sInterName + (bGrouped ? "" : " (" + iVisibleAttributes + "/" + iTotalAttr + ")");
    };

    /**
     * Handler for setting the visibility of an attribute.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press event
     */
    LanesTabController.prototype.onVisiblePressed = function (oEvent) {
      var oBindingContext = oEvent.getSource().getBindingContext("analyticsModel");
      var sPath = oBindingContext.getPath();

      // if the visibility is set to false, also set the tileVisibility to false
      if (!oEvent.getParameters().state) {
        oBindingContext.getModel().setProperty(sPath + "/firstTileAttribute", false);
        oBindingContext.getModel().setProperty(sPath + "/secondTileAttribute", false);
      }

      // trigger refresh the binding of the text showing the number of visible elements
      var oDynamicBindingsModel = this.getView().getModel("dynamicBindingsModel");
      oDynamicBindingsModel.setProperty(
        "/attrVisibilityUpdateFlag",
        !oDynamicBindingsModel.getProperty("/attrVisibilityUpdateFlag")
      );
    };

    /**
     * Format and translate a language key.
     * @param   {string} sLangKey Language identifier
     * @returns {string} Language name in the current user's language.
     */
    LanesTabController.prototype.langFormatter = function (sLangKey) {
      if (sLangKey) {
        var oLocaleData = new LocaleData(sap.ui.getCore().getConfiguration().getLocale());
        return oLocaleData.getLanguages()[sLangKey];
      }
      return ConfigUtils.getText("HPH_PAT_CFG_LANG_DEFAULT");
    };

    /**
     * Format the path of an attribute.
     * @param   {string} sAttrPath Path to the attribute
     * @returns {string} Formatted path.
     */
    LanesTabController.prototype.secondAttributeFormatter = function (sAttrPath) {
      var sInterPath = /(.*)\.attributes\..*/.exec(sAttrPath)[1];
      return "secondTileAttribute_" + sInterPath;
    };

    /**
     * Format the path of an attribute.
     * @param   {string} sAttrPath Path to the attribute
     * @returns {string} Formatted path.
     */
    LanesTabController.prototype.firstAttributeFormatter = function (sAttrPath) {
      var sInterPath = /(.*)\.attributes\..*/.exec(sAttrPath)[1];
      return "firstTileAttribute_" + sInterPath;
    };

    /**
     * Create a new unique laneId.
     * @param   {object[]} aLanes array of lanes
     * @returns {string} unique laneId
     */
    LanesTabController.prototype._newUniqueLaneId = function (aLanes) {
      var bDuplicateId = true;
      var sNewLaneId = "";
      var aExistingLaneIds = aLanes.map(function (oLane) {
        return oLane.laneId;
      });

      do {
        sNewLaneId = ConfigUtils.createGuid();
        bDuplicateId = aExistingLaneIds.indexOf(sNewLaneId) > -1;
      } while (bDuplicateId);

      return sNewLaneId;
    };

    /**
     * Handler for adding a new lane.
     */
    LanesTabController.prototype.onAddLanePressed = function () {
      var analyticsModel = this.getView().getModel("analyticsModel");
      var sDependentConfigPath = this.getView().getBindingContext("analyticsModel").getPath() + "/meta/dependentConfig";
      var oDependentConfig = analyticsModel.getProperty(sDependentConfigPath);
      var sVersionsPath = "/dmConfigList/" + oDependentConfig.configId + "/versions/" + oDependentConfig.configVersion;
      var oDmVersion = analyticsModel.getProperty(sVersionsPath);
      var emptyLane = ConfigUtils.cloneJson(oDmVersion.laneTemplate);
      var aColorPalette = this.getView().getModel("constantsModel").getProperty("/colorPalette");
      var sLanesPath = this.getView().getBindingContext("analyticsModel").getPath() + "/config/lanes";
      var aLanes = analyticsModel.getProperty(sLanesPath);

      emptyLane.color = aColorPalette[aLanes.length % aColorPalette.length].key;
      emptyLane.order = aLanes.length;
      emptyLane.laneId = this._newUniqueLaneId(aLanes);
      aLanes.push(emptyLane);
      analyticsModel.setProperty(sLanesPath, aLanes);

      this._interactionsInLane
        .getBinding("formElements")
        .filter(new sap.ui.model.Filter("source", sap.ui.model.FilterOperator.NE, "patient.interactions.ga_mutation"));

      // select the new lane and go to the edit page
      this._lanesList.fireItemPress({
        listItem: this._lanesList.getItems()[aLanes.length - 1],
        srcControl: this._lanesList.getItems()[aLanes.length - 1],
      });
    };

    /**
     * Delete a lane from the model.
     * @private
     * @param {string} sItemPath Path to the lane
     */
    LanesTabController.prototype._deleteLane = function (sItemPath) {
      var oAnalyticsModel = this.getView().getModel("analyticsModel");

      var iOrderItemToDelete = oAnalyticsModel.getProperty(sItemPath).order;
      var iIndexToDelete = parseInt(/.*\/lanes\/(\d+)/.exec(sItemPath)[1], 10);
      var sLanesListPath = this._lanesList.getBindingContext("analyticsModel").getPath() + "/config/lanes";
      var aLanes = oAnalyticsModel.getProperty(sLanesListPath);

      // remove the item
      aLanes.splice(iIndexToDelete, 1);

      // reset the order of the remaining elements such that the order used are consecutive numbers starting from 0
      aLanes = aLanes.map(function (oElem) {
        if (oElem.order > iOrderItemToDelete) {
          oElem.order -= 1;
        }
        return oElem;
      });
      oAnalyticsModel.setProperty(sLanesListPath, aLanes);
    };

    /**
     * Handler for the press event on the Delete Config Button.
     * Opens a confirmation dialog before publishing the Delete Event.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    LanesTabController.prototype.onDeleteLane = function (oEvent) {
      var that = this;
      var sItemPath = oEvent.getSource().getBindingContext("analyticsModel").getPath();

      MessageBox.show(ConfigUtils.getText("HPH_PAT_CFG_DELETE_LANE_MSG"), {
        icon: MessageBox.Icon.QUESTION,
        title: ConfigUtils.getText("HPH_PAT_CFG_DELETE_LANE_TITLE"),
        actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
        onClose: function (oAction) {
          if (oAction === MessageBox.Action.DELETE) {
            that._deleteLane(sItemPath);
          }
        },
      });
    };

    /**
     * Format a color key to the corresponding code.
     * @param   {string} sColorKey Color key
     * @returns {string} Color code.
     */
    LanesTabController.prototype.colorKeyToCodeFormatter = function (sColorKey) {
      var oConstantsModel = this.getView().getModel("constantsModel");
      if (oConstantsModel) {
        var aColors = oConstantsModel.getProperty("/colorPalette");
        for (var i = 0; i < aColors.length; i++) {
          if (aColors[i].key === sColorKey) {
            return aColors[i].code;
          }
        }
      }
      return "";
    };

    /**
     * Format a color name to the corresponding translation.
     * @param   {string} sColorName Color name (translation key)
     * @returns {string} Translated color name.
     */
    LanesTabController.prototype.colorNameToTranslationFormatter = function (sColorName) {
      return ConfigUtils.getText(sColorName);
    };

    /**
     * Format the visible interactions of a lane into a readable string.
     * @param   {object} mLane Lane object
     * @returns {string} Formatted list of interactions.
     */
    LanesTabController.prototype.laneDetailsFormatter = function (mLane) {
      var aVisibleInteractions = [];
      mLane.interactions.reduce(function (aPrevValues, oInteraction) {
        if (oInteraction.visible) {
          aPrevValues.push(oInteraction.modelName);
        }
        return aPrevValues;
      }, aVisibleInteractions);
      return aVisibleInteractions.join(", ");
    };

    /**
     * Changes the 0-indexed order to 1-indexed for displaying.
     * @param   {number} iOrder Technical order value
     * @returns {number} Display order value
     */
    LanesTabController.prototype.orderFormatter = function (iOrder) {
      return iOrder + 1;
    };

    /**
     * Handler for resetting the first attribute.
     * @param {sap.ui.base.Event} oEvent SAPUI5 Button press event
     */
    LanesTabController.prototype.onResetFirstAttrPressed = function (oEvent) {
      var sInteractionPath = oEvent.getSource().getBindingContext("analyticsModel").getPath();
      var oAnalyticsModel = oEvent.getSource().getModel("analyticsModel");
      var oInter = oAnalyticsModel.getProperty(sInteractionPath);
      for (var i = 0; i < oInter.attributes.length; i++) {
        oInter.attributes[i].firstTileAttribute = false;
        oAnalyticsModel.setProperty(sInteractionPath + "/attributes/" + i, oInter.attributes[i]);
      }
    };

    /**
     * Handler for resetting the second attribute.
     * @param {sap.ui.base.Event} oEvent SAPUI5 Button press event
     */
    LanesTabController.prototype.onResetSecondAttrPressed = function (oEvent) {
      var sInteractionPath = oEvent.getSource().getBindingContext("analyticsModel").getPath();
      var oAnalyticsModel = oEvent.getSource().getModel("analyticsModel");
      var oInter = oAnalyticsModel.getProperty(sInteractionPath);
      for (var i = 0; i < oInter.attributes.length; i++) {
        oInter.attributes[i].secondTileAttribute = false;
        oAnalyticsModel.setProperty(sInteractionPath + "/attributes/" + i, oInter.attributes[i]);
      }
    };

    /**
     * Format semantic annotations into readable remarks.
     * @param   {string[]} aAnnotations List of annotations
     * @returns {string}   Remark.
     */
    LanesTabController.prototype.annotationsToRemarksFormatter = function (aAnnotations) {
      if (aAnnotations && aAnnotations.indexOf("genomics_sample_id") !== -1) {
        return ConfigUtils.getText("HPH_PAT_CFG_GENOMIC_SAMPLE_ADMIN_REMARK");
      }
    };

    /**
     * Handler for the press event on first tile attribute flag.
     * Ensures that the second attribute tile flag is set to false
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    LanesTabController.prototype.onFirstAttributeSelect = function (oEvent) {
      var oAnalyticsModel = oEvent.getSource().getModel("analyticsModel");
      var sPath = oEvent.getSource().getBindingContext("analyticsModel").getPath();
      oAnalyticsModel.setProperty(sPath + "/secondTileAttribute", false);
    };

    /**
     * Handler for the press event on first tile attribute flag.
     * Ensures that the first attribute tile flag is set to false
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    LanesTabController.prototype.onSecondAttributeSelect = function (oEvent) {
      var oAnalyticsModel = oEvent.getSource().getModel("analyticsModel");
      var sPath = oEvent.getSource().getBindingContext("analyticsModel").getPath();
      oAnalyticsModel.setProperty(sPath + "/firstTileAttribute", false);
    };

    LanesTabController.prototype.handlePressOpenMenu = function (oEvent) {
      var oModel = oEvent.getSource().getModel("analyticsModel");
      var oBindingContext = oEvent.getSource().getBindingContext("analyticsModel");
      var sBindingPath = oBindingContext.getPath();
      var sAttributes = sBindingPath.split("/attributes/")[0] + "/attributes/";

      var aAttributes = oModel.getProperty(sAttributes).map(function (attr) {
        return new MenuItem({
          text: attr.modelName,
          key: attr.source.split(".attributes.")[1],
          select: function (oSelectEvent) {
            var patternPath = sBindingPath + "/formatter/pattern";

            var currentPattern = oModel.getProperty(patternPath);
            var placeholder = oSelectEvent.getSource().getPlaceholder();
            oModel.setProperty(patternPath, currentPattern + " " + placeholder);
          },
        });
      }, this);
      var eDock = sap.ui.core.Popup.Dock;
      new Menu({
        items: aAttributes,
      }).open(true, oEvent.getSource(), eDock.BeginTop, eDock.BeginBottom, oEvent.getSource());
    };

    /**
     * Handler for adding an allowed plottable attribute to the analyticsModel.
     * @param {sap.ui.base.Event} oEvent SAPUI5 event to add allowed plottable attribute.
     */
    LanesTabController.prototype.addAllowedPlottableAttr = function (oEvent) {
      var oAnalyticsModel = oEvent.getSource().getModel("analyticsModel");
      var sPath = oEvent.getSource().getBindingContext("analyticsModel").getPath();
      var sInputValue = oAnalyticsModel.getProperty(sPath + "/plottableAttrInputValue");
      if (sInputValue) {
        var aAllowedPlottableAttr = oAnalyticsModel.getProperty(sPath + "/allowedPlottableAttr");
        var bAlreadyInList = aAllowedPlottableAttr.some(function (oAttribute) {
          return oAttribute.name === sInputValue;
        });
        if (bAlreadyInList) {
          MessageBox.show(ConfigUtils.getText("HPH_PAT_CFG_GROUPED_ATTRIBUTES_DUPLICATE_MESSAGEBOX"), {
            icon: MessageBox.Icon.ERROR,
            title: ConfigUtils.getText("HPH_PAT_CFG_ERROR_MESSAGEBOX_TITLE"),
            actions: [sap.m.MessageBox.Action.CLOSE],
          });
        } else {
          aAllowedPlottableAttr.push({
            name: sInputValue,
            selected: false,
          });
          oAnalyticsModel.setProperty(sPath + "/allowedPlottableAttr", aAllowedPlottableAttr);
        }
        oAnalyticsModel.setProperty(sPath + "/plottableAttrInputValue", "");
      }
    };

    /**
     * Handler for selection change of the plottable attributes table.
     * @param {sap.ui.base.Event} oEvent selection event of the allowed plottable attributes table
     */
    LanesTabController.prototype.onAllowedPlottableAttrSelectionChange = function (oEvent) {
      var oAnalyticsModel = oEvent.getSource().getModel("analyticsModel");
      var sPath = oEvent.getSource().getBindingContext("analyticsModel").getPath();
      this.isAllowedPlottableAttrDeleteButtonEnabled(oAnalyticsModel, sPath);
    };

    /**
     * Handler to enable / disable the delete button of the plottable attributes table.
     * @param {sap.ui.base.Event} aAttributes list of allowed plottable attributes to check for selected.
     */
    LanesTabController.prototype.isAllowedPlottableAttrDeleteButtonEnabled = function (oAnalyticsModel, sPath) {
      var aAllowedPlottableAttributes = oAnalyticsModel.getProperty(sPath + "/allowedPlottableAttr");
      var enabled = aAllowedPlottableAttributes.some(function (oAttribute) {
        return oAttribute.selected === true;
      });
      oAnalyticsModel.setProperty(sPath + "/allowedPlottableAttrDeleteButtonEnabled", enabled);
    };

    /**
     * Handler for deleting an allowed plottable attribute from the analyticsModel.
     * @param {sap.ui.base.Event} oEvent SAPUI5 list item deletion event
     */
    LanesTabController.prototype.onDeleteAllowedPlottableAttr = function (oEvent) {
      // we set the references which are later needed for deleting, as the oEvent reference changes on closing the MessageBox
      var oAnalyticsModel = oEvent.getSource().getModel("analyticsModel");
      var sPath = oEvent.getSource().getBindingContext("analyticsModel").getPath();
      var aAllowedPlottableAttributes = oAnalyticsModel.getProperty(sPath + "/allowedPlottableAttr");
      var that = this;

      MessageBox.show(ConfigUtils.getText("HPH_PAT_CFG_GROUPED_ATTRIBUTES_DELETE_MESSAGEBOX"), {
        icon: MessageBox.Icon.WARNING,
        title: ConfigUtils.getText("HPH_PAT_CFG_DELETE_MESSAGEBOX_TITLE"),
        actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
        onClose: function (oAction) {
          if (oAction === "DELETE") {
            var newAllowedPlottableAttributes = [];
            aAllowedPlottableAttributes.forEach(function (oAttribute) {
              if (oAttribute.selected === false) {
                newAllowedPlottableAttributes.push(oAttribute);
              }
            });
            oAnalyticsModel.setProperty(sPath + "/allowedPlottableAttr", newAllowedPlottableAttributes);
            that.isAllowedPlottableAttrDeleteButtonEnabled(oAnalyticsModel, sPath);
          }
        },
      });
    };

    /**
     * Handler for selecting if all numeric attributes should be plottable in grouped interaction.
     * @param {sap.ui.base.Event} oEvent SAPUI5 radiogroup select event
     */
    LanesTabController.prototype.onSelectAttributesPlottable = function (oEvent) {
      var selectedIndex = oEvent.getParameter("selectedIndex");
      var oAnalyticsModel = oEvent.getSource().getModel("analyticsModel");
      var sPath = oEvent.getSource().getBindingContext("analyticsModel").getPath();
      if (selectedIndex === 1) {
        oAnalyticsModel.setProperty(sPath + "/plotGeneratedAttr", false);
      } else {
        oAnalyticsModel.setProperty(sPath + "/plotGeneratedAttr", true);
      }
    };

    return LanesTabController;
  }
);
