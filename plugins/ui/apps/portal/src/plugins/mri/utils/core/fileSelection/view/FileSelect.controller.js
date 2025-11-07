sap.ui.define(
  [
    "sap/ui/core/routing/History",
    "jquery.sap.global",
    "sap/m/Label",
    "sap/m/Link",
    "sap/m/MessageBox",
    "sap/m/Text",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/json/JSONModel",
    "sap/m/Tile",
    "sap/m/ViewSettingsDialog",
    "sap/ui/model/Sorter",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/CustomListItem",
    "sap/m/DateTimeInput",
    "sap/m/DatePicker",
    "sap/m/Popover",
    "sap/m/List",
    "hc/hph/core/ui/AjaxUtils",
    "sap/m/BusyDialog",
    "hc/hph/core/ui/fileSelection/util/Formatter",
  ],
  function (
    History,
    jQuery,
    Label,
    Link,
    MessageBox,
    Text,
    Fragment,
    MessageToast,
    Controller,
    Filter,
    JSONModel,
    Tile,
    SettingsDialog,
    Sorter,
    Dialog,
    Button,
    CustomListItem,
    DateTimeInput,
    DatePicker,
    Popover,
    List,
    AjaxUtils,
    BusyDialog,
    Formatter
  ) {
    "use strict";
    var selectController = Controller.extend(
      "hc.hph.core.ui.fileSelection.view.FileSelect",
      {
        // Intitialize the crumb info the collection root (the crumbs are the arrays returned by the Fileselection service )
        formatter: Formatter,
        sCollection: "/Hierarchy",
        oSettingsDialog: null,
        mInitialState: {
          aFileSelected: {},
          count: null,
        },
        metadata: {
          properties: {},
          aggregations: {
            suggestionItems: {
              type: "sap.m.SearchField",
              multiple: true,
            },
            customTabs: {
              type: "sap.m.ViewSettingsDialog",
              multiple: true,
            },
          },
          defaultAggregation: "customTabs",
        },
        onInit: function () {
          jQuery.sap.require("sap.ui.core.IconPool");
          jQuery.sap.require("hc.hph.core.ui.fileSelection.util.Formatter");
          // add the css class for the preview button
          this.previewButton = this.byId("preview");
          this.previewButton.addStyleClass("sapHcHphUi-TaggedBtn");
          var initialModel = new JSONModel();
          this.getView().setModel(initialModel, "initialModel");
          var fileModel = new JSONModel();
          this.getView().setModel(fileModel, "fileModel");
          if (!this.oTemplate) {
            this.oTemplate = sap.ui.xmlfragment(
              "hc.hph.core.ui.fileSelection.view.Row"
            );
          }
          this._oTable = this.byId("filesTable");
          this.getView().setModel(
            new sap.ui.model.resource.ResourceModel({
              bundleUrl:
                "/hc/hph/genomics/ui/i18n/plugins/messagebundle.properties",
              bundleLocale: sap.ui.getCore().getConfiguration().getLanguage(),
            }),
            "i18n"
          );
          var i18nDIModel = new sap.ui.model.resource.ResourceModel({
            bundleUrl:
              "/hc/hph/di/cockpit/ui/i18n/messageBundle.properties",
          });
          this.getView().setModel(i18nDIModel, "i18ndi");
          var oResourceBundle = this.getView()
            .getModel("i18n")
            .getResourceBundle();
          var oFilterData = {
            status: [
              {
                key: "null",
                text: oResourceBundle.getText("RUN_STATUS_NONE"),
              },
              {
                key: "Completed",
                text: oResourceBundle.getText("RUN_STATUS_COMPLETED"),
              },
              {
                key: "Failed",
                text: oResourceBundle.getText("RUN_STATUS_FAILED"),
              },
              {
                key: "Cancelled",
                text: oResourceBundle.getText("RUN_STATUS_CANCELLED"),
              },
              {
                key: "Rolledback",
                text: oResourceBundle.getText("RUN_STATUS_ROLLED_BACK"),
              },
              {
                key: "Queued",
                text: oResourceBundle.getText("RUN_STATUS_QUEUED"),
              },
            ],
            lastImported: {
              begin: {
                date: new Date(),
                enabled: false,
              },
              end: {
                date: new Date(),
                enabled: false,
              },
            },
            lastModified: {
              begin: {
                date: new Date(),
                enabled: false,
              },
              end: {
                date: new Date(),
                enabled: false,
              },
            },
            active: false,
            query: "",
          };
          oFilterData.selectedStatus = oFilterData.status.map(function (
            oStatus
          ) {
            return oStatus.key;
          });
          this.getView().setModel(
            new sap.ui.model.json.JSONModel(oFilterData),
            "filter"
          );
          var oListModel = new sap.ui.model.json.JSONModel();
          this.getView().setModel(oListModel, "oListModel");
          oListModel.setData({ count: null }, true);
          var sPath = this._getInitialPath();
          this._setAggregation(sPath);
        },
        onInitFiles: function (oParam) {
          var that = this;
          this.getView().byId("FileSelectorContent").setBusy(true);
          this.mRequest = AjaxUtils.ajax({
            url: jQuery.sap.getModulePath(oParam.path, "/" + oParam.service),
            method: "POST",
            data: JSON.stringify({
              profileId: oParam.profileID,
              remoteSourceParameter: oParam.remoteSourceParameter,
              schemaNameParameter: oParam.schemaNameParameter,
              tableNameParameter: oParam.tableNameParameter,
            }),
            dataType: "json",
          })
            .done(function (oData) {
              that.mRequest = null;
              that.getView().getModel("initialModel").setData(oData);
              that.getView().getModel("fileModel").setData(oData);
              that._oTable.setModel(that.getView().getModel("fileModel"));
              that.updateFilter();
              that.getView().byId("FileSelectorContent").setBusy(false);
              that.handleAutoSelection();
            })
            .fail(function (oResponse, sReason) {
              if (sReason !== "abort") {
                MessageToast.show(
                  that.getView().getModel("i18n").getProperty("ADMIN_ERROR")
                );
                console.error(oResponse.responseText);
              }
              that.mRequest = null;
              that.getView().byId("FileSelectorContent").setBusy(false);
            });
          that
            .getView()
            .getModel("initialModel")
            .attachRequestCompleted(function (oEvent) {
              var model = oEvent.getSource();
            });
        },
        onCancelFileInit: function () {
          if (this.mRequest) {
            this.mRequest.abort();
          }
        },
        handleFilter: function () {
          this.updateFilter();
        },
        updateFilter: function (bSelected) {
          var oFilterData = this.getView().getModel("filter").getData();
          var oStatusFilter = oFilterData.selectedStatus.reduce(function (
            oAllStatus,
            sKey
          ) {
            oAllStatus[sKey] = true;
            return oAllStatus;
          },
          {});
          // save binding path
          var oPathElement = (
            this._oTable.getModel()
              ? this._oTable.getModel()
              : this.getView().getModel("initialModel")
          ).getData().Hierarchy;
          var sBindingPath = this._oTable.getBindingPath("items");
          var aNameBindingPath = sBindingPath
            .split("/")
            .slice(3)
            .reduce(function (aPath, sPathElement, iPathElement) {
              if ((iPathElement & 1) === 0) {
                oPathElement = oPathElement.Folders[parseInt(sPathElement, 10)];
                aPath.push(oPathElement.Name);
              }
              return aPath;
            }, []);
          var oData = this.getView().getModel("initialModel").getData();
          var filterContent = function (aFolders) {
            var aFilteredFolders = [];
            aFolders.forEach(function (oEntry) {
              var oNewEntry = $.extend({}, oEntry);
              oNewEntry.OriginalEntry = oEntry;
              if (oNewEntry.Folders) {
                oNewEntry.Folders = filterContent(oEntry.Folders);
                aFilteredFolders.push(oNewEntry);
              }
              var dLastImported = new Date(oEntry.LastImported);
              var dLastModified = new Date(oEntry.LastUpdated);
              if (
                oNewEntry.Name.toUpperCase().indexOf(
                  oFilterData.query.toUpperCase()
                ) !== -1 &&
                oStatusFilter[oNewEntry.Status] &&
                (!oFilterData.lastImported.begin.enabled ||
                  dLastImported >= oFilterData.lastImported.begin.date) &&
                (!oFilterData.lastImported.end.enabled ||
                  dLastImported <= oFilterData.lastImported.end.date) &&
                (!oFilterData.lastModified.begin.enabled ||
                  dLastModified >= oFilterData.lastModified.begin.date) &&
                (!oFilterData.lastModified.end.enabled ||
                  dLastModified <= oFilterData.lastModified.end.date)
              ) {
                aFilteredFolders.push(oNewEntry);
                oEntry.FilteredOut = false;
              } else {
                oEntry.FilteredOut = true;
              }
            });
            return aFilteredFolders;
          };
          var oFiltered = {
            Hierarchy: {
              Name: oData.Hierarchy.Name,
              Folders: filterContent(oData.Hierarchy.Folders),
            },
          };
          this._updateFileCount(
            bSelected,
            oPathElement.OriginalEntry
              ? oPathElement.OriginalEntry
              : oData.Hierarchy
          );
          this._oTable.getModel().setData(oFiltered);
          // restore binding path
          oPathElement = oFiltered.Hierarchy;
          sBindingPath =
            "/Hierarchy/Folders" +
            aNameBindingPath.reduce(function (sPath, sFileName) {
              for (var iElement in oPathElement.Folders) {
                if (oPathElement.Folders[iElement].Name === sFileName) {
                  sPath += "/" + iElement + "/Folders";
                  oPathElement = oPathElement.Folders[iElement];
                  break;
                }
              }
              return sPath;
            }, "");
          this._setAggregation(sBindingPath);
        },
        handleOpenFilterDialog: function () {
          if (!this.filterDialog) {
            this.filterDialog = sap.ui.xmlfragment(
              "hc.hph.core.ui.fileSelection.view.Filter",
              this
            );
            this.getView().addDependent(this.filterDialog);
            this.filterDialog.setModel(new sap.ui.model.json.JSONModel());
          }
          this.filterDialog
            .getModel()
            .setData(
              $.extend(true, {}, this.getView().getModel("filter").getData())
            );
          this.getView().getModel("filter").refresh(true);
          this.filterDialog.open();
        },
        handleConfirmFilterDialog: function () {
          this.getView()
            .getModel("filter")
            .setData(
              $.extend(true, {}, this.filterDialog.getModel().getData())
            );
          this.updateFilter();
          this.filterDialog.close();
        },
        handleCancelFilterDialog: function () {
          this.updateFilter();
          this.filterDialog.close();
          this.getView().getModel("filter").refresh(true);
        },
        handleClearFilter: function () {
          var oFilterData = this.getView().getModel("filter").getData();
          oFilterData.selectedStatus = oFilterData.status.map(function (
            oStatus
          ) {
            return oStatus.key;
          });
          oFilterData.lastImported.begin.enabled = false;
          oFilterData.lastImported.end.enabled = false;
          oFilterData.lastModified.begin.enabled = false;
          oFilterData.lastModified.end.enabled = false;
          oFilterData.query = "";
          this.getView().getModel("filter").setData(oFilterData);
          this.getView().getModel("filter").refresh(true);
          this.updateFilter();
        },
        handleAutoSelection: function () {
          var that = this;
          var aSelectedFiles = this.getSelectedFiles();
          that
            .getView()
            .getModel("oListModel")
            .setData(
              { count: aSelectedFiles.length ? aSelectedFiles.length : null },
              true
            );
          if (aSelectedFiles.length > 0) {
            sap.ui.getCore().byId("Next").setEnabled(true);
          }
        },
        // Initial path is the first crumb appended to the collection root
        _getInitialPath: function () {
          return [this.sCollection, "Folders"].join("/");
        },
        // Remove the numeric item binding from a path
        _stripItemBinding: function (sPath) {
          var aParts = sPath.split("/");
          return aParts.slice(0, aParts.length - 1).join("/");
        },
        // Build the crumb links for display in the toolbar
        _maintainCrumbLinks: function (sPath) {
          // Determine trail parts
          var aPaths = [];
          var aParts = sPath.split("/");
          while (aParts.length > 1) {
            aPaths.unshift(aParts.join("/"));
            aParts = aParts.slice(0, aParts.length - 2);
          }
          // Re-build crumb toolbar based on trail parts
          var oCrumbToolbar = this.byId("idCrumbToolbar");
          while (oCrumbToolbar.getContent().length > 2) {
            oCrumbToolbar.removeContent(0);
          }
          aPaths.forEach(
            jQuery.proxy(function (sPath, iPathIndex) {
              var bIsLast = iPathIndex === aPaths.length - 1;
              // Special case for 1st crumb: fixed text
              var sText = "{Name}";
              // Context is one level up in path
              var sContext = this._stripItemBinding(sPath);
              var oCrumb = bIsLast
                ? new Text({ text: sText }).addStyleClass("crumbLast")
                : new Link({
                    text: sText,
                    target: sPath,
                    press: [this.handleLinkPress, this],
                  });
              oCrumb.bindElement(sContext);
              oCrumbToolbar.insertContent(
                oCrumb,
                oCrumbToolbar.getContent().length - 2
              );
              if (!bIsLast) {
                var oArrow = new Label({
                  textAlign: "Center",
                  text: "/",
                }).addStyleClass("crumbArrow");
                oCrumbToolbar.insertContent(
                  oArrow,
                  oCrumbToolbar.getContent().length - 2
                ); // -2 as there are toolbarspacer & button already
              }
            }, this)
          );
        },
        // Navigate through the file hierarchy by rebinding
        _setAggregation: function (sPath) {
          this._oTable.bindAggregation("items", sPath, this.oTemplate);
          this._maintainCrumbLinks(sPath);
        },
        // Navigation means a new aggregation to work our
        // way through the DocumentHierarchy
        handleLinkPress: function (oEvent) {
          this._setAggregation(oEvent.getSource().getTarget());
        },
        handleSelectionChange: function (oEvent) {
          var that = this;
          var oListItem = oEvent.getParameter("listItem");
          var oFile = oListItem.getBindingContext().getObject();
          if (oFile.Folders) {
            var sFolderPath = oListItem.getBindingContext().getPath();
            var aPath = sFolderPath.split("/");
            var sCurrentCrumb = aPath[aPath.length - 2];
            if (!this.oTemplate) {
              this.oTemplate = sap.ui.xmlfragment(
                "hc.hph.core.ui.fileSelection.view.Row"
              );
            }
            oListItem
              .getParent()
              .bindItems(sFolderPath + "/Folders", this.oTemplate);
            var sNewPath = [sFolderPath, "Folders"].join("/");
            this._setAggregation(sNewPath);
          } else {
            oFile.OriginalEntry.Selected = !oFile.OriginalEntry.Selected;
            oListItem.setSelected(false);
            oListItem
              .getCells()[0]
              .setSrc(Formatter.getCheckmark(oFile.OriginalEntry.Selected));
          }
          /***  Code to use for GFF3 and FASTA */
          /* else {
			    oFile.OriginalEntry. = !oFile.OriginalEntry.Selected;
			    var aSelectedFile = that.getSelectedFiles();
			    for(var i = 0; i<= aSelectedFile.length; i++){
			          if(aSelectedFile.length === 1){
			              oListItem.setSelected(false);
			       oListItem.getCells()[0].setSrc(hc.hph.core.ui.fileSelection.util.Formatter.getCheckmark(oFile.OriginalEntry.Selected));
			           break;
			    }
			        }
			}*/
          var oFileSelected = that.getSelectedFiles();
          this.getView()
            .getModel("oListModel")
            .setData(
              { count: oFileSelected.length ? oFileSelected.length : null },
              true
            );
          sap.ui
            .getCore()
            .byId("Next")
            .setEnabled(oFileSelected.length > 0);
          that.getView().getModel("initialModel").refresh(true);
          this.updateFilter();
        },
        onExit: function () {
          if (this._oDialog) {
            this._oDialog.destroy();
          }
        },
        getSplitAppObj: function () {
          var result = this.byId("SplitAppDemo");
          if (!result) {
            jQuery.sap.log.info("SplitApp object can't be found");
          }
          return result;
        },
        getSelectedFiles: function () {
          var oData = this.getView().getModel("initialModel").getData();
          return this.getFile(oData.Hierarchy);
        },
        getFile: function (oData) {
          var oThis = this;
          var aFiles = [];
          if (oData.Folders) {
            oData.Folders.forEach(function (oChild) {
              aFiles = aFiles.concat(oThis.getFile(oChild));
            });
          } else {
            return oData.Selected ? [oData] : [];
          }
          return aFiles;
        },
        // Dialog to preview the selected files
        onApproveDialog: function () {
          var that = this;
          if (!this.mSelectionDialog) {
            this.mSelectedTable = sap.ui.xmlfragment(
              "hc.hph.core.ui.fileSelection.view.SelectTable",
              this
            );
            this.mSelectedTable.setMode(sap.m.ListMode.Delete);
            this.mSelectedTable.setModel(new JSONModel());
            this.mSelectionDialog = new sap.m.Dialog({
              title: "{i18n>SELECTED_FILES}",
              type: "Message",
              resizable: true,
              draggable: true,
              contentWidth: "600px",
              content: [this.mSelectedTable],
              afterClose: function () {},
              leftButton: new sap.m.Button({
                text: "{i18n>OK}",
                tap: function () {
                  that.mSelectionDialog.close();
                },
              }),
            });
            this.mSelectionDialog.addStyleClass("SelectedFiles-PreviewDialog");
            this.getView().addDependent(this.mSelectionDialog);
          }
          var aFilesSelected = that.getSelectedFiles();
          var selectedFilesModel = this.mSelectedTable.getModel();
          selectedFilesModel.setData(aFilesSelected);
          this.mSelectionDialog.open();
        },
        //remove undesired files from the preview dialog
        handleDelete: function (oEvent) {
          var that = this;
          var sPath = oEvent.getParameters().listItem.getCells()[1].getText();
          var aList = that.getSelectedFiles();
          for (var x = 0; x < aList.length; x++) {
            var oFiles = aList[x];
            if (oFiles.Path === sPath) {
              oFiles.Selected = false;
              that.getView().getModel("fileModel").refresh(true);
              break;
            }
          }
          oEvent.getSource().getModel().setData(this.getSelectedFiles());
          this.updateFilter();
          that
            .getView()
            .getModel("oListModel")
            .setData(
              { count: aList.length - 1 ? aList.length - 1 : null },
              true
            );
          if (aList.length === 1) {
            sap.ui.getCore().byId("Next").setEnabled(false);
          }
        },
        handleSelectAll: function () {
          this.updateFilter(this.getView().byId("selectAll").getSelected());
        },
        _updateFileCount: function (bSelection, oRootElement) {
          var that = this;
          var oData = that.getView().getModel("initialModel").getData();
          var selectAll = function (oMainEntry, bBelowRoot) {
            if (oMainEntry === oRootElement) {
              bBelowRoot = true;
            }
            if (oMainEntry.Folders) {
              oMainEntry.TotalCount = 0;
              oMainEntry.SelectedCount = 0;
              oMainEntry.FilteredCount = 0;
              oMainEntry.FilteredSelectedCount = 0;
              oMainEntry.Folders.forEach(function (oSubEntry) {
                // go trough the folders and select the subfiles
                selectAll(oSubEntry, bBelowRoot);
                if (oSubEntry.Folders) {
                  oMainEntry.TotalCount += oSubEntry.TotalCount
                    ? oSubEntry.TotalCount
                    : 0;
                  oMainEntry.SelectedCount += oSubEntry.SelectedCount
                    ? oSubEntry.SelectedCount
                    : 0;
                  oMainEntry.FilteredCount += oSubEntry.FilteredCount
                    ? oSubEntry.FilteredCount
                    : 0;
                  oMainEntry.FilteredSelectedCount +=
                    oSubEntry.FilteredSelectedCount
                      ? oSubEntry.FilteredSelectedCount
                      : 0;
                } else if (oSubEntry.Selected) {
                  oMainEntry.TotalCount += 1;
                  oMainEntry.SelectedCount += 1;
                  oMainEntry.FilteredCount += oSubEntry.FilteredOut ? 0 : 1;
                  oMainEntry.FilteredSelectedCount += oSubEntry.FilteredOut
                    ? 0
                    : 1;
                } else {
                  oMainEntry.TotalCount += 1;
                  oMainEntry.FilteredCount += oSubEntry.FilteredOut ? 0 : 1;
                }
              });
              if (!oMainEntry.TotalCount) {
                delete oMainEntry.TotalCount;
              }
              if (!oMainEntry.SelectedCount) {
                delete oMainEntry.SelectedCount;
              }
              if (!oMainEntry.FilteredCount) {
                delete oMainEntry.FilteredCount;
              }
              if (!oMainEntry.FilteredSelectedCount) {
                delete oMainEntry.FilteredSelectedCount;
              }
            } else if (
              bSelection !== undefined &&
              !oMainEntry.FilteredOut &&
              bBelowRoot
            ) {
              oMainEntry.Selected = bSelection;
            }
          };
          selectAll(oData.Hierarchy);
          this.getView()
            .byId("selectAll")
            .setSelected(
              oRootElement.FilteredSelectedCount === oRootElement.FilteredCount
            );
          this.getView().getModel("initialModel").refresh(true);
          sap.ui
            .getCore()
            .byId("Next")
            .setEnabled(oData.Hierarchy.SelectedCount > 0);
          this.handleAutoSelection();
        },
      }
    );
    return selectController;
  }
);
