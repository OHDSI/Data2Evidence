jQuery.sap.registerModulePath("sap.hc", "/sap/hc");
jQuery.sap.registerModulePath("sap.hc.hph.di.documents.WorkBench.ui.i18n", "/sap/hc/hph/di/documents/WorkBench/ui/i18n");

// Load the Core library explicitly as we depend on it being loaded before initializing the Component.
// sap.ui.getCore().loadLibrary("hc.hph.core.ui");

sap.ui.define([
    "jquery.sap.global",
    "hc/hph/core/ui/JSONBinding/DeepJSONModel",
    "hc/hph/core/ui/JSONBinding/DeepJSONPropertyBinding",
    "hc/hph/core/ui/TimeoutHandler",
    "hc/hph/patient/app/ui/lib/PatientData",
    "hc/hph/patient/app/ui/lib/tab/TabBaseController",
    "hc/hph/patient/app/ui/lib/utils/Utils",
    "./extension/ExtensionLoader",
    "m/MessageBox",
    "sap/ui/core/UIComponent",
    "sap/ui/model/Filter",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/resource/ResourceModel"
], function (jQuery, DeepJSONModel, DeepJSONPropertyBinding, TimeoutHandler, PatientData, TabBaseController, Utils, ExtensionLoader, MessageBox, UIComponent, Filter, JSONModel, ResourceModel) {
    "use strict";

    /**
     * Constructor for the Patient Summary content Component.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * This Component acts like a control for the Patient Summary functionality.
     * It provides the Timeline, Overview, and Related Documents tabs and opens the Variant Browser View for a single
     * patient. The data loading is also handled internally.
     * @extends sap.ui.core.UIComponent
     * @alias sap.hc.hph.patient.app.ui.content.Component
     */
    var Component = UIComponent.extend("hc.hph.patient.app.ui.content.Component", {
        metadata: {
            name: "Patient Summary - Content",
            version: "${version}",
            includes: [
                "css/style.css"
            ],
            dependencies: {
                libs: [
                    "hc.hph.core.ui",
                    "hc.hph.patient.app.ui.lib",
                    "sap.m",
                    "sap.ui.core"
                ],
                ui5version: "1.52.17"
            },
            config: {
                resourceBundle: "i18n/messagebundle.properties",
                configService: "/ps-config-svc/hc/hph/patient/config/services/config.xsjs",
                patientService: "/hc/hph/patient/app/services/patientservice.xsjs"
            },

            rootView: "hc.hph.patient.app.ui.content.view.Content",

            properties: {
                /**
                 * Id of the patient to display.
                 * A change of this property leads to a reloading and rerending.
                 */
                patientId: {
                    type: "string",
                    group: "Data"
                },
                /**
                 * Whether to show the header with patient masterdata.
                 * A change of this property leads to a reloading and rerending.
                 */
                minimizedHeader: {
                    type: "boolean",
                    group: "Appearance",
                    defaultValue: false
                },
                /**
                 * The selected tab.
                 */
                tab: {
                    type: "string",
                    group: "Behavior",
                    defaultValue: "diagnoses"
                },
                /**
                 * Maps navigation targets for tabs representing the application state to their values.
                 * Navigation targets are prefixed with the corresponding extension key.
                 */
                urlParams: {
                    type: "object",
                    group: "Behavior",
                    defaultValue: {}
                },
                /**
                 * The navTargets property is an alias to urlParams and kept for compatibility reasons. Please use urlParams.
                 * @deprecated since FP06
                 */
                navTargets: {
                    type: "object",
                    group: "Behavior",
                    defaultValue: {}
                }
            },
            events: {
                /**
                 * Internal event to tell the controller that a config has been chosen (either automatically or
                 * manually) and downloaded so that the controller can start requesting the patient data.
                 */
                reload: {
                    parameters: {
                        /**
                         * Id of the patient to display.
                         */
                        patientId: {
                            type: "string"
                        }
                    }
                },
                /**
                 * Event to be fired if the selection of the config fails.
                 * This can have two reasons:
                 * 1. There is no config assigned to the current user
                 * 2. There are several configs assigned but the user cancelled the manual selection
                 * The reasons are reflected in the parameter.
                 */
                configSelectionFailed: {
                    parameters: {
                        /**
                         * True, if the user cancelled the config selection
                         * @type {Boolean}
                         */
                        cancelled: {
                            type: "boolean",
                            default: false
                        }
                    }
                },

                /**
                 * Event to be fired before the patient masterdata has been loaded.
                 */
                beforeDataLoad: {},

                /**
                 * Event to be fired after the patient masterdata has been loaded.
                 */
                afterDataLoad: {},

                /**
                 * Event to be fired if no patient data was found for the given patient id.
                 */
                patientNotFound: {
                    parameters: {
                        /**
                         * The given patient id.
                         * @type {string}
                         */
                        patientId: {
                            type: "string"
                        }
                    }
                },

                /**
                 * Event to be fired when the selected tab is changed.
                 * @deprecated since FP06
                 */
                tabChange: {
                    parameters: {
                        /**
                         * The newly selected tab key.
                         * @type {string}
                         */
                        tab: {
                            type: "string"
                        }
                    }
                },
                /**
                 * Event to be fired when a navigation target gets changed.
                 * @deprecated since FP06
                 */
                navigationTargetChange: {
                    parameters: {
                        navTarget: {
                            type: "string"
                        },
                        value: {
                            type: "any"
                        }
                    }
                }
            }
        }
    });


    Component.USER_STATE_SAVE_TIMEOUT = 3000;

    Component.WIDGET_RANKS = {
        "sap.hc.hph.patient.plugins.widgets.masterdata": 0,
        "sap.hc.hph.patient.plugins.widgets.diagnoses": 1,
        "sap.hc.hph.patient.plugins.widgets.documents": 2,
        "sap.hc.hph.patient.plugins.widgets.lab": 3,
        "sap.hc.hph.patient.plugins.widgets.surgeries": 4,
        "sap.hc.hph.patient.plugins.widgets.risks": 5
    };

    Component.TAB_RANKS = {
        "sap.hc.hph.patient.plugins.tabs.diagnoses": 0,
        "sap.hc.hph.patient.plugins.tabs.documents": 1,
        "sap.hc.hph.patient.plugins.tabs.lab": 2,
        "sap.hc.hph.patient.plugins.tabs.surgeries": 3,
        "sap.hc.hph.patient.plugins.tabs.timeline": 4,
        "sap.hc.hph.patient.plugins.tabs.overview": 5,
        "sap.hc.hph.patient.plugins.tabs.risks": 6,
        "sap.hc.hph.patient.plugins.tabs.masterdata": 7
    };

    Component.HL7_DEPARTMENTS_AT = [
        {"CODE": "F001", "DISPLAY_NAME": "Allgemeinmedizin", "LIST_WHEN_EMPTY": false, "DESCRIPTION": "Dokumente aus Allgemeinmedizinischen Organisationen "},
        {"CODE": "F002", "DISPLAY_NAME": "Anästhesiologie und Intensivmedizin", "LIST_WHEN_EMPTY": true, "DESCRIPTION": "Anästhesiologie und Intensivmedizin"},
        {"CODE": "F005", "DISPLAY_NAME": "Augenheilkunde", "LIST_WHEN_EMPTY": true, "DESCRIPTION": "Augenheilkunde"},
        {"CODE": "F006", "DISPLAY_NAME": "Blutgruppenserologie und Transfusionsmedizin", "LIST_WHEN_EMPTY": false, "DESCRIPTION": "Blutgruppenserologie und Transfusionsmedizin"},
        {"CODE": "F007", "DISPLAY_NAME": "Chirurgie", "LIST_WHEN_EMPTY": true, "DESCRIPTION": "Chirurgie (inklusive Gefäß- und Transplantationschirugie)"},
        {"CODE": "F010", "DISPLAY_NAME": "Gynäkologie und Geburtshilfe", "LIST_WHEN_EMPTY": true, "DESCRIPTION": "Frauenheilkunde (Gynäkologie), Geburtshilfe, inklusive Hebammentätigkeit, Wochenbettbetreuung, Schwangerenvorsorge"},
        {"CODE": "F014", "DISPLAY_NAME": "HNO", "LIST_WHEN_EMPTY": true, "DESCRIPTION": "Hals-, Nasen- und Ohrenkrankheiten"},
        {"CODE": "F015", "DISPLAY_NAME": "Dermatologie", "LIST_WHEN_EMPTY": true, "DESCRIPTION": "Haut- und Geschlechtskrankheiten"},
        {"CODE": "F016", "DISPLAY_NAME": "Mikrobiologie", "LIST_WHEN_EMPTY": false, "DESCRIPTION": "Dokumente aus dem Bereich mikrobiologisch-serologische Labordiagnostik"},
        {"CODE": "F019", "DISPLAY_NAME": "Innere Medizin", "LIST_WHEN_EMPTY": true, "DESCRIPTION": "Innere Medizin"},
        {"CODE": "F023", "DISPLAY_NAME": "Interdisziplinärer Bereich", "LIST_WHEN_EMPTY": true, "DESCRIPTION": "Interdisziplinärer Bereich  (Eingeschränkter Geltungsbereich, nur wenn in einem CDA-Leitfaden vorgesehen)"},
        {"CODE": "F025", "DISPLAY_NAME": "Kinder- und Jugendpsychiatrie", "LIST_WHEN_EMPTY": true, "DESCRIPTION": "Kinder- und Jugendpsychiatrie"},
        {"CODE": "F026", "DISPLAY_NAME": "Kinder- und Jugendchirurgie", "LIST_WHEN_EMPTY": true, "DESCRIPTION": "Kinder-Chirurgie"},
        {"CODE": "F027", "DISPLAY_NAME": "Kinder- und Jugendheilkunde", "LIST_WHEN_EMPTY": true, "DESCRIPTION": "Kinderheilkunde"},
        {"CODE": "F028", "DISPLAY_NAME": "Labordiagnostik", "LIST_WHEN_EMPTY": false, "DESCRIPTION": "Dokumente aus dem Bereich medizinisch-chemische Labordiagnostik"},
        {"CODE": "F029", "DISPLAY_NAME": "Mund-, Kiefer- und Gesichtschirurgie", "LIST_WHEN_EMPTY": true, "DESCRIPTION": "Mund-, Kiefer- und Gesichtschirurgie"},
        {"CODE": "F031", "DISPLAY_NAME": "Neurochirurgie", "LIST_WHEN_EMPTY": true, "DESCRIPTION": "Neurochirurgie"},
        {"CODE": "F032", "DISPLAY_NAME": "Neurologie", "LIST_WHEN_EMPTY": true, "DESCRIPTION": "Neurologie, Inkl. Stroke Unit sowie Neurologie Phase B, C"},
        {"CODE": "F033", "DISPLAY_NAME": "Nuklearmedizin", "LIST_WHEN_EMPTY": false, "DESCRIPTION": "Nuklearmedizin"},
        {"CODE": "F035", "DISPLAY_NAME": "Orthopädie und orthopädische Chirurgie", "LIST_WHEN_EMPTY": true, "DESCRIPTION": "Orthopädie und orthopädische Chirurgie"},
        {"CODE": "F036", "DISPLAY_NAME": "Palliativmedizin", "LIST_WHEN_EMPTY": true, "DESCRIPTION": "Dokumente der palliativ-medizinischen Versorgung"},
        {"CODE": "F037", "DISPLAY_NAME": "Pathologie", "LIST_WHEN_EMPTY": false, "DESCRIPTION": "Pathologie"},
        {"CODE": "F040", "DISPLAY_NAME": "Physikalische Medizin und Rehabilitation", "LIST_WHEN_EMPTY": true, "DESCRIPTION": "Physikalische Medizin"},
        {"CODE": "F041", "DISPLAY_NAME": "Plastische Chirurgie", "LIST_WHEN_EMPTY": false, "DESCRIPTION": "Plastische Chirurgie"},
        {"CODE": "F042", "DISPLAY_NAME": "Psychiatrie", "LIST_WHEN_EMPTY": true, "DESCRIPTION": "Psychiatrie"},
        {"CODE": "F043", "DISPLAY_NAME": "Pulmologie", "LIST_WHEN_EMPTY": true, "DESCRIPTION": "Pulmologie (Lungenheilkunde)"},
        {"CODE": "F044", "DISPLAY_NAME": "Radiologie", "LIST_WHEN_EMPTY": true, "DESCRIPTION": "Radiologie"},
        {"CODE": "F048", "DISPLAY_NAME": "Remobilisation/Nachsorge", "LIST_WHEN_EMPTY": false, "DESCRIPTION": "Remobilisation/Nachsorge"},
        {"CODE": "F052", "DISPLAY_NAME": "Unfallchirurgie", "LIST_WHEN_EMPTY": true, "DESCRIPTION": "Unfallchirurgie"},
        {"CODE": "F053", "DISPLAY_NAME": "Urologie", "LIST_WHEN_EMPTY": true, "DESCRIPTION": "Urologie"},
        {"CODE": "F055", "DISPLAY_NAME": "Zahn-, Mund- und Kieferheilkunde", "LIST_WHEN_EMPTY": false, "DESCRIPTION": "Zahn-, Mund- und Kieferheilkunde"},
        {"CODE": "F056", "DISPLAY_NAME": "Akutgeriatrie/Remobilisation", "LIST_WHEN_EMPTY": false, "DESCRIPTION": "Dokumente aus dem Bereich der Akutgeriatrie und Remobilisation"},
        {"CODE": "F057", "DISPLAY_NAME": "Gesundheits- und Krankenpflege", "LIST_WHEN_EMPTY": false, "DESCRIPTION": "Gesundheits- und Krankenpflegerische Dokumente (nicht zu verwenden für Dokumente aus dem Krankenhausbereich)"},
        {"CODE": "F058", "DISPLAY_NAME": "Herzchirurgie", "LIST_WHEN_EMPTY": false, "DESCRIPTION": "Herzchirurgie"},
        {"CODE": "F059", "DISPLAY_NAME": "Klinische Psychologie", "LIST_WHEN_EMPTY": true, "DESCRIPTION": "Klinische Psychologie"},
        {"CODE": "F060", "DISPLAY_NAME": "Kur- und Prävention", "LIST_WHEN_EMPTY": false, "DESCRIPTION": "Kur- und Prävention"},
        {"CODE": "F061", "DISPLAY_NAME": "Psychosomatik", "LIST_WHEN_EMPTY": false, "DESCRIPTION": "Psychosomatik"},
        {"CODE": "F062", "DISPLAY_NAME": "Radioonkologie", "LIST_WHEN_EMPTY": false, "DESCRIPTION": "Dokumente aus Strahlentherapie und Radioonkologie"},
        {"CODE": "F063", "DISPLAY_NAME": "Rechtliche Dokumente", "LIST_WHEN_EMPTY": false, "DESCRIPTION": "Rechtliche Dokumente wie Patientenverfügungen"},
        {"CODE": "F064", "DISPLAY_NAME": "Thoraxchirurgie", "LIST_WHEN_EMPTY": false, "DESCRIPTION": "Thoraxchirurgie"}
    ];

    /**
     * Initialize the component.
     * Create resource model and request the config information from the config service.
     * If there is only one, it is selected and the application will start immediately.
     * If there is more than one without any marked as default, a selection dialog is shown to the user.
     * Initialization of the content will continue once a config has been selected.
     * @override
     * @protected
     */
    Component.prototype.init = function () {
        sap.ui.core.UIComponent.prototype.init.apply(this, arguments);

        var mConfig = this.getMetadata().getConfig();

        var oResourceModel = new ResourceModel({
            bundleUrl: [jQuery.sap.getModulePath("hc.hph.patient.app.ui.content"), mConfig.resourceBundle].join("/")
        });
        this.setModel(oResourceModel, "i18n");

        var oResourceBundle = oResourceModel.getResourceBundle();
        Utils.setResourceBundle(oResourceBundle);

        // Create model for UI state
        this.setModel(new JSONModel({
            tab: this.getTab(),
            minimizedHeader: false,
            busy: true,
            error: ""
        }), "state");

        // Listen to changes of the selected tab
        new DeepJSONPropertyBinding(this.getModel("state"), "/tab")
            .attachChange(function () {
                var sTab = this.getModel("state").getProperty("/tab");
                this.setProperty("tab", sTab, true);
                this.fireTabChange({
                    tab: sTab
                });
            }, this);

        // Create model for tab extensions
        this._aUrlParamsBindings = [];
        this._aUserStateBindings = [];
        this.setModel(new DeepJSONModel(), "tabExt");
        this.setModel(new DeepJSONModel(), "widgetExt");

        this._aInteractionExtensions = [];
        // var getConfig = Utils.ajax(mConfig.configService + "?action=getMyConfig");
        var getConfig = Utils.ajax({
            url: mConfig.configService + "?action=getMyConfig",
            type: "POST",
            dataType: "json",
            contentType: "application/json; charset=utf-8",
            crossDomain: true,
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json; charset=utf-8"
            },
            data: JSON.stringify({"action": "getAll"})
        }).done(jQuery.proxy(function (aGetConfigResults) {
            var aData = aGetConfigResults[0].configs;
            function onClose() {
                this.fireConfigSelectionFailed({cancelled: false});
            }
            if (aData.length === 0) {
                MessageBox.show(Utils.getText("HPH_PAT_CONTENT_NO_CONFIG_ASSIGNED"), {
                    icon: MessageBox.Icon.ERROR,
                    styleClass: Utils.getContentDensityClass(),
                    title: Utils.getText("HPH_PAT_CONTENT_NOTIFICATION_ERROR"),
                    onClose: onClose.bind(this)
                });
            } else if (aData.length > 1) {
                aData[0].selected = true;
                this._openConfigSelection(aData);
            } else {
                this._loadApplication(aData[0]);
            }
        }, this));
    };

    /**
     * Returns the content of {@link sap.ui.core.UIComponent#createContent}.
     * If you specified a <code>rootView</code> in your metadata or in the descriptor file (manifest.json),
     * you will get the instance of the root view.
     * This getter will only return something if the {@link sap.ui.core.UIComponent#init} function was invoked.
     * If <code>createContent</code> is not implemented, and there is no root view, it will return <code>null</code>.
     * @protected
     * @returns {sap.ui.core.Control} the control created by {@link sap.ui.core.UIComponent#createContent}
     * FUTURE: Remove with SAPUI5 1.44
     */
    Component.prototype.getRootControl = function () {
        return this.getAggregation("rootControl");
    };

    /**
     * Load the list of available configurations and open the selection Dialog.
     */
    Component.prototype.openDepartmentSelectionDialog = function () {
        var sFragmentName = "hc.hph.patient.app.ui.content.view.DepartmentSelectionDialog";
        var oDepartmentSelectionDialog = sap.ui.xmlfragment(sFragmentName, this);
        var oDepartmentsModel = new JSONModel(Component.HL7_DEPARTMENTS_AT);
        oDepartmentSelectionDialog.setModel(oDepartmentsModel);
        oDepartmentSelectionDialog.setModel(this.getModel("i18n"), "i18n");
        oDepartmentSelectionDialog.addStyleClass(Utils.getContentDensityClass());
        oDepartmentSelectionDialog.open();
    };

    Component.prototype.onDepartmentSelected = function (oControlEvent) {
        if (oControlEvent.sId === "confirm" && oControlEvent.getParameters().selectedItem) {
            var sSelectedDepartment = oControlEvent.getParameters().selectedItem.mProperties.title;

            var oTabExtModel = this.getModel("tabExt");
            if (!oTabExtModel) {
                return;
            }

            var aExtensions = oTabExtModel.getData();
            if (Array.isArray(aExtensions)) {
                aExtensions.forEach(function (mExtension, index) {
                    var mUserState = mExtension.userState;
                    mUserState.defaultDepartment = sSelectedDepartment;
                    oTabExtModel.setProperty("/" + index + "/userState", mUserState);
                });
            }
        }
    };

    // Component.prototype.onDepartmentSearched = function (oEvent) {
    //     var sValue = oEvent.getParameter("value");
    //     var oFilter = new Filter("Name", sap.ui.model.FilterOperator.Contains, sValue);
    //     var oBinding = oEvent.getSource().getBinding("items");
    //     oBinding.filter([oFilter]);
    // };

    /**
     * Load the list of available configurations and open the selection Dialog.
     */
    Component.prototype.openConfigSelectionDialog = function () {
        var sUrl = this.getMetadata().getConfig().configService + "?action=getMyConfigList";
        // Request ps-config
        Utils.ajax({
            url: sUrl,
            type: "POST",
            dataType: "json",
            contentType: "application/json; charset=utf-8",
            crossDomain: true,
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json; charset=utf-8"
            },
            data: JSON.stringify({"action": "getAll"})
        }).done(jQuery.proxy(function (aData) {
            var configs = aData[0].configs
            configs.forEach(function (mDatum) {
                // TODO: Investigate why this.getModel("meta") is returning undefined
                mDatum.selected = mDatum.meta.configId === this.getModel("meta").getProperty("/configId");
                mDatum.selected = false;
            }, this);
            this._openConfigSelection(configs);
        }, this));
    };

    /**
     * Open the selection Dialog with the given list of configurations.
     * @private
     * @param {object[]} aConfigs List of configuration objects
     */
    Component.prototype._openConfigSelection = function (aConfigs) {
        var sFragmentName = "hc.hph.patient.app.ui.content.view.ConfigSelectionDialog";
        var oConfigSelectionDialog = sap.ui.xmlfragment(sFragmentName, this);
        oConfigSelectionDialog.setModel(new JSONModel({
            configs: aConfigs,
            default: false
        }));
        oConfigSelectionDialog.setModel(this.getModel("i18n"), "i18n");
        oConfigSelectionDialog.addStyleClass(Utils.getContentDensityClass());
        oConfigSelectionDialog.open();
    };

    /**
     * Cancels a scheduled call to save user state.
     */
    Component.prototype._cancelUserStatesSave = function () {
        if (typeof this._saveUserStateTimerId === "number") {
            window.clearTimeout(this._saveUserStateTimerId);
            this._saveUserStateTimerId = null;
        }
    };

    Component.prototype.saveUserStates = function () {
        this._cancelUserStatesSave();
        var oMetaModel = this.getModel("meta");
        var oTabExtModel = this.getModel("tabExt");
        // If there is no meta model, no config has been selected before closing.
        // Therefore the application did not open and no user state needs to be saved.
        if (oMetaModel && oTabExtModel) {
            var sConfigId = oMetaModel.getProperty("/configId");
            var sConfigVersion = oMetaModel.getProperty("/configVersion");

            Object.keys(this._markedExtensionIndices)
                .forEach(function (sExtensionIndex) {
                    var mExtension = oTabExtModel.getProperty("/" + sExtensionIndex);
                    Utils.setState(sConfigId, sConfigVersion, mExtension.config.key, mExtension.userState);
                }, this);
            this._markedExtensionIndices = {};
        }
    };

    /**
     * Schedules a call to (i.e., registers a timer) save current settings in user state (browser's local storage). Existing timers are cancelled to avoid duplicate calls.
     * The purpose of the timer approach is to
     *  1. save user state asynchronously and
     *  2. avoid saving the user state after every single change. This is relevant in case the user modifies multiple settings in a short period of time (e.g., when re-ordering lanes).
     * @param {number} iExtensionIndex Index of the extension in the extension array at tabExt>/ in the config
     */
    Component.prototype.markUserStateChanged = function (iExtensionIndex) {
        this._cancelUserStatesSave();
        this._markedExtensionIndices[iExtensionIndex] = true;
        this._saveUserStateTimerId = window.setTimeout(this.saveUserStates.bind(this), Component.USER_STATE_SAVE_TIMEOUT);
    };

    Component.prototype._pushUrlParams = function (aModels) {
        // Override URL params for all tabs/widgets
        aModels.forEach(function (oModel) {
            var mAllUrlParams = this.getProperty("urlParams");
            var aExtensions = oModel.getData();
            var sTab = this.getTab();
            if (Array.isArray(aExtensions)) {
                aExtensions.forEach(function (mExtension, index) {
                    var mUrlParams = {
                        own: {},
                        tab: sTab
                    };
                    if (mExtension.config.key) {
                        var sPrefix = mExtension.config.key + "_";
                        Object.keys(mAllUrlParams).forEach(function (sCombinedKey) {
                            if (sCombinedKey.indexOf(sPrefix) === 0) {
                                var sKey = sCombinedKey.substr(sPrefix.length);

                                // Check for the navigation target change to be valid
                                if (!Array.isArray(mExtension.config.urlParams) || mExtension.config.urlParams.indexOf(sKey) !== -1) {
                                    mUrlParams.own[sKey] = mAllUrlParams[sCombinedKey];
                                } else {
                                    jQuery.sap.log.error("The navigation key is not defined", sCombinedKey);
                                }
                            }
                        });
                    }
                    oModel.setProperty("/" + index + "/urlParams", mUrlParams);
                }, this);
            }
        }, this);
    };

    Component.prototype.setUrlParams = function (oAllUrlParams) {
        this.setProperty("urlParams", oAllUrlParams, true);
        this._pushUrlParams([this.getModel("tabExt"), this.getModel("widgetExt")]);
    };

    Component.prototype.pullUrlParams = function () {
        var oModels = [this.getModel("tabExt"), this.getModel("widgetExt")];
        var that = this;
        var mOldUrlParams = this.getProperty("urlParams");
        var sOldTab = this.getTab();
        var sNewTab = sOldTab;

        var mAllUrlParams = oModels.reduce(function (mAllUrlParamsPerModel, oModel) {
            var aExtensions = oModel.getData();
            if (Array.isArray(aExtensions)) {
                mAllUrlParamsPerModel = aExtensions.reduce(function (mAllUrlParamsPart, mExtension) {
                    if (mExtension.urlParams) {
                        if (mExtension.urlParams.own) {
                            // Prefix the url key with the extension key to avoid collisions.
                            var sPrefix = mExtension.config.key + "_";
                            Object.keys(mExtension.urlParams.own).forEach(function (sKey) {
                                var sNewValue = mExtension.urlParams.own[sKey];
                                // Fire change event if a URL parameter has been changed
                                if (mOldUrlParams[sPrefix + sKey] !== sNewValue) {
                                    that.fireNavigationTargetChange({
                                        navTarget: sPrefix + sKey,
                                        value: sNewValue
                                    });
                                }
                                mAllUrlParamsPart[sPrefix + sKey] = sNewValue;
                            });
                        }
                        if (typeof mExtension.urlParams.tab === "string" && sOldTab !== mExtension.urlParams.tab) {
                            sNewTab = mExtension.urlParams.tab;
                        }
                    }
                    return mAllUrlParamsPart;
                }, mAllUrlParamsPerModel);
            }
            return mAllUrlParamsPerModel;
        }, {});
        that.setProperty("tab", sNewTab, true);
        this.setProperty("urlParams", mAllUrlParams, true);
    };

    /**
     * Loads the application with a given configuration.
     * Set up relevant models and load configured extensions.
     * @private
     * @param {object} mConfig patient config object
     */
    Component.prototype._loadApplication = function (mConfig) {
        // SAMPLE mConfig = 
        var mConfigCopy = JSON.parse(JSON.stringify(mConfig.config));
        this.setModel(new DeepJSONModel(mConfigCopy), "config");
        // this._oPatientModel = new JSONModel(mConfig.config);
        this._oPatientModel = new JSONModel();


        // Prepare model for tab extensions:
        //
        //   - Remove old change handlers
        //   - Copy extension config
        //   - Fill user states
        //   - Fill URL paramaters
        //   - Setup new change handlers
        //
        this._aUserStateBindings.forEach(function (aArgs) {
            aArgs[0].detachChange(aArgs[1]);
        });
        this._aUrlParamsBindings.forEach(function (aArgs) {
            aArgs[0].detachChange(aArgs[1]);
        });
        this._aUserStateBindings = [];
        this._aUrlParamsBindings = [];
        if (mConfig.config.inspectorOptions) {
            if (mConfig.config.inspectorOptions.tabExtensions) {
                var aTabExtensions = mConfig.config.inspectorOptions.tabExtensions.map(function (mExtensionConfig, index) {
                    return {
                        config: mExtensionConfig,
                        userState: Utils.getState(mConfig.meta.configId, mConfig.meta.configVersion, mExtensionConfig.key),
                        rank: typeof Component.TAB_RANKS[mExtensionConfig.id] === "number" ? Component.TAB_RANKS[mExtensionConfig.id] : index + Object.keys(Component.TAB_RANKS).length
                    };
                });

                // Fix tab order (temporary fix for FP06 until we can order tabs in FP07)
                aTabExtensions.sort(function (mTabA, mTabB) {
                    return mTabA.rank - mTabB.rank;
                });
                
                // aTabExtensions = aTabExtensions.map(function(item) {
                //     // Check if the extensionId starts with 'sap.hc.'
                //     if (item.config.extensionId.indexOf('sap.hc.') === 0) {
                //         // Replace 'sap.hc.' with 'hc.'
                //         item.config.extensionId = item.config.extensionId.replace('sap.hc.', 'hc.');
                //     }
                //     return item;
                // });

                var oTabExtModel = this.getModel("tabExt");
                oTabExtModel.setData(aTabExtensions);
                this._pushUrlParams([this.getModel("tabExt")]);

                // Attach change listener to the user states of each extension
                this._markedExtensionIndices = {};
                aTabExtensions.forEach(function (mExtension, index) {
                    // Listen to changes of the user state
                    var oPropertyBinding = new DeepJSONPropertyBinding(oTabExtModel, "/" + index + "/userState");
                    var fnChangeHandler = function () {
                        this.markUserStateChanged(index);
                    }.bind(this);
                    oPropertyBinding.attachChange(fnChangeHandler);
                    this._aUserStateBindings.push([oPropertyBinding, fnChangeHandler]);

                    // Listen to changes of the URL parameters
                    oPropertyBinding = new DeepJSONPropertyBinding(oTabExtModel, "/" + index + "/urlParams");
                    fnChangeHandler = this.pullUrlParams.bind(this);
                    oPropertyBinding.attachChange(fnChangeHandler);
                    this._aUrlParamsBindings.push([oPropertyBinding, fnChangeHandler]);
                }, this);
            }

            if (mConfig.config.inspectorOptions.widgetExtensions) {
                var aWidgetExtensions = mConfig.config.inspectorOptions.widgetExtensions.map(function (mExtensionConfig, index) {
                    return {
                        config: mExtensionConfig,
                        userState: {},  // TODO: if neccessary
                        rank: typeof Component.WIDGET_RANKS[mExtensionConfig.id] === "number" ? Component.WIDGET_RANKS[mExtensionConfig.id] : index + Object.keys(Component.WIDGET_RANKS).length
                    };
                });

                // Fix widget order (temporary fix for FP06 until we can order tabs in FP07)
                aWidgetExtensions.sort(function (mWidgetA, mWidgetB) {
                    return mWidgetA.rank - mWidgetB.rank;
                });

                var oWidgetExtModel = this.getModel("widgetExt");
                oWidgetExtModel.setData(aWidgetExtensions);
                this._pushUrlParams([this.getModel("widgetExt")]);

                aWidgetExtensions.forEach(function (mExtension, index) {
                    // Listen to changes of the URL parameters
                    var oPropertyBinding = new DeepJSONPropertyBinding(oWidgetExtModel, "/" + index + "/urlParams");
                    var fnChangeHandler = this.pullUrlParams.bind(this);
                    oPropertyBinding.attachChange(fnChangeHandler);
                    this._aUrlParamsBindings.push([oPropertyBinding, fnChangeHandler]);
                }, this);
            }
        }

        this._oPatientModel.setSizeLimit(Infinity);
        this.setModel(this._oPatientModel, "patient");
        this.setModel(new JSONModel(mConfig.meta), "meta");

        // Load Interaction extensions
        var oExtensionLoader = new ExtensionLoader(this.getUrlParams());
        var _aInteractionExtensions = [];
        if (mConfig.hasOwnProperty("extensions") && Array.isArray(mConfig.extensions.interaction)) {
            _aInteractionExtensions = mConfig.extensions.interaction;
        }

        oExtensionLoader.loadExtensions(_aInteractionExtensions, ExtensionLoader.Extensions.Interaction)
            .then(function (aExtensionLists) {
                this._aInteractionExtensions = aExtensionLists;
                this.fireReload({
                    patientId: this.getPatientId()
                });
            }.bind(this));

        // oPatientIconTabBar.setSelectedKey(this.getTab());
    };

    Component.prototype.notifyPatientNotFound = function (sPatientId) {
        this.firePatientNotFound({
            patientId: sPatientId
        });
    };

    Component.prototype.notifyDataLoadStarted = function () {
        this.fireBeforeDataLoad();
    };
    Component.prototype.notifyDataLoadFinished = function () {
        this.fireAfterDataLoad();
    };

    /**
     * Setter for property patientId.
     * Only updates the property if it has changed.
     * If the patient config has already been loaded, fire the reload event to update the view.
     * @param {string} sPatientId Patient Id
     * @override
     */
    Component.prototype.setPatientId = function (sPatientId) {
        if (this.getPatientId() !== sPatientId) {
            this.setProperty("patientId", sPatientId, true);
            if (this._oPatientModel) {
                this.fireReload({
                    patientId: sPatientId
                });
            }
        }
    };

    /**
     * Setter for property tab.
     * Updates the state model.
     * @param {string} sTab Selected Tab, should be "timeline" or "overview".
     * @override
     */
    Component.prototype.setTab = function (sTab) {
        this.fireTabChange({
            tab: sTab
        });
        this.setProperty("tab", sTab, true);
        this.getModel("state").setProperty("/tab", sTab);
        this._pushUrlParams([this.getModel("tabExt"), this.getModel("widgetExt")]);
        TimeoutHandler._pingKeepalive();
    };

    /**
     * Setter for property tab.
     * Updates the state model.
     * @param {string} sTab Selected Tab, should be "timeline" or "overview".
     * @override
     */
    Component.prototype.setMinimizedHeader = function (bMinimized) {
        this.setProperty("minimizedHeader", bMinimized, true);
        this.getModel("state").setProperty("/minimizedHeader", bMinimized);
    };

    /**
     * Resets all customized timeline settings.
     */
    Component.prototype.resetSettings = function () {
        this.getRootControl().getController().resetSettings();
    };

    /**
     * Formatter for the Config Selection Dialog checks for a default selected configuration.
     *
     * @param {array} configs the array of configs
     * @returns {boolean} true if one config is selected as default; false otherwise
     */
    Component.prototype.hasDefaultSelected = function (configs) {
        if (!Array.isArray(configs)) {
            return false;
        }
        var defaultConfig = configs.filter(function (config) {
            return config.meta && config.meta.default;
        });
        return defaultConfig.length !== 0;
    };

    /**
     * Handler for clear default Button pressed in the Config Selection Dialog.
     *
     * @param {object} oEvent the press event
     */
    Component.prototype.onConfigDefaultClear = function (oEvent) {
        var oModel = oEvent.getSource().getModel();
        Utils.ajax({
            url: this.getMetadata().getConfig().configService,
            type: "POST",
            data: JSON.stringify({
                action: "clearDefault"
            }),
            contentType: "application/json;charset=utf-8",
            dataType: "json"
        }).done(jQuery.proxy(function () {
            var configs = Utils.cloneJson(oModel.getProperty("/configs"));
            configs.forEach(function (config) {
                config.meta.default = false;
            });
            oModel.setProperty("/configs", configs);
        }, this));
    };

    /**
     * Handler for "Select and Save as Default" Button pressed in the Config Selection Dialog.
     * Triggers the config load/app initialization as well as the backend request to save the selection as default.
     * @param {sap.ui.base.Event} oEvent List selectionChange Event
     */
    Component.prototype.onConfigSelectedAndSaved = function (oEvent) {
        var oDialog = oEvent.getSource().getParent().getParent();
        oDialog.setBusyIndicatorDelay(0).setBusy(true);
        var mConfigData = oEvent.getSource().getModel().getProperty("/configs").filter(function (mConfig) {
            return mConfig.selected;
        }).map(function (mConfig) {
            return {
                action: "setDefault",
                configId: mConfig.meta.configId,
                configVersion: mConfig.meta.configVersion
            };
        })[0];
        Utils.ajax({
            url: "/ps-config-svc/hc/hph/patient/app/services/config.xsjs",
            type: "POST",
            data: JSON.stringify(mConfigData),
            contentType: "application/json;charset=utf-8"
        });
        this.onConfigSelected(oEvent);
    };

    /**
     * Handler for "Select" Button pressed in the Config Selection Dialog.
     * Creates a configData object from the selection, gets the configuration from the backend and continues
     * initializing the application.
     * @param {sap.ui.base.Event} oEvent List selectionChange Event
     */
    Component.prototype.onConfigSelected = function (oEvent) {
        var oDialog = oEvent.getSource().getParent().getParent();
        oDialog.setBusyIndicatorDelay(0).setBusy(true);
        var mConfigData = oEvent.getSource().getModel().getProperty("/configs").filter(function (mConfig) {
            return mConfig.selected;
        }).map(function (mConfig) {
            return {
                action: "getFrontendConfig",
                configId: mConfig.meta.configId,
                configVersion: mConfig.meta.configVersion
            };
        })[0];
        Utils.ajax({
            url: "/ps-config-svc/hc/hph/patient/app/services/config.xsjs",
            type: "POST",
            data: JSON.stringify(mConfigData),
            contentType: "application/json;charset=utf-8",
            dataType: "json"
        }).done(jQuery.proxy(function (mData) {
            oDialog.destroy();
            this._loadApplication(mData);
        }, this));
    };

    /**
     * Handler for the Config Selection Dialog Cancel Button press.
     * Closes the Dialog which will trigger the onClose event.
     * @param {sap.ui.base.Event} oEvent Button Press Event
     */
    Component.prototype.onClosePressed = function (oEvent) {
        oEvent.getSource().getParent().getParent().close();
    };

    /**
     * Handler for the Config Selection Dialog close event.
     * Is called if the Config Selection Dialog is closed without selecting a config.
     */
    Component.prototype.onDialogClose = function () {
        if (!this._oPatientModel) {
            this.fireConfigSelectionFailed({
                cancelled: true
            });
        }
    };

    /**
     * Gets the title based on currently applicable configuration.
     * @returns {string} Returns the configured title.
     */
    Component.prototype.getTitle = function () {
        var sTitle = "";
        var oPatientModel = this.getModel("patient");
        var oConfigModel = this.getModel("config");
        if (oPatientModel && oConfigModel) {
            var masterDataAttrs = oPatientModel.getProperty("/masterData/attributes");
            var formatter = oConfigModel.getProperty("/masterdata/title/0/pattern");
            if (masterDataAttrs && formatter) {
                sTitle = PatientData.applyFormatter(masterDataAttrs, formatter);
            }
        }
        return sTitle;
    };

    /**
     * Get a list of Extensions that are subscribed to the given annotation.
     * @param   {string} sAnnotation Annotation to filter by
     * @returns {string} Returns the configured title.
     */
    Component.prototype.getExtensions = function (sAnnotation) {
        return this._aInteractionExtensions.filter(function (mExtension) {
            return mExtension.annotations.indexOf(sAnnotation) !== -1;
        });
    };

    Component.prototype.setNavTargets = function () {
        Component.prototype.setUrlParams.apply(this, arguments);
    };

    Component.prototype.getNavTargets = function () {
        return Component.prototype.getUrlParams.apply(this, arguments);
    };

    return Component;
});
