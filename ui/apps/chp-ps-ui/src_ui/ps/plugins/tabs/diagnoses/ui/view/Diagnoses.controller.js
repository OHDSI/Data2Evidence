sap.ui.define([
    "jquery.sap.global",
    "sap/hc/hph/patient/plugins/tabs/diagnoses/ui/lib/Utils",
    "sap/hc/hph/patient/app/ui/lib/PatientData",
    "sap/hc/hph/patient/app/ui/lib/tab/TabBaseController",
    "sap/ui/model/Filter"
], function (jQuery, Utils, PatientData, TabBaseController, Filter) {
    "use strict";

    /**
     * Constructor for the Patient Summary Diagnoses Controller.
     * @constructor
     *
     * @classdesc
     * This Controller is responsible for loading the patient data and handling all actions on the tabs of the Patient Summary.
     * @extends sap.ui.core.mvc.Controller
     * @alias sap.hc.hph.patient.app.ui.content.view.Content
     */
    var DiagnosesController = TabBaseController.extend("sap.hc.hph.patient.plugins.tabs.diagnoses.ui.view.Diagnoses");

    /** @constant {string} Key for "other departments" dropdown item. */
    var OTHER_DEPARTMENTS_KEY = "@otherDepartments@";

    /** @constant {string} Key for "no departments" dropdown item. */
    var NO_DEPARTMENTS_KEY = "@noDepartments@";

    /** @constant {string} Key for "all departments" dropdown item. */
    var ALL_DEPARTMENTS_KEY = "@allDepartments@";

    /** @constant {string} Key for "all departments" dropdown item. */
    var RIGHT_SIDE_DEFAULT_DEPARTMENT = OTHER_DEPARTMENTS_KEY;

    DiagnosesController.prototype.processPatientData = function (mPatientData, mConfig, mUserState, mExtensionConfig) {
        // initialize temporary storage for diagnoses, used during data processing
        this._mGroupedDiagnoses = {};
        this._mChronologicalDiagnoses = {
            dated: [],
            undated: [],
            totalUndated: 0
        };

        // Take predefined list of departments from the plugin settings
        if (mConfig && mExtensionConfig && mExtensionConfig.settings && Array.isArray(mExtensionConfig.settings.departments)) {
            mExtensionConfig.settings.departments.filter(function (mDepartment) {
                return mDepartment.DISPLAY_NAME && mDepartment.LIST_WHEN_EMPTY;
            }).forEach(function (mDepartment, i) {
                this._mGroupedDiagnoses[mDepartment.DISPLAY_NAME] = {
                    key: mDepartment.DISPLAY_NAME,
                    description: mDepartment.DESCRIPTION,
                    rank: i,
                    entries: {},
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
    DiagnosesController.prototype.startDataProcessing = function (/* mConfig */) {
        //
        // TARGET MODEL STRUCTURE
        // {
        //    chrono: {
        //        dated: [] <- ICD SINGLE DIAGNOSIS,
        //        undated: [] <- ICD SINGLE DIAGNOSIS
        //        totalUndated: 3
        //    },
        //    grouped: [] <- DEPARTMENT GROUPS
        // }

        // DEPARTMENT GROUP
        // {
        //     groupName: "HNO",
        //     entries: [] <- ICD Diagnoses Groups
        // }

        // ICD DIAGNOSES GROUP
        // {
        //     groupName: "Neubildung unsicheren oder unbekannten Verhaltens an sonstigen und nicht näher bezeichneten Lokalisationen",
        //     icdGroup: "D48",
        //     entries: [] <- ICD Single Diagnoses
        // }

        // ICD SINGLE DIAGNOSIS
        // {
        //     entryName: "Absiedlung BWK",
        //     icd: "D48.4"
        // }

        // // Add diagnoses specific properties to result data set
        // jQuery.extend(true, mConfig, {
        //     departments: [],
        //     grouped: [],
        //     chrono: []
        // });
    };

    DiagnosesController.prototype.startInteractionType = function (mInteractionType /* , mLane */) {
        // Ignore interactions that have not all mandatory annotations
        // - Diagnose Freitext (ps_diag_freetext)
        // - ICD Standardtext (ps_diag_icd_text)
        // - OE (ps_diag_oe)
        // - ICD Code (ps_diag_icd_code)
        // - ICD Group (ps_diag_icd_text).substring(0,3)
        // - ICD Group Text (ps_diag_icd_group_text)
        // - Fachbereich_ICD (ps_diag_fb_icd)
        // - Fachbereich_OE (ps_diag_fb_oe)
        // - Datum (interaction_start )
        var aAnnotations = ["ps_diag_freetext", "ps_diag_icd_text", "ps_diag_oe", "ps_diag_icd_code", "ps_diag_fb_icd", "ps_diag_fb_oe", "ps_diag_icd_group_text", "ps_diag_institution", "ps_diag_institution_short", "interaction_start"];
        return aAnnotations.every(function (sAnnotation) {
            return PatientData.getAttributeNameForAnnotation(mInteractionType, sAnnotation);
        });
    };

    DiagnosesController.prototype._parseRawDiagnosis = function (mEntry, mInteractionType) {
        var mParsedDiagnosis = {
            entryName: PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "ps_diag_freetext"),
            entryNameRaw: PatientData.getAttributeForAnnotation(mEntry, mInteractionType, "ps_diag_freetext"),
            icd_text: PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "ps_diag_icd_text"),
            ou: PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "ps_diag_oe"),
            icd: PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "ps_diag_icd_code"),
            icdRaw: PatientData.getAttributeForAnnotation(mEntry, mInteractionType, "ps_diag_icd_code"),
            icd_group: PatientData.getAttributeForAnnotation(mEntry, mInteractionType, "ps_diag_icd_code").substring(0, 3),
            icd_group_text: PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "ps_diag_icd_group_text"),
            department_ICD: PatientData.getAttributeForAnnotation(mEntry, mInteractionType, "ps_diag_fb_icd"),
            department_OU: PatientData.getAttributeForAnnotation(mEntry, mInteractionType, "ps_diag_fb_oe"),
            institution: PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "ps_diag_institution"),
            institution_short: PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "ps_diag_institution_short"),
            date: mEntry.start
        };
        if ((!mParsedDiagnosis.entryNameRaw || mParsedDiagnosis.entryNameRaw === PatientData.NO_VALUE) && mParsedDiagnosis.icdRaw && mParsedDiagnosis.icdRaw !== PatientData.NO_VALUE) {
            mParsedDiagnosis.entryName = mParsedDiagnosis.icd_text;
        }
        if (!this._mGroupedDiagnoses.hasOwnProperty(mParsedDiagnosis.department_ICD)) {
            mParsedDiagnosis.department_ICD += "*";
        }
        if (!this._mGroupedDiagnoses.hasOwnProperty(mParsedDiagnosis.department_OU)) {
            mParsedDiagnosis.department_OU += "*";
        }
        mParsedDiagnosis.departments = [mParsedDiagnosis.department_ICD];
        if (mParsedDiagnosis.department_ICD !== mParsedDiagnosis.department_OU) {
            mParsedDiagnosis.departments.push(mParsedDiagnosis.department_OU);
        }
        return mParsedDiagnosis;
    };

    DiagnosesController.prototype._isDated = function (mEntry) {
        return PatientData._hasFullDateInfo(mEntry);
    };

    DiagnosesController.prototype._getOwnDepartment = function () {
        return this._defaultDepartment || "Innere Medizin";
    };

    DiagnosesController.prototype._isOwnDepartmentDiagnosis = function (mParsedDiagnosis) {
        return mParsedDiagnosis.departments.indexOf(this._getOwnDepartment()) > -1;
    };

    DiagnosesController.prototype._isOtherDepartmentDiagnosis = function (mParsedDiagnosis) {
        return mParsedDiagnosis.departments.some(function (sDepartment) {
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
    DiagnosesController.prototype.addEntry = function (mEntry, mInteractionType /* , mLane*/) {
        var mDiag = this._parseRawDiagnosis(mEntry, mInteractionType);
        var sDatedProperty = this._isDated(mEntry) ? "dated" : "undated";

        // chronological data
        this._mChronologicalDiagnoses[sDatedProperty].push(mDiag);

        // grouped data
        mDiag.departments.forEach(function (sDepartment) {
            // Department Groups
            if (!this._mGroupedDiagnoses.hasOwnProperty(sDepartment)) {
                jQuery.sap.log.warning("Department " + sDepartment + " did not exist in departments metadata.");
                this._mGroupedDiagnoses[sDepartment] = {
                    key: sDepartment,
                    rank: Object.keys(this._mGroupedDiagnoses).length,
                    count: 0,
                    entries: {},
                    entryType: "unknown"
                };
            }
            // ICD Groups
            if (!this._mGroupedDiagnoses[sDepartment].entries.hasOwnProperty(mDiag.icd_group)) {
                this._mGroupedDiagnoses[sDepartment].entries[mDiag.icd_group] = {
                    groupName: mDiag.icd_group_text || (mDiag.icd_group ? "Diagnosen mit Code " + mDiag.icd_group : "Diagnosen ohne Code"),
                    icdGroup: mDiag.icd_group,
                    entries: [],
                    date: mDiag.date
                };
            }
            // Single Entries
            this._mGroupedDiagnoses[sDepartment].entries[mDiag.icd_group].entries.push(mDiag);
            this._mGroupedDiagnoses[sDepartment].count++;

            // update dates
            if (mDiag.date > this._mGroupedDiagnoses[sDepartment].entries[mDiag.icd_group].date) {
                this._mGroupedDiagnoses[sDepartment].entries[mDiag.icd_group].date = mDiag.date;
            }
        }, this);
    };


    // This function is called after all lanes have been processed
    DiagnosesController.prototype.finishDataProcessing = function (mResult) {
        // current view
        var oSegmentedButton = this.byId("diagnosesViewSwitch");
        mResult.currentPage = oSegmentedButton.getSelectedKey() || "diagnosesChronoPage";

        // departments
        var aDepartmentsSorted = Object.keys(this._mGroupedDiagnoses)
            .map(function (sDepartment) {
                var mDepartmentGroup = this._mGroupedDiagnoses[sDepartment];
                // prepare display text
                mDepartmentGroup.text = mDepartmentGroup.key + " (" + mDepartmentGroup.count + ")";
                // icd groups (dictionaries -> arrays)
                mDepartmentGroup.entries = Object.keys(mDepartmentGroup.entries).map(function (key) {
                    return mDepartmentGroup.entries[key];
                });
                return mDepartmentGroup;
            }, this)
            .sort(function (a, b) {
                return a.rank - b.rank;
            });

        mResult.leftDepartments = aDepartmentsSorted;
        var mOtherDepartmentsEntry = {
            key: OTHER_DEPARTMENTS_KEY,
            text: "- Andere Fachbereiche -",
            // text: Utils.getText("PS_PLUGINS_TABS_DIAG_OTHER_DEPARTMENTS"),
            rank: -1,
            count: 0,
            entries: [],
            entryType: "meta"
        };
        var mNoDepartmentsEntry = {
            key: NO_DEPARTMENTS_KEY,
            text: "- Keine Auswahl -",
            // text: Utils.getText("PS_PLUGINS_TABS_DIAG_NO_DEPARTMENTS"),
            rank: -1,
            count: 0,
            entryType: "meta"
        };
        var mAllDepartmentsEntry = {
            key: ALL_DEPARTMENTS_KEY,
            text: "- Alle Fachbereiche -",
            // text: Utils.getText("PS_PLUGINS_TABS_DIAG_ALL_DEPARTMENTS"),
            rank: -3,
            count: 0,
            entryType: "meta"
        };
        mResult.rightDepartments = [mAllDepartmentsEntry, mOtherDepartmentsEntry, mNoDepartmentsEntry].concat(aDepartmentsSorted);

        // grouped
        mResult.grouped = aDepartmentsSorted;

        // chrono
        mResult.chrono = this._mChronologicalDiagnoses;
        mResult.chrono.totalUndated = mResult.chrono.undated.length;

        // sort chronological diagnoses, diagnosis groups and diagnoses within those groups
        var aArraysToSort = [mResult.chrono.dated];
        mResult.grouped.forEach(function (mDepartmentGroup) {
            aArraysToSort.push(mDepartmentGroup.entries);
            mDepartmentGroup.entries.forEach(function (mIcdGroup) {
                aArraysToSort.push(mIcdGroup.entries);
            });
        }, this);
        aArraysToSort.forEach(function (aDiagnosesToSort) {
            aDiagnosesToSort.sort(function (a, b) {
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

    DiagnosesController.prototype.setPatientModel = function (mPatientData) {
        TabBaseController.prototype.setPatientModel.apply(this, arguments);

        // (re-)apply department filter if new patient data contains processed data
        if (mPatientData && mPatientData.chrono && mPatientData.grouped) {
            this.byId("leftDepartmentDropdown").setSelectedKey(this._getOwnDepartment());
            this.byId("rightDepartmentDropdown").setSelectedKey(RIGHT_SIDE_DEFAULT_DEPARTMENT);
            this._applyLeftDepartmentSelection(this._getOwnDepartment());
            if (RIGHT_SIDE_DEFAULT_DEPARTMENT !== OTHER_DEPARTMENTS_KEY) {
                this._applyRightDepartmentSelection(RIGHT_SIDE_DEFAULT_DEPARTMENT);
            }
        }
    };

    DiagnosesController.prototype.toggleUnfoldedLeft = function (oEvent) {
        var oRow = oEvent.getSource();
        var oContext = oRow.getBindingContext();
        oContext.getModel().setProperty("unfoldedLeft", !oContext.getProperty("unfoldedLeft"), oContext);
    };

    DiagnosesController.prototype.toggleUnfoldedRight = function (oEvent) {
        var oRow = oEvent.getSource();
        var oContext = oRow.getBindingContext();
        oContext.getModel().setProperty("unfoldedRight", !oContext.getProperty("unfoldedRight"), oContext);
    };

    DiagnosesController.prototype.onSubviewSelected = function (oEvent) {
        var oSegmentedButton = oEvent.getSource();
        var oNavContainer = this.byId("diagnosesTabNavCont");
        var sKey = oSegmentedButton.getSelectedKey();
        var oTargetPage = this.byId(sKey);
        oNavContainer.to(oTargetPage, "show");
    };

    DiagnosesController.prototype.formatDate = function (dDate) {
        if (dDate) {
            return Utils.formatDate(dDate);
        }
    };

    DiagnosesController.prototype.formatDatePair = function (dStart, dEnd) {
        if (dStart && dEnd) {
            var sRange = dStart.getFullYear();
            if (dStart.getFullYear() !== dEnd.getFullYear()) {
                sRange += "-" + dEnd.getFullYear();
            }
            return sRange;
        }
    };

    DiagnosesController.prototype.formatDateRange = function (aEntries) {
        if (Array.isArray(aEntries)) {
            var sStartDate;
            for (var i = 0; !sStartDate && i < aEntries.length; ++i) {
                sStartDate = aEntries[i].date;
            }
            return this.formatDatePair(aEntries[aEntries.length - 1].date, sStartDate);
        }
    };

    DiagnosesController.prototype.formatDepartments = function (aDepartments) {
        if (Array.isArray(aDepartments)) {
            return aDepartments.join(", ");
        }
    };

    DiagnosesController.prototype.onUndatedLinkPressed = function () {
        var domLabel = jQuery(this.getView().getDomRef()).find(".sapPSChronoBinsUndatedLabel")[0];
        if (domLabel) {
            domLabel.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    };

    DiagnosesController.prototype._filterChronologicalModelByDepartment = function (oModelBinding, sFilterDepartmentKey, bExclude) {
        if (oModelBinding && sFilterDepartmentKey) {
            if (!bExclude) {
                // including (only the given department)
                var oFilter = new Filter({
                    path: "departments",
                    test: function (aDepartments) { // return true means diagnosis is displayed
                        return Array.isArray(aDepartments)
                            && aDepartments.indexOf(sFilterDepartmentKey) > -1;
                    }
                });
                oModelBinding.filter(oFilter);
            } else {
                // excluding (all departments except the given one)
                var oExlusionFilter = new Filter({
                    path: "departments",
                    test: function (aDepartments) { // return true means diagnosis is displayed
                        return Array.isArray(aDepartments)
                            && (aDepartments.length === 0 // diagnoses without departments are not excluded
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

    DiagnosesController.prototype._filterGroupedModelByDepartment = function (oModelBinding, sFilterDepartmentKey, bExclude) {
        if (oModelBinding && sFilterDepartmentKey) {
            if (!bExclude) {
                // including (only the given department)
                var oFilter = new Filter({
                    path: "key",
                    operator: sap.ui.model.FilterOperator.EQ,
                    value1: sFilterDepartmentKey
                });
                oModelBinding.filter(oFilter);
            } else {
                // excluding (all departments except the given one)
                var oExlusionFilter = new Filter({
                    path: "key",
                    operator: sap.ui.model.FilterOperator.NE,
                    value1: sFilterDepartmentKey
                });
                oModelBinding.filter(oExlusionFilter);
            }
        }
    };

    DiagnosesController.prototype._getLeftDepartmentSelection = function () {
        return this.byId("leftDepartmentDropdown").getSelectedKey();
    };

    DiagnosesController.prototype._getRightDepartmentSelection = function () {
        return this.byId("rightDepartmentDropdown").getSelectedKey();
    };

    DiagnosesController.prototype._applyLeftDepartmentSelection = function (sDepartmentKey) {
        // filtering for
        // chronological view
        var oChronoTableDated = this.byId("diagnosesChronoTable");
        var oChronoTableUndated = this.byId("diagnosesChronoTableUndated");
        var oLeftBindingDated = oChronoTableDated.getBinding("leftRows");
        var oLeftBindingUndated = oChronoTableUndated.getBinding("leftRows");

        this._filterChronologicalModelByDepartment(oLeftBindingDated, sDepartmentKey);
        this._filterChronologicalModelByDepartment(oLeftBindingUndated, sDepartmentKey);

        // right side also needs re-filtering if "other departments" is selected
        if (this._getRightDepartmentSelection() === OTHER_DEPARTMENTS_KEY) {
            this._applyRightDepartmentSelection(OTHER_DEPARTMENTS_KEY);
        }

        // filtering for
        // grouped view
        var oGroupedTableLeft = this.byId("diagnosesGroupedTableLeft");
        var oLeftGroupedBinding = oGroupedTableLeft.getBinding("rows");
        this._filterGroupedModelByDepartment(oLeftGroupedBinding, sDepartmentKey);

        // for grouped view, right side is always filtered based on left side
        var oGroupedTableRight = this.byId("diagnosesGroupedTableRight");
        var oRightGroupedBinding = oGroupedTableRight.getBinding("rows");
        this._filterGroupedModelByDepartment(oRightGroupedBinding, sDepartmentKey, true);
    };

    DiagnosesController.prototype._applyRightDepartmentSelection = function (sDepartmentKey) {
        // if (this.getPatientModel().getProperty("/currentPage") === "diagnosesChronoPage") {
        // chronological view
        var oChronoTableDated = this.byId("diagnosesChronoTable");
        var oChronoTableUndated = this.byId("diagnosesChronoTableUndated");
        var oRightBindingDated = oChronoTableDated.getBinding("rightRows");
        var oRightBindingUndated = oChronoTableUndated.getBinding("rightRows");

        if (sDepartmentKey === OTHER_DEPARTMENTS_KEY) {
            var sLeftSideDepartmentKey = this._getLeftDepartmentSelection();
            this._filterChronologicalModelByDepartment(oRightBindingDated, sLeftSideDepartmentKey, true);
            this._filterChronologicalModelByDepartment(oRightBindingUndated, sLeftSideDepartmentKey, true);
        } else if (sDepartmentKey === ALL_DEPARTMENTS_KEY) {
            oRightBindingDated.filter([]);
            oRightBindingUndated.filter([]);
        } else {
            this._filterChronologicalModelByDepartment(oRightBindingDated, sDepartmentKey);
            this._filterChronologicalModelByDepartment(oRightBindingUndated, sDepartmentKey);
        }
        // }
    };

    DiagnosesController.prototype.onLeftDepartmentSelectionChanged = function (oControlEvent) {
        var sDepartmentKey = oControlEvent.mParameters.selectedItem.mProperties.key;
        this._applyLeftDepartmentSelection(sDepartmentKey);
    };

    DiagnosesController.prototype.onRightDepartmentSelectionChanged = function (oControlEvent) {
        var sDepartmentKey = oControlEvent.mParameters.selectedItem.mProperties.key;
        this._applyRightDepartmentSelection(sDepartmentKey);
    };

    /**
     * This function is called in processPatientData() to modify the original PS config object according to custom settings given in user state object
     * @param {any} mUserState User state to apply
     * @override
     */
    DiagnosesController.prototype.applyUserState = function (mUserState) {
        if (mUserState.defaultDepartment) {
            this._defaultDepartment = mUserState.defaultDepartment;
        }
    };

    /**
     * This function is called to retrieve the user state.
     * @returns {object} An object that represents the user state. This object will be passed as mUserState to processPatientData()
     * @override
     */
    DiagnosesController.prototype.getUserState = function () {
        /* empty base class implementation */
        return {
            defaultDepartment: this._defaultDepartment
        };
    };

    return DiagnosesController;
});

