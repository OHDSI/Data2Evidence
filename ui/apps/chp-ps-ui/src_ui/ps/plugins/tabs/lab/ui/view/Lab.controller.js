sap.ui.define([
    "sap/hc/hph/patient/app/ui/lib/utils/Utils",
    "sap/hc/hph/patient/app/ui/lib/PatientData",
    "sap/hc/hph/patient/app/ui/lib/tab/TabBaseController",
    "sap/ui/model/Filter"
], function (Utils, PatientData, TabBaseController, Filter) {
    "use strict";

    /**
     * Constructor for the Patient Summary Lab Documents Controller.
     * @constructor
     *
     * @classdesc
     * This Controller is responsible for loading the patient data and handling all actions on the tabs of the Patient Summary.
     * @extends sap.ui.core.mvc.Controller
     * @alias sap.hc.hph.patient.app.ui.content.view.Content
     */
    var LabController = TabBaseController.extend("sap.hc.hph.patient.plugins.tabs.lab.ui.view.Lab");

    /** @constant {string} Key for "other departments" dropdown item. */
    var OTHER_DEPARTMENTS_KEY = "@otherDepartments@";

    /** @constant {string} Key for "no departments" dropdown item. */
    var NO_DEPARTMENTS_KEY = "@noDepartments@";

    /** @constant {string} Key for "all departments" dropdown item. */
    var ALL_DEPARTMENTS_KEY = "@allDepartments@";

    /** @constant {string} Key for "all departments" dropdown item. */
    var RIGHT_SIDE_DEFAULT_DEPARTMENT = OTHER_DEPARTMENTS_KEY;


    LabController.prototype.processPatientData = function (mPatientData, mConfig, mUserState, mExtensionConfig) {
        // initialize temporary storage for lab documents, used during data processing
        this._aDepartmentsMetadata = {};
        this._mChronologicalLabDocuments = {
            dated: [],
            undated: [],
            totalUndated: 0
        };

        // Take predefined list of departments from the plugin settings
        if (mConfig && mExtensionConfig && mExtensionConfig.settings && Array.isArray(mExtensionConfig.settings.departments)) {
            mExtensionConfig.settings.departments.filter(function (mDepartment) {
                return mDepartment.DISPLAY_NAME && mDepartment.LIST_WHEN_EMPTY;
            }).forEach(function (mDepartment, i) {
                this._aDepartmentsMetadata[mDepartment.DISPLAY_NAME] = {
                    key: mDepartment.DISPLAY_NAME,
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
    LabController.prototype.startDataProcessing = function (/* mConfig */) {
        // SINGLE DOCUMENT
        // {
        //     title: "AK Pflegerischer Dekurs Aufwachraum",
        //     type: "AKAWDEK",
        //     oe: "AKAWOPB",
        //     department_OU: "Onkologie",
        //     date: new Date("2010-01-21")
        // }

    };

    LabController.prototype.startInteractionType = function (mInteractionType /* , mLane */) {
        // Ignore interactions that have not all mandatory annotations
        // - Titel  (ps_lab_title)
        // - Typ  (ps_lab_type)
        // - OE  (ps_lab_oe)
        // - Fachbereich_OE  (ps_lab_fb_oe)
        // - Datum  (interaction_start )
        var aAnnotations = ["ps_lab_title", "ps_lab_type", "ps_lab_oe", "ps_lab_fb_oe", "ps_lab_institution", "ps_lab_institution_short", "interaction_start"];
        return aAnnotations.every(function (sAnnotation) {
            return PatientData.getAttributeNameForAnnotation(mInteractionType, sAnnotation);
        });
    };

    LabController.prototype._parseRawLabDocument = function (mEntry, mInteractionType) {
        var mParsedLabDocument = {
            title: PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "ps_lab_title"),
            type: PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "ps_lab_type"),
            url: PatientData.getAttributeForAnnotation(mEntry, mInteractionType, "ps_lab_url"),
            oe: PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "ps_lab_oe"),
            department_OU: PatientData.getAttributeForAnnotation(mEntry, mInteractionType, "ps_lab_fb_oe"),
            institution: PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "ps_lab_institution"),
            institution_short: PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "ps_lab_institution_short"),
            date: mEntry.start
        };
        if (!this._aDepartmentsMetadata.hasOwnProperty(mParsedLabDocument.department_OU)) {
            mParsedLabDocument.department_OU += "*";
        }
        mParsedLabDocument.departments = [mParsedLabDocument.department_OU];
        return mParsedLabDocument;
    };

    LabController.prototype._isDated = function (mEntry) {
        return PatientData._hasFullDateInfo(mEntry);
    };

    LabController.prototype._getOwnDepartment = function () {
        return this._defaultDepartment || "Innere Medizin";
    };

    LabController.prototype._isOwnDepartmentLabDocument = function (mParsedLabDocument) {
        return mParsedLabDocument.departments.indexOf(this._getOwnDepartment()) > -1;
    };

    LabController.prototype._isOtherDepartmentLabDocument = function (mParsedLabDocument) {
        return mParsedLabDocument.departments.some(function (sDepartment) {
            return sDepartment !== this._getOwnDepartment();
        }, this);
    };

    /**
     * This function is called for each interaction.
     * @param {any} mEntry Interaction object
     * @param {any} mInteractionType Interaction type object
     * @param {any} mLane Lane object
     * @override
     */
    LabController.prototype.addEntry = function (mEntry, mInteractionType /* , mLane*/) {
        var mLabDoc = this._parseRawLabDocument(mEntry, mInteractionType);
        var sDatedProperty = this._isDated(mEntry) ? "dated" : "undated";

        if (!this._aDepartmentsMetadata.hasOwnProperty(mLabDoc.department_OU)) {
            jQuery.sap.log.warning("Department " + mLabDoc.department_OU + " did not exist in departments metadata.");
            this._aDepartmentsMetadata[mLabDoc.department_OU] = {
                key: mLabDoc.department_OU,
                rank: Object.keys(this._aDepartmentsMetadata).length,
                count: 0,
                entryType: "unknown"
            };
        }

        // chronological data
        this._mChronologicalLabDocuments[sDatedProperty].push(mLabDoc);
        this._aDepartmentsMetadata[mLabDoc.department_OU].count++;
    };


    // This function is called after all lanes have been processed
    LabController.prototype.finishDataProcessing = function (mResult) {
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
            // text: Utils.getText("PS_PLUGINS_TABS_LAB_OTHER_DEPARTMENTS"),
            rank: -2,
            count: 0,
            entryType: "meta"
        };
        var mNoDepartmentsEntry = {
            key: NO_DEPARTMENTS_KEY,
            text: "- Keine Auswahl -",
            // text: Utils.getText("PS_PLUGINS_TABS_LAB_NO_DEPARTMENTS"),
            rank: -1,
            count: 0,
            entryType: "meta"
        };
        var mAllDepartmentsEntry = {
            key: ALL_DEPARTMENTS_KEY,
            text: "- Alle Fachbereiche -",
            // text: Utils.getText("PS_PLUGINS_TABS_LAB_ALL_DEPARTMENTS"),
            rank: -3,
            count: 0,
            entryType: "meta"
        };
        mResult.rightDepartments = [mAllDepartmentsEntry, mOtherDepartmentsEntry, mNoDepartmentsEntry].concat(aDepartmentsSorted);

        // chronological
        mResult.chrono = this._mChronologicalLabDocuments;
        mResult.chrono.totalUndated = mResult.chrono.undated.length;

        // sort chronological lab documents
        var aArraysToSort = [mResult.chrono.dated];
        aArraysToSort.forEach(function (aLabDocsToSort) {
            aLabDocsToSort.sort(function (a, b) {
                if (a) {
                    if (b) {
                        return b.date - a.date;
                    } else {
                        return -1;
                    }
                }
                return b ? 1 : 0;
            });
        }, this);

        // settings
        mResult.settings = {
            dateFormat: Utils.getUserPrefsDatePattern()
        };
    };

    LabController.prototype.setPatientModel = function (mPatientData) {
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

    LabController.prototype._filterChronologicalModelByDepartment = function (oModelBinding, sFilterDepartmentKey, bExclude) {
        if (oModelBinding && sFilterDepartmentKey) {
            if (!bExclude) {
                // including (only the given department)
                var oFilter = new Filter({
                    path: "departments",
                    test: function (aDepartments) { // return true means lab doc is displayed
                        return Array.isArray(aDepartments)
                            && aDepartments.indexOf(sFilterDepartmentKey) > -1;
                    }
                });
                oModelBinding.filter(oFilter);
            } else {
                // excluding (all departments except the given one)
                var oExlusionFilter = new Filter({
                    path: "departments",
                    test: function (aDepartments) { // return true means lab doc is displayed
                        return Array.isArray(aDepartments)
                            && (aDepartments.length === 0 // lab docs without departments are not excluded
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

    LabController.prototype._getLeftDepartmentSelection = function () {
        return this.byId("leftDepartmentDropdown").getSelectedKey();
    };

    LabController.prototype._getRightDepartmentSelection = function () {
        return this.byId("rightDepartmentDropdown").getSelectedKey();
    };

    LabController.prototype._applyLeftDepartmentSelection = function (sDepartmentKey) {
        // filtering for
        // chronological view
        var oChronoTableDated = this.byId("labChronoTable");
        // var oChronoTableUndated = this.byId("labChronoTableUndated");
        var oLeftBindingDated = oChronoTableDated.getBinding("leftRows");
        // var oLeftBindingUndated = oChronoTableUndated.getBinding("leftRows");

        this._filterChronologicalModelByDepartment(oLeftBindingDated, sDepartmentKey);
        // this._filterChronologicalModelByDepartment(oLeftBindingUndated, sDepartmentKey);

        // right side also needs re-filtering if "other departments" is selected
        if (this._getRightDepartmentSelection() === OTHER_DEPARTMENTS_KEY) {
            this._applyRightDepartmentSelection(OTHER_DEPARTMENTS_KEY);
        }
    };

    LabController.prototype._applyRightDepartmentSelection = function (sDepartmentKey) {
        // chronological view
        var oChronoTableDated = this.byId("labChronoTable");
        // var oChronoTableUndated = this.byId("labChronoTableUndated");
        var oRightBindingDated = oChronoTableDated.getBinding("rightRows");
        // var oRightBindingUndated = oChronoTableUndated.getBinding("rightRows");

        if (sDepartmentKey === OTHER_DEPARTMENTS_KEY) {
            var sLeftSideDepartmentKey = this._getLeftDepartmentSelection();
            this._filterChronologicalModelByDepartment(oRightBindingDated, sLeftSideDepartmentKey, true);
            // this._filterChronologicalModelByDepartment(oRightBindingUndated, sLeftSideDepartmentKey, true);
        } else if (sDepartmentKey === ALL_DEPARTMENTS_KEY) {
            oRightBindingDated.filter([]);
        } else {
            this._filterChronologicalModelByDepartment(oRightBindingDated, sDepartmentKey);
            // this._filterChronologicalModelByDepartment(oRightBindingUndated, sDepartmentKey);
        }
    };

    LabController.prototype.onLeftDepartmentSelectionChanged = function (oControlEvent) {
        var sDepartmentKey = oControlEvent.mParameters.selectedItem.mProperties.key;
        this._applyLeftDepartmentSelection(sDepartmentKey);
    };

    LabController.prototype.onRightDepartmentSelectionChanged = function (oControlEvent) {
        var sDepartmentKey = oControlEvent.mParameters.selectedItem.mProperties.key;
        this._applyRightDepartmentSelection(sDepartmentKey);
    };

    LabController.prototype.showDocument = function (oEvent) {
        var sUrl = oEvent.getSource().getBindingContext().getProperty("url");
        if (sUrl && sUrl !== PatientData.NO_VALUE) {
            // Open document URL
            window.open(sUrl, "_self");
        }
    };

    /**
     * This function is called in processPatientData() to modify the original PS config object according to custom settings given in user state object
     * @param {any} mUserState User state to apply
     * @override
     */
    LabController.prototype.applyUserState = function (mUserState) {
        if (mUserState.defaultDepartment) {
            this._defaultDepartment = mUserState.defaultDepartment;
        }
    };

    /**
     * This function is called to retrieve the user state.
     * @returns {object} An object that represents the user state. This object will be passed as mUserState to processPatientData()
     * @override
     */
    LabController.prototype.getUserState = function () {
        /* empty base class implementation */
        return {
            defaultDepartment: this._defaultDepartment
        };
    };

    return LabController;
});

