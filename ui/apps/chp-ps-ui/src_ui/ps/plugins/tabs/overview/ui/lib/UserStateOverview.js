sap.ui.define([], function () {
    "use strict";

    var UserStateOverview = {};

    /** @constant {boolean} Default value for lane.initiallyFiltered field. */
    UserStateOverview.LANE_INITIALLY_FILTERED_DEFAULT_VALUE = false;

    /** @constant {string[]} Required properties/fields for valid lane states. */
    UserStateOverview.LANE_REQUIRED_PROPERTIES = ["laneId"];

    /** @constant {string[]} Primitive (non-object, non-array) properties/fields for lane states. */
    UserStateOverview.LANE_PRIMITIVE_PROPERTIES = ["laneId", "initiallyFiltered"];

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
    UserStateOverview._applyStateConfigDefaultPriority = function (oLane, oStateLane, sProperty, fParseStateValue, defaultValue) {
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
    UserStateOverview._applyStateToLane = function (oLane, oStateLane) {
        // apply regular properties in order (1. state, 2. app runtime/lane config, 3. default)
        this._applyStateConfigDefaultPriority(oLane, oStateLane, "initiallyFiltered", Boolean, this.LANE_INITIALLY_FILTERED_DEFAULT_VALUE);
    };


    /**
     * Checks whether a lane object from user state has all required properties (@see UserStateOverview.LANE_REQUIRED_PROPERTIES).
     *
     * @param   {object}    oStateLane  the lane object from user state
     * @returns {boolean}               true if valid; otherwise false
     */
    UserStateOverview._isValidStateLane = function (oStateLane) {
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
    UserStateOverview._getLaneMatcher = function (bFallbackToTitleMatching, aLanes) {
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
    UserStateOverview._isLegacyUserState = function (oState) {
        return !oState.lanes.every(function (oLane) {
            return oLane.hasOwnProperty("laneId");
        });
    };

    /**
     * Checks given user state for existence of lane settings.
     * @param   {object}    oState  the user state to check
     * @returns {boolean}   true if lane settings exist, false otherwise
     */
    UserStateOverview._stateHasLanes = function (oState) {
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
     * (@see UserStateOverview.LANE_REQUIRED_PROPERTIES). When a matching lane is found, we apply the settings from user state to the lane object from
     * application runtime. Specifically, this is done for all properties in @see UserStateOverview.LANE_PRIMITIVE_PROPERTIES as well as sublanes. Values
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
    UserStateOverview.applyUserStateToLanes = function (oState, aLanes) {
        if (this._stateHasLanes(oState)) {
            // 1. check for fallback matching via lane title
            var bUseLegacyMatching = this._isLegacyUserState(oState);
            var fFindLaneMatches = this._getLaneMatcher(bUseLegacyMatching, aLanes);

            // 2. filter for state lanes with required properties
            var aValidStateLanes = bUseLegacyMatching ?
                oState.lanes :
                oState.lanes.filter(this._isValidStateLane, this);

            // 3. apply state to lanes if matching state exists
            aLanes.forEach(function (oLane) {
                var aMatchingStateLanes = fFindLaneMatches(oLane, aValidStateLanes);
                if (aMatchingStateLanes.length === 1) {
                    var oMatchingStateLane = aMatchingStateLanes[0];
                    this._applyStateToLane(oLane, oMatchingStateLane);
                }
            }, this);
        }
    };

    /**
     * Parses a lane object from application runtime and
     * returns an object that will be saved to user state for this lane.
     *
     * Only setting properties from @see UserStateOverview.LANE_PRIMITIVE_PROPERTIES
     * and validated sublanes are parsed and saved.
     *
     * @param   {object} oLane  a lane object from application runtime
     * @returns {object}        a lane object that will be saved in user state
     */
    UserStateOverview._parseLane = function (oLane) {
        var oStateLane = {};

        // save primitive values
        this.LANE_PRIMITIVE_PROPERTIES.forEach(function (sProperty) {
            if (oLane.hasOwnProperty(sProperty)) {
                oStateLane[sProperty] = oLane[sProperty];
            }
        });

        return oStateLane;
    };

    /**
     * Checks whether the given lane object from runtime represents a valid object
     * that can successfully be saved to user state. In order to be valid a lane object needs
     * to have all properties as defined in @see UserStateOverview.LANE_REQUIRED_PROPERTIES.
     *
     * @param   {any}       oLane   the lane object from application runtime
     * @returns {boolean}           true if lane object is valid; false otherwise
     */
    UserStateOverview._isValidLane = function (oLane) {
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
     * Lane settings are saved for each validated input lane (i.e., it has all required properties. @see UserStateOverview.LANE_REQUIRED_PROPERTIES).
     * For each lane, a set of settings with primitive values (@see UserStateOverview.LANE_PRIMITIVE_PROPERTIES) are saved if they exist in the input
     * lane object. In addition, a lane's valid sublanes are also saved. @see UserStateOverview._getSublaneValidator for more information on how
     * sublanes are validated.
     *
     * The settings are saved per (configId, configVersion, User)-tuple.
     *
     * @param {object[]}    aLanes      The array of lanes that should be represented in user state.
     *                                  This should typically come from the regular runtime data model.
     * @returns {object}                The user state retrieved from the current config in aLanes
     */
    UserStateOverview.getUserStateFromLanes = function (aLanes) {
        var oState = {
            lanes: aLanes
                .filter(this._isValidLane, this)
                .map(this._parseLane, this)
        };

        return oState;
    };

    return UserStateOverview;
});
