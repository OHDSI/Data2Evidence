sap.ui.define(
  [
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "./ifr/PatientListVisitor",
    "./library",
    "./MedexChart",
    "./MenuButton",
    "./MriFrontendConfig",
    "sap/m/Bar",
    "sap/m/FlexBox",
    "sap/m/Label",
    "sap/m/Link",
    "sap/m/Text",
    "sap/ui/commons/Label",
    "sap/ui/commons/Paginator",
    "sap/ui/core/CustomData",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/type/Date",
    "sap/ui/table/Column",
    "sap/ui/table/Table",
    "sap/ui/unified/Menu",
    "sap/ui/unified/MenuItem"
  ],
  function(
    jQuery,
    Utils,
    PatientListVisitor,
    library,
    MedexChart,
    MenuButton,
    MriFrontendConfig,
    Bar,
    FlexBox,
    Label,
    Link,
    Text,
    CommonsLabel,
    Paginator,
    CustomData,
    JSONModel,
    DateType,
    Column,
    Table,
    Menu,
    MenuItem
  ) {
    "use strict";

    /**
     * Constructor for a new PatientListChart.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * This control displays the patient list.
     * @extends sap.hc.mri.pa.ui.lib.MedexChart
     * @alias sap.hc.mri.pa.ui.lib.PatientListChart
     */
    var PatientListChart = MedexChart.extend(
      "sap.hc.mri.pa.ui.lib.PatientListChart",
      {
        metadata: {
          properties: {
            pageSize: {
              type: "int",
              defaultValue: 20
            },
            chartableFilterCards: {
              type: "object[]",
              defaultValue: [],
              bindable: "bindable"
            }
          },
          aggregations: {
            _table: {
              type: "sap.ui.table.Table",
              multiple: false,
              visibility: "hidden"
            }
          }
        },
        renderer: function(oRenderManager, oControl) {
          oRenderManager.write("<div ");
          oRenderManager.writeControlData(oControl);
          oRenderManager.addClass("sapMriPaPatientList");
          oRenderManager.writeClasses();
          oRenderManager.write(">");
          oRenderManager.renderControl(oControl.getAggregation("_table"));
          oRenderManager.write("</div>");
        }
      }
    );

    PatientListChart.prototype.init = function() {
      MedexChart.prototype.init.call(this);

      this._chartKey = "list";

      this._settings = {
        downloadEnabled: MriFrontendConfig.getFrontendConfig().isChartDownloadEnabled(
          this._chartKey
        ),
        collectionEnabled: MriFrontendConfig.getFrontendConfig().isChartCollectionEnabled(
          this._chartKey
        ),
        pdfDownloadEnabled: MriFrontendConfig.getFrontendConfig().isChartPDFDownloadEnabled(
          this._chartKey
        )
      };

      this.initDataModel();
      this._createTable();
    };

    PatientListChart.prototype.clearChart = function() {
      this.initDataModel();
    };

    PatientListChart.prototype.setChartOptions = function(oOptions) {
      if ("list" in oOptions) {
        this.getDataModel().setProperty(
          "/selected_attributes",
          oOptions.list.selected_attributes
        );
        this.getDataModel().setProperty(
          "/sorted_attributes",
          oOptions.list.sorted_attributes
        );
        this.getDataModel().setProperty(
          "/sorting_directions",
          oOptions.list.sorting_directions
        );
        this._allAttributesPositions = oOptions.list.selected_attributes;
      }
    };

    PatientListChart.prototype.initDataModel = function() {
      var patientListConfig = MriFrontendConfig.getFrontendConfig().getPatientListConfig();
      var selectedAttributes = {};

      var defaultAttributes = patientListConfig.getInitialTableColumns();
      var pageSize = patientListConfig.getDefaultPageSize();
      this.setPageSize(pageSize);

      var that = this;
      this._allAttributesPositions = {};

      defaultAttributes.forEach(function(attribute, index) {
        selectedAttributes[attribute.getConfigPath()] = index;

        that._allAttributesPositions[attribute.getConfigPath()] = index + 1;
      });

      var model = new JSONModel({
        current_page: 1,
        selected_attributes: selectedAttributes,
        sorted_attributes: [],
        sorting_directions: []
      });
      this.setModel(model);
    };

    PatientListChart.prototype.setChartableFilterCards = function(
      aChartableFilterCards
    ) {
      this.setProperty("chartableFilterCards", aChartableFilterCards, true);
      var interactionPaths = aChartableFilterCards.map(function(obj) {
        //return obj.sFilterCardConfigPath;
        return obj.sFilterCardInstance;
      });
      var selectedAttribute = this.getModel().getProperty(
        "/selected_attributes"
      );
      var attributePaths = Object.keys(
        this.getModel().getProperty("/selected_attributes")
      );
      var attributeToRemove = [];
      var i;
      for (i = 0; i < attributePaths.length; i++) {
        var attributeObj = MriFrontendConfig.getFrontendConfig().getAttributeByPath(
          attributePaths[i]
        );
        if (
          attributeObj._oInternalConfigAttribute.aggregated &&
          interactionPaths.indexOf(attributeObj._sParentPath) < 0
        ) {
          attributeToRemove.push(attributePaths[i]);
        }
      }
      for (i = 0; i < attributeToRemove.length; i++) {
        var order = selectedAttribute[attributeToRemove[i]];

        for (var property in selectedAttribute) {
          if (selectedAttribute.hasOwnProperty(property)) {
            if (selectedAttribute[property] > order) {
              selectedAttribute[property]--;
            }
          }
        }

        delete selectedAttribute[attributeToRemove[i]];
      }
      this.getModel().setProperty("/selected_attributes", selectedAttribute);

      this.getModel().setProperty("/available_interactions", {});
      for (i = 0; i < interactionPaths.length; i++) {
        this.getModel().setProperty(
          "/available_interactions/" + interactionPaths[i],
          1
        );
      }

      // Add the filtercard attributes to the menu
      var that = this;
      var submenu = new Menu();
      this.filterCardMenu.setSubmenu(submenu);

      aChartableFilterCards.forEach(function(card) {
        if (card.sFilterCardInstance === "patient") {
          return;
        }
        var attributeMenu = new Menu();

        card.aAttributes.forEach(function(attribute) {
          if (!attribute.bAvailable) {
            return;
          }
          var attributeKey = attribute.sAttributeInstance;
          attributeMenu.addItem(
            new MenuItem({
              text: attribute.sAttributeName,
              enabled: {
                path: "/selected_attributes/" + attributeKey,
                formatter: function(b) {
                  return typeof b === "undefined";
                }
              },
              select: function() {
                var _allAttributesPositions = that._allAttributesPositions;
                // did we see the attribute already? Then we use the position we used for the attribute the last time we saw it
                // otherwise we add the attribute with a position just past the largest that we ever saw
                if (
                  typeof _allAttributesPositions[attributeKey] === "undefined"
                ) {
                  var index = 1;
                  jQuery.each(_allAttributesPositions, function(key, val) {
                    index = index < val ? val : index;
                  });
                  _allAttributesPositions[attributeKey] = index + 1;
                }
                this.getModel().setProperty(
                  "/selected_attributes/" + attributeKey,
                  _allAttributesPositions[attributeKey]
                );
                that.reloadChart();
              }
            })
          );
        });

        var fcmenu = new MenuItem({
          text: card.sFilterCardName,
          submenu: attributeMenu
        });

        submenu.addItem(fcmenu);
      });
      return this;
    };

    PatientListChart.prototype._buildMenu = function() {
      var that = this;

      var patientListConfig = MriFrontendConfig.getFrontendConfig().getPatientListConfig();

      var basicDataCols = patientListConfig.getBasicDataCols();
      var allOtherColumns = patientListConfig.getAllNonBasicDataColumnsByInteractions();

      function addColsToMenu(interaction, submenu) {
        var aAttributes = interaction.attributes;
        aAttributes.forEach(function(attribute) {
          var attributeKey = attribute.getConfigPath();
          var interactionKey = attributeKey.substring(
            0,
            attributeKey.indexOf(".attributes.")
          );

          submenu.addItem(
            new MenuItem({
              text: attribute.getName(),
              enabled: {
                path: "/selected_attributes/" + attributeKey,
                formatter: function(b) {
                  return typeof b === "undefined";
                }
              },
              visible: attribute._oInternalConfigAttribute.aggregated
                ? {
                    path: "/available_interactions/" + interactionKey,
                    formatter: function(b) {
                      return typeof b !== "undefined";
                    }
                  }
                : true,
              select: function() {
                var _allAttributesPositions = that._allAttributesPositions;
                // did we see the attribute already? Then we use the position we used for the attribute the last time we saw it
                // otherwise we add the attribute with a position just past the largest that we ever saw
                if (
                  typeof _allAttributesPositions[attributeKey] === "undefined"
                ) {
                  var index = 1;
                  jQuery.each(_allAttributesPositions, function(key, val) {
                    index = index < val ? val : index;
                  });
                  _allAttributesPositions[attributeKey] = index + 1;
                }
                this.getModel().setProperty(
                  "/selected_attributes/" + attributeKey,
                  _allAttributesPositions[attributeKey]
                );
                that.reloadChart();
              }
            })
          );

          // Also note when the "patientlist_linkcolumn" scope is set to true as we
          // will use that column's values to be rendered as a clickable link that
          // triggers the Patient Summary.
          if (attribute.isLinkColumn()) {
            if (typeof that._linkAttrIds === "undefined") {
              that._linkAttrIds = [];
            }
            that._linkAttrIds.push(attributeKey);
          }
        });
      }

      var generalSubmenu = new Menu();
      addColsToMenu(basicDataCols, generalSubmenu);

      var moreSubmenu = new Menu();
      jQuery.each(allOtherColumns, function(key, obj) {
        var submenu = new Menu();

        addColsToMenu(obj, submenu);
        moreSubmenu.addItem(
          new MenuItem({
            text: obj.name,
            submenu: submenu
          })
        );
      });

      // keep a reference so we can update this when chartable filter cards is updated
      this.filterCardMenu = new MenuItem({
        text: "Filter Cards",
        submenu: new Menu({
          items: []
        })
      });

      var menu = new Menu({
        items: [
          new MenuItem({
            text: "{i18n>MRI_PA_MENUITEM_INTERACTIONS_GENERAL}",
            submenu: generalSubmenu
          }),
          this.filterCardMenu,
          new MenuItem({
            text: "Any",
            submenu: moreSubmenu,
            startsSection: true
          }),
          new MenuItem({
            text: "{i18n>MRI_PA_PATIENT_LIST_RESTORE_DEFAULT}",
            select: function() {
              that.getDataModel(true);
              that.reloadChart();
            },
            startsSection: true
          })
        ]
      });

      return menu;
    };

    PatientListChart.prototype.getItemsForCollection = function(callback) {
      var oFilterObject = this.getController().generateAnnotatedFilterObject({
        collection: true
      });
      Utils.ajax({
        type: "POST",
        url: this.getDataURL(),
        contentType: "application/json",
        data: MriFrontendConfig.getFrontendConfig().addConfigMetadata(
          oFilterObject
        ),
        complexResult: false
      }).done(function(oResponse) {
        var items = oResponse.data.map(function(oResponseElement) {
          return {
            itemId: oResponseElement.pid,
            itemType: "sap.hhp.tax.Patient"
          };
        });

        // Only try to add non-empty lists
        if (items.length) {
          callback(items);
        }
      });
    };

    PatientListChart.prototype._createTable = function() {
      var that = this;

      var oMenu = this._buildMenu();

      var oMenuButton = new MenuButton({
        text: "{i18n>MRI_PA_PATIENT_LIST_EDIT_COLUMNS}",
        tooltip: "{i18n>MRI_PA_TOOLTIP_PATIENT_LIST_EDIT_COLUMNS}",
        press: [
          function(oEvent) {
            var oButton = oEvent.getSource();
            oMenu.open(
              true,
              oButton,
              sap.ui.core.Popup.Dock.BeginTop,
              sap.ui.core.Popup.Dock.BeginBottom,
              oButton
            );
          },
          this
        ]
      });
      oMenuButton.addDependent(oMenu);

      var oTable = new Table({
        enableColumnReordering: false,
        selectionMode: sap.ui.table.SelectionMode.None,
        visibleRowCount: this.getPageSize(),
        visibleRowCountMode: sap.ui.table.VisibleRowCountMode.Fixed,
        footer: new FlexBox({
          justifyContent: sap.m.FlexJustifyContent.Center,
          items: new Paginator({
            currentPage: "{/current_page}",
            numberOfPages: "{/total_pages}",
            page: [
              function() {
                this._updateTriggeredFromPaginator = true;
                this.reloadChart();
              },
              this
            ]
          })
        }),
        noData: new FlexBox({
          alignItems: sap.m.FlexAlignItems.Center,
          height: "100%",
          justifyContent: sap.m.FlexJustifyContent.Center,
          items: [
            new CommonsLabel({
              icon: "sap-icon://message-information",
              text: "{" + Utils.models.RESULTS + ">/noDataReason}"
            })
          ]
        }).addStyleClass("sapMriChartNoDataPholder"),
        rows: "{/response/data}",
        toolbar: new Bar({
          contentLeft: oMenuButton
        }),
        sort: function(oEvent) {
          oEvent.preventDefault();
          that.sortByColumnIndex(
            this.indexOfColumn(oEvent.getParameter("column")),
            oEvent.getParameter("sortOrder")
          );
        }
      }).addStyleClass("sapUiSmallMargin");

      oTable.bindColumns("/response/measures", function(sId, oContext) {
        // this returns the instanceId
        var sInstanceId = oContext.getProperty("id");

        // name of filtercard where attribute belongs
        var parentColumnName = oContext.getProperty("parentColumnName");

        // this is the config path
        var sAttributeId = oContext.getProperty("configPath");

        var oTemplateControl;
        // Decide whether to render the attribute as a Link or Text.
        if (that._isLinkAttribute(sAttributeId)) {
          oTemplateControl = new Link({
            text: "{" + sInstanceId + "}",
            tooltip: "{i18n>MRI_PA_PATIENT_LIST_OPEN_PV}",
            customData: [
              new CustomData({
                key: "pid",
                value: "{pid}"
              })
            ],
            press: function(oEvent) {
              var aPatientId = oEvent.getSource().data("pid");
              var sPatientId = "";
              if (Array.isArray(aPatientId) && aPatientId.length === 1) {
                sPatientId = aPatientId[0];
              }
              if (sPatientId) {
                var oPatientSummary = sap.ui.xmlview(
                  "sap.hc.mri.pa.ui.views.PatientSummary"
                );
                oPatientSummary.setModel(
                  new JSONModel({
                    dataLoaded: false,
                    settings: {
                      patientId: sPatientId
                    }
                  }),
                  "patientSummary"
                );
                that.addDependent(oPatientSummary);

                oPatientSummary.getController().open();
              } else {
                jQuery.sap.log.error(
                  "Cannot open Patient Summary",
                  "Patient Id not set",
                  "PatientList"
                );
              }
            }
          });
        } else {
          // building the normal Text template
          oTemplateControl = new Text({
            text: {
              path: sInstanceId
            }
          });
        }

        var labels = [
          new Label({
            text: "{name}",
            tooltip: "{fullname}"
          })
        ];

        if (parentColumnName) {
          labels.unshift(
            new Label({
              text: parentColumnName,
              tooltip: parentColumnName
            })
          );
        }

        var oColumn = new Column(sId, {
          sortProperty: sInstanceId,
          // label: new Label({
          //   text: "{name}",
          //   tooltip: "{fullname}"
          // }),
          multiLabels: labels,
          template: oTemplateControl
        });
        oColumn.getMenu().onBeforeRendering = function() {
          var iColumnIndex = oColumn.getParent().indexOfColumn(oColumn);
          var sAttrName = oColumn.getSortProperty();

          if (Menu.prototype.onBeforeRendering) {
            Menu.prototype.onBeforeRendering.call(this);
          }
          if (this.getItems().length === 2) {
            this.addItem(
              new MenuItem({
                text: "{i18n>MRI_PA_PATIENT_LIST_REMOVE_COLUMN}",
                select: function() {
                  that.removeAttributeBycolumnIndex(iColumnIndex, sAttrName);
                  that.reloadChart();
                }
              })
            );
          }
        };
        return oColumn;
      });

      this.setAggregation("_table", oTable);
    };

    PatientListChart.prototype.reloadChart = function() {
      this.getController().updateChart();
    };

    PatientListChart.prototype.sortByColumnIndex = function(
      columnIndex,
      sortOrder
    ) {
      var attrKey = this._columnIndexToAttrKey[columnIndex];
      if (attrKey) {
        var model = this.getDataModel();
        var sortingDirections = model.getProperty("/sorting_directions");
        var sortedAttributes = model.getProperty("/sorted_attributes");
        if (sortedAttributes.indexOf(attrKey) !== -1) {
          sortingDirections.splice(sortedAttributes.indexOf(attrKey), 1);
          sortedAttributes.splice(sortedAttributes.indexOf(attrKey), 1);
        }
        sortingDirections = [
          sortOrder === sap.ui.table.SortOrder.Descending ? "D" : "A"
        ].concat(sortingDirections);
        sortedAttributes = [attrKey].concat(sortedAttributes);

        model.setProperty("/sorted_attributes", sortedAttributes);
        model.setProperty("/sorting_directions", sortingDirections);
        this.reloadChart();
      }
    };

    PatientListChart.prototype.removeAttributeBycolumnIndex = function(
      columnIndex,
      attrName
    ) {
      var attrKey = this._columnIndexToAttrKey[columnIndex];
      if (attrKey) {
        var model = this.getDataModel();
        var selectedAttributes = model.getProperty("/selected_attributes");
        delete selectedAttributes[attrKey];
        model.setProperty("/selected_attributes", selectedAttributes);
        delete this._allAttributesPositions[attrName];
      }
    };

    PatientListChart.prototype._updateLocationsModel = function() {
      var $this = this.getDomRef();
      if ($this === null) {
        // can be null during view creation
        return;
      }

      // get locations data and initially hide everything
      var oLocationsData = this.getModel(Utils.models.LOCATIONS).getData();
      for (var i = 0; i < sap.hc.mri.pa.ui.lib.Dimensions.Count; i++) {
        oLocationsData.attr[i].visible = false;
      }

      this.getModel(Utils.models.LOCATIONS).setData(oLocationsData);
    };

    PatientListChart.prototype.getDataModel = function(reinit) {
      if (reinit) {
        this.initDataModel();
      }

      var model = this.getModel();
      return model;
    };

    /**
     * Add PatientList annotations to the filter objects.
     * @param   {sap.hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.Filter} oIFR    IFR object
     * @param   {object}                                                       mParams Parameter object
     * @returns {object[]}                                                     Filter object enriched with axis selections
     */
    PatientListChart.prototype.preprocessFilterQuery = function(oIFR, mParams) {
      var aFilters = MedexChart.prototype.preprocessFilterQuery.call(
        this,
        oIFR
      );
      var aRequests = aFilters.map(function(oFilter) {
        return this._preprocessOneFilterObject(oFilter, mParams);
      }, this);
      this._preprocessIFRObject(oIFR, mParams);
      return aRequests;
    };

    PatientListChart.prototype._preprocessIFRObject = function(oIFR, mParams) {
      var that = this;
      var axes = [];
      var constraints = PatientListVisitor.getFilterConstraints(oIFR);
      if (!mParams) {
        mParams = {};
      }

      var pageSize = this.getPageSize();
      var model = this.getDataModel();

      var currentPage = model.getProperty("/current_page");

      oIFR.guarded = true;

      if (mParams.cvs || mParams.collection) {
        // for save as csv functionality - no limit is required
        oIFR.limit = 0;
        oIFR.offset = 0;
      } else {
        oIFR.limit = pageSize;
        oIFR.offset = currentPage > 0 ? (currentPage - 1) * pageSize : 0;
      }

      var sortedAttributes = model.getProperty("/sorted_attributes"); // attributes that will be sorted in the output. Empty Array if no specific sorting is required
      var sortingDirections = model.getProperty("/sorting_directions"); // directions to sort.
      var selectedAttributes = model.getProperty("/selected_attributes");
      var catIndex = sortedAttributes.length; // use as value of the xaxis parameter in the filter's attributes.

      this._attributeCardinalityTest = []; // maps the index of each column to the number of times the corresponding attribute appears in the filter
      this._columnIndexToAttrKeyTest = []; // maps column indexes to attribute keys

      var instanceCount = 10000;

      // for each selected attribute, add the corresponding category to the filter with the right value for the xaxis attribute
      // selected_attributes map each selected attribute to an integer specifiying in which order it will appear in the columns. This integer however
      // can't be used to directly index the column and it's unique for each attribute
      // sort attributes based on the order given by selected_attributes
      Object.keys(selectedAttributes)
        .reduce(function(columnList, attribute) {
          columnList.push([attribute, selectedAttributes.attribute]);
          return columnList;
        }, [])
        .sort(function(a, b) {
          return a[1] - b[1];
        })
        .forEach(function(attributePair, index) {
          var axis = {
            id: attributePair[0],
            axis: "y",
            aggregation: "string_agg"
          };

          var sortableIdx = sortedAttributes.indexOf(attributePair[0]);

          if (sortableIdx !== -1) {
            axis.order = sortingDirections[sortableIdx] === "D" ? "D" : "A";
            axis.seq = sortableIdx + 1;
          } else {
            axis.seq = ++catIndex;
          }

          // checks if interaction of filtercard constraints matches selected column interaction type
          var fcConstraint = constraints.filtercardConstraints.filter(function(
            h
          ) {
            if (
              attributePair[0].split(".")[1] !== "attributes" &&
              h.sConfigPath === "patient"
            ) {
              return false;
            } else {
              //return attributePair[0].search(h.sConfigPath) !== -1;
              return attributePair[0].search(h.sInstanceID) !== -1;
            }
          });

          // checks if any of the attributes set in filtercards matches selected column attributes
          var attrConstraint = constraints.filterAttributeConstraints.filter(
            function(g) {
              return attributePair[0] === g.sConfigPath;
            }
          );

          // if selected attribute is not associated with any filtercard constraint, empty filtercard has to be created
          var instanceId = MriFrontendConfig.getFrontendConfig().getInteractionInstancePath(
            axis.id
          );
          if (fcConstraint.length === 0) {
            var newInstanceId = instanceId + "." + instanceCount;
            axis.isFiltercard = false;
            axis.id = axis.id.replace(instanceId, newInstanceId);
            axis.instanceID = newInstanceId;
            //++instanceCount;
          } else {
            axis.isFiltercard = true;
            // if selected attribute is not an attribute constraint in a filtercard, empty attribute has to be created
            if (attrConstraint.length === 0) {
              axis.id = axis.id.replace(
                instanceId,
                fcConstraint[0].sInstanceID
              );
              axis.instanceID = fcConstraint[0].sInstanceID;
            } else if (attributePair[0].split(".")[1] !== "attributes") {
              // if selected attribute is not a basic data attribute, set axis id to the filtercard attribute instanceid
              axis.id = attrConstraint[0].sInstanceID;
              that._attributeCardinalityTest[index] = 1;
            }
            axis.instanceID = MriFrontendConfig.getFrontendConfig().getInteractionInstancePath(
              axis.id
            );
          }

          axis.configPath = MriFrontendConfig.getFrontendConfig().getGenericPath(
            axis.instanceID
          );

          that._columnIndexToAttrKeyTest[index] = attributePair[0];

          axes.push(axis);
        });

      oIFR.axes = axes;
    };

    PatientListChart.prototype._preprocessOneFilterObject = function(
      filterObject,
      params
    ) {
      if (!params) {
        params = {};
      }

      var pageSize = this.getPageSize();
      var model = this.getDataModel();
      if (!this._updateTriggeredFromPaginator && !params.cvs) {
        model.setProperty("/current_page", 1);
      }
      this._updateTriggeredFromPaginator = false;

      var currentPage = model.getProperty("/current_page");

      filterObject.guarded = true;

      if (params.cvs || params.collection) {
        // for save as csv functionality - no limit is required
        filterObject.limit = 0;
        filterObject.offset = 0;
      } else {
        filterObject.limit = pageSize;
        filterObject.offset =
          currentPage > 0 ? (currentPage - 1) * pageSize : 0;
      }

      function removeMeasures(obj) {
        for (var attr in obj) {
          if (obj.hasOwnProperty(attr)) {
            if (attr === "yaxis" || attr === "aggregation") {
              delete obj[attr];
            } else {
              obj = obj[attr];
              if (obj instanceof Object) {
                removeMeasures(obj);
              }
            }
          }
        }
      }
      // remove all measures from the filterObject (there should not be any, but just to be on the safe side...)
      removeMeasures(filterObject);

      if (params.collection) {
        return filterObject;
      }

      var that = this;
      var catIndex;

      function annotateFilterObject(
        element,
        pieces,
        i,
        columnIndex,
        isSorted,
        sortingDirection,
        sortPos
      ) {
        var piece = pieces[i];
        var parent = i > 0 ? pieces[i - 1] : null;
        var sortingPosition = sortPos;

        if (!element.hasOwnProperty(piece)) {
          element[piece] = parent === "attributes" ? [] : {};
        }

        element = element[piece];

        if (parent === "interactions") {
          var sFirstKey;
          if (Object.keys(element).length === 0) {
            element["1"] = {};
            sFirstKey = "1";
          } else {
            var potentialInteractionsKey = Object.keys(element);
            for (var ii = 0; ii < potentialInteractionsKey.length; ii++) {
              if (
                element[potentialInteractionsKey[ii]] &&
                !element[potentialInteractionsKey[ii]].exclude
              ) {
                sFirstKey = potentialInteractionsKey[ii];
                break;
              }
            }
            var counter = 0;
            while (!sFirstKey) {
              counter++;
              if (potentialInteractionsKey.indexOf(counter.toString()) < 0) {
                element[counter.toString()] = {};
                sFirstKey = counter.toString();
              }
            }
          }
          var card = 0;
          // isFiltercard=true property is created automatically when converting IFR to mri request.
          // the following handles new filtercards that have been created to handle x axis attributes that are not constraints
          if (element[sFirstKey] instanceof Object) {
            if (typeof element[sFirstKey].isFiltercard === "undefined") {
              element[sFirstKey].isFiltercard = false;
            }
            annotateFilterObject(
              element[sFirstKey],
              pieces,
              i + 1,
              columnIndex,
              isSorted,
              sortingDirection,
              sortingPosition
            );
          }
          ++card;
          that._attributeCardinality[columnIndex] = card;
        } else if (parent === "attributes") {
          if (element.length === 0) {
            element.push({});
          }
          if (isSorted) {
            element[0].order = sortingDirection === "D" ? "D" : "A";
            element[0].yaxis = sortingPosition;
            element[0].aggregation = "string_agg";
          } else {
            element[0].yaxis = ++catIndex;
            element[0].aggregation = "string_agg";
          }
          that._columnIndexToAttrKey[columnIndex] = pieces.join(".");
        } else {
          annotateFilterObject(
            element,
            pieces,
            i + 1,
            columnIndex,
            isSorted,
            sortingDirection,
            sortingPosition
          );
        }
      }
      // for each selected attribute, add the corresponding category to the filter with the right value for the xaxis attribute
      var selectedAttributes = model.getProperty("/selected_attributes");
      // selected_attributes map each selected attribute to an integer specifiying in which order it will appear in the columns. This integer however
      // can't be used to directly index the column and it's unique for each attribute
      var sortable = [];
      jQuery.each(selectedAttributes, function(attrname, index) {
        sortable.push([attrname, index]);
      });
      sortable.sort(function(a, b) {
        return a[1] - b[1];
      }); // sort attributes based on the order given by selected_attributes

      this._attributeCardinality = []; // maps the index of each column to the number of times the corresponding attribute appears in the filter
      this._columnIndexToAttrKey = []; // maps column indexes to attribute keys

      var sortedAttributes = model.getProperty("/sorted_attributes"); // attributes that will be sorted in the output. Empty Array if no specific sorting is required
      var sortingDirections = model.getProperty("/sorting_directions"); // directions to sort.

      var columnIndex = 0; // index of the column (0-based)
      catIndex = sortedAttributes.length; // use as value of the xaxis parameter in the filter's attributes.
      // Different from column_index because 1-based and because a column can map to multiple attributes in the filter, each one with a different xaxis value

      jQuery.each(sortable, function(i, pair) {
        var attrName = pair[0];

        var pieces = attrName.split(".");
        var indexOfSortable = sortedAttributes.indexOf(attrName);
        var isSorted = indexOfSortable !== -1;

        // FIXME MRI FO
        // annotate each attribute in the filter with the correct xaxis value while updating _attribute_cardinality and _column_index_to_attr_key
        annotateFilterObject(
          filterObject,
          pieces,
          0,
          columnIndex++,
          isSorted,
          sortingDirections[indexOfSortable],
          indexOfSortable + 1
        );
      });

      return filterObject;
    };

    PatientListChart.prototype.updateValues = function(response) {
      var oPatientListConfig = MriFrontendConfig.getFrontendConfig().getPatientListConfig();
      var aAttributeInformation = oPatientListConfig.getAllAttributes();
      var that = this;

      //   response.data = MriFrontendConfig.getFrontendConfig().translate(
      //     response.data
      //   );

      // response = this._renameAttributesGeneric(response);
      var orderedMeasures = [];
      for (var i = 0; i < response.measures.length; ++i) {
        if (response.measures[i]) {
          // change the order of the columns
          orderedMeasures[
            this._allAttributesPositions[response.measures[i].id]
          ] =
            response.measures[i];

          if (this._attributeCardinality[i] > 1) {
            var ids = [response.measures[i].id];
            for (var j = 1; j < this._attributeCardinality[i]; ++j) {
              ids.push(response.measures[i + j].id);
            }
            response.measures.splice(i + 1, this._attributeCardinality[i] - 1);

            for (var n = 0; n < response.data.length; ++n) {
              for (var k = 1; k < ids.length; ++k) {
                if (response.data[n][ids[k]]) {
                  response.data[n][ids[0]] += "," + response.data[n][ids[k]];
                }
              }
            }
          }
        }
      }

      //   response.measures = orderedMeasures.filter(function(e) {
      //     return typeof e !== "undefined";
      //   });

      response.measures.forEach(function(mMeasure) {
        mMeasure.configPath = MriFrontendConfig.getFrontendConfig().getGenericPath(
          mMeasure.id
        );
        var filterCardInstance = that.findFiltercardByAttribute(mMeasure.id);
        aAttributeInformation.some(function(mAttrInfo) {
          if (mAttrInfo.getConfigPath() === mMeasure.configPath) {
            mMeasure.parentColumnName =
              filterCardInstance &&
              filterCardInstance.sFilterCardConfigPath !== "patient"
                ? filterCardInstance.sFilterCardName
                : null;
            mMeasure.fullname =
              (mAttrInfo.getParentFilterCard()
                ? mAttrInfo.getParentFilterCard().getName() + " - "
                : "") + mAttrInfo.getName();
            return true;
          } else {
            return false;
          }
        });

        var mAttributeConfig = MriFrontendConfig.getFrontendConfig().getAttributeByPath(
          mMeasure.id
        );
        response.data.forEach(function(mDatum) {
          if (!Array.isArray(mDatum[mMeasure.id])) {
            mDatum[mMeasure.id] = [mDatum[mMeasure.id]];
          }
          mDatum[mMeasure.id] = mDatum[mMeasure.id]
            .map(function(vData) {
              if (vData === "NoValue") {
                return Utils.getText("MRI_PA_NO_VALUE");
              }
              if (
                mAttributeConfig.getType() ===
                  sap.hc.mri.pa.ui.lib.CDMAttrType.Datetime ||
                mAttributeConfig.getType() ===
                  sap.hc.mri.pa.ui.lib.CDMAttrType.Date
              ) {
                var dDate = Utils.parseHANADate(vData);
                if (dDate) {
                  return mAttributeConfig.getType() ===
                    sap.hc.mri.pa.ui.lib.CDMAttrType.Datetime
                    ? Utils.formatDateTime(dDate)
                    : Utils.formatDate(dDate);
                }
                return Utils.getText("MRI_PA_INVALID_DATE");
              }
              return vData;
            })
            .join(", ");
        });
      });

      // Set number of visible rows to the number or rows in the response
      this.getAggregation("_table").setVisibleRowCount(
        response.data.length || this.getPageSize()
      );

      var model = this.getDataModel();
      var totalPages = Math.ceil(
        response.totalPatientCount / this.getPageSize()
      );
      model.setProperty("/total_pages", totalPages);
      if (model.getProperty("/current_page") > totalPages) {
        model.setProperty("/current_page", totalPages);
      }
      // Set measures property to "undefined"
      model.setProperty("/response/measures");
      model.setProperty("/response", response);

      // Update status bar
      var oModel = this.getModel(Utils.models.RESULTS);
      if (oModel) {
        var oStatusData = oModel.getData();
        oStatusData.drilldown.enabled = false;
        oModel.setData(oStatusData);
      }
    };

    /**
     * Return the download link url.
     * @returns {string} URL of the download link for the PatientList.
     */
    PatientListChart.prototype._getDownloadLink = function() {
      return "/sap/hc/mri/pa/services/analytics.xsjs?action=patientdetailcsv";
    };

    /**
     * Return the download data
     * @returns {object} Filter Data of the download link for the PatientList.
     */
    PatientListChart.prototype._getDownloadData = function() {
      var oFilters = this.getController().generateBackendIFR({
        cvs: true
      });
      return oFilters;
    };

    /**
     * Return the download link Parameter.
     * @returns {Object} Object Containing the Download Parameter.
     */
    PatientListChart.prototype._getDownloadParameter = function() {
      var csvParam = {
        configData: MriFrontendConfig.getFrontendConfig().getConfigMetadata(),
        returnAsCsv: true,
        uiColumnDisplayOrder: this.getAggregation("_table")
          .getColumns()
          .map(function(col) {
            return col.getSortProperty();
          })
      };
      return { csvParam: csvParam };
    };

    /**
     * Replaces all the instance attribute paths in the response with the equivalent generic path.
     * @private
     * @param   {object} response a response object
     * @returns {object} a copy of the initial response object with the modified keys and values.
     */
    PatientListChart.prototype._renameAttributesGeneric = function(response) {
      var newResponse = Utils.cloneJson(response);
      newResponse.measures.forEach(function(mMeasure) {
        mMeasure.id = MriFrontendConfig.getFrontendConfig().getGenericPath(
          mMeasure.id
        );
        mMeasure.value = "{" + mMeasure.id + "}";
      });
      newResponse.data = newResponse.data.map(function(mDatum) {
        var mNewDatum = {};
        for (var sKey in mDatum) {
          if (mDatum.hasOwnProperty(sKey)) {
            var sNewKey = MriFrontendConfig.getFrontendConfig().getGenericPath(
              sKey
            );
            mNewDatum[sNewKey] = mDatum[sKey];
          }
        }
        return mNewDatum;
      });
      return newResponse;
    };

    /**
     * Decides whether attrId is an attribute id that shall be rendered as a link
     * for triggering the Patient Summary.
     * Note, that the argument may have suffixes attached that must be ignored.
     * (e.g. 'firstname1' vs. 'firstname')
     * @private
     * @param   {string}  attrId Id of the attribute of a column
     * @returns {boolean} True, if it should be displayed as a link
     */
    PatientListChart.prototype._isLinkAttribute = function(attrId) {
      if (!this._linkAttrIds) {
        return false;
      }
      if (!attrId) {
        return false;
      }

      // Return true if this._linkAttrIds contains a string that attrId starts with.
      for (var i = 0; i < this._linkAttrIds.length; i++) {
        if (attrId.indexOf(this._linkAttrIds[i]) === 0) {
          return true;
        }
      }

      return false;
    };

    PatientListChart.prototype.onAfterShow = function() {
      var oStatusData = this.getModel(Utils.models.RESULTS).getData();
      oStatusData.drilldown.enabled = false;
      oStatusData.download.enabled = this._settings.downloadEnabled;
      oStatusData.collection.enabled = this._settings.collectionEnabled;
      oStatusData.pdfDownload.enabled = this._settings.pdfDownloadEnabled;
      this.getModel(Utils.models.RESULTS).setData(oStatusData);

      // left part of the chart containing
      this.getModel(Utils.models.STATUS).setProperty("/beginVisible", false);

      this._updateLocationsModel();
    };

    PatientListChart.prototype.getDataURL = function() {
      return "/sap/hc/mri/pa/services/analytics.xsjs?action=patientdetail";
    };

    PatientListChart.prototype.findFiltercardByAttribute = function(
      instanceId
    ) {
      return this.getProperty("chartableFilterCards").find(
        function(card) {
          return (
            typeof card.aAttributes.find(function(attribute) {
              return attribute.sAttributeInstance === instanceId;
            }) !== "undefined"
          );
        }.bind(this)
      );
    };
    return PatientListChart;
  }
);
