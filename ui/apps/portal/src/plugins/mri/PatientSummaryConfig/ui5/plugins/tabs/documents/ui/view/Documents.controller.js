sap.ui.define([
    "hc/hph/patient/app/ui/lib/utils/Utils",
    "hc/hph/patient/app/ui/lib/PatientData",
    "hc/hph/patient/app/ui/lib/tab/TabBaseController",
    "sap/ui/model/Filter",
    "sap/ui/model/json/JSONModel"
], function (Utils, PatientData, TabBaseController, Filter, JSONModel) {
    "use strict";

    /**
     * Constructor for the Patient Summary Documents Controller.
     * @constructor
     *
     * @classdesc
     * This Controller is responsible for loading the patient data and handling all actions on the tabs of the Patient Summary.
     * @extends sap.ui.core.mvc.Controller
     * @alias hc.hph.patient.app.ui.content.view.Content
     */
    var DocumentsController = TabBaseController.extend("hc.hph.patient.plugins.tabs.documents.ui.view.Documents");

    /** @constant {string} Key for "other departments" dropdown item. */
    var OTHER_DEPARTMENTS_KEY = "@otherDepartments@";

    /** @constant {string} Key for "no departments" dropdown item. */
    var NO_DEPARTMENTS_KEY = "@noDepartments@";

    /** @constant {string} Key for "all departments" dropdown item. */
    var ALL_DEPARTMENTS_KEY = "@allDepartments@";

    /** @constant {string} Key for "all departments" dropdown item. */
    var RIGHT_SIDE_DEFAULT_DEPARTMENT = OTHER_DEPARTMENTS_KEY;

    DocumentsController.prototype.processPatientData = function (mPatientData, mConfig, mUserState, mExtensionConfig) {
        // initialize temporary storage for documents, used during data processing
        this._aDepartmentsMetadata = {};
        this._mGroupedDocuments = {};
        this._mChronologicalDocuments = {
            dated: [],
            undated: [],
            totalUndated: 0
        };

        // Take predefined list of document types from the plugin settings
        if (mConfig && mExtensionConfig && mExtensionConfig.settings && Array.isArray(mExtensionConfig.settings.documentGroups)) {
            mExtensionConfig.settings.documentGroups.filter(function (mDocGroup) {
                return mDocGroup.DESCRIPTION && mDocGroup.SORT && mDocGroup.DOCUMENT_GROUP;
            }).forEach(function (mDocGroup) {
                this._mGroupedDocuments[mDocGroup.DESCRIPTION] = {
                    docGroup: mDocGroup.DOCUMENT_GROUP,
                    groupName: mDocGroup.DESCRIPTION,
                    rank: mDocGroup.SORT,
                    entries: [],
                    date: null
                };
            }, this);
        }

        // Take predefined list of departments from the plugin settings
        if (mConfig && mExtensionConfig && mExtensionConfig.settings && Array.isArray(mExtensionConfig.settings.departments)) {
            mExtensionConfig.settings.departments.filter(function (mDepartment) {
                return mDepartment.DISPLAY_NAME && mDepartment.LIST_WHEN_EMPTY;
            }).forEach(function (mDepartment, i) {
                this._aDepartmentsMetadata[mDepartment.DISPLAY_NAME] = {
                    key: mDepartment.DISPLAY_NAME,
                    description: mDepartment.DESCRIPTION,
                    rank: i,
                    count: 0,
                    entryType: "known"
                };
            }, this);
        }

        TabBaseController.prototype.processPatientData.apply(this, arguments);
    };

    /**
     * This function is called before the whole processing starts.
     * @param {any} mConfig Patient Summary configuration
     * @override
     */
    DocumentsController.prototype.startDataProcessing = function (/* mConfig */) {
        //
        // TARGET MODEL STRUCTURE
        // {
        //    chrono: {
        //        dated: [] <- Single Documents,
        //        undated: [] <- Single Documents,
        //        totalUndated: 3
        //    },
        //    grouped: [] <- Doc Type Groups
        // }

        // Doc Type Groups
        // {
        //     groupName: "Arztbrief",
        //     entries: [] <- Single Documents
        // }

        // SINGLE DOCUMENT
        // {
        //     title: "AK Pflegerischer Dekurs Aufwachraum",
        //     docTypeShort: "AKD",
        //     docGroup: "OP/PU/WAR",
        //     docTypeId: "AKAWDEK",
        //     oe: "AKAWOPB",
        //     oeDesc: "AK AWR OP B",
        //     date: new Date("2010-01-21")
        // }
    };

    DocumentsController.prototype.startInteractionType = function (mInteractionType /* , mLane */) {
        // Ignore interactions that have not all mandatory annotations
        // - Titel  (ps_doc_title)
        // - Typ  (ps_doc_type)
        // - OE  (ps_doc_oe)
        // - Fachbereich_OE  (ps_doc_fb_oe)
        // - Datum  (interaction_start )
        var aAnnotations = ["ps_doc_title", "ps_doc_type", "ps_doc_oe", "ps_doc_fb_oe", "ps_doc_institution", "ps_doc_institution_short", "interaction_start"];
        return aAnnotations.every(function (sAnnotation) {
            return PatientData.getAttributeNameForAnnotation(mInteractionType, sAnnotation);
        });
    };

    DocumentsController.prototype._parseRawDocument = function (mEntry, mInteractionType) {
        var mParsedDocument = {
            title: PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "ps_doc_title"),
            docTypeId: PatientData.getAttributeForAnnotation(mEntry, mInteractionType, "ps_doc_type"),
            url: PatientData.getAttributeForAnnotation(mEntry, mInteractionType, "ps_doc_url"),
            oe: PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "ps_doc_oe"),
            department_OU: PatientData.getAttributeForAnnotation(mEntry, mInteractionType, "ps_doc_fb_oe"),
            institution: PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "ps_doc_institution"),
            institution_short: PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "ps_doc_institution_short"),
            date: mEntry.start
        };
        if (!this._mGroupedDocuments.hasOwnProperty(mParsedDocument.docTypeId)) {
            mParsedDocument.docTypeId += "*";
        }
        if (!this._aDepartmentsMetadata.hasOwnProperty(mParsedDocument.department_OU)) {
            mParsedDocument.department_OU += "*";
        }
        mParsedDocument.departments = [mParsedDocument.department_OU];
        return mParsedDocument;
    };

    DocumentsController.prototype._isDated = function (mEntry) {
        return PatientData._hasFullDateInfo(mEntry);
    };

    DocumentsController.prototype._getOwnDepartment = function () {
        return this._defaultDepartment || "Innere Medizin";
    };

    DocumentsController.prototype._isOwnDepartmentDocument = function (mParsedDocument) {
        return mParsedDocument.departments.indexOf(this._getOwnDepartment()) > -1;
    };

    DocumentsController.prototype._isOtherDepartmentDocument = function (mParsedDocument) {
        return mParsedDocument.departments.some(function (sDepartment) {
            return sDepartment !== this._getOwnDepartment();
        }, this);
    };

    DocumentsController.prototype.showDocument = function (oEvent, sModel) {
        var sUrl = oEvent.getSource().getBindingContext(sModel).getProperty("url");
        if (sUrl && sUrl !== PatientData.NO_VALUE) {
            // Open document URL
            window.open(sUrl, "_self");
        }
    };

    DocumentsController.prototype.showLeftDocument = function (oEvent) {
        return this.showDocument(oEvent, "leftGroupModel");
    };

    DocumentsController.prototype.showRightDocument = function (oEvent) {
        return this.showDocument(oEvent, "rightGroupModel");
    };

    /**
     * This function is called for each interaction.
     * @param {any} mEntry Interaction object
     * @param {any} mInteractionType Interaction type object
     * @param {any} mLane Lane object
     * @override
     */
    DocumentsController.prototype.addEntry = function (mEntry, mInteractionType /* , mLane*/) {
        var mDoc = this._parseRawDocument(mEntry, mInteractionType);
        var sDatedProperty = this._isDated(mEntry) ? "dated" : "undated";

        // chronological data
        this._mChronologicalDocuments[sDatedProperty].push(mDoc);

        if (!this._aDepartmentsMetadata.hasOwnProperty(mDoc.department_OU)) {
            jQuery.sap.log.warning("Department " + mDoc.department_OU + " did not exist in departments metadata.");
            this._aDepartmentsMetadata[mDoc.department_OU] = {
                key: mDoc.department_OU,
                rank: Object.keys(this._aDepartmentsMetadata).length,
                count: 0,
                entryType: "unknown"
            };
        }

        // grouped data
        if (!this._mGroupedDocuments.hasOwnProperty(mDoc.docTypeId)) {
            jQuery.sap.log.warning("Document type " + mDoc.docTypeId + " did not exist in document types metadata.");
            this._mGroupedDocuments[mDoc.docTypeId] = {
                docGroup: mDoc.docTypeId,
                groupName: mDoc.docTypeId,
                entries: [],
                date: mDoc.date
            };
        }
        this._mGroupedDocuments[mDoc.docTypeId].entries.push(mDoc);
        this._aDepartmentsMetadata[mDoc.department_OU].count++;
        // update dates
        if (!this._mGroupedDocuments[mDoc.docTypeId].date || mDoc.date > this._mGroupedDocuments[mDoc.docTypeId].date) {
            this._mGroupedDocuments[mDoc.docTypeId].date = mDoc.date;
        }
    };


    // This function is called after all lanes have been processed
    DocumentsController.prototype.finishDataProcessing = function (mResult) {
        // current view
        var oSegmentedButton = this.byId("documentsViewSwitch");
        mResult.currentPage = oSegmentedButton.getSelectedKey() || "documentsChronoPage";

        // departments
        var aDepartmentsSorted = Object.keys(this._aDepartmentsMetadata)
            .map(function (sDepartment) {
                var mDepartmentGroup = this._aDepartmentsMetadata[sDepartment];
                // prepare display text
                mDepartmentGroup.text = mDepartmentGroup.key + " (" + mDepartmentGroup.count + ")";
                return mDepartmentGroup;
            }, this)
            .sort(function (a, b) {
                return a.rank - b.rank;
            });
        mResult.leftDepartments = aDepartmentsSorted;
        var mOtherDepartmentsEntry = {
            key: OTHER_DEPARTMENTS_KEY,
            text: "- Andere Fachbereiche -",
            // text: Utils.getText("PS_PLUGINS_TABS_DOC_OTHER_DEPARTMENTS"),
            rank: -1,
            count: 0,
            entryType: "meta"
        };
        var mNoDepartmentsEntry = {
            key: NO_DEPARTMENTS_KEY,
            text: "- Keine Auswahl -",
            // text: Utils.getText("PS_PLUGINS_TABS_DOC_NO_DEPARTMENTS"),
            rank: -1,
            count: 0,
            entryType: "meta"
        };
        var mAllDepartmentsEntry = {
            key: ALL_DEPARTMENTS_KEY,
            text: "- Alle Fachbereiche -",
            // text: Utils.getText("PS_PLUGINS_TABS_DOC_ALL_DEPARTMENTS"),
            rank: -3,
            count: 0,
            entryType: "meta"
        };
        mResult.rightDepartments = [mAllDepartmentsEntry, mOtherDepartmentsEntry, mNoDepartmentsEntry].concat(aDepartmentsSorted);

        // grouped documents (dictionaries -> arrays)
        var aDocumentTypesSorted = Object.keys(this._mGroupedDocuments).sort(function (a, b) {
            if (this._mGroupedDocuments[a].hasOwnProperty("rank")) {
                if (this._mGroupedDocuments[b].hasOwnProperty("rank")) {
                    return this._mGroupedDocuments[a].rank - this._mGroupedDocuments[b].rank;
                } else {
                    return -1;
                }
            }
            return this._mGroupedDocuments[b].hasOwnProperty("rank") ? 1 : 0;
        }.bind(this));
        this._mGroupedDocuments = aDocumentTypesSorted.map(function (sDocumentType) {
            return this._mGroupedDocuments[sDocumentType];
        }, this);

        // chronological documents
        mResult.chrono = this._mChronologicalDocuments;
        mResult.chrono.totalUndated = mResult.chrono.undated.length;

        // sort chronological documents, document groups and documents within those groups
        var aArraysToSort = [mResult.chrono.dated];
        this._mGroupedDocuments.forEach(function (mDocumentTypeGroup) {
            aArraysToSort.push(mDocumentTypeGroup.entries);
        }, this);
        aArraysToSort.forEach(function (aDocumentsToSort) {
            aDocumentsToSort.sort(function (a, b) {
                if (a) {
                    if (b) {
                        return b.date - a.date; // reverse chronological
                    } else {
                        return -1;
                    }
                }
                return b ? 1 : 0;
            });
        }, this);

        // initialize group view models
        function fnShallowCopyGroupedDocuments(mDocumentTypeGroup) {
            return {
                // shallow clone
                docGroup: mDocumentTypeGroup.docGroup,
                groupName: mDocumentTypeGroup.groupName,
                rank: mDocumentTypeGroup.rank,
                entries: mDocumentTypeGroup.entries,
                date: mDocumentTypeGroup.date,
                unfolded: false
            };
        }

        this._oLeftGroupModel = new JSONModel(this._mGroupedDocuments.map(fnShallowCopyGroupedDocuments));
        this._oRightGroupModel = new JSONModel(this._mGroupedDocuments.map(fnShallowCopyGroupedDocuments));
        this._oLeftGroupModel.setSizeLimit(Infinity);
        this._oRightGroupModel.setSizeLimit(Infinity);
        this.getView().setModel(this._oLeftGroupModel, "leftGroupModel");
        this.getView().setModel(this._oRightGroupModel, "rightGroupModel");

        // settings
        mResult.settings = {
            dateFormat: Utils.getUserPrefsDatePattern()
        };
    };

    DocumentsController.prototype.setPatientModel = function (mPatientData) {
        TabBaseController.prototype.setPatientModel.apply(this, arguments);

        // (re-)apply department filter if new patient data contains processed data
        if (mPatientData && mPatientData.chrono) {
            this.byId("leftDepartmentDropdown").setSelectedKey(this._getOwnDepartment());
            this.byId("rightDepartmentDropdown").setSelectedKey(RIGHT_SIDE_DEFAULT_DEPARTMENT);
            this._applyLeftDepartmentSelection(this._getOwnDepartment());
            if (RIGHT_SIDE_DEFAULT_DEPARTMENT !== OTHER_DEPARTMENTS_KEY) {
                this._applyRightDepartmentSelection(RIGHT_SIDE_DEFAULT_DEPARTMENT);
            }
        }
    };


    DocumentsController.prototype.toggleUnfoldedLeft = function (oEvent) {
        var oRow = oEvent.getSource();
        var oContext = oRow.getBindingContext("leftGroupModel");
        oContext.getModel().setProperty("unfolded", !oContext.getProperty("unfolded"), oContext);
    };

    DocumentsController.prototype.toggleUnfoldedRight = function (oEvent) {
        var oRow = oEvent.getSource();
        var oContext = oRow.getBindingContext("rightGroupModel");
        oContext.getModel().setProperty("unfolded", !oContext.getProperty("unfolded"), oContext);
    };

    DocumentsController.prototype.onSubviewSelected = function (oEvent) {
        var oSegmentedButton = oEvent.getSource();
        var oNavContainer = this.byId("documentsTabNavCont");
        var sKey = oSegmentedButton.getSelectedKey();
        var oTargetPage = this.byId(sKey);
        oNavContainer.to(oTargetPage, "show");
    };

    DocumentsController.prototype.formatDate = function (dDate) {
        if (dDate) {
            return Utils.formatDate(dDate);
        }
    };

    DocumentsController.prototype.formatDatePair = function (dStart, dEnd) {
        if (dStart && dEnd) {
            var sRange = dStart.getFullYear();
            if (dStart.getFullYear() !== dEnd.getFullYear()) {
                sRange += "-" + dEnd.getFullYear();
            }
            return sRange;
        }
    };

    DocumentsController.prototype.formatDateRange = function (aEntries) {
        if (Array.isArray(aEntries) && aEntries.length > 0) {
            var sStartDate;
            for (var i = 0; !sStartDate && i < aEntries.length; ++i) {
                sStartDate = aEntries[i].date;
            }
            return this.formatDatePair(aEntries[aEntries.length - 1].date, sStartDate);
        } else {
            return "";
        }
    };

    DocumentsController.prototype._filterChronologicalModelByDepartment = function (oModelBinding, sFilterDepartmentKey, bExclude) {
        if (oModelBinding && sFilterDepartmentKey) {
            if (!bExclude) {
                // including (only the given department)
                var oFilter = new Filter({
                    path: "departments",
                    test: function (aDepartments) { // return true means document is displayed
                        return Array.isArray(aDepartments)
                            && aDepartments.indexOf(sFilterDepartmentKey) > -1;
                    }
                });
                oModelBinding.filter(oFilter);
            } else {
                // excluding (all departments except the given one)
                var oExlusionFilter = new Filter({
                    path: "departments",
                    test: function (aDepartments) { // return true means document is displayed
                        return Array.isArray(aDepartments)
                            && (aDepartments.length === 0 // documents without departments are not excluded
                                || aDepartments.some(function (sDepartment) {
                                    return sDepartment !== sFilterDepartmentKey;
                                })
                            );
                    }
                });
                oModelBinding.filter(oExlusionFilter);
            }
        }
    };

    DocumentsController.prototype._getLeftDepartmentSelection = function () {
        return this.byId("leftDepartmentDropdown").getSelectedKey();
    };

    DocumentsController.prototype._getRightDepartmentSelection = function () {
        return this.byId("rightDepartmentDropdown").getSelectedKey();
    };

    DocumentsController.prototype._applyLeftDepartmentSelection = function (sDepartmentKey) {
        // filtering for
        // chronological view
        var oChronoTableDated = this.byId("documentsChronoTable");
        var oLeftBindingDated = oChronoTableDated.getBinding("leftRows");

        this._filterChronologicalModelByDepartment(oLeftBindingDated, sDepartmentKey);

        // right side also needs re-filtering if "other departments" is selected
        if (this._getRightDepartmentSelection() === OTHER_DEPARTMENTS_KEY) {
            this._applyRightDepartmentSelection(OTHER_DEPARTMENTS_KEY);
        }

        // filtering for
        // grouped view
        if (this._oLeftGroupModel) {
            this._oLeftGroupModel.getData().forEach(function (mDocumentTypeGroup, i) {
                mDocumentTypeGroup.entries = this._mGroupedDocuments[i].entries.filter(function (mDocument) {
                    return mDocument.departments.indexOf(sDepartmentKey) > -1;
                }, this);
            }, this);
            this._oLeftGroupModel.updateBindings();
        }

        // for grouped view, right side is always filtered based on left side
        if (this._oLeftGroupModel) {
            this._oRightGroupModel.getData().forEach(function (mDocumentTypeGroup, i) {
                mDocumentTypeGroup.entries = this._mGroupedDocuments[i].entries.filter(function (mDocument) {
                    return mDocument.departments.length === 0 // documents without departments are not excluded
                        || mDocument.departments.some(function (sDepartment) {
                            return sDepartment !== sDepartmentKey;
                        });
                }, this);
            }, this);
            this._oRightGroupModel.updateBindings();
        }
    };

    DocumentsController.prototype._applyRightDepartmentSelection = function (sDepartmentKey) {
        // if (this.getPatientModel().getProperty("/currentPage") === "documentsChronoPage") {
        // chronological view
        var oChronoTableDated = this.byId("documentsChronoTable");
        var oRightBindingDated = oChronoTableDated.getBinding("rightRows");

        if (sDepartmentKey === OTHER_DEPARTMENTS_KEY) {
            var sLeftSideDepartmentKey = this._getLeftDepartmentSelection();
            this._filterChronologicalModelByDepartment(oRightBindingDated, sLeftSideDepartmentKey, true);
        } else if (sDepartmentKey === ALL_DEPARTMENTS_KEY) {
            oRightBindingDated.filter([]);
        } else {
            this._filterChronologicalModelByDepartment(oRightBindingDated, sDepartmentKey);
        }
        // }
    };

    DocumentsController.prototype.onLeftDepartmentSelectionChanged = function (oControlEvent) {
        var sDepartmentKey = oControlEvent.mParameters.selectedItem.mProperties.key;
        this._applyLeftDepartmentSelection(sDepartmentKey);
    };

    DocumentsController.prototype.onRightDepartmentSelectionChanged = function (oControlEvent) {
        var sDepartmentKey = oControlEvent.mParameters.selectedItem.mProperties.key;
        this._applyRightDepartmentSelection(sDepartmentKey);
    };

    /**
     * This function is called in processPatientData() to modify the original PS config object according to custom settings given in user state object
     * @param {any} mUserState User state to apply
     * @override
     */
    DocumentsController.prototype.applyUserState = function (mUserState) {
        if (mUserState.defaultDepartment) {
            this._defaultDepartment = mUserState.defaultDepartment;
        }
    };

    /**
     * This function is called to retrieve the user state.
     * @returns {object} An object that represents the user state. This object will be passed as mUserState to processPatientData()
     * @override
     */
    DocumentsController.prototype.getUserState = function () {
        /* empty base class implementation */
        return {
            defaultDepartment: this._defaultDepartment
        };
    };

    return DocumentsController;
});

