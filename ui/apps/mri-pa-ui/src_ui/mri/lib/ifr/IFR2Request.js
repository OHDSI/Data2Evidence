/* eslint no-use-before-define: [2, "nofunc"] */
sap.ui.define([
    "sap/hc/mri/pa/ui/Utils",
    "sap/hc/mri/pa/ui/lib/MriFrontendConfig",
    "sap/hc/mri/pa/ui/lib/VariantValidator"
], function (Utils, MriFrontendConfig, VariantValidator) {
    "use strict";


    /*
        Performs a deep extend on a list of objects.
        - The algorithm assumes, that the different objects have the same datatype at same path (if exists).
        - Arrays will be concatinated.
        - If the same value (non object) is set in the same path in multiple objects, the last objects "wins".
    */
    function _combineRequests(aRequests) {
        // get distinct properties
        var properties = [];
        aRequests.forEach(function (request) {
            properties = properties.concat(Object.keys(request));
        });
        properties = properties.filter(function (request, ind, self) {
            return self.indexOf(request) === ind;
        });

        // perform a deep extend
        var res = {};
        var next;
        var val;
        properties.forEach(function (prop) {
            next = [];
            val = null;
            aRequests.forEach(function (request) {
                if (request.hasOwnProperty(prop)) {
                    if (Array.isArray(request[prop])) {
                        if (!Array.isArray(val)) {
                            val = [];
                        }
                        val = val.concat(request[prop]);
                    } else if (typeof request[prop] === "object") {
                        next.push(request[prop]);
                    } else if (typeof request[prop] !== "undefined") {
                        val = request[prop];
                    }
                }
            });
            if (next.length > 0) {
                res[prop] = _combineRequests(next);
            } else {
                res[prop] = val;
            }
        });
        return res;
    }

    function _annotateRequestWithMetadata(request, metadata) {
        return _combineRequests([request, {
            configData: {
                configId: metadata.id,
                configVersion: metadata.version
            }
        }]);
    }

    function _annotateExpressions(obj, property, value) {
        if (obj.hasOwnProperty("value")) {
            obj[property] = value;
        } else if (Array.isArray(obj)) {
            obj.forEach(function (element) {
                _annotateExpressions(element, property, value);
            });
        } else if (typeof obj === "object") {
            Object.keys(obj).forEach(function (key) {
                _annotateExpressions(obj[key], property, value);
            });
        }
    }

    function _isAbsTimeConstraint(configPath) {
        var pathParts = configPath.split(".");
        var lastPathPart = pathParts.pop();
        return lastPathPart === "_absTime";
    }

    function _isLocationConstraint(configPath) {
        var oAttrConfig = MriFrontendConfig.getFrontendConfig().getAttributeByPath(configPath);
        return oAttrConfig && oAttrConfig.hasAnnotation("genomics_variant_location");
    }

    function _isEmptyObj(oObj) {
        return Object.keys(oObj).length === 0 && JSON.stringify(oObj) === JSON.stringify({});
    }

    function _isNotEmptyObj(oObj) {
        return !_isEmptyObj(oObj);
    }

    function _isInteger(x) {
        return Math.round(x) === x;
    }

    function FilterVisitor() {
        this.request = {};
    }

    FilterVisitor.prototype.visitFilter = function (configMetadata, cards) {
        var filtercardResults = this._visit(cards);
        var filterContainer = {
            any: []
        };
        function traverse(cards, item) {
            if (cards.length) {
                var head = cards[0];
                var tail = cards.splice(1);
                if (head.or.length > 0) {
                    head.or.forEach(function (e) {
                        if (tail.length) {
                            traverse(tail, item.concat([e]));
                        } else {
                            filterContainer.any.push(item.concat([e]));
                        }
                    });
                }
            }
        };
        traverse(filtercardResults.and, []);
        this.request = [];
        var combinedFilters;
        var combinedFiltersWithMetadata;
        var that = this;
        filterContainer.any.forEach(function (filtercard) {
            combinedFilters = _combineRequests(filtercard);
            combinedFiltersWithMetadata = _annotateRequestWithMetadata(combinedFilters, configMetadata);
            that.request.push(combinedFiltersWithMetadata);
        });
    };



    FilterVisitor.prototype.visitAnd = function (andContent) {
        var andList = [];

        andContent.forEach(function (visitable) {
            andList.push(this._visit(visitable));
        }, this);

        this.request = {
            and: andList
        };
    };

    FilterVisitor.prototype.visitOr = function (orContent) {
        var orList = [];

        orContent.forEach(function (visitable) {
            orList.push(this._visit(visitable));
        }, this);

        this.request = {
            or: orList
        };
    };

    FilterVisitor.prototype.visitNot = function (notContent) {
        // visit using the negated visitor
        this.request = this._visit(notContent[0], true);
    };

    FilterVisitor.prototype.visitFilterCard = function (configPath, instanceNumber, instanceID, name, successor, advanceTimeFilter, parentInteraction, attributes, inactive) {
        // completely ignore inactive cards for request
        if (!inactive) {
            var attributeRes = this._visit(attributes);
            var filtercardAttributes = {};

            if (attributeRes && attributeRes.hasOwnProperty("and")) {
                filtercardAttributes = _combineRequests(attributeRes.and);
            }

            if (successor && successor.hasOwnProperty("id")) {
                // successorFilter can be one of the following:
                // - []
                // - [{and:[{op: ">=" or "<",value:1}]}]
                // - [{and:[{op: ">=",value:1},{op: "<",value:90}]}]
                var successorFilter = [];
                var daysBetweenConstraint = [];
                if (successor.hasOwnProperty("minDaysBetween") && _isInteger(successor.minDaysBetween)) {
                    daysBetweenConstraint.push({
                        op: ">=",
                        value: successor.minDaysBetween
                    });
                }
                if (successor.hasOwnProperty("maxDaysBetween") && _isInteger(successor.maxDaysBetween)) {
                    daysBetweenConstraint.push({
                        op: "<",
                        value: successor.maxDaysBetween
                    });
                }
                if (daysBetweenConstraint.length > 0) {
                    successorFilter.push({
                        and: daysBetweenConstraint
                    });
                }

                // FIXME: use configPath && instanceNumber instead of instanceID
                filtercardAttributes._succ = [{
                    value: successor.id,
                    filter: successorFilter
                }];
            }

            if (advanceTimeFilter) {
                filtercardAttributes._tempQ = [{and: advanceTimeFilter.request}];
            }

            if (parentInteraction) {
                filtercardAttributes.parentInteraction = [{value: parentInteraction}];
            }

            // special case for basic data: if there is no instance number, don't create this level
            var requestPath = instanceNumber > 0 ? configPath + "." + instanceNumber : configPath;
            var filterObject = {
                isFiltercard: true,
                attributes: filtercardAttributes
            };
            Utils.createPathInObject(this.request, requestPath, filterObject);
        }
    };

    FilterVisitor.prototype.visitAttribute = function (configPath, instanceID, constraints) {
        var expressionRequest = this._visit(constraints, false, _isLocationConstraint(configPath));
        var pathParts = configPath.split(".");
        var lastPathPart = pathParts.pop();
        var filter;
        if (expressionRequest.hasOwnProperty("or") && expressionRequest.or.length > 0) {
            // add the list of constraints (Boolean.Or)
            filter = expressionRequest.or;
        } else if (!expressionRequest.hasOwnProperty("or") && Object.keys(expressionRequest).length > 0) {
            // add a single constraint
            filter = expressionRequest;
        }
        this.request[lastPathPart] = [{
            filter: filter
        }];
        if (_isAbsTimeConstraint(configPath)) {
            _annotateExpressions(this.request[lastPathPart], "type", "abstime");
        }
    };

    FilterVisitor.prototype.visitExpression = function (comparisonOperation, comparisonValue) {
        this.request = {
            op: comparisonOperation,
            value: comparisonValue
        };
    };

    FilterVisitor.prototype._visit = function (visitable, negated, isLocation) {
        var tempVisitor = this._getInstance(negated, isLocation);
        visitable.accept(tempVisitor);
        return tempVisitor.request;
    };

    FilterVisitor.prototype._getInstance = function (negated, isLocation) {
        if (negated) {
            if (isLocation) {
                return new NegatedLocationVisitor();
            } else {
                return new NegatedFilterVisitor();
            }
        } else if (isLocation) {
            return new LocationVisitor();
        } else {
            return new FilterVisitor();
        }
    };

    function NegatedFilterVisitor() {
        FilterVisitor.call(this);
    }

    NegatedFilterVisitor.prototype = Object.create(FilterVisitor.prototype);
    NegatedFilterVisitor.prototype.constructor = NegatedFilterVisitor;

    NegatedFilterVisitor.prototype.visitFilterCard = function (configPath, instanceNumber, instanceID, name, successor, advanceTimeFilter, parentInteraction, attributes, inactive) {
        FilterVisitor.prototype.visitFilterCard.call(this, configPath, instanceNumber, instanceID, name, successor, advanceTimeFilter, parentInteraction, attributes, inactive);
        // completely ignore inactive cards for request
        if (!inactive) {
            var sFilterCardPath = configPath + "." + instanceNumber + ".exclude";
            Utils.createPathInObject(this.request, sFilterCardPath, true);
        }
    };

    NegatedFilterVisitor.prototype._getInstance = function (negated, isLocation) {
        if (negated) {
            if (isLocation) {
                return new LocationVisitor();
            } else {
                return new FilterVisitor();
            }
        } else if (isLocation) {
            return new NegatedLocationVisitor();
        } else {
            return new NegatedFilterVisitor();
        }
    };

    function LocationVisitor() {
        FilterVisitor.call(this);
    }

    LocationVisitor.prototype = Object.create(FilterVisitor.prototype);
    LocationVisitor.prototype.constructor = LocationVisitor;

    LocationVisitor.prototype.visitExpression = function (comparisonOperation, comparisonValue) {
        this.request = {
            op: comparisonOperation,
            value: comparisonValue
        };
    };

    LocationVisitor.prototype._getInstance = function (negated) {
        if (negated) {
            return new NegatedLocationVisitor();
        }
        return new LocationVisitor();
    };

    function NegatedLocationVisitor() {
        LocationVisitor.call(this);
    }

    NegatedLocationVisitor.prototype = Object.create(LocationVisitor.prototype);
    NegatedLocationVisitor.prototype.constructor = NegatedLocationVisitor;

    NegatedLocationVisitor.prototype.visitFilterCard = function (configPath, instanceNumber, instanceID, name, successor, advanceTimeFilter, parentInteraction, attributes, inactive) {
        LocationVisitor.prototype.visitFilterCard.call(this, configPath, instanceNumber, instanceID, name, successor, advanceTimeFilter, parentInteraction, attributes, inactive);

        // completely ignore inactive cards for request
        if (!inactive) {
            var sFilterCardPath = configPath + "." + instanceNumber + ".exclude";
            Utils.createPathInObject(this.request, sFilterCardPath, true);
        }
    };

    NegatedLocationVisitor.prototype._getInstance = function (negated) {
        if (negated) {
            return new LocationVisitor();
        }
        return new NegatedLocationVisitor();
    };

    function ifr2request(ifr) {
        var ov = new FilterVisitor();
        ifr.accept(ov);
        return ov.request;
    }

    return ifr2request;
});
