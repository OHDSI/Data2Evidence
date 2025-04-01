/* eslint no-use-before-define: [2, "nofunc"] */
sap.ui.define([
    "sap/hc/mri/pa/ui/lib/ifr/BooleanContainers",
    "sap/hc/mri/pa/ui/lib/ifr/InternalFilterRepresentation"
], function (BooleanContainers, IFR) {
    "use strict";

    function inheritsFrom(Childclass, Baseclass) {
        Childclass.prototype = Object.create(Baseclass.prototype);
        Childclass.prototype.constructor = Childclass;
    }

    function DirectBuildContainer() {
        this._content = null;
    }

    DirectBuildContainer.prototype.build = function () {
        if (this._content !== null) {
            return this._content.build();
        } else {
            return new BooleanContainers.Empty();
        }
    };

    DirectBuildContainer.prototype.add = function (newContent) {
        if (this._content !== null) {
            throw new Error("Cannot add more than one element!");
        }

        this._content = newContent;
    };

    function WrappedBuildContainer(BooleanContainerType) {
        this._content = [];
        this._BooleanContainerType = BooleanContainerType;
    }

    WrappedBuildContainer.prototype.build = function () {
        var containerContent = this._content.map(function (element) {
            return element.build();
        });

        return new this._BooleanContainerType(containerContent);
    };

    WrappedBuildContainer.prototype.add = function (newContent) {
        this._content.push(newContent);
    };

    function AndContainer() {
        WrappedBuildContainer.call(this, BooleanContainers.And);
    }
    inheritsFrom(AndContainer, WrappedBuildContainer);

    function OrContainer() {
        WrappedBuildContainer.call(this, BooleanContainers.Or);
    }
    inheritsFrom(OrContainer, WrappedBuildContainer);

    function NotContainer() {
        WrappedBuildContainer.call(this, BooleanContainers.Not);
    }
    inheritsFrom(NotContainer, WrappedBuildContainer);


    function BaseBuilder(parent, container) {
        this._parent = parent;
        this._container = container || new DirectBuildContainer();
        this._builderParameters = {};
    }

    BaseBuilder.prototype.addAnd = function () {
        return this._addContainer(new AndContainer());
    };

    BaseBuilder.prototype.addOr = function () {
        return this._addContainer(new OrContainer());
    };

    BaseBuilder.prototype.addNot = function () {
        return this._addContainer(new NotContainer());
    };

    BaseBuilder.prototype._addContainer = function (newContainer) {
        this._container.add(newContainer);
        return new this.constructor(this, newContainer);
    };


    BaseBuilder.prototype.setParameters = function (parameters) {
        this._builderParameters = parameters;
        return this;
    };

    BaseBuilder.prototype.up = function () {
        return this._parent;
    };

    /*
    TODO
        FilterBuilder.prototype.up = function () {
            throw new Error("Cannot go up on Filter level!");
        };
     */

    function FilterBuilder() {
        BaseBuilder.apply(this, arguments);
    }

    inheritsFrom(FilterBuilder, BaseBuilder);

    FilterBuilder.prototype.addFilterCard = function () {
        var subBuilder = new FilterCardBuilder(this);
        this._container.add(subBuilder);
        return subBuilder;
    };

    FilterBuilder.prototype.build = function () {
        return new IFR.Filter({
            configMetadata: this._builderParameters.configMetadata || new IFR.ConfigMetadata(),
            cards: this._container.build()
        });
    };

    function FilterCardBuilder() {
        BaseBuilder.apply(this, arguments);
    }

    inheritsFrom(FilterCardBuilder, BaseBuilder);

    FilterCardBuilder.prototype.build = function () {
        return new IFR.FilterCard({
            configPath: this._builderParameters.configPath || "",
            instanceNumber: this._builderParameters.instanceNumber || 0,
            instanceID: this._builderParameters.instanceID || "",
            name: this._builderParameters.name || "",
            successor: this._builderParameters.successor || null,
            advanceTimeFilter: this._builderParameters.advanceTimeFilter || null,
            parentInteraction: this._builderParameters.parentInteraction || "",
            attributes: this._container.build(),
            inactive: this._builderParameters.inactive || false
        });
    };

    FilterCardBuilder.prototype.addAttribute = function () {
        var subBuilder = new AttributeBuilder(this);
        this._container.add(subBuilder);
        return subBuilder;
    };

    function AttributeBuilder() {
        BaseBuilder.apply(this, arguments);
    }

    inheritsFrom(AttributeBuilder, BaseBuilder);

    AttributeBuilder.prototype.build = function () {
        return new IFR.Attribute({
            configPath: this._builderParameters.configPath || "",
            instanceID: this._builderParameters.instanceID || "",
            constraints: this._container.build()
        });
    };

    AttributeBuilder.prototype.addExpression = function (operation, value) {
        var subBuilder = new ExpressionBuilder(this, operation, value);
        this._container.add(subBuilder);
        return subBuilder;
    };

    function ExpressionBuilder(parent, operator, value) {
        this._parent = parent;
        this._builderParameters = {
            operator: operator,
            value: value
        };
    }

    ExpressionBuilder.prototype.build = function () {
        return new IFR.Expression({
            operator: typeof this._builderParameters.operator !== "undefined" ? this._builderParameters.operator : "=",
            value: typeof this._builderParameters.value !== "undefined" ? this._builderParameters.value : 0
        });
    };

    ExpressionBuilder.prototype.setParameters = BaseBuilder.prototype.setParameters;

    ExpressionBuilder.prototype.up = BaseBuilder.prototype.up;

    return {
        FilterBuilder: FilterBuilder
    };
});
