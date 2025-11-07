/* eslint-disable no-use-before-define */

sap.ui.define([
    "sap/hc/mri/pa/ui/lib/library",
    "sap/hc/mri/pa/ui/lib/MriFrontendConfig",
    "sap/hc/mri/pa/ui/Utils"
], function (library, MriFrontendConfig, Utils) {
    "use strict";

    var _maxAttributeTags = 5;
    var _attributesSeparator = ";";
    var _morePlaceholder = "...";

    function _createHtmlSpan(value, sOtherClasses) {
        sOtherClasses = sOtherClasses || "";
        return "<span class=\"sapMriPaBmkDescrElement " + sOtherClasses + "\">" + value + "</span>";
    }

    function _createHtmlDiv(value, sOtherClasses) {
        sOtherClasses = sOtherClasses || "";
        return "<div class=\"sapMriPaBmkDescrLine " + sOtherClasses + "\">" + value + "</div>";
    }

    function _escapeHtmlCharacters(sValue) {
        return sValue.replace("\"", "&quot;").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    function _checkValidStrings(sItem) {
        if (sItem) {
            return true;
        }
        return false;
    }

    function Visitor() {
        // Empty constructor
    }

    Visitor.prototype._visitAll = function (listOfVisitables) {
        var result = [];
        listOfVisitables.forEach(function (visitable) {
            result.push(this._visit(visitable));
        }, this);
        return result;
    };

    Visitor.prototype._visit = function (visitable) {
        var tempVisitor = this._getVisitor();
        visitable.accept(tempVisitor);
        return tempVisitor.result;
    };

    Visitor.prototype._getVisitor = function () {
        return new Visitor();
    };

    Visitor.prototype.visitFilter = function (configMetadata, cards) {
        this.result = this._visit(cards);
    };

    Visitor.prototype.visitAnd = function (andContent) {
        var res = this._visitAll(andContent);
        this.result = res.filter(_checkValidStrings).map(function (sHtmlAttr) {
            return _createHtmlDiv(sHtmlAttr);
        }).join("");
    };

    Visitor.prototype.visitOr = function (orContent) {
        var res = this._visitAll(orContent);
        this.result = res.filter(_checkValidStrings).map(function (sHtmlAttr) {
            return _createHtmlDiv(sHtmlAttr);
        }).join("");
    };

    Visitor.prototype.visitNot = function (notContent) {
        this.result = this._visitAll(notContent);
    };

    Visitor.prototype.visitFilterCard = function (configPath, instanceNumber, instanceID, cardName, successor, advanceTimeFilter, parentInteraction, attributes) {
        var fcv = new FilterCardVisitor();
        attributes.accept(fcv);
        var sAttributes = fcv.result;
        var sFilterCardName = cardName ? cardName : MriFrontendConfig.getFrontendConfig().getFilterCardByPath(configPath).getName();
        if (sAttributes) {
            sFilterCardName += ": ";
        }
        this.result = _createHtmlSpan(_escapeHtmlCharacters(sFilterCardName), "sapMriPaBmkDescrHead") + sAttributes;
    };

    Visitor.prototype.visitAttribute = function () {
        throw new Error("Unexpected");
    };

    Visitor.prototype.visitExpression = function () {
        throw new Error("Unexpected");
    };

    function FilterCardVisitor() {
        Visitor.call(this);
    }
    FilterCardVisitor.prototype = Object.create(Visitor.prototype);
    FilterCardVisitor.prototype.constructor = FilterCardVisitor;

    FilterCardVisitor.prototype._getVisitor = function () {
        return new FilterCardVisitor();
    };

    FilterCardVisitor.prototype.visitExpression = function () {
        throw new Error("Unexpected");
    };

    FilterCardVisitor.prototype.visitFilter = function () {
        throw new Error("Unexpected");
    };

    FilterCardVisitor.prototype.visitAnd = function (andContent) {
        var res = this._visitAll(andContent);
        this.result = res.filter(_checkValidStrings).join("");
    };

    FilterCardVisitor.prototype.visitOr = function (orContent) {
        var res = this._visitAll(orContent);
        this.result = res.filter(_checkValidStrings).join("");
    };

    FilterCardVisitor.prototype.visitAttribute = function (configPath, instanceID, constraints) {
        var av;
        var oAttrConfig = MriFrontendConfig.getFrontendConfig().getAttributeByPath(configPath);
        if (oAttrConfig && oAttrConfig.getType() === sap.hc.mri.pa.ui.lib.CDMAttrType.Date) {
            av = new DateAttributeVisitor();
        } else if (oAttrConfig && oAttrConfig.getType() === sap.hc.mri.pa.ui.lib.CDMAttrType.Datetime) {
            av = new DateTimeAttributeVisitor();
        } else {
            av = new AttributeVisitor();
        }
        constraints.accept(av);
        var sConstraintsText = av.result;
        // check that the attribute has constraints and it's a config attribute
        if (sConstraintsText && oAttrConfig) {
            var sAttrName = oAttrConfig.getName();
            this.result = _createHtmlSpan(_escapeHtmlCharacters(sAttrName)) + sConstraintsText + _createHtmlSpan(_attributesSeparator);
        } else {
            this.result = "";
        }
    };

    function AttributeVisitor() {
        Visitor.call(this);
    }
    AttributeVisitor.prototype = Object.create(Visitor.prototype);
    AttributeVisitor.prototype.constructor = AttributeVisitor;

    AttributeVisitor.prototype._getVisitor = function () {
        return new AttributeVisitor();
    };

    AttributeVisitor.prototype.visitFilter = function () {
        throw new Error("Unexpected");
    };

    AttributeVisitor.prototype.visitFilterCard = function () {
        throw new Error("Unexpected");
    };

    AttributeVisitor.prototype.visitAttribute = function () {
        throw new Error("Unexpected");
    };

    AttributeVisitor.prototype.visitAnd = function (andContent) {
        var res = this._visitAll(andContent);
        this.result = res.filter(_checkValidStrings).join("");
    };

    AttributeVisitor.prototype.visitOr = function (orContent) {
        var res = this._visitAll(orContent);
        var aResults = res.filter(_checkValidStrings);
        var iOtherResults = 0;
        if (aResults.length > _maxAttributeTags) {
            iOtherResults = aResults.length - _maxAttributeTags;
            aResults = aResults.slice(0, _maxAttributeTags);
        }
        this.result = aResults.join("") + (iOtherResults > 0 ? _createHtmlSpan(_morePlaceholder) : "");
    };

    AttributeVisitor.prototype.visitExpression = function (comparisonOperation, comparisonValue) {
        var sExpressionText;
        switch (comparisonOperation) {
            case "=":
            case "contains":
                sExpressionText = String(comparisonValue);
                break;
            default:
                sExpressionText = comparisonOperation + String(comparisonValue);
        }

        this.result = _createHtmlSpan(_escapeHtmlCharacters(sExpressionText), "sapMriPaValidTagStyle");
    };

    function DateAttributeVisitor() {
        AttributeVisitor.call(this);
    }

    DateAttributeVisitor.prototype = Object.create(AttributeVisitor.prototype);

    DateAttributeVisitor.prototype.constructor = DateAttributeVisitor;

    DateAttributeVisitor.prototype._getVisitor = function () {
        return new DateAttributeVisitor();
    };

    DateAttributeVisitor.prototype.visitExpression = function (comparisonOperation, comparisonValue) {
        var dValue = Utils.parseISODate(comparisonValue);
        var sExpressionText;
        var sDateValue;
        if (dValue) {
            sDateValue = Utils.formatDate(dValue);
        } else {
            sDateValue = comparisonValue;
        }
        sExpressionText = comparisonOperation + String(sDateValue);
        this.result = _createHtmlSpan(_escapeHtmlCharacters(sExpressionText), "sapMriPaValidTagStyle");
    };

    function DateTimeAttributeVisitor() {
        AttributeVisitor.call(this);
    }

    DateTimeAttributeVisitor.prototype = Object.create(AttributeVisitor.prototype);

    DateTimeAttributeVisitor.prototype.constructor = DateTimeAttributeVisitor;

    DateTimeAttributeVisitor.prototype._getVisitor = function () {
        return new DateTimeAttributeVisitor();
    };

    DateTimeAttributeVisitor.prototype.visitExpression = function (comparisonOperation, comparisonValue) {
        var dValue = Utils.parseISODate(comparisonValue);
        var sExpressionText;
        var sDateValue;
        if (dValue) {
            sDateValue = Utils.formatDateTime(dValue);
        } else {
            sDateValue = comparisonValue;
        }
        sExpressionText = comparisonOperation + String(sDateValue);
        this.result = _createHtmlSpan(_escapeHtmlCharacters(sExpressionText), "sapMriPaValidTagStyle");
    };

    function ifr2text(ifr) {
        var ov = new Visitor();
        ifr.accept(ov);
        return ov.result;
    }

    return ifr2text;
});
