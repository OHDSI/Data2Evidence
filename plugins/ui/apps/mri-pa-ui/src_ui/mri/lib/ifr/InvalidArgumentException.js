sap.ui.define([], function () {
    "use strict";

    function InvalidArgumentException() {
        var error = Error.apply(this, arguments);

        this.name = "InvalidArgumentException";
        this.message = error.message;
        this.stack = error.stack;
    }

    InvalidArgumentException.prototype = Object.create(Error.prototype);
    InvalidArgumentException.prototype.constructor = InvalidArgumentException;

    return InvalidArgumentException;
});
