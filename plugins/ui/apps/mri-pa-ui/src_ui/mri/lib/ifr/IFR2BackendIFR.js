/* eslint no-use-before-define: [2, "nofunc"] */
sap.ui.define([
    "./BooleanContainers",
    "./InternalFilterRepresentation",
    "sap/hc/mri/pa/ui/Utils",
    "sap/hc/mri/pa/ui/lib/MriFrontendConfig",
    "sap/hc/mri/pa/ui/lib/VariantValidator"
], function (BooleanContainers, IFR, Utils, MriFrontendConfig, VariantValidator) {
    "use strict";

    function _isLocationConstraint(configPath) {
        var oAttrConfig = MriFrontendConfig.getFrontendConfig().getAttributeByPath(configPath);
        return oAttrConfig && oAttrConfig.hasAnnotation("genomics_variant_location");
    }

    function FilterVisitor() {
        this.request = {};
    }

    FilterVisitor.prototype.visitFilter = function (mConfigMetadata, oCards) {
        this.request = new IFR.Filter({
            cards: this._visit(oCards),
            configMetadata: new IFR.ConfigMetadata(mConfigMetadata.version, mConfigMetadata.id)
        });
    };

    FilterVisitor.prototype.visitAnd = function (aAndContent) {
        this.request = new BooleanContainers.And(aAndContent.map(function (visitable) {
            return this._visit(visitable);
        }, this));
    };

    FilterVisitor.prototype.visitOr = function (aOrContent) {
        this.request = new BooleanContainers.Or(aOrContent.map(function (visitable) {
            return this._visit(visitable);
        }, this));
    };

    FilterVisitor.prototype.visitNot = function (aNotContent) {
        this.request = new BooleanContainers.Not([this._visit(aNotContent[0], true)]);
    };

    FilterVisitor.prototype.visitFilterCard = function (sConfigPath, iInstanceNumber, sInstanceID, sCardName, oSuccessor, oAdvanceTimeFilter, oParentInteraction, oAttributes, bInactive) {
        this.request = new IFR.FilterCard({
            configPath: sConfigPath,
            instanceNumber: iInstanceNumber,
            instanceID: sInstanceID,
            name: sCardName,
            successor: oSuccessor,
            advanceTimeFilter: oAdvanceTimeFilter,
            parentInteraction: oParentInteraction,
            attributes: this._visit(oAttributes),
            inactive: bInactive
        });
    };

    FilterVisitor.prototype.visitAttribute = function (sConfigPath, sInstanceID, constraints) {
        var params = {
            configPath: sConfigPath,
            instanceID: sInstanceID,
            constraints: constraints
        };

        if (_isLocationConstraint(sConfigPath)) {
            var expressionRequest = this._visit(constraints, false, true);
            params.constraints = expressionRequest;
        }

        this.request = new IFR.Attribute(params);
    };

    FilterVisitor.prototype._visit = function (visitable, negated, isLocation) {
        var tempVisitor = this._getInstance(negated, isLocation);
        visitable.accept(tempVisitor);
        return tempVisitor.request;
    };

    FilterVisitor.prototype._getInstance = function (negated, isLocation) {
        if (isLocation) {
            return new LocationVisitor();
        } else {
            return new FilterVisitor();
        }
    };

    function LocationVisitor() {
        FilterVisitor.call(this);
    }

    LocationVisitor.prototype = Object.create(FilterVisitor.prototype);
    LocationVisitor.prototype.constructor = LocationVisitor;

    LocationVisitor.prototype.visitExpression = function (comparisonOperation, comparisonValue) {
        var mValidationResult = VariantValidator.validateFromCache(comparisonValue);
        this.request = new BooleanContainers.And([new IFR.Expression({
            operator: ">=",
            value: mValidationResult.positionStart
        }), new IFR.Expression({
            operator: "<=",
            value: mValidationResult.positionEnd
        })]);
    };

    LocationVisitor.prototype._getInstance = function () {
        return new LocationVisitor();
    };

    /**
     * Traverses through IFR, allows for value and structural modifications before it is sent as request
     * @param   {object}    oIFR                IFR object
     * @returns {object}    request             Backend IFR request object
     */
    function ifr2backendifr(oIFR) {
        var oFilterVisitor = new FilterVisitor();
        oIFR.accept(oFilterVisitor);
        Object.keys(oIFR).filter(function (key) {
            return !(key === "cards" || key === "configMetadata");
        }).forEach(function (key) {
            oFilterVisitor.request[key] = oIFR[key];
        });
        return oFilterVisitor.request;
    }

    return ifr2backendifr;
});
