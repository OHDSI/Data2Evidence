sap.ui.define(
  [
    "jquery.sap.global",
    "hc/mri/pa/config/ui/lib/ConfigUtils",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/type/Integer",
    "hc/mri/pa/config/ui/lib/Formatter"
  ],
  function(jQuery, ConfigUtils, Controller, Integer, Formatter) {
    "use strict";

    /**
     * Constructor for the FilterCardsTab Controller.
     * @constructor
     *
     * @classdesc
     * Controller for the filter cards tab.
     * @extends sap.ui.core.mvc.Controller
     * @alias hc.mri.pa.config.ui.views.FilterCardsTab
     */
    var FilterCardsTabController = Controller.extend(
      "hc.mri.pa.config.ui.views.FilterCardsTab"
    );

    FilterCardsTabController.prototype.formatter = Formatter;
    
    FilterCardsTabController.prototype.listUpdateFinished = function (oEvent) {
        oEvent.getSource().getItems().forEach(function (item) {
            item.getCells().forEach(function (cell) {
                // Attach parse error event on 
                if (cell.hasStyleClass("defaultBinSizeInput")) {
                    cell  
                    .bindProperty("value", {
                        path: "analyticsModel>defaultBinSize",
                        type: new Integer()
                    })
                    .attachParseError(function (oEvent) {
                        if (oEvent.getSource().getValue() === "") {                      
                            var path = oEvent.getSource().getBindingContext("analyticsModel").getPath();
                            this.getModel("analyticsModel").setProperty(path +"/defaultBinSize", undefined)                           
                        } else {
                            ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "MRI_PA_CFG_PLEASE_INSERT_INTEGER_VALUE");
                            oEvent.getSource().setValue(oEvent.getParameter("oldValue"));
                        }
                    });
                }
            });
        });
    };

    FilterCardsTabController.prototype.onInit = function() {
        var controller = this;

        [
            {
                id: "filterCArdsPanelId"
            }
        ].forEach(function (obj) {
            var oPanel = this.byId(obj.id);

            oPanel.onAfterRendering(function (oEvent) {
                console.log(oEvent);
            });

            oPanel.attachExpand(function (oEvent) {
                var oItem = this.getParent();
                oItem.setSelected(true);

                // Do not render content if collapsing
                // Do not render if already rendered
                if(!oEvent.getParameter("expand") || this.getContent().length > 0) {
                    return;
                }

                var fragmentId = controller.createId(this.getDomRef().id);
                var filterCardItemFragment = sap.ui.xmlfragment(
                    fragmentId,
                    "hc.mri.pa.config.ui.views.FilterCardsTabItem",
                    controller
                );

                controller.getView().addDependent(filterCardItemFragment);
                this.addContent(filterCardItemFragment);
            });
        }, this);
    };

    /**
     * Handler for the press event on the whole Toolbar inside the Panel header.
     * We listen to this event to make the panel expand when any part of the toolbar (that is not the Switch control)
     * is pressed, not only the expand arrow to the left.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    FilterCardsTabController.prototype.onHeaderToolbarPress = function(oEvent) {
      if (
        oEvent
          .getParameter("srcControl")
          .getMetadata()
          .getName() !== "sap.m.Switch"
      ) {
        var oPanel = oEvent.getSource().getParent();
        oPanel.setExpanded(!oPanel.getExpanded());
      }
    };

    /**
     * Handler for the press event on the ordering of the filter card.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    FilterCardsTabController.prototype.onMoveCardUp = function(oEvent) {
      var parentTable = this._getParentTableControlForFilterCard(
        oEvent.getSource()
      );
      this.onMoveLine(parentTable, -1, "order");
    };

    /**
     * Handler for the press event on the ordering of the filter card.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    FilterCardsTabController.prototype.onMoveCardDown = function(oEvent) {
      var parentTable = this._getParentTableControlForFilterCard(
        oEvent.getSource()
      );
      this.onMoveLine(parentTable, 1, "order");
    };

    /**
     * Handler for the press event on the ordering of the attributes.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    FilterCardsTabController.prototype.onMoveUp = function(oEvent) {
      var parentTable = this._getParentTableControlForAttribute(
        oEvent.getSource()
      );
      this.onMoveLine(parentTable, -1, "filtercard/order");
    };

    /**
     * Handler for the press event on the ordering of the attributes.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    FilterCardsTabController.prototype.onMoveDown = function(oEvent) {
      var parentTable = this._getParentTableControlForAttribute(
        oEvent.getSource()
      );
      this.onMoveLine(parentTable, 1, "filtercard/order");
    };

    /**
     * Handler for the change event on the switch to make all attributes visible/invisible.
     * @param {sap.ui.base.Event} oEvent SAPUI5 change Event.
     */
    FilterCardsTabController.prototype.onAllInitialPressed = function(oEvent) {
      var newState = oEvent.getParameters().selected;
      var parentTable = oEvent
        .getSource()
        .getParent()
        .getParent()
        .getParent();
      var nbOfAttributes = parentTable
        .getBindingContext("analyticsModel")
        .getProperty("attributes").length;
      var filtercardPath = parentTable
        .getBindingContext("analyticsModel")
        .getPath();

      for (var i = 0; i < nbOfAttributes; i++) {
        var isVisible = this.getView()
          .getModel("analyticsModel")
          .getProperty(
            filtercardPath + "/attributes/" + i + "/filtercard/visible"
          );
        if (!(!isVisible && newState)) {
          this.getView()
            .getModel("analyticsModel")
            .setProperty(
              filtercardPath + "/attributes/" + i + "/filtercard/initial",
              newState
            );
        }
      }
    };

    FilterCardsTabController.prototype.onAllRefTextPressed = function(oEvent) {
      var newState = oEvent.getParameters().selected;
      var parentTable = oEvent
        .getSource()
        .getParent()
        .getParent()
        .getParent();
      var nbOfAttributes = parentTable
        .getBindingContext("analyticsModel")
        .getProperty("attributes").length;
      var filtercardPath = parentTable
        .getBindingContext("analyticsModel")
        .getPath();

      for (var i = 0; i < nbOfAttributes; i++) {
        this.getView()
          .getModel("analyticsModel")
          .setProperty(
            filtercardPath + "/attributes/" + i + "/useRefText",
            newState
          );
      }
    };

    FilterCardsTabController.prototype.onAllRefValuePressed = function(oEvent) {
      var newState = oEvent.getParameters().selected;
      var parentTable = oEvent
        .getSource()
        .getParent()
        .getParent()
        .getParent();
      var nbOfAttributes = parentTable
        .getBindingContext("analyticsModel")
        .getProperty("attributes").length;
      var filtercardPath = parentTable
        .getBindingContext("analyticsModel")
        .getPath();

      for (var i = 0; i < nbOfAttributes; i++) {
        this.getView()
          .getModel("analyticsModel")
          .setProperty(
            filtercardPath + "/attributes/" + i + "/useRefValue",
            newState
          );
      }
    };

    FilterCardsTabController.prototype.onAllCategoryPressed = function(oEvent) {
      var newState = oEvent.getParameters().selected;
      var parentTable = oEvent
        .getSource()
        .getParent()
        .getParent()
        .getParent();
      var nbOfAttributes = parentTable
        .getBindingContext("analyticsModel")
        .getProperty("attributes").length;
      var filtercardPath = parentTable
        .getBindingContext("analyticsModel")
        .getPath();

      for (var i = 0; i < nbOfAttributes; i++) {
        this.getView()
          .getModel("analyticsModel")
          .setProperty(
            filtercardPath + "/attributes/" + i + "/category",
            newState
          );
      }
    };

    FilterCardsTabController.prototype.onAllMeassurePressed = function(oEvent) {
      var newState = oEvent.getParameters().selected;
      var parentTable = oEvent
        .getSource()
        .getParent()
        .getParent()
        .getParent();
      var nbOfAttributes = parentTable
        .getBindingContext("analyticsModel")
        .getProperty("attributes").length;
      var filtercardPath = parentTable
        .getBindingContext("analyticsModel")
        .getPath();

      for (var i = 0; i < nbOfAttributes; i++) {
        this.getView()
          .getModel("analyticsModel")
          .setProperty(
            filtercardPath + "/attributes/" + i + "/measure",
            newState
          );
      }
    };

    FilterCardsTabController.prototype.onAllOrderedPressed = function(oEvent) {
      var newState = oEvent.getParameters().selected;
      var parentTable = oEvent
        .getSource()
        .getParent()
        .getParent()
        .getParent();
      var nbOfAttributes = parentTable
        .getBindingContext("analyticsModel")
        .getProperty("attributes").length;
      var filtercardPath = parentTable
        .getBindingContext("analyticsModel")
        .getPath();

      for (var i = 0; i < nbOfAttributes; i++) {
        this.getView()
          .getModel("analyticsModel")
          .setProperty(
            filtercardPath + "/attributes/" + i + "/ordered",
            newState
          );
      }
    };

    FilterCardsTabController.prototype.onAllCachePressed = function(oEvent) {
      var newState = oEvent.getParameters().selected;
      var parentTable = oEvent
        .getSource()
        .getParent()
        .getParent()
        .getParent();
      var nbOfAttributes = parentTable
        .getBindingContext("analyticsModel")
        .getProperty("attributes").length;
      var filtercardPath = parentTable
        .getBindingContext("analyticsModel")
        .getPath();

      for (var i = 0; i < nbOfAttributes; i++) {
        this.getView()
          .getModel("analyticsModel")
          .setProperty(
            filtercardPath + "/attributes/" + i + "/cached",
            newState
          );
      }
    };

    /**
     * Handler for the change event on the switch to make all attributes initial.
     * @param {sap.ui.base.Event} oEvent SAPUI5 change Event.
     */
    FilterCardsTabController.prototype.onAllVisiblePressed = function(oEvent) {
      var newState = oEvent.getParameters().state;
      var parentTable = oEvent
        .getSource()
        .getParent()
        .getParent()
        .getParent();
      var nbOfAttributes = parentTable
        .getBindingContext("analyticsModel")
        .getProperty("attributes").length;
      var filtercardPath = parentTable
        .getBindingContext("analyticsModel")
        .getPath();

      for (var i = 0; i < nbOfAttributes; i++) {
        this.getView()
          .getModel("analyticsModel")
          .setProperty(
            filtercardPath + "/attributes/" + i + "/filtercard/visible",
            newState
          );

        if (!newState) {
          this.getView()
            .getModel("analyticsModel")
            .setProperty(
              filtercardPath + "/attributes/" + i + "/filtercard/initial",
              newState
            );
        }
      }
    };

    /**
     * Handler for the change event on the switch to control enabling/disabling of filtercard initial attribute checkbox.
     * This is to ensure that a non-visible attribute cannot be set to initial
     * @param {sap.ui.base.Event} oEvent SAPUI5 change Event.
     */
    FilterCardsTabController.prototype.onVisiblePressed = function(oEvent) {
      var newState = oEvent.getParameters().state;
      var attributePath = oEvent
        .getSource()
        .getParent()
        .getBindingContext("analyticsModel")
        .getPath();

      if (!newState) {
        this.getView()
          .getModel("analyticsModel")
          .setProperty(attributePath + "/filtercard/initial", newState);
      }
    };

    FilterCardsTabController.prototype.onMoveLine = function(
      parentTable,
      increaseDecrease,
      orderProperty
    ) {
      var selected = parentTable.getSelectedItems();

      if (selected.length > 0) {
        // only do that for the second line and above
        var selectedLine = parentTable.indexOfItem(selected[0]);
        var numOfRows = parentTable.getItems().length;

        if (
          selectedLine + increaseDecrease >= 0 &&
          selectedLine + increaseDecrease < numOfRows
        ) {
          this._changeOrder(
            parentTable,
            selectedLine,
            increaseDecrease,
            orderProperty
          );
        }
      }
    };

    FilterCardsTabController.prototype._getParentTableControlForFilterCard = function(
      sourceButton
    ) {
      return sourceButton.getParent().getParent();
    };

    FilterCardsTabController.prototype._getParentTableControlForAttribute = function(
      sourceButton
    ) {
      return sourceButton.getParent().getParent();
    };

    FilterCardsTabController.prototype._changeOrder = function(
      parentTable,
      selectedLine,
      increaseDecrease,
      orderProperty
    ) {
      var lines = parentTable.getItems();
      var neighbourLine = selectedLine + increaseDecrease;
      var lineOrder = lines[selectedLine]
        .getBindingContext("analyticsModel")
        .getProperty(orderProperty);
      var neighboutOrder = lines[neighbourLine]
        .getBindingContext("analyticsModel")
        .getProperty(orderProperty);

      var selectedPath = lines[selectedLine]
        .getBindingContext("analyticsModel")
        .getPath();
      var neighbourPath = lines[neighbourLine]
        .getBindingContext("analyticsModel")
        .getPath();

      this.getView()
        .getModel("analyticsModel")
        .setProperty(selectedPath + "/" + orderProperty, neighboutOrder);
      this.getView()
        .getModel("analyticsModel")
        .setProperty(neighbourPath + "/" + orderProperty, lineOrder);

      var itemsBinding = parentTable.getBinding("items");

      itemsBinding.sort(itemsBinding.aSorters[0]);
    };

    return FilterCardsTabController;
  }
);
