/* eslint no-use-before-define: [2, "nofunc"] */
sap.ui.define(function () {
    "use strict";

    function BaseVisitor(levelName, callbacks) {
        this._levelName = levelName;
        this._callbacks = callbacks;

        if (!callbacks) {
            callbacks = {};
        }

        this._onVisitFilter = returnNoOpIfUndefined(callbacks.onVisitFilter);
        this._onVisitFilterCard = returnNoOpIfUndefined(callbacks.onVisitFilterCard);
        this._onVisitAttribute = returnNoOpIfUndefined(callbacks.onVisitAttribute);
        this._onVisitExpression = returnNoOpIfUndefined(callbacks.onVisitExpression);
        this._onVisitAndStart = returnNoOpIfUndefined(callbacks.onVisitAndStart);
        this._onVisitAndEnd = returnNoOpIfUndefined(callbacks.onVisitAndEnd);
        this._onVisitOrStart = returnNoOpIfUndefined(callbacks.onVisitOrStart);
        this._onVisitOrEnd = returnNoOpIfUndefined(callbacks.onVisitOrEnd);
        this._onVisitNotStart = returnNoOpIfUndefined(callbacks.onVisitNotStart);
        this._onVisitNotEnd = returnNoOpIfUndefined(callbacks.onVisitNotEnd);

        function returnNoOpIfUndefined(callback) {
            if (!callback) {
                return noop;
            } else {
                return callback;
            }
        }

        function noop() { /* noop */ }
    }

    BaseVisitor.prototype.new = function (Type) {
        return new Type(this._callbacks);
    };

    BaseVisitor.prototype.visitFilter = function () {
        this._throwAreNotAllowed("Filters");
    };

    BaseVisitor.prototype.visitFilterCard = function () {
        this._throwAreNotAllowed("FilterCards");
    };

    BaseVisitor.prototype.visitAttribute = function () {
        this._throwAreNotAllowed("Attributes");
    };

    BaseVisitor.prototype.visitExpression = function () {
        this._throwAreNotAllowed("Expressions");
    };

    BaseVisitor.prototype._throwAreNotAllowed = function (type) {
        throw new IllegalStateException(type + " are not allowed on " + this._levelName + " level!");
    };

    BaseVisitor.prototype.visitAnd = function (andContent) {
        this._onVisitAndStart(andContent);
        this._visitAll(andContent);
        this._onVisitAndEnd();
    };

    BaseVisitor.prototype.visitOr = function (orContent) {
        this._onVisitOrStart(orContent);
        this._visitAll(orContent);
        this._onVisitOrEnd();
    };

    BaseVisitor.prototype.visitNot = function (notContent) {
        this._onVisitNotStart(notContent);
        this._visitAll(notContent);
        this._onVisitNotEnd();
    };

    BaseVisitor.prototype._visitAll = function (listOfVisitables) {
        listOfVisitables.forEach(function (visitable) {
            this._visit(visitable);
        }, this);
    };

    BaseVisitor.prototype._visit = function (visitable) {
        visitable.accept(this);
    };


    function FilterVisitor(callbacks) {
        BaseVisitor.call(this, "Filter", callbacks);
    }

    FilterVisitor.prototype = Object.create(BaseVisitor.prototype);
    FilterVisitor.prototype.constructor = FilterVisitor;

    FilterVisitor.prototype.visitFilter = function (configMetadata, cards) {
        this._onVisitFilter(configMetadata, cards);
        cards.accept(this.new(FilterCardVisitor));
    };

    function FilterCardVisitor(callbacks) {
        BaseVisitor.call(this, "FilterCard", callbacks);
    }

    FilterCardVisitor.prototype = Object.create(BaseVisitor.prototype);
    FilterCardVisitor.prototype.constructor = FilterCardVisitor;


    FilterCardVisitor.prototype.visitFilterCard = function (configPath, instanceNumber, instanceID, name, successor, advanceTimeFilter, parentInteraction, attributes, inactive) {
        this._onVisitFilterCard(configPath, instanceNumber, instanceID, name, successor, advanceTimeFilter, parentInteraction, attributes, inactive);
        attributes.accept(this.new(AttributeVisitor));
    };

    function AttributeVisitor(callbacks) {
        BaseVisitor.call(this, "Attribute", callbacks);
    }

    AttributeVisitor.prototype = Object.create(BaseVisitor.prototype);
    AttributeVisitor.prototype.constructor = AttributeVisitor;


    AttributeVisitor.prototype.visitAttribute = function (configPath, instanceID, constraints) {
        this._onVisitAttribute(configPath, instanceID, constraints);
        constraints.accept(this.new(ExpressionVisitor));
    };

    function ExpressionVisitor(callbacks) {
        BaseVisitor.call(this, "Expression", callbacks);
    }

    ExpressionVisitor.prototype = Object.create(BaseVisitor.prototype);
    ExpressionVisitor.prototype.constructor = ExpressionVisitor;


    ExpressionVisitor.prototype.visitExpression = function (operator, value) {
        this._onVisitExpression(operator, value);
    };

    function IllegalStateException() {
        var error = Error.apply(this, arguments);

        this.name = "IllegalStateException";
        this.message = error.message;
        this.stack = error.stack;
    }

    IllegalStateException.prototype = Object.create(Error.prototype);
    IllegalStateException.prototype.constructor = IllegalStateException;

    return {
        FilterVisitor: FilterVisitor,
        FilterCardVisitor: FilterCardVisitor,
        AttributeVisitor: AttributeVisitor,
        ExpressionVisitor: ExpressionVisitor,
        IllegalStateException: IllegalStateException
    };
});
