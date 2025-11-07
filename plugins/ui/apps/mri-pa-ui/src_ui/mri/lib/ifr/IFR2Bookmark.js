/* eslint no-use-before-define: [2, "nofunc"] */
sap.ui.define(function () {
    "use strict";

    function Visitor() {
        this._result = null;
    }

    Visitor.prototype.visitFilter = function (configMetadata, cards) {
        var res = _visit(cards);

        var configMetadataJson = {
            id: configMetadata.id,
            version: configMetadata.version
        };

        this._result = {
            configMetadata: configMetadataJson,
            cards: res
        };
    };

    Visitor.prototype.visitAnd = function (andContent) {
        var res = _visitAll(andContent);
        this._result = _buildBooleanLogicJSON("AND", res);
    };

    Visitor.prototype.visitOr = function (orContent) {
        var res = _visitAll(orContent);
        this._result = _buildBooleanLogicJSON("OR", res);
    };

    Visitor.prototype.visitNot = function (notContent) {
        var res = _visitAll(notContent);
        this._result = _buildBooleanLogicJSON("NOT", res);
    };

    function _buildBooleanLogicJSON(operation, content) {
        return {
            type: "BooleanContainer",
            op: operation,
            content: content
        };
    }

    Visitor.prototype.visitFilterCard = function (configPath, instanceNumber, instanceID, name, successor, advanceTimeFilter, parentInteraction, attributes) {
        var res = _visit(attributes);

        var successorJson = null;
        var advanceTimeFilterJson = null;

        if (successor) {
            successorJson = {
                id: successor.id,
                minDaysBetween: successor.minDaysBetween,
                maxDaysBetween: successor.maxDaysBetween
            };
        }

        if (advanceTimeFilter) {
            advanceTimeFilterJson = advanceTimeFilter;
        }

        this._result = {
            type: "FilterCard",
            configPath: configPath,
            instanceNumber: instanceNumber,
            instanceID: instanceID,
            name: name,
            successor: successorJson,
            advanceTimeFilter: advanceTimeFilterJson,
            parentInteraction: parentInteraction,
            attributes: res
        };
    };

    Visitor.prototype.visitAttribute = function (configPath, instanceID, constraints) {
        this._result = {
            type: "Attribute",
            configPath: configPath,
            instanceID: instanceID,
            constraints: _visit(constraints)
        };
    };

    function _visitAll(listOfVisitables) {
        var result = [];
        listOfVisitables.forEach(function (visitable) {
            result.push(_visit(visitable));
        }, this);
        return result;
    }

    function _visit(visitable) {
        var tempVisitor = new Visitor();
        visitable.accept(tempVisitor);
        return tempVisitor._result;
    }

    Visitor.prototype.visitExpression = function (comparisonOperation, comparisonValue) {
        this._result = {
            type: "Expression",
            operator: comparisonOperation,
            value: comparisonValue
        };
    };

    function ifr2bookmark(ifr) {
        var ov = new Visitor();
        ifr.accept(ov);
        return ov._result;
    }

    return ifr2bookmark;
});
