/* eslint no-use-before-define: [2, "nofunc"] */
sap.ui.define([
    "sap/hc/mri/pa/ui/lib/ifr/BooleanContainers",
    "sap/hc/mri/pa/ui/lib/ifr/InternalFilterRepresentation",
    "sap/hc/mri/pa/ui/lib/MriFrontendConfig"
], function (BooleanContainers, IFR, MriFrontendConfig) {
    "use strict";

    function createBooleanContainer(type, content) {
        switch (content.operator) {
            case "AND":
                return new BooleanContainers.And(content.content);
            case "OR":
                return new BooleanContainers.Or(content.content);
            case "NOT":
                return new BooleanContainers.Not(content.content);
            default:
                throw new Error("Should never happen!!!");
        }
    }

    function createFilter(content) {
        var id = MriFrontendConfig.getFrontendConfig().getPaConfigId();
        var version = MriFrontendConfig.getFrontendConfig().getPaConfigVersion();
        return new IFR.Filter({
            configMetadata: new IFR.ConfigMetadata(version, id),
            cards: content.cards
        });
    }

    function createFiltercard(content) {
        return new IFR.FilterCard(content);
    }

    function createAttribute(content) {
        return new IFR.Attribute(content);
    }

    function createSuccessor(content) {
        return new IFR.Successor(content.successorID, content.minDaysBetween, content.maxDaysBetween);
    }

    function convertBM2IFR(oBookmark) {
        var oIFR = convertFilter(oBookmark);
        return oIFR;
    }

    function convertFilter(oBMFilter) {
        // create a filtercard for each patient interaction
        // -> [{obj: {...}, path: "patient.interactions.chemo.1"},...]
        var oBMFiltercards = getFiltercards(oBMFilter);
        var oFiltercards = oBMFiltercards.map(function (filtercard) {
            return convertFilterCard(filtercard.path, filtercard.obj);
        });

        // all filtercards in the BM should be in the "All" section
        var allSection = createBooleanContainer("FilterCard", {
            operator: "AND",
            content: oFiltercards
        });

        var anySection = createBooleanContainer("FilterCard", {
            operator: "OR",
            content: []
        });

        // add top level filtercard container
        var oFilterCardContainer = createBooleanContainer("FilterCard", {
            operator: "AND",
            content: [allSection, anySection]
        });

        // create Filter object
        var oFilter = createFilter({
            cards: oFilterCardContainer
        });
        return oFilter;
    }

    function convertFilterCard(path, oBMFiltercard) {
        var configPath;
        var instancePath;
        var instanceNumber;

        if (path === "patient") {
            configPath = path;
            instancePath = configPath;
        } else {
            // splits path in config path and instance number based on formatting rule:
            // e.g. (patient.interactions.priDiag).(1)
            // e.g. (patient.conditions.acme.interactions.chemo).(2)
            var matches = path.match(/^(\w+(?:\.\w+)*)(?:\.(\d+))$/);
            if (matches) {
                configPath = matches[1];
                instanceNumber = matches[2];
                instancePath = [configPath, instanceNumber].join(".");
            } else {
                throw new Error("path does not match expected format");
            }
        }

        var oBMAttributes = getAttributes(oBMFiltercard);
        // -> [{obj: {...}, path: "OPS_CODE"},...]
        var oAttributes = oBMAttributes.filter(function (attribute) {
            // successor will be handled separately
            return attribute.path !== "attributes._succ";
        }).map(function (attribute) {
            // create attribute objects
            var attributeConfigPath = [configPath, attribute.path].join(".");
            var attributeInstancePath = [path, attribute.path].join(".");
            return convertAttribute(attributeConfigPath, attributeInstancePath, attribute.obj);
        });
        // all attributes in the BM should be "and"ed
        var oBoolContainer = createBooleanContainer("Attribute", {
            operator: "AND",
            content: oAttributes
        });
        // create a Successor object (undefined if no successor specified)
        var oSuccessor = convertSuccessor(oBMFiltercard);

        // create Filtercard object
        var oFiltercard = createFiltercard({
            attributes: oBoolContainer,
            configPath: configPath,
            instanceNumber: parseInt(instanceNumber, 10),
            instanceID: instancePath,
            name: "",
            successor: oSuccessor
        });

        // exclude filtercard by adding a NOT condition
        if (oBMFiltercard.exclude) {
            return createBooleanContainer("FilterCards", {
                operator: "NOT",
                content: [oFiltercard]
            });
        }
        return oFiltercard;
    }

    function convertAttribute(configPath, instancePath, oBMAttribute) {
        var oConstraintContainer;
        if (oBMAttribute.length > 0 && oBMAttribute[0].hasOwnProperty("filter")) {
            // oBMAttribute can have at max one element
            var oConstraints = oBMAttribute[0].filter.map(function (oConstraint) {
                return convertAttributeConstraint(oConstraint);
            });
            oConstraintContainer = createBooleanContainer("AttributeConstraint", {
                operator: "OR",
                content: oConstraints
            });
        } else {
            oConstraintContainer = createBooleanContainer("AttributeConstraint", {
                operator: "OR",
                content: []
            });
        }

        // create Attribute object
        var oAttribute = createAttribute({
            constraints: oConstraintContainer,
            configPath: configPath,
            instanceID: instancePath
        });

        return oAttribute;
    }

    function convertAttributeConstraint(oConstraint) {
        if (oConstraint.hasOwnProperty("and")) {
            return new BooleanContainers.And(oConstraint.and.map(convertAttributeConstraint));
        } else if (oConstraint.hasOwnProperty("or")) {
            return new BooleanContainers.Or(oConstraint.and.or(convertAttributeConstraint));
        } else if (oConstraint.hasOwnProperty("op")) {
            return new IFR.Expression({
                operator: oConstraint.op,
                value: oConstraint.value
            });
        } else {
            throw new Error("TODO!");
        }
    }


    function getFiltercards(oFilter) {
        var walker = getJsonWalkFunction(oFilter);
        var filtercards = walker("**.interactions.*.*");
        var basicdata = {
            path: "patient",
            obj: {
                isFiltercard: true,
                attributes: oFilter.patient.attributes
            }
        };
        filtercards.push(basicdata);
        return filtercards;
    }

    function getAttributes(oFiltercard) {
        var walker = getJsonWalkFunction(oFiltercard);
        return walker("attributes.*");
    }

    function convertSuccessor(oBMFiltercard) {
        if (oBMFiltercard.hasOwnProperty("attributes") && oBMFiltercard.attributes.hasOwnProperty("_succ")) {
            var succAttribute = oBMFiltercard.attributes._succ;
            var minDaysBetween = 1;
            var maxDaysBetween;
            var successorID;
            // a filtercard can have at max one successor
            if (succAttribute.length > 0) {
                successorID = succAttribute[0].value;
                // the BM version that is parsed in this library can only have one filter
                // this filter supports an upper and a lower limit. None, one or both can be set.
                if (succAttribute[0].hasOwnProperty("filter") && succAttribute[0].filter.length > 0 && succAttribute[0].filter[0].hasOwnProperty("and")) {
                    var constraints = succAttribute[0].filter[0].and;
                    constraints.forEach(function (constraint) {
                        if (constraint.op && (constraint.op === ">=" || constraint.op === ">")) {
                            minDaysBetween = constraint.value;
                        } else if (constraint.op && (constraint.op === "<" || constraint.op === "<=")) {
                            maxDaysBetween = constraint.value;
                        }
                    });
                }
            }

            return createSuccessor({
                successorID: successorID,
                minDaysBetween: minDaysBetween,
                maxDaysBetween: maxDaysBetween
            });
        }
    }

    // Copied from utils:
    // getJsonWalkFunction can be imported from sap.hc.mri.pa.Utils

    function assert(condition, msg) {
        if (!condition) {
            throw new Error(msg);
        }
    }

    function getSortedKeys(obj) {
        return Object.keys(obj).sort();
    }

    function getJsonWalkFunction(obj) {
        // Collect all paths through objects terminating at a non-object
        function isProperObject(mPotentialObject) {
            return typeof mPotentialObject === "object" && mPotentialObject !== null;
        }
        var pathIndex = {};

        function collect(curObj, curPath) {
            pathIndex[curPath] = curObj;
            if (isProperObject(curObj)) {
                getSortedKeys(curObj).forEach(function (key) {
                    var subPath = curPath === "" ? key : curPath + "." + key;
                    collect(curObj[key], subPath);
                });
            }
        }
        collect(obj, "");

        // Construct the match extraction function to be returned
        // Will return an array holding an index for all paths matching the argument
        function getMatch(pathExpression) {
            assert(!pathExpression.match(/.\*\*$/g), "no ** expression at end of path allowed");
            var pathSplit = pathExpression.split(".");
            // Construct regular expression for matching paths
            var regexpSplit = pathSplit.map(function (subPath) {
                switch (subPath) {
                    case "**":
                        return "[^\\.]+(?:\\.[^\\.]+)*";
                    case "*":
                        return "[^\\.]+";
                    default:
                        return subPath;
                }
            });
            var regexp = new RegExp("^" + regexpSplit.join("\\.") + "$");

            // Index all matching paths in object
            var result = [];
            var isMatch = null;
            Object.keys(pathIndex).forEach(function (path) {
                isMatch = regexp.test(path);
                if (isMatch) {
                    result.push({
                        path: path,
                        obj: pathIndex[path]
                    });
                }
            });
            // Return index
            return result;
        }

        // Return function
        return getMatch;
    }

    return {
        convertBM2IFR: convertBM2IFR
    };
});
