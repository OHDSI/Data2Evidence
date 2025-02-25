sap.ui.define([
    "hc/hph/patient/app/ui/lib/utils/Utils",
    "hc/hph/patient/app/ui/lib/PatientData",
    "hc/hph/patient/app/ui/lib/tab/TabBaseController",
    "sap/ui/model/Filter"
], function (Utils, PatientData, TabBaseController, Filter) {
    "use strict";

    /**
     * Constructor for the Patient Summary Surgeries Controller.
     * @constructor
     *
     * @classdesc
     * This Controller is responsible for loading the patient data and handling all actions on the tabs of the Patient Summary.
     * @extends sap.ui.core.mvc.Controller
     * @alias hc.hph.patient.app.ui.content.view.Content
     */
    var SurgeriesController = TabBaseController.extend("hc.hph.patient.plugins.tabs.surgeries.ui.view.Surgeries");

    /** @constant {string} Key for "other departments" dropdown item. */
    var OTHER_DEPARTMENTS_KEY = "@otherDepartments@";

    /** @constant {string} Key for "no departments" dropdown item. */
    var NO_DEPARTMENTS_KEY = "@noDepartments@";

    /** @constant {string} Key for "all departments" dropdown item. */
    var ALL_DEPARTMENTS_KEY = "@allDepartments@";

    /** @constant {string} Key for "all departments" dropdown item. */
    var RIGHT_SIDE_DEFAULT_DEPARTMENT = OTHER_DEPARTMENTS_KEY;

    SurgeriesController.prototype.processPatientData = function (mPatientData, mConfig, mUserState, mExtensionConfig) {
        // initialize temporary storage for surgeries, used during data processing
        this._aDepartmentsMetadata = {};
        this._mChronologicalSurgeries = {
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

    SurgeriesController.prototype.startInteractionType = function (mInteractionType /* , mLane */) {
        // Ignore interactions that have not all mandatory annotations
        // - Freitext (ps_surg_freetext)
        // - OE (ps_surg_oe)
        // - Fachbereich_OE (ps_surg_fb_oe)
        // - Datum  (interaction_start )
        var aAnnotations = ["ps_surg_freetext", "ps_surg_oe", "ps_surg_fb_oe", "ps_surg_institution", "ps_surg_institution_short", "interaction_start"];
        return aAnnotations.every(function (sAnnotation) {
            return PatientData.getAttributeNameForAnnotation(mInteractionType, sAnnotation);
        });
    };

    SurgeriesController.prototype._parseRawSurgery = function (mEntry, mInteractionType) {
        var mParsedSurgery = {
            freetext: PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "ps_surg_freetext"),
            oe: PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "ps_surg_oe"),
            department_OU: PatientData.getAttributeForAnnotation(mEntry, mInteractionType, "ps_surg_fb_oe"),
            institution: PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "ps_surg_institution"),
            institution_short: PatientData.getFormattedAttributeForAnnotation(mEntry, mInteractionType, "ps_surg_institution_short"),
            date: Utils.parseISODate(PatientData.getAttributeForAnnotation(mEntry, mInteractionType, "interaction_start"))
        };
        if (!this._aDepartmentsMetadata.hasOwnProperty(mParsedSurgery.department_OU)) {
            mParsedSurgery.department_OU += "*";
        }
        mParsedSurgery.departments = [mParsedSurgery.department_OU];
        return mParsedSurgery;
    };

    SurgeriesController.prototype._isDated = function (mEntry) {
        return PatientData._hasFullDateInfo(mEntry);
    };

    SurgeriesController.prototype._getOwnDepartment = function () {
        return this._defaultDepartment || "Innere Medizin";
    };

    SurgeriesController.prototype._isOwnDepartmentSurgery = function (mParsedSurgery) {
        return mParsedSurgery.departments.indexOf(this._getOwnDepartment()) > -1;
    };

    SurgeriesController.prototype._isOtherDepartmentSurgery = function (mParsedSurgery) {
        return mParsedSurgery.departments.some(function (sDepartment) {
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
    SurgeriesController.prototype.addEntry = function (mEntry, mInteractionType /* , mLane*/) {
        var mSurg = this._parseRawSurgery(mEntry, mInteractionType);
        var sDatedProperty = this._isDated(mEntry) ? "dated" : "undated";

        if (!this._aDepartmentsMetadata.hasOwnProperty(mSurg.department_OU)) {
            jQuery.sap.log.warning("Department " + mSurg.department_OU + " did not exist in departments metadata.");
            this._aDepartmentsMetadata[mSurg.department_OU] = {
                key: mSurg.department_OU,
                rank: Object.keys(this._aDepartmentsMetadata).length,
                count: 0,
                entryType: "unknown"
            };
        }

        // chronological data
        this._mChronologicalSurgeries[sDatedProperty].push(mSurg);
        this._aDepartmentsMetadata[mSurg.department_OU].count++;
    };


    // This function is called after all lanes have been processed
    SurgeriesController.prototype.finishDataProcessing = function (mResult) {
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
            // text: Utils.getText("PS_PLUGINS_TABS_SURG_OTHER_DEPARTMENTS"),
            rank: -1,
            count: 0,
            entryType: "meta"
        };
        var mNoDepartmentsEntry = {
            key: NO_DEPARTMENTS_KEY,
            text: "- Keine Auswahl -",
            // text: Utils.getText("PS_PLUGINS_TABS_SURG_NO_DEPARTMENTS"),
            rank: -1,
            count: 0,
            entryType: "meta"
        };
        var mAllDepartmentsEntry = {
            key: ALL_DEPARTMENTS_KEY,
            text: "- Alle Fachbereiche -",
            // text: Utils.getText("PS_PLUGINS_TABS_SURG_ALL_DEPARTMENTS"),
            rank: -3,
            count: 0,
            entryType: "meta"
        };
        mResult.rightDepartments = [mAllDepartmentsEntry, mOtherDepartmentsEntry, mNoDepartmentsEntry].concat(aDepartmentsSorted);

        // chronological
        mResult.chrono = this._mChronologicalSurgeries;
        mResult.chrono.totalUndated = mResult.chrono.undated.length;

        // sort chronological surgeries
        var aArraysToSort = [mResult.chrono.dated];
        aArraysToSort.forEach(function (aSurgeriesToSort) {
            aSurgeriesToSort.sort(function (a, b) {
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

    SurgeriesController.prototype.setPatientModel = function (mPatientData) {
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

    SurgeriesController.prototype._filterChronologicalModelByDepartment = function (oModelBinding, sFilterDepartmentKey, bExclude) {
        if (oModelBinding && sFilterDepartmentKey) {
            if (!bExclude) {
                // including (only the given department)
                var oFilter = new Filter({
                    path: "departments",
                    test: function (aDepartments) { // return true means surgery is displayed
                        return Array.isArray(aDepartments)
                            && aDepartments.indexOf(sFilterDepartmentKey) > -1;
                    }
                });
                oModelBinding.filter(oFilter);
            } else {
                // excluding (all departments except the given one)
                var oExlusionFilter = new Filter({
                    path: "departments",
                    test: function (aDepartments) { // return true means surgery is displayed
                        return Array.isArray(aDepartments)
                            && (aDepartments.length === 0 // surgeries without departments are not excluded
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

    SurgeriesController.prototype._getLeftDepartmentSelection = function () {
        return this.byId("leftDepartmentDropdown").getSelectedKey();
    };

    SurgeriesController.prototype._getRightDepartmentSelection = function () {
        return this.byId("rightDepartmentDropdown").getSelectedKey();
    };

    SurgeriesController.prototype._applyLeftDepartmentSelection = function (sDepartmentKey) {
        // filtering for
        // chronological view
        var oChronoTableDated = this.byId("surgeriesChronoTable");
        // var oChronoTableUndated = this.byId("surgeriesChronoTableUndated");
        var oLeftBindingDated = oChronoTableDated.getBinding("leftRows");
        // var oLeftBindingUndated = oChronoTableUndated.getBinding("leftRows");

        this._filterChronologicalModelByDepartment(oLeftBindingDated, sDepartmentKey);
        // this._filterChronologicalModelByDepartment(oLeftBindingUndated, sDepartmentKey);

        // right side also needs re-filtering if "other departments" is selected
        if (this._getRightDepartmentSelection() === OTHER_DEPARTMENTS_KEY) {
            this._applyRightDepartmentSelection(OTHER_DEPARTMENTS_KEY);
        }
    };

    SurgeriesController.prototype._applyRightDepartmentSelection = function (sDepartmentKey) {
        // chronological view
        var oChronoTableDated = this.byId("surgeriesChronoTable");
        // var oChronoTableUndated = this.byId("surgeriesChronoTableUndated");
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

    SurgeriesController.prototype.onLeftDepartmentSelectionChanged = function (oControlEvent) {
        var sDepartmentKey = oControlEvent.mParameters.selectedItem.mProperties.key;
        this._applyLeftDepartmentSelection(sDepartmentKey);
    };

    SurgeriesController.prototype.onRightDepartmentSelectionChanged = function (oControlEvent) {
        var sDepartmentKey = oControlEvent.mParameters.selectedItem.mProperties.key;
        this._applyRightDepartmentSelection(sDepartmentKey);
    };

    /**
     * This function is called in processPatientData() to modify the original PS config object according to custom settings given in user state object
     * @param {any} mUserState User state to apply
     * @override
     */
    SurgeriesController.prototype.applyUserState = function (mUserState) {
        if (mUserState.defaultDepartment) {
            this._defaultDepartment = mUserState.defaultDepartment;
        }
    };

    /**
     * This function is called to retrieve the user state.
     * @returns {object} An object that represents the user state. This object will be passed as mUserState to processPatientData()
     * @override
     */
    SurgeriesController.prototype.getUserState = function () {
        /* empty base class implementation */
        return {
            defaultDepartment: this._defaultDepartment
        };
    };

    return SurgeriesController;
});

