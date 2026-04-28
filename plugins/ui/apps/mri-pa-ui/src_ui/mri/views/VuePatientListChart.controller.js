sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "sap/hc/mri/pa/ui/lib/ifr/PatientListVisitor",
    "sap/hc/mri/pa/ui/lib/MriFrontendConfig",
    "sap/m/Bar",
    "sap/m/Button",
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
    "sap/ui/unified/MenuItem",
    'sap/ui/core/mvc/Controller',
    "sap/ui/model/resource/ResourceModel"
], function (jQuery, Utils, PatientListVisitor, MriFrontendConfig, Bar, Button, FlexBox, Label, Link, Text, CommonsLabel, Paginator, CustomData, JSONModel, DateType, Column, Table, Menu, MenuItem
    , Controller, ResourceModel) {
        const PatientListChart = Controller.extend('sap.hc.mri.pa.ui.views.VuePatientListChart', {
            onInit: function () {
                this.eventBus = sap.ui.getCore().getEventBus();
                this.eventBus.subscribe(
                    'EVENT_PL_CHART_INIT',
                    this.initChart,
                    this);

                this.eventBus.subscribe(
                    'EVENT_PL_CHART_UPDATE',
                    this.updateChart,
                    this);

                this.eventBus.subscribe(
                    'EVENT_PL_CHART_BUSY',
                    this.setChartBusy,
                    this);

                this.eventBus.subscribe(
                    'EVENT_PL_CHART_RENDER',
                    this.renderChart,
                    this);

                this.plTableContainter = this.byId('mriPLCohorts');

                this.getView().setModel(new ResourceModel({
                    bundleUrl: jQuery.sap.getModulePath("sap.hc.mri.pa.ui") + "/i18n/text.properties"
                }), 'i18n');
            },
            onExit: function () {
                this.eventBus.unsubscribe(
                    'EVENT_PL_CHART_INIT',
                    this.initChart,
                    this);

                this.eventBus.unsubscribe(
                    'EVENT_PL_CHART_UPDATE',
                    this.updateChart,
                    this);

                this.eventBus.unsubscribe(
                    'EVENT_PL_CHART_BUSY',
                    this.setChartBusy,
                    this);

                this.eventBus.unsubscribe(
                    'EVENT_PL_CHART_RENDER',
                    this.renderChart,
                    this);
            },
            updateChart: function (sChannelId, sEventId, oEventData) {
                this.reloadChart(oEventData.ifr, oEventData.additionalInformation);
            },
            reloadChart: function (ifr, additionalInformation) {
                if (ifr) {
                    this._ifr = ifr;
                }
                var oIFR = this._ifr;

                var that = this;
                var axes = [];
                var constraints = {
                    filterAttributeConstraints: [],
                    filtercardConstraints: []
                };

                var interactionPaths = [];
                oIFR.content[0].content.forEach(function (filtercard) {
                    if (!filtercard.content) { // Excluded Filtercard
                        constraints.filtercardConstraints.push({
                            sConfigPath: filtercard._configPath,
                            iInstanceNumber: filtercard._instanceNumber,
                            sInstanceID: filtercard._instanceID
                        });
                        filtercard._attributes.content.forEach(function (attribute) {
                            constraints.filterAttributeConstraints.push({
                                sConfigPath: attribute._configPath,
                                sInstanceID: attribute._instanceID
                            });
                        });
                        if (filtercard._configPath !== 'patient') {
                            interactionPaths.push(filtercard._configPath);
                        }
                    }
                });
                //var constraints = PatientListVisitor.getFilterConstraints(oIFR);
                /*
                if (!mParams) {
                    mParams = {};
                }
                */
                var mParams = {};

                var pageSize = this.getPageSize();
                var model = this.getView().getModel();
                var request = {};

                var currentPage = model.getProperty("/current_page");

                request.guarded = true;

                if (mParams.cvs || mParams.collection) {
                    // for save as csv functionality - no limit is required
                    request.limit = 0;
                    request.offset = 0;
                } else {
                    request.limit = pageSize;
                    request.offset = currentPage > 0 ? (currentPage - 1) * pageSize : 0;
                }

                var sortedAttributes = model.getProperty("/sorted_attributes"); // attributes that will be sorted in the output. Empty Array if no specific sorting is required
                var sortingDirections = model.getProperty("/sorting_directions"); // directions to sort.
                var selectedAttributes = model.getProperty("/selected_attributes");

                if (additionalInformation) {
                    model.setProperty("/sorted_attributes", additionalInformation.sorted_attributes);
                    sortedAttributes = additionalInformation.sorted_attributes;
                    model.setProperty("/sorting_directions", additionalInformation.sorting_directions);
                    sortingDirections = additionalInformation.sorting_directions;
                    model.setProperty("/selected_attributes", additionalInformation.selected_attributes);
                    selectedAttributes = additionalInformation.selected_attributes;

                    that._allAttributesPositions = {};
                    Object.keys(selectedAttributes).forEach(function (key) {
                        that._allAttributesPositions[key] = selectedAttributes[key] + 1;
                    });
                }

                var removedAttribute = false;
                var attributePaths = Object.keys(selectedAttributes);
                var attributeToRemove = [];
                var i;
                for (i = 0; i < attributePaths.length; i++) {
                    var attributeObj = MriFrontendConfig.getFrontendConfig().getAttributeByPath(attributePaths[i]);
                    if (attributeObj._oInternalConfigAttribute.aggregated && interactionPaths.indexOf(attributeObj._sParentPath) < 0) {
                        attributeToRemove.push(attributePaths[i]);
                    }
                }
                for (i = 0; i < attributeToRemove.length; i++) {
                    var order = selectedAttributes[attributeToRemove[i]];
        
                    for (var property in selectedAttributes) {
                        if (selectedAttributes.hasOwnProperty(property)) {
                            if (selectedAttributes[property] > order) {
                                selectedAttributes[property]--;
                            }
                        }
                    }
        
                    delete selectedAttributes[attributeToRemove[i]];
                    removedAttribute = true;
                }
                model.setProperty("/available_interactions", {});
                for (i = 0; i < interactionPaths.length; i++) {
                    model.setProperty("/available_interactions/" + interactionPaths[i], 1);
                }

                if (removedAttribute) {
                    model.setProperty("/selected_attributes", selectedAttributes);
                }



                const requestAdditionalInformation = {
                    sorted_attributes: sortedAttributes,
                    sorting_directions: sortingDirections,
                    selected_attributes: selectedAttributes
                };
                var catIndex = sortedAttributes.length; // use as value of the xaxis parameter in the filter's attributes.

                this._attributeCardinalityTest = []; // maps the index of each column to the number of times the corresponding attribute appears in the filter
                this._columnIndexToAttrKeyTest = []; // maps column indexes to attribute keys

                var instanceCount = 10000;
                var axes = [];

                var test = Object.keys(selectedAttributes)
                    .reduce(function (columnList, attribute) {
                        columnList.push([attribute, selectedAttributes.attribute]);
                        return columnList;
                    }, [])
                    .sort(function (a, b) {
                        return a[1] - b[1];
                    }).forEach(function (attributePair, index) {
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
                        var fcConstraint = constraints.filtercardConstraints.filter(function (h) {
                            if (attributePair[0].split(".")[1] !== "attributes" && h.sConfigPath === "patient") {
                                return false;
                            } else {
                                return attributePair[0].search(h.sConfigPath) !== -1;
                            }
                        });

                        // checks if any of the attributes set in filtercards matches selected column attributes
                        var attrConstraint = constraints.filterAttributeConstraints.filter(function (g) {
                            return attributePair[0] === g.sConfigPath;
                        });

                        // if selected attribute is not associated with any filtercard constraint, empty filtercard has to be created
                        var instanceId = MriFrontendConfig.getFrontendConfig().getInteractionInstancePath(axis.id);
                        if (fcConstraint.length === 0) {
                            var newInstanceId = instanceId + "." + instanceCount;
                            axis.isFiltercard = false;
                            axis.id = axis.id.replace(instanceId, newInstanceId);
                            axis.instanceID = newInstanceId;
                            ++instanceCount;
                        } else {
                            axis.isFiltercard = true;
                            // if selected attribute is not an attribute constraint in a filtercard, empty attribute has to be created
                            if (attrConstraint.length === 0) {
                                axis.id = axis.id.replace(instanceId, fcConstraint[0].sInstanceID);
                                axis.instanceID = fcConstraint[0].sInstanceID;
                            } else if (attributePair[0].split(".")[1] !== "attributes") {
                                // if selected attribute is not a basic data attribute, set axis id to the filtercard attribute instanceid
                                axis.id = attrConstraint[0].sInstanceID;
                                that._attributeCardinalityTest[index] = 1;
                            }
                            axis.instanceID = MriFrontendConfig.getFrontendConfig().getInteractionInstancePath(axis.id);
                        }

                        axis.configPath = MriFrontendConfig.getFrontendConfig().getGenericPath(axis.instanceID);

                        that._columnIndexToAttrKeyTest[index] = attributePair[0];

                        axes.push(axis);
                    });
                request.axes = axes;
                request.cards = oIFR;

                this.eventBus.publish('VUE_SET_PL_REQUEST', { request: request, additionalInformation: requestAdditionalInformation });
            },
            renameAttributesGeneric: function (response) {
                var newResponse = Utils.cloneJson(response);
                newResponse.measures.forEach(function (mMeasure) {
                    mMeasure.id = MriFrontendConfig.getFrontendConfig().getGenericPath(mMeasure.id);
                    mMeasure.value = "{" + mMeasure.id + "}";
                });
                newResponse.data = newResponse.data.map(function (mDatum) {
                    var mNewDatum = {};
                    for (var sKey in mDatum) {
                        if (mDatum.hasOwnProperty(sKey)) {
                            var sNewKey = MriFrontendConfig.getFrontendConfig().getGenericPath(sKey);
                            mNewDatum[sNewKey] = mDatum[sKey];
                        }
                    }
                    return mNewDatum;
                });
                return newResponse;
            },
            renderChart: function (sChannelId, sEventId, oEventData) {
                var response = JSON.parse(JSON.stringify(oEventData.data));
                this._attributeCardinality = [];

                var oPatientListConfig = MriFrontendConfig.getFrontendConfig().getPatientListConfig();
                var aAttributeInformation = oPatientListConfig.getAllAttributes();

                response.data = Utils.translate(response.data);

                response = this.renameAttributesGeneric(response);
                var orderedMeasures = [];
                for (var i = 0; i < response.measures.length; ++i) {
                    if (response.measures[i]) {
                        // change the order of the columns
                        orderedMeasures[this._allAttributesPositions[response.measures[i].id]] = response.measures[i];

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

                response.measures = orderedMeasures.filter(function (e) {
                    return typeof e !== "undefined";
                });

                response.measures.forEach(function (mMeasure) {
                    aAttributeInformation.some(function (mAttrInfo) {
                        if (mAttrInfo.getConfigPath() === mMeasure.id) {
                            mMeasure.fullname = (mAttrInfo.getParentFilterCard() ? mAttrInfo.getParentFilterCard().getName() + " - " : "") + mAttrInfo.getName();
                            return true;
                        } else {
                            return false;
                        }
                    });

                    var mAttributeConfig = MriFrontendConfig.getFrontendConfig().getAttributeByPath(mMeasure.id);
                    response.data.forEach(function (mDatum) {
                        if (!Array.isArray(mDatum[mMeasure.id])) {
                            mDatum[mMeasure.id] = [mDatum[mMeasure.id]];
                        }
                        mDatum[mMeasure.id] = mDatum[mMeasure.id].map(function (vData) {
                            if (vData === "NoValue") {
                                return Utils.getText("MRI_PA_NO_VALUE");
                            }
                            if (mAttributeConfig.getType() === sap.hc.mri.pa.ui.lib.CDMAttrType.Datetime || mAttributeConfig.getType() === sap.hc.mri.pa.ui.lib.CDMAttrType.Date) {
                                var dDate = Utils.parseHANADate(vData);
                                if (dDate) {
                                    return mAttributeConfig.getType() === sap.hc.mri.pa.ui.lib.CDMAttrType.Datetime ?
                                        Utils.formatDateTime(dDate) : Utils.formatDate(dDate);
                                }
                                return Utils.getText("MRI_PA_NO_VALUE");
                            }
                            return vData;
                        }).join(", ");
                    });
                });

                this._columnIndexToAttrKey = response.measures.map(function (measure) {
                    return measure.id;
                });

                // Set number of visible rows to the number or rows in the response
                //this.getAggregation("_table").setVisibleRowCount(response.data.length || this.getPageSize());

                var model = this.getView().getModel();
                var totalPages = Math.ceil(response.totalPatientCount / this.getPageSize());
                model.setProperty("/total_pages", totalPages);
                if (model.getProperty("/current_page") > totalPages) {
                    model.setProperty("/current_page", totalPages);
                }
                // Set measures property to "undefined"
                model.setProperty("/response/measures");
                model.setProperty("/response", response);

                if (response.noDataReason) {
                    model.setProperty("/noDataReason", response.noDataReason);
                }

                // Update status bar
                /*
                var oModel = this.getModel(Utils.models.RESULTS);
                if (oModel) {
                    var oStatusData = oModel.getData();
                    oStatusData.drilldown.enabled = false;
                    oModel.setData(oStatusData);
                }
                */
            },
            setPageSize: function (pageSize) {
                this._pageSize = pageSize;
            },
            getPageSize: function () {
                return this._pageSize;
            },
            isLinkAttribute: function (attrId) {
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
            },
            initChart: function (sChannelId, sEventId, oEventData) {
                //const MriFrontendConfig = oEventData.mriFrontEndConfig;
                this._chartKey = "list";
                this._ifr = JSON.parse(JSON.stringify(oEventData.ifr));

                if (MriFrontendConfig) {
                    //this._MriFrontendConfig = MriFrontendConfig;
                    this._settings = {
                        downloadEnabled: MriFrontendConfig.getFrontendConfig().isChartDownloadEnabled(this._chartKey),
                        collectionEnabled: MriFrontendConfig.getFrontendConfig().isChartCollectionEnabled(this._chartKey),
                        pdfDownloadEnabled: MriFrontendConfig.getFrontendConfig().isChartPDFDownloadEnabled(this._chartKey)
                    };
                    this.initDataModel();
                    this._table = this.createTable();
                }

                this.reloadChart(oEventData.ifr, oEventData.additionalInformation);
            },
            initDataModel: function () {
                var patientListConfig = MriFrontendConfig.getFrontendConfig().getPatientListConfig();
                var selectedAttributes = {};

                var defaultAttributes = patientListConfig.getInitialTableColumns();
                var pageSize = patientListConfig.getDefaultPageSize();
                this.setPageSize(pageSize);

                var that = this;
                this._allAttributesPositions = {};

                defaultAttributes.forEach(function (attribute, index) {
                    selectedAttributes[attribute.getConfigPath()] = index;

                    that._allAttributesPositions[attribute.getConfigPath()] = index + 1;
                });

                var model = new JSONModel({
                    current_page: 1,
                    selected_attributes: selectedAttributes,
                    available_interactions: {},
                    sorted_attributes: [],
                    sorting_directions: [],
                    noDataReason: ''
                });
                this.getView().setModel(model);
            },
            createTable: function () {
                var that = this;
                var oMenu = this.buildMenu();

                var oMenuButton = new Button({
                    text: Utils.getText('MRI_PA_PATIENT_LIST_EDIT_COLUMNS'),
                    tooltip: Utils.getText('MRI_PA_TOOLTIP_PATIENT_LIST_EDIT_COLUMNS'),
                    press: [function (oEvent) {
                        var oButton = oEvent.getSource();
                        oMenu.open(true, oButton, sap.ui.core.Popup.Dock.BeginTop, sap.ui.core.Popup.Dock.BeginBottom, oButton);
                    }, this]
                });
                oMenuButton.setIcon("sap-icon://dropdown");
                oMenuButton.setIconFirst(false);
                oMenuButton.addStyleClass("sapMriPaMenuButton");

                oMenuButton.addDependent(oMenu);

                var oTable = new Table({
                    enableColumnReordering: false,
                    selectionMode: sap.ui.table.SelectionMode.None,
                    visibleRowCount: that.getPageSize(),
                    visibleRowCountMode: sap.ui.table.VisibleRowCountMode.Fixed,
                    footer: new FlexBox({
                        justifyContent: sap.m.FlexJustifyContent.Center,
                        items: new Paginator({
                            currentPage: "{/current_page}",
                            numberOfPages: "{/total_pages}",
                            page: [function () {
                                that._updateTriggeredFromPaginator = true;
                                that.reloadChart();
                            }, this]
                        })
                    }),
                    noData: new FlexBox({
                        alignItems: sap.m.FlexAlignItems.Center,
                        height: "100%",
                        justifyContent: sap.m.FlexJustifyContent.Center,
                        items: [
                            new CommonsLabel({
                                icon: "sap-icon://message-information",
                                text: "{/noDataReason}"
                            })
                        ]
                    }).addStyleClass("sapMriChartNoDataPholder"),
                    rows: "{/response/data}",
                    toolbar: new Bar({
                        contentLeft: oMenuButton
                    }),
                    sort: function (oEvent) {
                        oEvent.preventDefault();
                        that.sortByColumnIndex(this.indexOfColumn(oEvent.getParameter("column")), oEvent.getParameter("sortOrder"));
                    }
                }).addStyleClass("sapUiSmallMargin");

                oTable.bindColumns("/response/measures", function (sId, oContext) {
                    var sAttributeId = oContext.getProperty("id");

                    var oTemplateControl;
                    // Decide whether to render the attribute as a Link or Text.
                    if (that.isLinkAttribute(sAttributeId)) {
                        oTemplateControl = new Link({
                            text: "{" + sAttributeId + "}",
                            tooltip: Utils.getText('MRI_PA_PATIENT_LIST_OPEN_PV'),
                            customData: [
                                new CustomData({
                                    key: "pid",
                                    value: "{pid}"
                                })
                            ],
                            press: function (oEvent) {
                                var aPatientId = oEvent.getSource().data("pid");
                                var sPatientId = "";
                                if (Array.isArray(aPatientId) && aPatientId.length === 1) {
                                    sPatientId = aPatientId[0];
                                }
                                if (sPatientId) {
                                    var oPatientSummary = sap.ui.xmlview("sap.hc.mri.pa.ui.views.PatientSummary");
                                    oPatientSummary.setModel(new JSONModel({
                                        dataLoaded: false,
                                        settings: {
                                            patientId: sPatientId
                                        }
                                    }), "patientSummary");
                                    that.getView().addDependent(oPatientSummary);

                                    oPatientSummary.getController().open();
                                } else {
                                    jQuery.sap.log.error("Cannot open Patient Summary", "Patient Id not set", "PatientList");
                                }
                            }
                        });
                    } else { // building the normal Text template
                        oTemplateControl = new Text({
                            text: {
                                path: sAttributeId
                            }
                        });
                    }

                    var oColumn = new Column(sId, {
                        sortProperty: sAttributeId,
                        label: new Label({
                            text: "{name}",
                            tooltip: "{fullname}"
                        }),
                        template: oTemplateControl
                    });
                    oColumn.getMenu().onBeforeRendering = function () {
                        var iColumnIndex = oColumn.getParent().indexOfColumn(oColumn);
                        var sAttrName = oColumn.getSortProperty();

                        if (Menu.prototype.onBeforeRendering) {
                            Menu.prototype.onBeforeRendering.call(this);
                        }
                        if (this.getItems().length === 2) {
                            this.addItem(new MenuItem({
                                text: Utils.getText('MRI_PA_PATIENT_LIST_REMOVE_COLUMN'),
                                select: function () {
                                    that.removeAttributeBycolumnIndex(iColumnIndex, sAttrName);
                                    that.reloadChart();
                                }
                            }));
                        }
                    };
                    return oColumn;
                });

                this.plTableContainter.addContent(oTable);
            },
            removeAttributeBycolumnIndex: function (columnIndex, attrName) {
                var attrKey = this._columnIndexToAttrKey[columnIndex];
                if (attrKey) {
                    var model = this.getView().getModel();
                    var selectedAttributes = model.getProperty("/selected_attributes");
                    delete selectedAttributes[attrKey];
                    model.setProperty("/selected_attributes", selectedAttributes);
                    delete this._allAttributesPositions[attrName];
                }
            },
            sortByColumnIndex: function (columnIndex, sortOrder) {
                var attrKey = this._columnIndexToAttrKey[columnIndex];
                if (attrKey) {
                    var model = this.getView().getModel();
                    var sortingDirections = model.getProperty("/sorting_directions");
                    var sortedAttributes = model.getProperty("/sorted_attributes");
                    if (sortedAttributes.indexOf(attrKey) !== -1) {
                        sortingDirections.splice(sortedAttributes.indexOf(attrKey), 1);
                        sortedAttributes.splice(sortedAttributes.indexOf(attrKey), 1);
                    }
                    sortingDirections = [sortOrder === sap.ui.table.SortOrder.Descending ? "D" : "A"].concat(sortingDirections);
                    sortedAttributes = [attrKey].concat(sortedAttributes);

                    model.setProperty("/sorted_attributes", sortedAttributes);
                    model.setProperty("/sorting_directions", sortingDirections);
                    this.reloadChart();
                }
            },
            buildMenu: function () {
                var that = this;

                var patientListConfig = MriFrontendConfig.getFrontendConfig().getPatientListConfig();

                var basicDataCols = patientListConfig.getBasicDataCols();
                var allOtherColumns = patientListConfig.getAllNonBasicDataColumnsByInteractions();

                function addColsToMenu(interaction, submenu) {
                    var aAttributes = interaction.attributes;
                    aAttributes.forEach(function (attribute) {
                        var attributeKey = attribute.getConfigPath();
                        var interactionKey = attributeKey.substring(0, attributeKey.indexOf(".attributes."));

                        submenu.addItem(new MenuItem({
                            text: attribute.getName(),
                            enabled: {
                                path: "/selected_attributes/" + attributeKey,
                                formatter: function (b) {
                                    return typeof b === "undefined";
                                }
                            },
                            visible: attribute._oInternalConfigAttribute.aggregated ? {
                                path: "/available_interactions/" + interactionKey,
                                formatter: function (b) {
                                    return typeof b !== "undefined";
                                }
                            } : true,
                            select: function () {
                                var _allAttributesPositions = that._allAttributesPositions;
                                // did we see the attribute already? Then we use the position we used for the attribute the last time we saw it
                                // otherwise we add the attribute with a position just past the largest that we ever saw
                                if (typeof _allAttributesPositions[attributeKey] === "undefined") {
                                    var index = 1;
                                    jQuery.each(_allAttributesPositions, function (key, val) {
                                        index = index < val ? val : index;
                                    });
                                    _allAttributesPositions[attributeKey] = index + 1;
                                }
                                that.getView().getModel().setProperty("/selected_attributes/" + attributeKey, _allAttributesPositions[attributeKey] - 1);
                                that.reloadChart();
                            }
                        }));

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
                jQuery.each(allOtherColumns, function (key, obj) {
                    var submenu = new Menu();

                    addColsToMenu(obj, submenu);
                    moreSubmenu.addItem(new MenuItem({
                        text: obj.name,
                        submenu: submenu
                    }));
                });

                var menu = new Menu({
                    items: [
                        new MenuItem({
                            text: Utils.getText('MRI_PA_MENUITEM_INTERACTIONS_GENERAL'),
                            submenu: generalSubmenu
                        }),
                        new MenuItem({
                            text: Utils.getText('MRI_PA_MENUITEM_MORE'),
                            submenu: moreSubmenu,
                            startsSection: true
                        }),
                        new MenuItem({
                            text: Utils.getText('MRI_PA_PATIENT_LIST_RESTORE_DEFAULT'),
                            select: function () {
                                that.initDataModel();
                                that.reloadChart();
                            },
                            startsSection: true
                        })
                    ]
                });

                return menu;
            }
        });
        return PatientListChart;
    });