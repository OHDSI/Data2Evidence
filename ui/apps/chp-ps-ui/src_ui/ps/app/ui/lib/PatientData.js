sap.ui.define([
    "hc/hph/patient/app/ui/lib/utils/Utils",
    "core/format/NumberFormat"
], function (Utils, NumberFormat) {
    "use strict";

    /**
     * Check if an object is a valid JS Date object
     *
     * @param {any} oAny - input to be checked
     * @returns {boolean} - true if input is a valid Date object
     */
    function _isValidDate(oAny) {
        /* The !isNan check guards against invalid date objects (e.g. new Date("not a date"))
        because getTime() returns NaN for invalid dates.*/
        return Object.prototype.toString.call(oAny) === "[object Date]" && !isNaN(oAny.getTime());
    }

    /**
     * Check if an object is an array with valid date as the first entry.
     *
     * @param {any} oAny - input to be checked
     * @returns {boolean} - true if input is an array containing a valid date
     */
    function _isValidNonEmptyDateArray(oAny) {
        if (Array.isArray(oAny) && oAny.length > 0) {
            var parsedStartDate = Utils.parseISODate(oAny[0]);
            if (_isValidDate(parsedStartDate)) {
                return true;
            }
        }
        return false;
    }

    /**
    * Special case handling: Zoom range is too small.
    * In case the range is smaller than the minimal allowed size, pad it symmetrically on the upper
    * and lower end to make it the minimal size.
    * @param {Date} dLowerZoomEdge date of proposed lower zoom limit of the timeline
    * @param {Date} dUpperZoomEdge date of proposed upper zoom limit of the timeline
    * @returns {object} JSON object holding the upper and lower zoom limits in the fields 'upper' and 'lower', respectively
    */
    function checkMinimalZoomRange(dLowerZoomEdge, dUpperZoomEdge) {
        var TWO_DAYS_IN_MS = 2 * 24 * 60 * 60 * 1000;
        var iActualRange = dUpperZoomEdge.getTime() - dLowerZoomEdge.getTime();
        if (iActualRange < TWO_DAYS_IN_MS) {
            var padding = (TWO_DAYS_IN_MS - iActualRange) / 2;
            dLowerZoomEdge = new Date(dLowerZoomEdge.getTime() - padding);
            dUpperZoomEdge = new Date(dUpperZoomEdge.getTime() + padding);
        }
        return {
            lower: dLowerZoomEdge,
            upper: dUpperZoomEdge
        };
    }

    var PatientData = {};

    /** @constant {string} Reserved word to represent undefined attribute values. */
    // FIXME: use i18n texts here
    PatientData.NO_VALUE = "NoValue";

    /** @constant {regex} Regular expression to detect whether an attribute value begins with a numerical value. */
    PatientData.PLOTTABLE_DATA_REGEX = /^-?\d+(\.\d+)?/;

    /**
     * Check if an event entry should be handled as an event with a date.
     *
     * @param {object} mEntry - event entry
     * @returns {boolean} - true if event is to be handled as having a date
     */
    PatientData._hasFullDateInfo = function (mEntry) {
        return mEntry.start && mEntry.end;
    };

    /**
     * Get the attribute name for a given annotation.
     *
     * @param {object} mObjectType Object type, e.g. the definition of an interaction
     * @param {string} sAnnotation Annotation name
     * @returns {string} Name of the (first) attribute with the given annotation or null.
     */
    PatientData.getAttributeNameForAnnotation = function (mObjectType, sAnnotation) {
        if (mObjectType && mObjectType.annotations) {
            var aAttributes = mObjectType.annotations[sAnnotation];
            if (Array.isArray(aAttributes) && aAttributes.length > 0) {
                return aAttributes[0];
            }
        }
        return null;
    };

    /**
     * Get the attribute value for a given annotation.
     *
     * @param {object} mObject Given object, e.g. an interaction
     * @param {object} mObjectType Object type, e.g. the definition of an interaction
     * @param {string} sAnnotation Annotation name
     * @returns {string} (First) attribute value of the (first) attribute with the given annotation or null.
     */
    PatientData.getAttributeForAnnotation = function (mObject, mObjectType, sAnnotation) {
        var sAttribute = PatientData.getAttributeNameForAnnotation(mObjectType, sAnnotation);
        if (sAttribute) {
            var aValues = mObject.attributes[sAttribute];
            if (aValues && aValues.length > 0) {
                return aValues[0];
            }
            jQuery.sap.log.warning("Missing values for '" + sAnnotation + "'-annotated attribute '" + sAttribute + "'.");
        }
        jQuery.sap.log.warning("Missing values for annotation '" + sAnnotation + "'.");
        return PatientData.NO_VALUE;
    };

    /**
     * Get the formatted attribute value for a given annotation.
     *
     * @param {object} mObject Given object, e.g. an interaction
     * @param {object} mObjectType Object type, e.g. the definition of an interaction
     * @param {string} sAnnotation Annotation name
     * @returns {string} (First) attribute value of the (first) attribute with the given annotation or null.
     */
    PatientData.getFormattedAttributeForAnnotation = function (mObject, mObjectType, sAnnotation) {
        var sAttribute = PatientData.getAttributeNameForAnnotation(mObjectType, sAnnotation);
        if (sAttribute) {
            var aValues = mObject.attributesFormatted[sAttribute];
            if (aValues && aValues.length > 0) {
                return aValues[0];
            }
            jQuery.sap.log.warning("Missing values for '" + sAnnotation + "'-annotated attribute '" + sAttribute + "'.");
        }
        jQuery.sap.log.warning("Missing values for annotation '" + sAnnotation + "'.");
        return PatientData.NO_VALUE;
    };

    /**
     * Returns a functor that converts 'NoValue' into a translated string and formats the
     * rest with up to 2 functors.
     *
     * If the formatting fails, the stringified version of the raw input is returned.
     *
     * @param {function} fConverter1 Inner functor
     * @param {function} fConverter2 Outer functor
     * @returns {function} Functor that handles 'NoValue' and optionally applies inner and outer functors if available
     */
    PatientData.getNoValueHandler = function (fConverter1, fConverter2) {
        var sNoValueText = Utils.getText("HPH_PAT_CONTENT_NO_VALUE");
        if (fConverter1) {
            if (fConverter2) {
                return function (s) {
                    if (s === PatientData.NO_VALUE) {
                        return sNoValueText;
                    }
                    var returnValue;
                    // Attempt to apply both formatters
                    try {
                        returnValue = fConverter2(fConverter1(s));
                    } catch (err) {
                        // Fallback: return stringified raw value or no value string for falsy values
                        returnValue = s ? s.toString() : sNoValueText;
                    }
                    return returnValue;
                };
            } else {
                return function (s) {
                    if (s === PatientData.NO_VALUE) {
                        return sNoValueText;
                    }
                    var returnValue;
                    // Attempt to apply the formatter
                    try {
                        // Fallback: return stringified raw value or no value string for falsy values
                        returnValue = fConverter1(s);
                    } catch (err) {
                        returnValue = s ? s.toString() : sNoValueText;
                    }
                    return returnValue;
                };
            }
        } else {
            return function (s) {
                return s === PatientData.NO_VALUE ? sNoValueText : s;
            };
        }
    };

    /**
     * Returns a functor that formats attributes given their type
     *
     * @param {object} sAttributeType Type of the attribute
     * @returns {function} Functor that parses and formats attribute values of a given format, e.g. formats an ISO timestamp using a user-specific date format
     */
    PatientData.getAttributeFormatter = function (sAttributeType) {
        var oNumberFormatter = NumberFormat.getFloatInstance({
            groupingEnabled: false
        });
        var fWrappedNumberFormatter = function (rawInput) {
            if (!isNaN(Number(rawInput))) {
                return oNumberFormatter.format(rawInput);
            }
            return rawInput;
        };
        if (sAttributeType === sap.hc.hph.patient.app.ui.lib.CDMAttrType.Date) {
            return PatientData.getNoValueHandler(Utils.parseISODate, Utils.formatDate);
        } else if (sAttributeType === sap.hc.hph.patient.app.ui.lib.CDMAttrType.Datetime) {
            return PatientData.getNoValueHandler(Utils.parseISODate, Utils.formatDateTime);
        } else if (sAttributeType === sap.hc.hph.patient.app.ui.lib.CDMAttrType.Number) {
            return PatientData.getNoValueHandler(fWrappedNumberFormatter);
        } else {
            return PatientData.getNoValueHandler();
        }
    };

    /**
     * Returns a functor that formats a set of attributes given a formatter string
     *
     * @param {object} mAttributes Attributes given as a map, e.g. { nameA: [value0, value1, ...], nameB: [...] }
     * @param {string} sFormatter Formatter string with placeholders, e.g. "{FirstName} {LastName}"
     * @returns {function} Functor that fills the placeholders of the formatter string by the appropriate attribute values
     */
    PatientData.applyFormatter = function (mAttributes, sFormatter) {
        return sFormatter.replace(/{(\w+)}/g, function (_, sPlaceholderAttributeSource) {
            var aValues = mAttributes[sPlaceholderAttributeSource];
            if (Array.isArray(aValues)) {
                return mAttributes[sPlaceholderAttributeSource].join(", ");
            } else {
                return typeof aValues !== "undefined" ? aValues : "?";
            }
        });
    };

    /**
     * Calculate the the maximum zoom range.
     *
     * The logic is the following:
     * 1. Check which initial zoom option is set.
     * 2. If "1 Year" or "3 Years" is set, we calculate that directly.
     * 3. If "All" is set, we follow the following procedure:
     * 3.1. The set of relevant dates is S = (birth, death, first clinical event, last clinical event, today)
     * 3.2. Filter S to only keep valid dates that are marked as relevant in the model
     * 3.3. The lower and upper zoom edges are now the first and last dates, respectively, in S
     * 3.4. If the resulting zoom interval is smaller than a fixed minimum, symmetrically pad it
     *
     * @param {Date} oDob date of birth Date object (or undefined, if not known or not present)
     * @param {Date} oDod date of death Date object (or undefined, if not known or not present)
     * @param {Date} oFirstEventDateSeen date of the first clinical event (or undefined, if not known or not present)
     * @param {Date} oLastEventDateSeen date of the last clinical event (or undefined, if not known or not present)
     * @returns {object} JSON object holding the upper and lower zoom limits in the fields 'upper' and 'lower', respectively
     */
    PatientData.getMaximumZoomRange = function (oDob, oDod, oFirstEventDateSeen, oLastEventDateSeen) {
        // This array will always contain at least one valid date (viz. today)
        var aValidDates = [oDob, oDod, oFirstEventDateSeen, oLastEventDateSeen, new Date()]
            .filter(function (oDate) {
                return _isValidDate(oDate);
            });
        // Lower limit = minimum date
        var lowerZoomEdgeTime = Math.min.apply(null, aValidDates); // min casts to epoch time
        var lowerZoomEdge = new Date(lowerZoomEdgeTime);
        // Upper limit = maximum date
        var upperZoomEdgeTime = Math.max.apply(null, aValidDates); // max casts to epoch time
        var upperZoomEdge = new Date(upperZoomEdgeTime);

        return checkMinimalZoomRange(lowerZoomEdge, upperZoomEdge);
    };

    PatientData.getLifespanZoomRange = function (oDob, oDod) {
        // Lower limit = minimum date
        var lowerZoomEdgeTime = oDob;
        // Upper limit = maximum date
        var upperZoomEdgeTime = oDod;

        if (!_isValidDate(lowerZoomEdgeTime)) {
            lowerZoomEdgeTime = new Date();
            lowerZoomEdgeTime.setFullYear(lowerZoomEdgeTime.getFullYear() - 100); // today - 100 years
        }
        if (!_isValidDate(upperZoomEdgeTime)) {
            upperZoomEdgeTime = new Date(); // today
        }

        return checkMinimalZoomRange(lowerZoomEdgeTime, upperZoomEdgeTime);
    };

    PatientData.getInteractionsZoomRange = function (oDob, oDod, oFirstEventDateSeen, oLastEventDateSeen) {
        // Lower limit = minimum date
        var lowerZoomEdgeTime = oFirstEventDateSeen;
        // Upper limit = maximum date
        var upperZoomEdgeTime = oLastEventDateSeen;

        if (!_isValidDate(lowerZoomEdgeTime) || !_isValidDate(upperZoomEdgeTime)) {
            return this.getLifespanZoomRange(oDob, oDod);
        }

        return checkMinimalZoomRange(lowerZoomEdgeTime, upperZoomEdgeTime);
    };

    PatientData.getFirstDODZoomRange = function (oDob, oDod, oFirstEventDateSeen) {
        // Lower limit = minimum date
        var lowerZoomEdgeTime = oFirstEventDateSeen;
        // Upper limit = maximum date
        var upperZoomEdgeTime = oDod;

        if (!_isValidDate(lowerZoomEdgeTime)) {
            return this.getLifespanZoomRange(oDob, oDod);
        }
        if (!_isValidDate(upperZoomEdgeTime)) {
            upperZoomEdgeTime = new Date(); // today
        }

        return checkMinimalZoomRange(lowerZoomEdgeTime, upperZoomEdgeTime);
    };

    /**
     * Perform  processing of the master data based on the corresponding configuration.
     *
     * This function does NOT modify the input arguments.
     *
     * @param {object} mPatientMasterData JSON object holding the patient master data as returned from the backend
     * @param {object} mConfigMasterDataRaw JSON object holding the masterdata configuration
     * @returns {object} JSON object holding the updated masterdata configuration (with data attached)
     */
    PatientData.processMasterData = function (mPatientMasterData, mConfigMasterDataRaw) {
        var newMasterDataConfig = jQuery.extend(true, {}, mConfigMasterDataRaw);

        if (!mPatientMasterData || !mPatientMasterData.attributes) {
            return newMasterDataConfig;
        }

        // Master data lines formatter function
        var fFormatMasterdata = function (_, p1) {
            if (!Array.isArray(mPatientMasterData.attributes[p1])) {
                jQuery.sap.log.error("MasterData attribute should be an array of values: " + p1, "PatientService");
                return mPatientMasterData.attributes[p1];
            }
            var oAttributeFormatter = PatientData.getAttributeFormatter(newMasterDataConfig.types[p1]);
            return mPatientMasterData.attributes[p1].map(oAttributeFormatter).join(", ");
        };

        // Format master data texts
        newMasterDataConfig.title[0].text = newMasterDataConfig.title[0].pattern.replace(/{(\w+)}/g, fFormatMasterdata);
        newMasterDataConfig.details.forEach(function (mRow) {
            mRow.text = mRow.pattern.replace(/{(\w+)}/g, fFormatMasterdata);
        });

        // Set patient dob and dod, if available, to be displayed on the timeline
        delete newMasterDataConfig.dob;
        delete newMasterDataConfig.dod;
        var dob = PatientData.getAttributeForAnnotation(mPatientMasterData, newMasterDataConfig, "date_of_birth");
        var dod = PatientData.getAttributeForAnnotation(mPatientMasterData, newMasterDataConfig, "date_of_death");
        var parsedDob = Utils.parseISODate(dob);
        if (_isValidDate(parsedDob)) {
            newMasterDataConfig.dob = parsedDob;
        }
        var parsedDod = Utils.parseISODate(dod);
        if (_isValidDate(parsedDod)) {
            newMasterDataConfig.dod = parsedDod;
        }
        return newMasterDataConfig;
    };

    /**
     * Guesses whether a grouped interaction attribute can be plotted.
     *
     * @param {array} sValue Attribute value.
     * @returns {bool} Whether the attribute can be plotted.
     */

    PatientData.guessIsPlottable = function (sValue) {
        return PatientData.PLOTTABLE_DATA_REGEX.test(sValue);
    };

    /**
     * Extracts the plottable value of an grouped interaction attribute.
     *
     * @param {string} sValue Attribute value.
     * @returns {array} An array [value, unit] with value being the plottable y-value of the attribute and unit being an optional suffix.
     */
    PatientData.extractPlottableValue = function (sValue) {
        if (typeof sValue === "string") {
            var aMatch = PatientData.PLOTTABLE_DATA_REGEX.exec(sValue);
            if (aMatch) {
                return [Number(aMatch[0]), sValue.substr(aMatch[0].length).trim()];
            }
        }
        return [sValue, ""];
    };

    PatientData.getKeyForAttributeUnit = function (oKeyStore, sAttributeName, sUnit) {
        var mDict = oKeyStore.dicts[sAttributeName];
        if (mDict) {
            return mDict[sUnit];
        } else {
            return sAttributeName;
        }
    };

    PatientData.assignKeyForAttributeUnit = function (oKeyStore, sAttributeName, sUnit) {
        var mDict = oKeyStore.dicts[sAttributeName];
        if (!mDict) {
            mDict = oKeyStore.dicts[sAttributeName] = {};
        }
        if (mDict[sUnit]) {
            return mDict[sUnit];
        } else {
            oKeyStore.lastKey += 1;
            mDict[sUnit] = oKeyStore.lastKey;
            return oKeyStore.lastKey;
        }
    };

    /**
     * Perform full processing of the fetched data based on the corresponding configuration.
     *
     * This function DOES modify the mConfig input argument.
     *
     * @param {object}   mPatientRaw JSON object holding the patient data as returned from the backend
     * @param {object}   mConfig JSON object holding the configuration
     * @param {object}   mCallbacks Object with functors that, if defined, are called on different events
     * @param {function} mCallbacks.addEntry Called for each interaction, given arguments are (mEntry, mInteractionType, mLane)
     * @param {function} mCallbacks.startInteractionType Called before processing an interaction type of a lane, given arguments are (mInteractionType, mLane). If the function returns false, the whole interaction will be skipped.
     * @param {function} mCallbacks.finishInteractionType Called after processing an interaction type of a lane, given arguments are (mInteractionType, mLane)
     * @param {function} mCallbacks.startLane Called before processing a lane, given arguments are (mLane)
     * @param {function} mCallbacks.finishLane Called after processing a lane, given arguments are (mLane)
     * @param {function} mCallbacks.startDataProcessing Called before the whole processing starts, given arguments are (mConfig)
     * @param {function} mCallbacks.finishDataProcessing Called after the whole processing is done, given arguments are (mConfig)
     */
    PatientData.process = function (mPatientRaw, mConfig, mCallbacks) {
        mCallbacks = mCallbacks || {};

        // // Initialize overview data
        // var mConfig = jQuery.extend(true, {}, mConfigRaw);

        if (mCallbacks.startDataProcessing) {
            mCallbacks.startDataProcessing(mConfig);
        }

        // Process clinical event data, one lane at the time
        mConfig.lanes.forEach(function (mLane) {
            mLane.plottableAttributes = [];

            if (mCallbacks.startLane) {
                mCallbacks.startLane(mLane);
            }

            // Process data for a single lane, one interaction type at the time
            mLane.interactions.forEach(function (mInteractionType) {
                /* Get the attributes annotated as start and end. If exactly one annotation is missing,
                we use the other (i.e. if only a start attribute is defined, we take the same attribute
                to be the end attribute). */
                var sAttrInteractionStart = PatientData.getAttributeNameForAnnotation(mInteractionType, "interaction_start");
                var sAttrInteractionEnd = PatientData.getAttributeNameForAnnotation(mInteractionType, "interaction_end");
                if (sAttrInteractionStart && !sAttrInteractionEnd) {
                    sAttrInteractionEnd = sAttrInteractionStart;
                }
                if (sAttrInteractionEnd && !sAttrInteractionStart) {
                    sAttrInteractionStart = sAttrInteractionEnd;
                }

                var aInteractions = mPatientRaw.interactionTypes[mInteractionType.source];
                if (!Array.isArray(aInteractions)) {
                    jQuery.sap.log.error("Response did not contain requested interactionType: " + mInteractionType.source, "PatientService");
                    return;
                }
                // We use slice() to get a copy of the array since we will modify the data in-place below
                aInteractions = aInteractions.slice();

                /*
                Only do time-related processing if both start and end are defined
                (by the above logic, either neither or both are defined)
                */
                if (sAttrInteractionStart && sAttrInteractionEnd) {
                    /* Clean up times */
                    aInteractions = aInteractions.map(function (mInteraction) {
                        /* Replace invalid or missing dates with the "no value"-string */
                        if (!_isValidNonEmptyDateArray(mInteraction.attributes[sAttrInteractionStart])) {
                            mInteraction.attributes[sAttrInteractionStart] = [PatientData.NO_VALUE];
                        }
                        if (!_isValidNonEmptyDateArray(mInteraction.attributes[sAttrInteractionEnd])) {
                            mInteraction.attributes[sAttrInteractionEnd] = [PatientData.NO_VALUE];
                        }
                        /* Convert events with both start and end annotated but only one valid
                        date to points event at that date */
                        var sStartTime = mInteraction.attributes[sAttrInteractionStart][0];
                        var sEndTime = mInteraction.attributes[sAttrInteractionEnd][0];
                        if (sStartTime === PatientData.NO_VALUE && sEndTime !== PatientData.NO_VALUE) {
                            mInteraction.attributes[sAttrInteractionStart] = [sEndTime];
                        }
                        if (sEndTime === PatientData.NO_VALUE && sStartTime !== PatientData.NO_VALUE) {
                            mInteraction.attributes[sAttrInteractionEnd] = [sStartTime];
                        }
                        return mInteraction;
                    });

                    /* Sort interaction by start time, treating dateless events
                    as coming before all others. */
                    aInteractions.sort(function (a, b) {
                        var aStart = a.attributes[sAttrInteractionStart][0];
                        var bStart = b.attributes[sAttrInteractionStart][0];
                        if (aStart === PatientData.NO_VALUE) {
                            if (bStart === PatientData.NO_VALUE) {
                                return 0;
                            } else {
                                return -1;
                            }
                        } else if (bStart === PatientData.NO_VALUE) {
                            return 1;
                        }
                        var aStartTime = Utils.parseISODate(aStart).getTime();
                        var bStartTime = Utils.parseISODate(bStart).getTime();

                        return aStartTime - bStartTime;
                    });
                }

                // Create a list of annotations
                var aAnnotationAttributes = Object.keys(mInteractionType.annotations).reduce(function (aPrevAnnotations, sAnnotation) {
                    if (sAnnotation !== "interaction_end" && sAnnotation !== "interaction_start") {
                        Array.prototype.push.apply(aPrevAnnotations, mInteractionType.annotations[sAnnotation].map(function (sAttribute) {
                            return {
                                annotation: sAnnotation,
                                attribute: sAttribute
                            };
                        }));
                    }
                    return aPrevAnnotations;
                }, []);

                if (mCallbacks.startInteractionType) {
                    var bProceed = mCallbacks.startInteractionType(mInteractionType, mLane);
                    if (bProceed === false) {
                        // If false (not undefined) is returned, skip the whole interaction type
                        return;
                    }
                }

                if (!mInteractionType.attributes || mInteractionType.allowUndefinedAttributes) {
                    // We will automatically construct attribute definitions based on patient data
                    mInteractionType.attributes = [];
                }

                // Extract plottable attributes
                var aVisibleAttributes = mInteractionType.attributes.filter(function (mAttributeType) {
                    return mAttributeType.visible;
                });
                var aPlottableAttributes = aVisibleAttributes.filter(function (mAttributeType) {
                    return mAttributeType.plottable;
                });
                var aAttributesToFormat = mInteractionType.attributes.filter(function (mAttributeType) {
                    return mAttributeType.plottable || mAttributeType.visible;
                });

                // Get formatters for all configured attributes
                var aPreformatter = mInteractionType.attributes.map(function (mAttributeType) {
                    return PatientData.getAttributeFormatter(mAttributeType.type);
                });
                var aDisallowedAttributes = (mInteractionType.annotations.interaction_start || []).concat(mInteractionType.annotations.interaction_end || []);
                var mSeenPlottableAttributes = {};
                var oKeyCache = {
                    dicts: {},
                    lastKey: 0
                };

                // Process data for a single interaction type, one event at the time
                aInteractions.forEach(function (mInteraction) {
                    /*
                    In the below, we rely on the checks above to ensure that
                    (1) If a start or end annotation exists, the corresponding attribute contains a non-empty array
                    (2) The first entry in the end and start arrays is either (a) a string that will produce a valid
                    Date object when passed to Utils.parseISODate(), or (b) the "no value"-string
                    */
                    var interactionStart = null;
                    if (sAttrInteractionStart && mInteraction.attributes[sAttrInteractionStart][0] !== PatientData.NO_VALUE) {
                        interactionStart = Utils.parseISODate(mInteraction.attributes[sAttrInteractionStart][0]);
                    }
                    var interactionEnd = null;
                    if (sAttrInteractionEnd && mInteraction.attributes[sAttrInteractionEnd][0] !== PatientData.NO_VALUE) {
                        interactionEnd = Utils.parseISODate(mInteraction.attributes[sAttrInteractionEnd][0]);
                    }

                    var aAnnotations = aAnnotationAttributes.map(function (o) {
                        return {
                            annotation: o.annotation,
                            values: mInteraction.attributes[o.attribute]
                        };
                    });

                    var mEntry = {
                        start: interactionStart, // always null or a valid date object
                        end: interactionEnd, // always null or a valid date object
                        annotations: aAnnotations,
                        attributes: mInteraction.attributes,
                        plottableAttributes: aPlottableAttributes,
                        visibleAttributes: aVisibleAttributes,
                        plotKeyCache: oKeyCache
                    };

                    /*
                    Process the data for each attribute. If we are dealing with a grouped interaction
                    (allowUndefinedAttributes = true), for which the attributes are not defined in the
                    configuration, simply add all attributes (other than start and end). Otherwise,
                    only add selected attributes and format them based on configuration.
                    */
                    if (mInteractionType.allowUndefinedAttributes) {
                        // Grouped interaction case
                        mEntry.attributesFormatted = mInteraction.attributes;

                        // Don't show attributes with interaction_start or interaction_end annotation
                        mEntry.visibleAttributes = Object.keys(mInteraction.attributes)
                            // keep all attributes but start/end time of the interaction
                            .filter(function (sAttributeKey) {
                                return aDisallowedAttributes.indexOf(sAttributeKey) === -1;
                            })
                            .map(function (sAttributeKey) {
                                return {
                                    id: sAttributeKey,
                                    name: sAttributeKey
                                };
                            });
                        /* Identify plottable attributes based on the current data and extend the
                        configuration accordingly.
                        */
                        mEntry.plottableAttributes = [];
                        if (mInteractionType.plotGeneratedAttr || mInteractionType.allowedPlottableAttr.length > 0) {
                            mEntry.visibleAttributes.forEach(function (mAttributeType) {
                                var isPlottable = false;
                                var plottingAllowed = mInteractionType.plotGeneratedAttr || mInteractionType.allowedPlottableAttr.indexOf(mAttributeType.name) > -1;
                                if (plottingAllowed) {
                                    var aValues = mInteraction.attributes[mAttributeType.id];
                                    if (!Array.isArray(aValues)) {
                                        aValues = [aValues];
                                    }

                                    aValues.forEach(function (sValue) {
                                        if (PatientData.guessIsPlottable(sValue)) {
                                            isPlottable = true;
                                            var aNumberUnit = PatientData.extractPlottableValue(sValue);
                                            var sKey = PatientData.assignKeyForAttributeUnit(oKeyCache, mAttributeType.id, aNumberUnit[1]);
                                            if (!mSeenPlottableAttributes[sKey]) {
                                                var sNameSuffix = aNumberUnit[1] ? " [" + aNumberUnit[1] + "]" : "";
                                                // Dynamically extend the config
                                                // It is used later (in cbFinishInteractionType) to build the list of available chart lanes
                                                mSeenPlottableAttributes[sKey] = true;
                                                mInteractionType.attributes.push({
                                                    id: sKey,
                                                    name: mAttributeType.name + sNameSuffix,
                                                    plottable: true
                                                });
                                            }
                                        }
                                    });
                                }

                                if (isPlottable) {
                                    mEntry.plottableAttributes.push(mAttributeType);
                                }
                            });
                        }
                    } else {
                        // Normal interaction case
                        // Preformat all interaction attributes
                        var mAttributes = mInteractionType.attributes.reduce(function (mPrev, mAttributeType, index) {
                            var aAttributes = mInteraction.attributes[mAttributeType.id];
                            if (Array.isArray(aAttributes)) {
                                mPrev[mAttributeType.id] = aAttributes.map(aPreformatter[index]);
                            } else {
                                jQuery.sap.log.error("Response interaction " + mInteractionType.source + " did not contain requested attribute: " + mAttributeType.id, "PatientService");
                            }
                            return mPrev;
                        }, {});

                        // Use formatters to format all attributes that are visible or plottable
                        var addFormattedAttribute = function (mPrev, mAttributeType) {
                            var sFormatterPattern = mAttributeType.formatter && mAttributeType.formatter.pattern ? mAttributeType.formatter.pattern : "{" + mAttributeType.id + "}";
                            mPrev[mAttributeType.id] = [PatientData.applyFormatter(mAttributes, sFormatterPattern)];
                            return mPrev;
                        };
                        mEntry.attributesFormatted = aAttributesToFormat.reduce(addFormattedAttribute, {});
                    }
                    if (mCallbacks.addEntry) {
                        mCallbacks.addEntry(mEntry, mInteractionType, mLane);
                    }
                });
                if (mCallbacks.finishInteractionType) {
                    mCallbacks.finishInteractionType(mInteractionType, mLane);
                }
            });
            if (mCallbacks.finishLane) {
                mCallbacks.finishLane(mLane);
            }
        });

        if (mCallbacks.finishDataProcessing) {
            mCallbacks.finishDataProcessing(mConfig);
        }
    };

    /**
     * Prepare list of attributes
     * We implicitly derive the order of attributes (which implies their display order)
     * from the order of attributes in the config.
     * @param {object} mEntry Entry object given as first argument of the addEntry functor in process
     * @returns {array} Array of attributes used by the Tile control
     */
    PatientData.getTileAttributes = function (mEntry) {
        return mEntry.visibleAttributes.map(function (mAttributeType) {
            var mAttribute = {
                name: mAttributeType.name,
                values: mEntry.attributesFormatted[mAttributeType.id]
            };
            if (mAttributeType.firstTileAttribute || mAttributeType.secondTileAttribute) {
                mAttribute.main = true;
                mAttribute.mainOrder = mAttributeType.firstTileAttribute ? 1 : 2;
            }
            return mAttribute;
        });
    };

    return PatientData;
});
