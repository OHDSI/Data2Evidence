sap.ui.define([
    "sap/hc/mri/pa/ui/lib/MriFrontendConfig",
    "./InternalFilterRepresentation"
], function (MriFrontendConfig, InternalFilterRepresentation) {
    "use strict";

    function _andBooleanArray(aBoolVals) {
        return aBoolVals.reduce(function (bPrevious, bCurrent) {
            return bPrevious && bCurrent;
        }, true);
    }

    function _isInternalAttribute(sAttrKey) {
        return sAttrKey === "_absTime";
    }

    function ValidatorVisitor() {
        // Empty constructor
    }

    function _visit(visitable) {
        var tempVisitor = new ValidatorVisitor();
        visitable.accept(tempVisitor);
        return tempVisitor.result;
    }

    function _visitAll(listOfVisitables) {
        var result = [];
        listOfVisitables.forEach(function (visitable) {
            result.push(_visit(visitable));
        }, this);
        return result;
    }

    ValidatorVisitor.prototype.visitFilter = function (configMetadata, cards) {
        this.result = _visit(cards);
    };

    ValidatorVisitor.prototype.visitAnd = function (andContent) {
        var res = _visitAll(andContent);
        this.result = _andBooleanArray(res);
    };

    ValidatorVisitor.prototype.visitOr = function (orContent) {
        if (orContent.length && orContent[0] instanceof InternalFilterRepresentation.FilterCard) {
            this.result = false;
            return;
        }

        var res = _visitAll(orContent);
        this.result = _andBooleanArray(res);
    };

    ValidatorVisitor.prototype.visitNot = function (notContent) {
        var res = _visitAll(notContent);
        this.result = _andBooleanArray(res);
    };

    ValidatorVisitor.prototype.visitFilterCard = function (configPath, instanceNumber, instanceID, name, successor, advanceTimeFilter, parentInteraction, attributes) {
        // check that the config recognizes this filter card
        var oFcConfig = MriFrontendConfig.getFrontendConfig().getFilterCardByPath(configPath);
        if (oFcConfig) {
            // the filter card exist in the config - continue to check attribute level
            this.result = _visit(attributes);
        } else {
            // filter card not found in config - not valid
            this.result = false;
        }
    };

    ValidatorVisitor.prototype.visitAttribute = function (configPath) {
        var oAttrConfig = MriFrontendConfig.getFrontendConfig().getAttributeByPath(configPath);

        // check for annotated attribute config path
        if (!oAttrConfig) {
            var attribute = MriFrontendConfig.getFrontendConfig().getAttributeByAnnotatedPath(configPath);
            //  annotation should be unique, therefore only one attribute should possess that particular annotation value
            if (attribute.length === 1) {
                var pathToken = configPath.split(".");
                pathToken.pop();
                pathToken.push(attribute[0]);
                oAttrConfig = MriFrontendConfig.getFrontendConfig().getAttributeByPath(pathToken.join("."));
            }
        }

        var bIsInternalAttribute = _isInternalAttribute(MriFrontendConfig.getFrontendConfig().getAttributeKeyFromPath(configPath));
        if (oAttrConfig || bIsInternalAttribute) {
            // attribute exists in the config - continue to check attribute level
            this.result = true;
        } else {
            // attribute not found in config - not valid
            this.result = false;
        }
    };

    ValidatorVisitor.prototype.visitExpression = function () {
        throw new Error("Unexpected");
    };

    function ifrConfigValidator(ifr) {
        var vv = new ValidatorVisitor();
        ifr.accept(vv);
        return vv.result;
    }

    return ifrConfigValidator;
});
