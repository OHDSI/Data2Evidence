sap.ui.define([], function () {
    "use strict";

    function getAnd() {
        return getBooleanContainer({
            op: "AND",
            content: Array.prototype.slice.call(arguments)
        });
    }

    function getOr() {
        return getBooleanContainer({
            op: "OR",
            content: Array.prototype.slice.call(arguments)
        });
    }

    function getNot() {
        return getBooleanContainer({
            op: "NOT",
            content: Array.prototype.slice.call(arguments)
        });
    }

    function getBooleanContainer(params) {
        params = params || {};
        return {
            type: "BooleanContainer",
            op: params.op || "AND",
            content: params.content || null
        };
    }

    var _filterNo = -1;

    function getFilter(params) {
        params = params || {};
        _filterNo += 1;
        return {
            configMetadata: {
                version: _filterNo,
                id: "id " + _filterNo
            },
            cards: null
        };
    }

    var _filterCardNo = -1;

    function getFilterCard(params) {
        params = params || {};
        _filterCardNo += 1;
        return {
            type: "FilterCard",
            configPath: params.configPath || "FilterCard path " + _filterCardNo,
            instanceNumber: params.instanceNumber || _filterCardNo,
            instanceID: params.instanceID || "FilterCard instance id " + _filterCardNo,
            name: params.name || "",
            successor: params.successor || null,
            advanceTimeFilter: params.advanceTimeFilter || null,
            parentInteraction: params.parentInteraction || "",
            attributes: params.attributes || null
        };
    }

    var _attributeNo = -1;

    function getAttribute(params) {
        params = params || {};
        _attributeNo += 1;
        return {
            type: "Attribute",
            configPath: params.configPath || "Attribute path " + _attributeNo,
            instanceID: params.instanceID || "Attribute instance id " + _attributeNo,
            constraints: params.constraints || null
        };
    }

    var _expressionNo = -1;

    function getExpression(params) {
        params = params || {};
        _expressionNo += 1;
        return {
            type: "Expression",
            operator: params.operator || "=",
            value: params.value || _expressionNo
        };
    }

    var _successorNo = -1;

    function getSuccessor(params) {
        params = params || {};
        _successorNo += 1;
        return {
            id: params.id || "Successor id " + _successorNo,
            minDaysBetween: params.minDaysBetween || _successorNo,
            maxDaysBetween: params.maxDaysBetween || _successorNo + 1
        };
    }

    return {
        getAnd: getAnd,
        getOr: getOr,
        getNot: getNot,
        getFilter: getFilter,
        getFilterCard: getFilterCard,
        getAttribute: getAttribute,
        getExpression: getExpression,
        getSuccessor: getSuccessor
    };
});
