sap.ui.define([
    "jquery.sap.global",
    "./BackendLinker"
], function (jQuery, BackendLinker) {
    "use strict";

    /**
     * Handles the upgrade of the underlaying CDW config by applying as many as possible settings from the previous
     * version.
     * @namespace
     * @alias hc.hph.patient.config.ui.lib.ConfigUpgrade
     */
    var ConfigUpgrade = {};

    /**
     * @constant {string[]} LANE_PROPERTIES List of lane properties.
     * @name hc.hph.patient.config.ui.lib.ConfigUpgrade.LANE_PROPERTIES
     */
    ConfigUpgrade.LANE_PROPERTIES = [
        "laneId",
        "color",
        "initiallyFiltered",
        "laneType",
        "order",
        "tilesHidden",
        "visible"
    ];

    /**
     * @constant {string[]} INTERACTION_PROPERTIES List of interaction properties.
     * @name hc.hph.patient.config.ui.lib.ConfigUpgrade.INTERACTION_PROPERTIES
     */
    ConfigUpgrade.INTERACTION_PROPERTIES = [
        "plotGeneratedAttr",
        "allowedPlottableAttr",
        "visible"
    ];

    /**
     * @constant {string[]} ATTRIBUTE_PROPERTIES List of attribute properties.
     * @name hc.hph.patient.config.ui.lib.ConfigUpgrade.ATTRIBUTE_PROPERTIES
     */
    ConfigUpgrade.ATTRIBUTE_PROPERTIES = [
        "firstTileAttribute",
        "formatter",
        "order",
        "secondTileAttribute",
        "visible"
    ];

    /**
     * @constant {string[]} TIMELINE_ZOOM_PROPERTIES List of timeline zoom properties.
     * @name hc.hph.patient.config.ui.lib.ConfigUpgrade.TIMELINE_ZOOM_PROPERTIES
     */
    ConfigUpgrade.TIMELINE_ZOOM_PROPERTIES = [
        "initialZoom",
        "leftZoom",
        "middleZoom",
        "rightZoom"
    ];

    /**
     * Copy a property (and value) from a source object to a target object.
     * @param {object} mTarget   Target object
     * @param {object} mSource   Source object
     * @param {string} sProperty Object property name
     */
    ConfigUpgrade.applyProperty = function (mTarget, mSource, sProperty) {
        if (typeof mSource[sProperty] !== "undefined") {
            mTarget[sProperty] = mSource[sProperty];
        }
    };

    /**
     * Copy each of the {@link hc.hph.patient.config.ui.lib.ConfigUpgrade.ATTRIBUTE_PROPERTIES ATTRIBUTE_PROPERTIES}
     * from a source object to a target object.
     * @param {object} mTarget Target object
     * @param {object} mSource Source object
     */
    ConfigUpgrade.applyAttributeSettings = function (mTarget, mSource) {
        this.ATTRIBUTE_PROPERTIES.forEach(function (sProperty) {
            this.applyProperty(mTarget, mSource, sProperty);
        }, this);
        if (mTarget.numerical) {
            // if the attribute has been numerical in the previous version, then keep the setting
            mTarget.plottable = mSource.numerical ? mSource.plottable : mTarget.plottable;
        }
    };

    /**
     * Sort the attributes in target interaction according to sorting order of source interaction.
     * Attributes which are only present in target interaction are sorted to the back.
     * @param {object} mTargetInteraction Target interaction object
     * @param {object} mSourceInteraction Source interaction object
     */
    ConfigUpgrade.applyInteractionAttributeOrder = function (mTargetInteraction, mSourceInteraction) {
        // create array of target attributes in the order of their corresponding source attributes
        var aSortedTargetAttributes = [];
        mSourceInteraction.attributes.forEach(function (mSourceAttribute) {
            for (var i = 0; i < mTargetInteraction.attributes.length; i++) {
                var mTargetAttribute = mTargetInteraction.attributes[i];
                if (mTargetAttribute.source === mSourceAttribute.source) {
                    // add target attribute to sorted target attributes
                    aSortedTargetAttributes.push(mTargetAttribute);
                    // remove from target
                    mTargetInteraction.attributes.splice(i, 1);
                    // stop
                    break;
                }
            }
        }, this);

        // add remaining target attributes (those without corresponding source attribute) at the back
        aSortedTargetAttributes = aSortedTargetAttributes.concat(mTargetInteraction.attributes);

        // save order in order property
        aSortedTargetAttributes.forEach(function (mAttribute, index) {
            mAttribute.order = index;
        });

        // assign sorted attributes to target interaction
        mTargetInteraction.attributes = aSortedTargetAttributes;
    };

    /**
     * Copy each of the {@link hc.hph.patient.config.ui.lib.ConfigUpgrade.INTERACTION_PROPERTIES INTERACTION_PROPERTIES}
     * as well as their attributes from a source object to a target object.
     * @param {object} mTargetInteraction Target interaction object
     * @param {object} mSourceInteraction Source interaction object
     */
    ConfigUpgrade.applyInteractionSettings = function (mTargetInteraction, mSourceInteraction) {
        this.INTERACTION_PROPERTIES.forEach(function (sProperty) {
            this.applyProperty(mTargetInteraction, mSourceInteraction, sProperty);
        }, this);
        mSourceInteraction.attributes.forEach(function (mSourceAttribute) {
            mTargetInteraction.attributes.forEach(function (mTargetAttribute) {
                if (mTargetAttribute.source === mSourceAttribute.source) {
                    this.applyAttributeSettings(mTargetAttribute, mSourceAttribute);
                }
            }, this);
        }, this);
    };

    /**
     * Copy the settings from the source lane object to the target lane object.
     * @param {object} mTargetLane Target lane object
     * @param {object} mSourceLane Source lane object
     */
    ConfigUpgrade.applyLaneSettings = function (mTargetLane, mSourceLane) {
        mSourceLane.title.forEach(function (mSourceLaneTitle) {
            mTargetLane.title.forEach(function (mTargetLaneTitle) {
                if (mTargetLaneTitle.lang === mSourceLaneTitle.lang) {
                    mTargetLaneTitle.value = mSourceLaneTitle.value;
                }
            });
        });
        mSourceLane.interactions.forEach(function (mSourceLaneInteraction) {
            mTargetLane.interactions.forEach(function (mTargetLaneInteraction) {
                if (mTargetLaneInteraction.source === mSourceLaneInteraction.source) {
                    this.applyInteractionSettings(mTargetLaneInteraction, mSourceLaneInteraction);
                    this.applyInteractionAttributeOrder(mTargetLaneInteraction, mSourceLaneInteraction);
                }
            }, this);
        }, this);
        this.LANE_PROPERTIES.forEach(function (sProperty) {
            this.applyProperty(mTargetLane, mSourceLane, sProperty);
        }, this);
    };

    /**
     * Copy the lanes from the source object to the target object.
     * @param {object} mTargetConfig   Target configuration object
     * @param {object} mSourceConfig   Source configuration object
     * @param {object} mConfigTemplate Configuration template
     */
    ConfigUpgrade.addLanes = function (mTargetConfig, mSourceConfig, mConfigTemplate) {
        mSourceConfig.lanes.forEach(function (mSourceLane) {
            mTargetConfig.lanes.push(JSON.parse(JSON.stringify(mConfigTemplate.laneTemplate)));
            var mTargetLane = mTargetConfig.lanes[mTargetConfig.lanes.length - 1];
            this.applyLaneSettings(mTargetLane, mSourceLane);
        }, this);
    };

    /**
     * Copy the titles from the source object to the target object.
     * @param {object[]} aTargetTitles Target titles
     * @param {object[]} aSourceTitles Source title
     * @param {object}   mTemplate     Configuration template
     */
    ConfigUpgrade.addHeaderTitle = function (aTargetTitles, aSourceTitles, mTemplate) {
        aSourceTitles.forEach(function (mSourceTitle) {
            if (typeof mSourceTitle.pattern !== "undefined") {
                aTargetTitles[aTargetTitles.length - 1].pattern = mSourceTitle.pattern;
            }
            mSourceTitle.values.forEach(function (sValue) {
                if (mTemplate.masterdataAttributes && mTemplate.masterdataAttributes.hasOwnProperty(sValue)) {
                    aTargetTitles[aTargetTitles.length - 1].values.push(sValue);
                }
            });
        });
    };

    /**
     * Copy the headerDetails from the source object to the target object.
     * @param {object[]} aTargetDetails Target headerDetails
     * @param {object[]} aSourceDetails Source headerDetails
     * @param {object}   mTemplate      Configuration template
     */
    ConfigUpgrade.addHeaderDetails = function (aTargetDetails, aSourceDetails, mTemplate) {
        aSourceDetails.forEach(function (mSourceDetail) {
            aTargetDetails.push({
                pattern: "",
                values: []
            });
            if (typeof mSourceDetail.pattern !== "undefined") {
                aTargetDetails[aTargetDetails.length - 1].pattern = mSourceDetail.pattern;
            }
            mSourceDetail.values.forEach(function (value) {
                if (mTemplate.masterdataAttributes && mTemplate.masterdataAttributes.hasOwnProperty(value)) {
                    aTargetDetails[aTargetDetails.length - 1].values.push(value);
                }
            });
        });
    };

    /**
     * Copy the configInformation from the source object to the target object.
     * @param {object} mTargetConfigInformations Target configInformation object
     * @param {object} mSourceConfigInformations Source configInformation object
     */
    ConfigUpgrade.addConfigInformations = function (mTargetConfigInformations, mSourceConfigInformations) {
        if (typeof mSourceConfigInformations.note !== "undefined") {
            mTargetConfigInformations.note = mSourceConfigInformations.note;
        }
    };

    /**
     * Copy the inpectorOptions from the source object to the target object, incl.
     * each of the {@link hc.hph.patient.config.ui.lib.ConfigUpgrade.TIMELINE_ZOOM_PROPERTIES TIMELINE_ZOOM_PROPERTIES}.
     * @param {object} mTargetInspectorOptions Target inpectorOptions object
     * @param {object} mSourceInspectorOptions Source inspectorOptions object
     */
    ConfigUpgrade.addInspectorOptions = function (mTargetInspectorOptions, mSourceInspectorOptions) {
        if (typeof mSourceInspectorOptions === "object") {
            if (typeof mSourceInspectorOptions.overview === "object") {
                if (typeof mSourceInspectorOptions.overview.visible !== "undefined") {
                    mTargetInspectorOptions.overview.visible = mSourceInspectorOptions.overview.visible;
                }
            }
            if (typeof mSourceInspectorOptions.timeline === "object") {
                if (typeof mSourceInspectorOptions.timeline.zoom === "object") {
                    this.TIMELINE_ZOOM_PROPERTIES.forEach(function (sProperty) {
                        this.applyProperty(mTargetInspectorOptions.timeline.zoom, mSourceInspectorOptions.timeline.zoom, sProperty);
                    }, this);
                }
            }
            if (Array.isArray(mSourceInspectorOptions.tabExtensions)) {
                mTargetInspectorOptions.tabExtensions = mSourceInspectorOptions.tabExtensions;
            }
            if (Array.isArray(mSourceInspectorOptions.widgetExtensions)) {
                mTargetInspectorOptions.widgetExtensions = mSourceInspectorOptions.widgetExtensions;
            }
        }
    };

    /**
     * Apply the source configuration and the configuration template to the target configuration in place.
     * @param {object} mTargetConfig   Target configuration object
     * @param {object} mSourceConfig   Source configuration object
     * @param {object} mConfigTemplate Configuration template
     */
    ConfigUpgrade.applySettings = function (mTargetConfig, mSourceConfig, mConfigTemplate) {
        this.addLanes(mTargetConfig, mSourceConfig, mConfigTemplate);
        this.addHeaderTitle(mTargetConfig.masterdata.title, mSourceConfig.masterdata.title, mConfigTemplate);
        this.addHeaderDetails(mTargetConfig.masterdata.details, mSourceConfig.masterdata.details, mConfigTemplate);
        this.addConfigInformations(mTargetConfig.configInformations, mSourceConfig.configInformations);
        this.addInspectorOptions(mTargetConfig.inspectorOptions, mSourceConfig.inspectorOptions);
    };

    /**
     * Upgrade a configuration by applying a source configuration to the configuration template.
     * @param   {object} mSourceConfig   Source configuration object
     * @param   {object} mConfigTemplate Configuration template
     * @returns {object} Upgraded configuration
     */
    ConfigUpgrade.upgradeConfig = function (mSourceConfig, mConfigTemplate) {
        var mTargetConfig = BackendLinker.getEmptyConfig();
        this.applySettings(mTargetConfig, mSourceConfig, mConfigTemplate);
        return mTargetConfig;
    };

    return ConfigUpgrade;
});
