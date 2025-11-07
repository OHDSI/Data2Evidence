sap.ui.define([], function () {
    "use strict";

    /**
     * Create a new BooleanContainer.
     * @constructor
     * @param {any} content Container content
     *
     * @classdesc
     * Base Container for boolean Logic.
     * @alias sap.hc.mri.pa.ui.lib.ifr.BooleanContainers.BooleanContainer
     */
    function BooleanContainer(content) {
        this.content = content;
    }

    /**
     * Create a new And.
     * @constructor
     * @param {any} content Container content
     *
     * @classdesc
     * And Container for boolean Logic.
     * @alias sap.hc.mri.pa.ui.lib.ifr.BooleanContainers.And
     */
    function And(content) {
        BooleanContainer.call(this, content);
    }

    And.prototype = Object.create(BooleanContainer.prototype);
    And.prototype.constructor = And;

    And.prototype.accept = function (visitor) {
        visitor.visitAnd(this.content);
    };

    /**
     * Create a new Or.
     * @constructor
     * @param {any} content Container content
     *
     * @classdesc
     * Or Container for boolean Logic.
     * @alias sap.hc.mri.pa.ui.lib.ifr.BooleanContainers.Or
     */
    function Or(content) {
        BooleanContainer.call(this, content);
    }

    Or.prototype = Object.create(BooleanContainer.prototype);
    Or.prototype.constructor = Or;

    Or.prototype.accept = function (visitor) {
        visitor.visitOr(this.content);
    };

    /**
     * Create a new Not.
     * @constructor
     * @param {any} content Container content
     *
     * @classdesc
     * Not Container for boolean Logic.
     * @alias sap.hc.mri.pa.ui.lib.ifr.BooleanContainers.Not
     */
    function Not(content) {
        BooleanContainer.call(this, content);
    }

    Not.prototype = Object.create(BooleanContainer.prototype);
    Not.prototype.constructor = Not;

    Not.prototype.accept = function (visitor) {
        visitor.visitNot(this.content);
    };

    function Empty() {
        BooleanContainer.call(this);
    }

    Empty.prototype = Object.create(BooleanContainer.prototype);
    Empty.prototype.constructor = Empty;

    Empty.prototype.accept = function () {
        // noop
    };

    return {
        BooleanContainer: BooleanContainer,
        And: And,
        Or: Or,
        Not: Not,
        Empty: Empty
    };
});
