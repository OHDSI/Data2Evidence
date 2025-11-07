sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "./MriConfigAttribute",
    "./MriConfigFilterCard",
    "./MriConfigPatientList",
    "./ifr/BooleanContainers",
    "./ifr/InternalFilterRepresentation"
], function (jQuery, Utils, MriConfigAttribute, MriConfigFilterCard, MriConfigPatientList, BooleanContainers, InternalFilterRepresentation) {
    "use strict";

    /**
     * MriFrontendConfig
     * @namespace
     * @alias sap.hc.mri.pa.ui.lib.MriFrontendConfig
     */

    var _instance;

    /**
     * Create an MriFrontendConfig instance from a given config object.
     * This function has to be called before the instance is used in the application.
     * It should only be called once in the Component.
     * @constructor
     * @private
     * @param   {Object} mConfig Mri config object
     */

    function MriFrontendConfig(mConfig) {
        this._internalConfig = mConfig.config;
        this._configMetadata = mConfig.meta;

        this._aFilterCards = [];
        this._mFilterCards = {};
        this._aAttributes = [];
        this._mAttributes = {};
        this._oPatientListConfig = {};

        this._oJsonWalk = Utils.getJsonWalkFunction(this._internalConfig);
        var aConfigInteractions = this._oJsonWalk("patient")
            .concat(this._oJsonWalk("patient.interactions.*"))
            .concat(this._oJsonWalk("patient.**.interactions.*"));

        // add the patientList config member
        this._oPatientListConfig = new MriConfigPatientList(this._internalConfig);

        var isFilterCardVisible;

        for (var i = 0; i < aConfigInteractions.length; i++) {
            isFilterCardVisible = typeof aConfigInteractions[i].obj.filtercard === "undefined" || aConfigInteractions[i].obj.filtercard.visible === true;

            var aConfigAttributes = this._oJsonWalk(aConfigInteractions[i].path + ".attributes.*");
            var aPatientListAttributes = []; // only attributes visible in the Patient list
            var aCurrentAttributes = [];

            for (var j = 0; j < aConfigAttributes.length; j++) {
                var newAttribute = new MriConfigAttribute(
                    aConfigAttributes[j].path, aConfigAttributes[j].obj, aConfigInteractions[i].path);

                this._aAttributes.push(newAttribute);
                this._mAttributes[aConfigAttributes[j].path] = newAttribute;
                aCurrentAttributes.push(newAttribute);

                // only add visible attributes to the patientList
                if (aConfigAttributes[j].obj.patientlist && aConfigAttributes[j].obj.patientlist.visible) {
                    aPatientListAttributes.push(newAttribute);
                }
            }

            if (isFilterCardVisible) {
                var newFilterCard = new MriConfigFilterCard(
                    aConfigInteractions[i].path, aConfigInteractions[i].obj, aCurrentAttributes);

                this._aFilterCards.push(newFilterCard);

                this._mFilterCards[aConfigInteractions[i].path] = newFilterCard;
            }

            this._oPatientListConfig.addInteractionAttributes(aConfigInteractions[i].path, aConfigInteractions[i].obj, aPatientListAttributes);
        }

        // sort the filter cards by the order
        this._aFilterCards.sort(function (f1, f2) {
            return f1.getOrder() - f2.getOrder();
        });

        this.getUnmodified = function () {
            return this._internalConfig;
        };

        this.getConfigMetadata = function () {
            return {
                configId: this.getPaConfigId(),
                configVersion: this.getPaConfigVersion()
            };
        };

        /**
         * Add the config metadata required for most MRI PA requests and stringify the result
         * @param   {object} mData Object containing data for the request
         * @returns {string} Stringified version of the object with added config metadata.
         */
        this.addConfigMetadata = function (mData) {
            mData.configData = this.getConfigMetadata();
            return JSON.stringify(mData);
        };

        this.getVersion = function () {
            return this._configMetadata.dependentConfig.configVersion;
        };

        this.getDatamodelConfigId = function () {
            return this._configMetadata.dependentConfig.configId;
        };

        this.getPaConfigId = function () {
            return this._configMetadata.configId;
        };

        this.getPaConfigVersion = function () {
            return this._configMetadata.configVersion;
        };

        this.getBasicDataFilterCard = function () {
            return this._mFilterCards.patient;
        };

        this.getFilterCards = function () {
            return this._aFilterCards;
        };

        this.getPatientListConfig = function () {
            return this._oPatientListConfig;
        };

        this.walkJsonPath = function (sPattern) {
            return this._oJsonWalk(sPattern);
        };

        this.getFilterCardByPath = function (sPath) {
            return this._mFilterCards[sPath];
        };

        this.getPageTitle = function () {
            return this._internalConfig.pageTitle;
        };

        this.getChartOptions = function (sChartType) {
            return this._internalConfig.chartOptions[sChartType];
        };

        /**
         * Returns the details of certain panel eg visible, enabled etc
         * @param   {string} sPanelType Type of panel eg any filter panel or all filter panel
         * @returns {Object} Object of panel config
         */
        this.getPanelOptions = function (sPanelType) {
            return this._internalConfig.panelOptions[sPanelType];
        };
        this.getAttributeByPath = function (sPath) {
            // make it also work for instance of interactions, like [...].interactions.priDiag.1.attributes.[...]
            return this._mAttributes[this.getGenericPath(sPath)];
        };

        /**
         * Given a full attribute path, returns the part of the path before the .attributes part (i.e. for a
         * interaction instance, the instance number will be part of the path e.g.: "patient.interactions.priDiag.1")
         * @param   {string} sPath Full attribute path
         * @returns {string} Interaction path
         */
        this.getInteractionInstancePath = function (sPath) {
            var aParts = /(.*)?\.attributes\.(.*)/.exec(sPath);
            return aParts[1];
        };

        /**
         * Given a particular path in the filter object, get the generic config path by removing the .<instance_number> parts of the path
         * @param   {string} sPath Full attribute path
         * @returns {string} Full generic path
         */
        this.getGenericPath = function (sPath) {
            var genericPath = sPath.replace(/\.\d+\./g, ".");

            // covers where the instance number is at the end of the string e.g. [..].priDiag.1
            genericPath = genericPath.replace(/\.\d+$/g, "");
            return genericPath;
        };

        /**
         * Given a full attribute path in the filter object, returns the attribute key only, i.e. the part after ".attributes."
         * @param   {string} sPath Full attribute path
         * @returns {string} Local attribute key
         */
        this.getAttributeKeyFromPath = function (sPath) {
            var aParts = /(.*)?\.attributes\.(.*)/.exec(sPath);
            return aParts[2];
        };

        this.isValidFilterCardAttribute = function (sPath) {
            var aParts = /(.*?attributes\.)(.*)/.exec(sPath);
            var sAttrKey = aParts[2];

            if (sAttrKey === "_succ" || sAttrKey === "_absTime" || sAttrKey === "_parentInteraction") {
                return true;
            }
            // make it also work for instance of interactions, like [...].interactions.priDiag.1.attributes.[...]
            var genericPath = this.getGenericPath(sPath);
            return this._mAttributes[genericPath] && this._mAttributes[genericPath].isVisibleInFilterCard();
        };

        /**
         * Checks validity of an annotated configuration path
         * @param   {string}      sPath  Full attribute path
         * @returns {boolean}     True for valid annotated path
         */
        this.isValidFilterCardAnnotatedAttribute = function (sPath) {
            var aParts = /(.*?attributes\.)(.*)/.exec(sPath);
            var sAttrKey = aParts[2];

            if (sAttrKey === "_succ" || sAttrKey === "_absTime" || sAttrKey === "_parentInteraction") {
                return true;
            }

            var attribute = this.getAttributeByAnnotatedPath(sPath);

            return attribute.length === 1;
        };

        this.isChartVisible = function (chartType) {
            if (this._internalConfig.chartOptions[chartType]) {
                return this._internalConfig.chartOptions[chartType].visible;
            }
            return false;
        };

        this.isChartCollectionEnabled = function (chartType) {
            // Availability of Collection feature
            return this._internalConfig.chartOptions[chartType].collectionEnabled === true;
        };

        this.isChartDownloadEnabled = function (chartType) {
            // Availability of Data download
            return this._internalConfig.chartOptions[chartType].downloadEnabled === true;
        };

        this.isChartPDFDownloadEnabled = function (chartType) {
            // Availability of PDF Data download
            return this._internalConfig.chartOptions[chartType].pdfDownloadEnabled === true;
        };

        this.getInitialChart = function () {
            return this._internalConfig.chartOptions.initialChart;
        };

        this.isMatchAnyFilterEnabled = function () {
            //  Availability of Match Any Filtercard feature
            return this._internalConfig.panelOptions.afp.visible === true;
        };

        this.isAdvancedTimeFilteringEnabled = function () {
            //  Availability of Advanced Time Filtering feature
            return this._internalConfig.panelOptions.advancedTimeFiltering.useNextInteraction === true;
        };

        this.isAbsoluteTimeFilteringEnabled = function () {
            //  Availability of Absolute Time Filtering feature
            if (this._internalConfig.panelOptions && this._internalConfig.panelOptions.absoluteTimeFiltering) {
                return this._internalConfig.panelOptions.absoluteTimeFiltering.absoluteTimeEnabled === true;
            }
            return true;
        };

        this.isNoValueTextCustomized = function () {
            //  Using Customized No Value Text
            if (this._internalConfig.panelOptions && this._internalConfig.panelOptions.noValueText) {
                return this._internalConfig.panelOptions.noValueText.customizedNoValueText === true;
            }
            return false;
        };


        /**
         * Returns an array containing the paths to the filter cards that contains at least an attribute with a specific annotation.
         * If no such a FC is found, an empty array is returned.
         * @param   {string}   sAnnotation Annotation name
         * @returns {string[]} List of paths
         */
        this.getInterHavingAttrAnnotation = function (sAnnotation) {
            var paths = [];
            this.getFilterCards().forEach(
                function (inter) {
                    if (inter.hasAnnotation(sAnnotation)) {
                        paths.push(inter.getConfigPath());
                    }
                }
            );
            return paths;
        };

        /**
         * Returns an array containing Annotations of an attribute
         * @param   {sPath}     sPath Configuration path of the attribute
         * @returns {string[]}  List of annotations
         */
        this.getAnnotationByPath = function (sPath) {
            var attr = this.getAttributeByPath(sPath);
            if (attr) {
                return attr.getAnnotations();
            }
        };

        /**
         * Retrieves an array of attributes that has annotated config path sPath.
         * Ideally the array should have a length of 1.
         * @param   {string}    sPath Configuration path of the attribute
         * @returns {string[]}  List of attributes
         */
        this.getAttributeByAnnotatedPath = function (sPath) {
            var attribute = [];
            this.getFilterCards().forEach(
                function (inter) {
                    attribute = attribute.concat(inter.getAttributesWithAnnotation(sPath.split(".").pop()));
                }
            );
            return attribute;
        };

        /**
         * Get the config path from a MRI path-ID. This is a temporary solution until we completely decouple the
         * MRI path/IDs from the config path.
         * @param   {string} sMriPath The path in the MRI Filter Object
         * @returns {string} The config path corresponding to the attribute or the instance.
         * @name sap.hc.mri.pa.ui.lib.MriFrontendConfig.convertInternalPathToConfigPath
         */
        this.convertInternalPathToConfigPath = function (sMriPath) {
            var sConfiPath = sMriPath;
            if (sMriPath.substring(0, 4) === "all.") {
                sConfiPath = sConfiPath.replace("all.", "");
            }
            if (sMriPath.substring(0, 4) === "any.") {
                sConfiPath = sConfiPath.replace("any.", "");
            }

            return sConfiPath;
        };

        /**
         * Get the initial IFR from the configuration.
         * @returns {sap.hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.Filter} IFR Filter
         * @name sap.hc.mri.pa.ui.lib.MriFrontendConfig.getInitialIFR
         */
        this.getInitialIFR = function () {
            var aIFRFilterCards = this._aFilterCards.filter(function (oFilterCardConfig) {
                return oFilterCardConfig.isInitial();
            }).map(function (oFilterCardConfig) {
                var sInstanceId = oFilterCardConfig.getConfigPath() + (oFilterCardConfig.isBasicData() ? "" : ".1");
                var aIFRAttributes = oFilterCardConfig.getAllAttributes().filter(function (oAttributeConfig) {
                    return oAttributeConfig.isInitialInFilterCard();
                }).map(function (oAttributeConfig) {
                    return new InternalFilterRepresentation.Attribute({
                        configPath: oAttributeConfig.getConfigPath(),
                        constraints: new BooleanContainers.Empty(),
                        instanceID: sInstanceId + ".attributes." + oAttributeConfig.getConfigKey()
                    });
                });
                return new InternalFilterRepresentation.FilterCard({
                    attributes: new BooleanContainers.And(aIFRAttributes),
                    configPath: oFilterCardConfig.getConfigPath(),
                    instanceID: sInstanceId,
                    instanceNumber: 1,
                    name: ""
                });
            });

            return this._getIFRWithFiltersInAllPart(aIFRFilterCards);
        };

        /**
         * Internal function building a base IFR, opt.
         * @private
         * @param   {sap.hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.FilterCard[]} andFilterCards Array of FilterCards to be put into the ALL part.
         * @returns {sap.hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.Filter} IFR Filter
         * @name sap.hc.mri.pa.ui.lib.MriFrontendConfig.getEmptyIFR
         */
        this._getIFRWithFiltersInAllPart = function (andFilterCards) {
            andFilterCards = andFilterCards || [];

            return new InternalFilterRepresentation.Filter({
                configMetadata: new InternalFilterRepresentation.ConfigMetadata(
                    this.getPaConfigVersion(),
                    this.getPaConfigId()
                ),
                cards: new BooleanContainers.And([
                    new BooleanContainers.And(andFilterCards),
                    new BooleanContainers.Or([])
                ])
            });
        };

        this.getTranslationList = function () {
            return this._aAttributes.map(function (attribute) {
                return Utils.getText('MRI_PA_NO_VALUE_CUSTOM', attribute._oInternalConfigAttribute.name);
            });
        };

        /**
         * Transform all values within an object according to the translation
         * @param   {Object} Object to be translated
         * @returns {Object} The same object with all values within it translated
         */
        this.translate = function (obj) {
            var k;
            for (k in obj) {
                if (obj.hasOwnProperty(k)) {
                    switch (typeof obj[k]) {
                        case "object":
                            if (obj[k] instanceof Array) {
                                obj[k] = this._translate(obj[k], k);
                            } else {
                                this.translate(obj[k]);
                            }
                            break;
                        case "string":
                            obj[k] = this._translate(obj[k], k);
                            break;
                        default:
                            break;
                    }
                }
            }
            return obj;
        };

        this._translate = function (str, key) {
            var attribute = this.getAttributeByPath(key);
            if (str === 'NoValue') {
                if (this.isNoValueTextCustomized()) {
                    return Utils.getText('MRI_PA_NO_VALUE_CUSTOM', attribute._oInternalConfigAttribute.name);
                } else {
                    return Utils.getText('MRI_PA_NO_VALUE');
                }
            } else {
                return str;
            }
        };

        /**
         * Perform a reverse translation within an object according to the translation
         *  @param   {Object} Object to be translated
         *  @returns {Object} The same object with all values within it translated
        */
        this.reverseTranslate = function (obj, list) {
            var k;
            if (!list) {
                list = this.getTranslationList();
            }
            for (k in obj) {
                if (obj.hasOwnProperty(k)) {
                    switch (typeof obj[k]) {
                        case "object":
                            this.reverseTranslate(obj[k], list);
                            break;
                        case "string":
                            obj[k] = this._reverseTranslate(obj[k], list);
                            break;
                        default:
                            break;
                    }
                }
            }
            return obj;
        };

        this._reverseTranslate = function (str, list) {
            if (list.indexOf(str) > -1 || str === Utils.getText('MRI_PA_NO_VALUE')) {
                return 'NoValue';
            } else {
                return str;
            }
        };

        this.getInitialAxisSelection = function () {
            var result = [
                sap.hc.mri.pa.ui.lib.Selection.Invalid,
                sap.hc.mri.pa.ui.lib.Selection.Invalid,
                sap.hc.mri.pa.ui.lib.Selection.Invalid,
                sap.hc.mri.pa.ui.lib.Selection.Invalid,
                sap.hc.mri.pa.ui.lib.Selection.Invalid,
                sap.hc.mri.pa.ui.lib.Selection.Invalid
            ];
            this._aFilterCards.forEach(function (oneFilterCardConfig) {
                if (oneFilterCardConfig.isInitial()) {
                    oneFilterCardConfig.getAllAttributes().forEach(function (oneConfigAttribute) {
                        var measuresInitialIndex = this._internalConfig.chartOptions.initialAttributes.measures.indexOf(oneConfigAttribute.getConfigPath());
                        var categoriesInitialIndex = this._internalConfig.chartOptions.initialAttributes.categories.indexOf(oneConfigAttribute.getConfigPath());
                        if (oneConfigAttribute.isInitialInFilterCard() || measuresInitialIndex !== -1 || categoriesInitialIndex !== -1) {
                            var instancePath = oneFilterCardConfig.getConfigPath() + (oneFilterCardConfig.isBasicData() ? "" : ".1") + ".attributes." + oneConfigAttribute.getConfigKey();

                            if (measuresInitialIndex >= 0) {
                                result[4 + measuresInitialIndex] = instancePath;
                            }

                            if (categoriesInitialIndex >= 0) {
                                result[categoriesInitialIndex] = instancePath;
                            }
                        }
                    }, this);
                }
            }, this);
            return result;
        };
    }

    MriFrontendConfig.createFrontendConfig = function (mConfig) {
        _instance = new MriFrontendConfig(mConfig);
    };

    MriFrontendConfig.hasFrontendConfig = function () {
        return Boolean(_instance);
    };

    MriFrontendConfig.getFrontendConfig = function () {
        if (!_instance) {
            var sMessage = "FrontendConfig has to be created before usage";
            var sComponent = "MriFrontendConfig.getFrontendConfig";
            jQuery.sap.log.error(sMessage, null, sComponent);
        }
        return _instance;
    };

    return MriFrontendConfig;
}, true);
