sap.ui.define([
    "hc/hph/cdw/config/ui/lib/ParentMappings",
    "sap/ui/core/mvc/Controller"
], function (ParentMappings, Controller) {
    "use strict";

    var I18N_MODEL = "hc.hph.cdw.config.ui.i18n";
    var CONFIG_MODEL = "configEditorModel";

    var ParentMappingController = Controller.extend("hc.hph.cdw.config.ui.views.ParentMapping");

    ParentMappingController.prototype.onInit = function () {
        this._context = null;
        this.getView().setModel(new sap.ui.model.json.JSONModel({ options: [] }), "parentOptions");
        var editableModel = new sap.ui.model.json.JSONModel({ editable: true });
        editableModel.setDefaultBindingMode(sap.ui.model.BindingMode.OneWay);
        this.getView().setModel(editableModel, "editableModel");
    };

    ParentMappingController.prototype.showMapping = function (context) {
        this._context = context;
        this.getView().getModel("editableModel").setData({ editable: context.editable !== false });
        this.getView().bindElement({ path: context.path, model: CONFIG_MODEL });
        this._refreshOptions();
    };

    ParentMappingController.prototype._configModel = function () {
        return this.getView().getModel(CONFIG_MODEL);
    };

    ParentMappingController.prototype._refreshOptions = function () {
        var model = this._configModel();
        var options = ParentMappings.availableParents(
            model.getProperty(this._context.listPath),
            this._context.index,
            model.getProperty("/parentInteractions"),
            this._context.selfPath
        );
        this.getView().getModel("parentOptions").setData({ options: options });
    };

    ParentMappingController.prototype._text = function (key) {
        return this.getView().getModel(I18N_MODEL).getResourceBundle().getText(key);
    };

    ParentMappingController.prototype.onFieldChange = function () {
        if (!this._context) {
            return;
        }
        var model = this._configModel();
        var result = ParentMappings.validate(model.getProperty(this._context.listPath), this._text.bind(this));
        model.setProperty(this._context.listPath, result.items);
        this._refreshOptions();
    };

    return ParentMappingController;
});
