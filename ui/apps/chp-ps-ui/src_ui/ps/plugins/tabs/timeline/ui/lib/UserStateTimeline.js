sap.ui.define([], function () {
    "use strict";

    var UserStateTimeline = {};

    /** @constant {boolean} Default value for lane.minimized field. */
    UserStateTimeline.LANE_MINIMIZED_DEFAULT_VALUE = false;

    /** @constant {array} Default value for lane.subLanes field. */
    UserStateTimeline.LANE_SUBLANES_DEFAULT_VALUE = [];

    /** @constant {boolean} Default value for lane.visible field. */
    UserStateTimeline.LANE_VISIBLE_DEFAULT_VALUE = false;

    /** @constant {number} Default value for lane.rank field. Lanes are sorted to the front by default */
    UserStateTimeline.LANE_RANK_DEFAULT_VALUE = -1;

    /** @constant {string[]} Required properties/fields for valid lane states. */
    UserStateTimeline.LANE_REQUIRED_PROPERTIES = ["laneId"];

    /** @constant {string[]} Primitive (non-object, non-array) properties/fields for lane states. */
    UserStateTimeline.LANE_PRIMITIVE_PROPERTIES = ["laneId", "minimized", "rank", "visible"];

    /** @constant {string} Default value for sublane.laneType field. */
    UserStateTimeline.SUBLANE_LANETYPE_DEFAULT_VALUE = "ChartLane";

    /** @constant {string[]} Valid values for sublane.laneType field. */
    UserStateTimeline.SUBLANE_LANETYPE_VALID_VALUES = ["ChartLane"];

    /** @constant {sap.hc.hph.patient.app.ui.lib.timeline.ChartMode} Default value for sublane.mode field. */
    UserStateTimeline.SUBLANE_MODE_DEFAULT_VALUE = sap.hc.hph.patient.app.ui.lib.timeline.ChartMode.Line;

    /** @constant {sap.hc.hph.patient.app.ui.lib.timeline.ChartMode[]} Valid values for sublane.mode field. */
    UserStateTimeline.SUBLANE_MODE_VALID_VALUES = [sap.hc.hph.patient.app.ui.lib.timeline.ChartMode.Dot, sap.hc.hph.patient.app.ui.lib.timeline.ChartMode.Line];

    /** @constant {array} Default value for lane.subLanes field. */
    UserStateTimeline.SUBLANE_PLOTTABLE_ATTRIBUTES_DEFAULT_VALUE = [];

    /** @constant {string[]} Required properties/fields for valid sublane states. */
    UserStateTimeline.SUBLANE_REQUIRED_PROPERTIES = ["interactionId", "valueColumn"];

    /** @constant {string[]} Primitive (non-object, non-array) properties/fields for lane states. */
    UserStateTimeline.SUBLANE_PRIMITIVE_PROPERTIES = ["laneType", "mode", "color", "interactionId", "valueColumn"];

    /**
     * Checks whether the given sublane object from user state matches any of the given attributes defined for an interaction of the parent lane.
     *
     * A sublane matches an attribute if all of the following hold:
     *      1. the attribute is visible
     *      2. the attribute is plottable
     *      3. attribute.id == sublane.valueColumn
     *
     * @param {object[]}    aAttributes     the array of attributes which are defined for interaction of the parent lane
     * @param {object}      oStateSublane   the sublane object from user state which we try to match to the attributes
     * @returns {object[]}                  the array of matching attributes
     */
    UserStateTimeline._findSublaneAttributeMatches = function (aAttributes, oStateSublane) {
        var aMatchingAttributes = [];

        if (aAttributes && Array.isArray(aAttributes)) {
            aMatchingAttributes = aAttributes.filter(function (oAttribute) {
                return oAttribute &&
                    oAttribute.visible &&
                    oAttribute.plottable &&
                    oAttribute.hasOwnProperty("name") && // needed because we will later derive sublane.title from it
                    oAttribute.hasOwnProperty("id") &&
                    oAttribute.id === oStateSublane.valueColumn;
            });
        }

        return aMatchingAttributes;
    };

    /**
     * Checks whether the given sublane object from user state matches any of the given interactions defined for the parent lane.
     *
     * A sublane matches an interaction if all of the following apply:
     *      1. the interaction is not a grouped interaction
     *      2. interaction.source == sublane.interactionId
     *      3. the interactions has a matching attribute (@see UserStateTimeline._findSublaneAttributeMatches)
     *
     * @param {object[]}    aInteractions   the array of interactions which are defined for the parent lane
     * @param {object}      oStateSublane   the sublane object from user state which we try to match to interactions from parent lane
     * @returns {object[]}                  the array of matching interactions
     */
    UserStateTimeline._findSublaneInteractionMatches = function (aInteractions, oStateSublane) {
        var aMatchingInteractions = [];

        if (aInteractions && Array.isArray(aInteractions)) {
            aMatchingInteractions = aInteractions.filter(function (oInteraction) {
                return oInteraction &&
                    !(oInteraction.hasOwnProperty("allowUndefinedAttributes") && oInteraction.allowUndefinedAttributes) &&
                    oInteraction.hasOwnProperty("name") && // needed because we will later derive sublane.interactionName from it
                    oInteraction.hasOwnProperty("source") &&
                    oInteraction.source === oStateSublane.interactionId &&
                    oInteraction.hasOwnProperty("attributes") &&
                    this._findSublaneAttributeMatches(oInteraction.attributes, oStateSublane).length > 0;
            }, this);
        }

        return aMatchingInteractions;
    };

    /**
     * Returns a sublane parser function based on the given lane object from application runtime.
     *
     * The returned function expects a validated sublane from user state and returns a sublane for the application runtime data model.
     * The parsing logic is implemented in-place, i.e., the input object is only modified where needed, and output and input objects are the same.
     *
     * @argument {object}   oLane   the lane object from application runtime
     * @returns {function}          the sublane parser function
     */
    UserStateTimeline._getSingleStateSublaneParser = function (oLane) {
        var that = this;
        return function (oStateSublane) {
            // use sublane as provided from state, but check and potentially overwrite the following properties
            // - interactionId: use value interactionId from state (required property, it has already been validated)
            // - valueColumn: use value valueColumn from state (required property, it has already been validated)
            // - laneType: use value laneType from state if valid, otherwise default
            if (!(oStateSublane.hasOwnProperty("laneType") && that.SUBLANE_LANETYPE_VALID_VALUES.indexOf(oStateSublane.laneType) > -1)) {
                oStateSublane.laneType = that.SUBLANE_LANETYPE_DEFAULT_VALUE;
            }
            // - mode: use value mode from state if valid, otherwise default
            if (!(oStateSublane.hasOwnProperty("mode") && that.SUBLANE_MODE_VALID_VALUES.indexOf(oStateSublane.mode) > -1)) {
                oStateSublane.mode = that.SUBLANE_MODE_DEFAULT_VALUE;
            }
            // - color: use value color from lane config/app runtime! (in order to adapt to changes in configured color)
            if (oLane.hasOwnProperty("color")) {
                oStateSublane.color = oLane.color;
            }
            // - interactionName: use value from matching interaction in lane config/app runtime! (in order to adapt to changes in interaction names; we are matching interactions via interaction.source only)
            // - title: use value name from matching attribute in lane config/app runtime! (in order to adapt to changes in attribute names; we are matching attributes via attribute.id only)
            var aMatchingInteractions = that._findSublaneInteractionMatches(oLane.interactions, oStateSublane);
            var aMatchingAttributes = that._findSublaneAttributeMatches(aMatchingInteractions[0].attributes, oStateSublane);
            // there will always be at least one matching interaction and attribute, because validation (_getSingleStateSublaneValidator) has already checked for their existence
            oStateSublane.interactionName = aMatchingInteractions[0].name;
            oStateSublane.title = aMatchingAttributes[0].name;
            // - plottableAttributes: always use default ([])
            oStateSublane.plottableAttributes = that.SUBLANE_PLOTTABLE_ATTRIBUTES_DEFAULT_VALUE;

            return oStateSublane;
        };
    };

    /**
     * Returns a sublane validation function which validates a sublane based on the given application runtime lane and according to the following rules:
     *
     * 1. there is an interaction in app runtime lane.interactions for which sublane.interactionId == interaction.source, and
     * 2. there is an attribute in interaction.attributes for which sublane.valueColumn == attribute.id, and
     * 3. attribute.visible and attribute.plottable are true for that interaction
     *
     * @argument {object}   oLane   the lane object from application runtime
     * @returns {function}          the sublane validation function
     */
    UserStateTimeline._getSingleStateSublaneValidator = function (oLane) {
        var that = this;
        return function (oStateSublane) {
            return oLane &&
                oStateSublane &&
                that.SUBLANE_REQUIRED_PROPERTIES.every(hasOwnProperty, oStateSublane) &&
                oLane.hasOwnProperty("interactions") &&
                that._findSublaneInteractionMatches(oLane.interactions, oStateSublane).length > 0;
        };
    };

    /**
     * Returns a sublanes parser function which parses an array of sublanes from user state based on the given lane object from application runtime.
     *
     * @param {object}      oLane   lane object from application runtime that is used to validate and parse sublanes from user state
     * @returns {function}          the sublanes parser function that expects an array of sublanes from user state and returns an
     *                              array of parsed sublanes that can be assigned to application runtime
     */
    UserStateTimeline._getStateSublanesParser = function (oLane) {
        var that = this;
        var fSublaneValidator = this._getSingleStateSublaneValidator(oLane);
        var fSublaneParser = this._getSingleStateSublaneParser(oLane);
        return function (aStateSublanes) {
            if (Array.isArray(aStateSublanes)) {
                return aStateSublanes
                    .filter(fSublaneValidator, that)
                    .map(fSublaneParser, that);
            } else {
                return that.LANE_SUBLANES_DEFAULT_VALUE;
            }
        };
    };


    /**
     * Assigns a property from user state or default values to lane objects (application runtime).
     *
     * It implements the following logic:
     *      1. User State
     *      2. Application Runtime / Config
     *      3. Default Value
     *
     * @param {object}      oLane               the lane object from application runtime which settings are applied to
     * @param {object}      oStateLane          the lane object from user state which settings are taken from
     * @param {string}      sProperty           the property to assign
     * @param {function}    fParseStateValue    a function to parse the value from user state
     * @param {any}         defaultValue        the default value to assign
     */
    UserStateTimeline._applyStateConfigDefaultPriority = function (oLane, oStateLane, sProperty, fParseStateValue, defaultValue) {
        if (oStateLane.hasOwnProperty(sProperty)) {
            oLane[sProperty] = fParseStateValue(oStateLane[sProperty]);
        } else if (!oLane.hasOwnProperty(sProperty)) {
            oLane[sProperty] = defaultValue;
        }
    };


    /**
     * Applies settings from the given user state lane object to the given application runtime lane object.
     *
     * Values for properties are assigned according to the following logic:
     *      1. User State
     *      2. Application Runtime / Config
     *      3. Default Value
     *
     * The rank property is always set to default if does not exist in the lane object from user state.
     *
     * @param {object} oLane        the lane object from application runtime which settings are applied to
     * @param {object} oStateLane   the lane object from user state which settings are taken from
     */
    UserStateTimeline._applyStateToLane = function (oLane, oStateLane) {
        // apply rank property which deviates from regular order (it always overwrites lane config)
        if (oStateLane.hasOwnProperty("rank") && !isNaN(parseInt(oStateLane.rank, 10))) {
            oLane.rank = parseInt(oStateLane.rank, 10);
        } else { // always use default rank when rank is missing from state
            oLane.rank = this.LANE_RANK_DEFAULT_VALUE;
        }

        // apply regular properties in order (1. state, 2. app runtime/lane config, 3. default)
        var fSublanesParser = this._getStateSublanesParser(oLane);
        this._applyStateConfigDefaultPriority(oLane, oStateLane, "visible", Boolean, this.LANE_VISIBLE_DEFAULT_VALUE);
        this._applyStateConfigDefaultPriority(oLane, oStateLane, "minimized", Boolean, this.LANE_MINIMIZED_DEFAULT_VALUE);
        this._applyStateConfigDefaultPriority(oLane, oStateLane, "subLanes", fSublanesParser, this.LANE_SUBLANES_DEFAULT_VALUE);
    };


    /**
     * Checks whether a lane object from user state has all required properties (@see UserStateTimeline.LANE_REQUIRED_PROPERTIES).
     *
     * @param   {object}    oStateLane  the lane object from user state
     * @returns {boolean}               true if valid; otherwise false
     */
    UserStateTimeline._isValidStateLane = function (oStateLane) {
        return oStateLane &&
            this.LANE_REQUIRED_PROPERTIES.every(hasOwnProperty, oStateLane);
    };

    /**
     * Returns a lane matching function based on the given lanes from application runtime.
     *
     * The returned function expects two parameters:
     *      1. the lane object (from app runtime) which we want to match
     *      2. an array of lane objects from user state from which we want to find a match
     * The returned function returns an array of matching lane objects from user state.
     *
     * In the regular case (bFallbackToTitleMatching == false), we return a simple matching function based on laneId.
     * In the legacy case, we return a matching function that checks for ambiguity of lane titles and only returns a match if the title is unique in application runtime data.
     *
     * @param   {boolean}   bFallbackToTitleMatching    a boolean flag; true: use legacy matching via lane title; false: use matching via laneId
     * @param   {object[]}  aLanes                      the array of lanes from application runtime
     * @returns {function}                              the lane matching function
     */
    UserStateTimeline._getLaneMatcher = function (bFallbackToTitleMatching, aLanes) {
        if (bFallbackToTitleMatching) {
            // count titles in order to omit lanes with ambiguous titles
            var oTitleCounts = {};
            aLanes.forEach(function (oLane) {
                if (!oTitleCounts.hasOwnProperty(oLane.title)) {
                    oTitleCounts[oLane.title] = 1;
                } else {
                    oTitleCounts[oLane.title] += 1;
                }
            });

            // legacy matching function via lane title
            return function (oLane, oStateLanes) {
                if (oTitleCounts[oLane.title] > 1) {
                    // no matches in case of ambiguous matching
                    return [];
                } else {
                    return oStateLanes.filter(function (oStateLane) {
                        return oStateLane.hasOwnProperty("title") &&
                            oStateLane.title === oLane.title;
                    });
                }
            };
        } else {
            // regular matching function via lane id
            return function (oLane, oStateLanes) {
                return oStateLanes.filter(function (oStateLane) {
                    return oStateLane.laneId === oLane.laneId;
                });
            };
        }
    };


    /**
     * Checks whether currently saved user state supports matching via laneId.
     *
     * @param   {object}    oState  the user state to check
     * @returns {boolean}           true if matching via laneId is not supported
     *                              and legacy matching mode is needed; false otherwise
     */
    UserStateTimeline._isLegacyUserState = function (oState) {
        return !oState.lanes.every(function (oLane) {
            return oLane.hasOwnProperty("laneId");
        });
    };

    /**
     * Checks given user state for existence of lane settings.
     * @param   {object}    oState  the user state to check
     * @returns {boolean}   true if lane settings exist, false otherwise
     */
    UserStateTimeline._stateHasLanes = function (oState) {
        return oState &&
            oState.hasOwnProperty("lanes") &&
            Array.isArray(oState.lanes) &&
            oState.lanes.length > 0;
    };

    /**
     * Loads lane-specific settings from user state (browser's local storage) and applies them to the given lane objects from application runtime.
     *
     *   User State (User-specific settings saved in browser's local storage)                  Application Runtime Data Model (content will match Patient Summary config!)
     *            [                                                                               [
     *                {lane 1 as represented in user state},                                          {lane 1 as represented in runtime data model},
     *                {lane 2 as represented in user state},                      apply               {lane 2 as represented in runtime data model},
     *                ...,                                                        ========>>          ...,
     *                {lane n as represented in user state}                                           {lane n as represented in runtime data model}
     *            ]                                                                               ]
     *
     * For each lane from application runtime, we try to find a matching lane object in the saved user state. Matching is based on the "laneId"
     * property of a lane which was introduced for FP5. Lanes in user state are only considered for matching if they have all required properties
     * (@see UserStateTimeline.LANE_REQUIRED_PROPERTIES). When a matching lane is found, we apply the settings from user state to the lane object from
     * application runtime. Specifically, this is done for all properties in @see UserStateTimeline.LANE_PRIMITIVE_PROPERTIES as well as sublanes. Values
     * for those properties are assigned according to the following logic:
     *      1. User State
     *      2. Application Runtime
     *      3. Default Value
     * That means: If a property is missing from the saved user state, we keep the value from application runtime. If the property is also missing
     * from the application runtime, we make sure the property exists by assigning a default value.
     *
     * The rank property (which defines the display order of lanes) is treated specially. If possible (=matching lane found) we apply the rank value
     * from user state plus an offset (=number of lanes). In all other cases (="new lanes") we apply a rank value that equals the index of the lane as
     * is stored in the config. That means: We use a rank < N (where N=number of lanes) for all new lanes and a rank >= N for all lanes represented in
     * user state. All new lanes are shown at the top in the same order in which they are saved in the config. The new lanes are then followed by the
     * "known lanes" in the same order in which they were saved in the user state.
     *
     * In order to support user states that were saved with a pre-FP5 version, we support a legacy lane matching mode that is based on the "title"
     * property of a lane. In case of ambiguous matches (multiple lanes with same title) we treat lanes as new.
     *
     * The User State settings are loaded per (configId, configVersion, User)-tuple.
     *
     * @param {object}      oState      User state to be applied.
     * @param {object[]}    aLanes      The array of lanes from application runtime to which the lane settings from user state should be applied.
     */
    UserStateTimeline.applyUserStateToLanes = function (oState, aLanes) {
        if (this._stateHasLanes(oState)) {
            // 1. check for fallback matching via lane title
            var bUseLegacyMatching = this._isLegacyUserState(oState);
            var fFindLaneMatches = this._getLaneMatcher(bUseLegacyMatching, aLanes);

            // 2. filter for state lanes with required properties
            var aValidStateLanes = bUseLegacyMatching ?
                oState.lanes :
                oState.lanes.filter(this._isValidStateLane, this);

            // 3. apply state to lanes if matching state exists
            aLanes.forEach(function (oLane, index) {
                var aMatchingStateLanes = fFindLaneMatches(oLane, aValidStateLanes);
                if (aMatchingStateLanes.length === 1) {
                    var oMatchingStateLane = aMatchingStateLanes[0];
                    this._applyStateToLane(oLane, oMatchingStateLane);
                    // offset rank by number of lanes to sort known lanes to the end (additionally offset by +1 for cases where default rank of -1 is applied)
                    oLane.rank += aLanes.length + 1;
                } else {
                    // assing rank based on index in array to sort new lanes (=lanes without match in user state) to the front
                    oLane.rank = index;
                }
            }, this);

            // 3. sort lanes
            aLanes.sort(function comp(a, b) {
                return a.rank - b.rank;
            });

            // 4. re-assign ranks
            aLanes.forEach(function (oLane, index) {
                oLane.rank = index;
            });
        }
    };

    /**
     * Parses a lane's sublane object from application runtime and
     * returns an object that will be saved to user state for this sublane.
     *
     * Only setting properties from @see UserStateTimeline.SUBLANE_PRIMITIVE_PROPERTIES are saved.
     *
     * @param   {object} oSublane   a lane object from application runtime
     * @returns {object}            a lane object that will be saved in user state
     */
    UserStateTimeline._parseSubLane = function (oSublane) {
        var oStateSubLane = {};

        // save primitive values
        this.SUBLANE_PRIMITIVE_PROPERTIES.forEach(function (sProperty) {
            if (oSublane.hasOwnProperty(sProperty)) {
                oStateSubLane[sProperty] = oSublane[sProperty];
            }
        });

        return oStateSubLane;
    };

    /**
     * Returns a sublane validation function that is based on the given parent lane object from application runtime.
     *
     * The sublane validation function returned by this function accepts a sublane object from runtime as input parameter and returns true if the sublane is valid, otherwise false.
     * A sublane is valid if it has all required properties (@see UserStateTimeline.SUBLANE_REQUIRED_PROPERTIES) and if it is valid for the given parent lane object.
     * A sublane is valid for the given parent lane if the interaction attribute referenced by the sublane is regularly defined within the parent lane.
     *
     * @param   {object}    oLane   a lane object from application runtime
     * @returns {function}          the sublane validation function
     */
    UserStateTimeline._getSublaneValidator = function (oLane) {
        var that = this;
        return function (oSublane) {
            return that.SUBLANE_REQUIRED_PROPERTIES.every(hasOwnProperty, oSublane) &&
                oLane.hasOwnProperty("interactions") &&
                // sublane is only valid if matching interactions are found (this excludes grouped interactions)
                that._findSublaneInteractionMatches(oLane.interactions, oSublane).length > 0;
        };
    };

    /**
     * Parses a lane object from application runtime and
     * returns an object that will be saved to user state for this lane.
     *
     * Only setting properties from @see UserStateTimeline.LANE_PRIMITIVE_PROPERTIES
     * and validated sublanes are parsed and saved.
     *
     * @param   {object} oLane  a lane object from application runtime
     * @returns {object}        a lane object that will be saved in user state
     */
    UserStateTimeline._parseLane = function (oLane) {
        var oStateLane = {};

        // save primitive values
        this.LANE_PRIMITIVE_PROPERTIES.forEach(function (sProperty) {
            if (oLane.hasOwnProperty(sProperty)) {
                oStateLane[sProperty] = oLane[sProperty];
            }
        });

        // save sublanes
        var fSublaneValidator = this._getSublaneValidator(oLane);
        if (oLane.hasOwnProperty("subLanes")) {
            oStateLane.subLanes = oLane.subLanes
                .filter(fSublaneValidator, this)
                .map(this._parseSubLane, this);
        }

        return oStateLane;
    };

    /**
     * Checks whether the given lane object from runtime represents a valid object
     * that can successfully be saved to user state. In order to be valid a lane object needs
     * to have all properties as defined in @see UserStateTimeline.LANE_REQUIRED_PROPERTIES.
     *
     * @param   {any}       oLane   the lane object from application runtime
     * @returns {boolean}           true if lane object is valid; false otherwise
     */
    UserStateTimeline._isValidLane = function (oLane) {
        return this.LANE_REQUIRED_PROPERTIES.every(hasOwnProperty, oLane);
    };

    /**
     * Saves lane settings as user state in browser's local storage.
     *
     *     Application Runtime Data Model                                      User State (User-specific settings saved in browser's local storage)
     *        [                                                                           [
     *            {lane 1 as represented in runtime data model},       validate               {lane 1 as represented in user state},
     *            {lane 2 as represented in runtime data model},       & parse                {lane 2 as represented in user state},
     *            ...,                                                 ========>>             ...,
     *            {lane n as represented in runtime data model}                               {lane n as represented in user state}
     *        ]                                                                           ]
     *
     * Lane settings are saved for each validated input lane (i.e., it has all required properties. @see UserStateTimeline.LANE_REQUIRED_PROPERTIES).
     * For each lane, a set of settings with primitive values (@see UserStateTimeline.LANE_PRIMITIVE_PROPERTIES) are saved if they exist in the input
     * lane object. In addition, a lane's valid sublanes are also saved. @see UserStateTimeline._getSublaneValidator for more information on how
     * sublanes are validated.
     *
     * The settings are saved per (configId, configVersion, User)-tuple.
     *
     * @param {object[]}    aLanes      The array of lanes that should be represented in user state.
     *                                  This should typically come from the regular runtime data model.
     * @returns {object}                The user state retrieved from the current config in aLanes
     */
    UserStateTimeline.getUserStateFromLanes = function (aLanes) {
        var oState = {
            lanes: aLanes
                .filter(this._isValidLane, this)
                .map(this._parseLane, this)
        };

        return oState;
    };

    return UserStateTimeline;
});

