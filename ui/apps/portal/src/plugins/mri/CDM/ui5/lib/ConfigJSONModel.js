sap.ui.define([
    "sap/ui/model/json/JSONModel"
], function (JSONModel) {
    "use strict";

    var model = JSONModel.extend("ConfigJSONModel", {
        constructor: function() {
            JSONModel.apply(this, arguments);

            this.setSizeLimit(1000);
            return this;
        },
        setProperty: function(path, data) {
            JSONModel.prototype.setProperty.apply(this, arguments);
            //TODO: IMPLEMENT AUTO SAVE HERE
            //console.log("path: " + path + ":" + ( typeof data === "object" ?  JSON.stringify(data) : data));
            return this;
        }

    });

    return model;

});