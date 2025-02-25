sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "sap/hc/hph/core/ui/odata/ODataModel",
    "sap/ui/model/resource/ResourceModel",
    "sap/hc/hph/collections/ui/components/collectionsManager/util/Formatters"
], function (jQuery, Utils, MessageBox, MessageToast, UIComponent, JSONModel, ODataModel, ResourceModel, Formatter) {
    "use strict";

    var Component = UIComponent.extend("sap.hc.mri.pa.ui.collection.Component", {
        metadata: {
            version: "${version}",
            dependencies: {
                libs: [
                    "sap.m",
                    "sap.ui.core"
                ],
                ui5version: "1.28.29"
            },
            config: {
                resourceBundle: "i18n/text.properties",
                serviceUrl: "/sap/hc/hph/collections/odata/Collections.xsodata",
                patientCountUrl: "/sap/hc/mri/pa/services/analytics.xsjs?action=totalpcount"
            }
        }
    });

    /** @constant {Number} Max length of cohort title. */
    var TITLE_MAX_LENGTH = 256;

    /**
     * Initialize the component.
     * Creates the Dialog from the fragment definition and sets the models.
     * Does not create any View or UI.
     * @override
     */
    Component.prototype.init = function () {
        UIComponent.prototype.init.apply(this, arguments);
        var that = this;
        var mConfig = this.getMetadata().getConfig();
        var oModel = new ODataModel(mConfig.serviceUrl, true);
        this.setModel(oModel);
        
        oModel.attachRequestCompleted(function(){
            var col = Object.keys(oModel.oData).map(function(c) {
                return { value: oModel.oData[c].Id, text: Formatter.getCohortFullName.call(that, oModel.oData[c].Title, oModel.oData[c].CreatedBy, oModel.oData[c].full_name) }
            });
            sap.ui.getCore().getEventBus().publish('VUE_ADD_COHORT_OLD_COLLECTION', col);
        });

        this.setModel(new ResourceModel({
            bundleUrl: jQuery.sap.getModulePath("sap.hc.mri.pa.ui.collection") + "/" + mConfig.resourceBundle
        }), "i18n");
        this.setModel(new ResourceModel({
            bundleUrl: jQuery.sap.getModulePath("sap.hc.hph.collections.ui.components.collectionsManager") + "/" + mConfig.resourceBundle
        }), "Collectionsi18n");

        this._oDialog = sap.ui.xmlfragment("sap.hc.mri.pa.ui.collection.views.Dialog", this);
        this._oDialog.addStyleClass(Utils.getContentDensityClass());
        this._oDialog.setModel(this.getModel("i18n"), "i18n");
        this._oDialog.setModel(this.getModel());
        var that = this;
        sap.ui.getCore().getEventBus().subscribe('VUE_ADD_COHORT_OPENDIALOG', function(channel, event) {
            that.vueOpenDialog();
        });
    };

    /**
     * Opens the Dialog and with an empty selection model.
     * Can take a callback function to enable custom behavior for AddingToCollections functionality.
     * The function can be async and return a promise or has to return the success as Boolean.
     * The user will be notified about the outcome of the function.
     * @param {Function} fCallback Callback function to execute on Dialog confirm
     * @param {Boolean}  bAsync    True if callback function returns a promise
     */
    Component.prototype.openDialog = function (fCallback, bAsync) {
        this._mCallback = {
            function: fCallback,
            async: bAsync
        };

        var oModel = this.getModel();
        oModel.refresh();
        this._oDialog.setBusy(false);
        this._oDialog.setModel(new JSONModel({
            subset: true,
            total: false,
            newCollection: true,
            oldCollection: false,
            subsetCount: this.getModel("i18n").getResourceBundle().getText("MRI_PA_COLL_CALCULATING"),
            totalCount: this.getModel("i18n").getResourceBundle().getText("MRI_PA_COLL_CALCULATING"),
            hasExistingCollections: false
        }), "selection");

        // get FilterObject
        var oIFR = this.getModel("IFRModel").getData();
        // the patient count request (not guarded) but without censoring
        oIFR.disableCensoring = true;
        oIFR.guarded = false;

        this._firePCountRequest(oIFR, "/totalCount");
        // the patient count request (guarded)
        oIFR.guarded = true;

        this._firePCountRequest(oIFR, "/subsetCount");

        // enable EXISTING_COLLECTION radio button if there are existing collections
        var oSelectionModel = this._oDialog.getModel("selection");
        new sap.ui.model.Binding(oModel, "/", oModel.getContext("/")).attachChange(function (oEvent) {
            if (Object.getOwnPropertyNames(oEvent.getSource().getModel().getProperty("/")).length) {
                oSelectionModel.setProperty("/hasExistingCollections", true, true);
            }
        });

        this._oDialog.open();
    };

    Component.prototype.vueOpenDialog = function () {
        var oModel = this.getModel();
        oModel.refresh();
    };

    /**
     * Formatter for the enabled state of the Dialog Ok-Button.
     * The Button is only enabled if one of the RadioButtons has been chosen and an acceptable value has been entered.
     * @param   {Boolean} bOldCollection Select state of the "existing Collection" RadioButton
     * @param   {Boolean} bNewCollection Select state of the "create Collection" RadioButton
     * @param   {String}  sId            SelectedKey of the "existing Collection" ComboBox (therefore a CollectionId)
     * @param   {String}  sTitle         Value of the "create Collection" Input (a CollectionTitle)
     * @returns {Boolean} Enabled state of the Ok-Button
     */
    Component.prototype.formatButtonEnabled = function (bOldCollection, bNewCollection, sId, sTitle) {
        var bUseOldCollection = bOldCollection && Boolean(sId);
        var bUseNewCollection = bNewCollection && Boolean(sTitle) && sTitle.length <= TITLE_MAX_LENGTH;
        return bUseOldCollection || bUseNewCollection;
    };

    /**
     * Formatter for the value state of the title Input.
     * The state will be set to Error if the value of the Input is longer that the allowed maximum.
     * @param   {String}                           sTitle         Value of the "New Cohort" Input
     * @param   {Boolean}                          bNewCollection Select state of the "New Cohort" RadioButton
     * @returns {sap.ui.core.ValueState|undefined} Error or undefined.
     */
    Component.prototype.formatTitleValueState = function (sTitle, bNewCollection) {
        if (bNewCollection && sTitle && sTitle.length > TITLE_MAX_LENGTH) {
            return sap.ui.core.ValueState.Error;
        }
    };

    /**
     * Formatter for the value state text of the title Input.
     * @param   {String}           sTitle sTitle Value of the "New Cohort" Input
     * @returns {String|undefined} Value state text or undefined.
     */
    Component.prototype.formatTitleValueStateText = function (sTitle) {
        if (sTitle && sTitle.length > TITLE_MAX_LENGTH) {
            return this.getModel("i18n").getResourceBundle().getText("MRI_PA_COLL_TITLE_MAX_LENGTH", [TITLE_MAX_LENGTH]);
        }
    };

    /**
     * Handler for the Dialog Ok-Button press.
     * Executes the defined callback function if available and notifies user about the outcome.
     */
    Component.prototype.onOkButtonPress = function () {
        if (typeof this._mCallback === "object" && typeof this._mCallback.function === "function") {
            this._oDialog.setBusy(true);
            var oModel = this._oDialog.getModel("selection");
            var bNew = oModel.getProperty("/newCollection");
            var bGuarded = oModel.getProperty("/subset");
            var sCollection = bNew ? oModel.getProperty("/collectionTitle") : oModel.getProperty("/collectionId");

            if (this._mCallback.async) {
                var that = this;
                this._mCallback.function(bNew, sCollection, bGuarded).done(function () {
                    that._onAddToCollectionSuccess(bNew, sCollection);
                }).fail(function () {
                    that._onAddToCollectionFailure(bNew);
                });
            } else {
                var bSuccess = this._mCallback.function(bNew, sCollection, bGuarded);
                if (bSuccess) {
                    this._onAddToCollectionSuccess(bNew);
                } else {
                    this._onAddToCollectionFailure(bNew);
                }
            }
        }
        // FUTURE: Add standard behavior.
    };

    /**
     * Notifies the user of "Add to Collection" success.
     * @private
     * @param {Boolean} bNew   True, if a new collection has been created
     * @param {String}  sTitle Title of the new collection or "undefined"
     */
    Component.prototype._onAddToCollectionSuccess = function (bNew, sTitle) {
        this._oDialog.close();
        var oRB = this.getModel("i18n").getResourceBundle();
        var sMessage = bNew ? oRB.getText("MRI_PA_COLL_SUCCESS_CREATE_AND_ADD", sTitle) : oRB.getText("MRI_PA_COLL_SUCCESS_ADD_PATIENT");
        MessageToast.show(sMessage);
    };

    /**
     * Notifies the user of "Add to Collection" failure.
     * @private
     * @param {Boolean} bNew True, if a new collection has been created
     */
    Component.prototype._onAddToCollectionFailure = function (bNew) {
        this._oDialog.close();
        var oRB = this.getModel("i18n").getResourceBundle();
        var oRBCollections = this.getModel("Collectionsi18n").getResourceBundle();
        var sMessage = bNew ? oRBCollections.getText("COLLECTIONEXISTS") : oRB.getText("MRI_PA_COLL_FAILURE_ADD_PATIENT");
        // FUTURE: SAPUI5 1.30 use sap.m.MessageBox.error
        MessageBox.show(sMessage, {
            icon: MessageBox.Icon.ERROR,
            styleClass: Utils.getContentDensityClass(),
            title: oRB.getText("MRI_PA_COLL_ERROR")
        });
    };

    /**
     * Handler for the Dialog Cancel-Button press.
     * Closes the Dialog.
     */
    Component.prototype.onCancelButtonPress = function () {
        this._oDialog.close();
    };

    /**
     * Fires a request to get the patient count and sets result to the given model property.
     * @private
     * @param {object[]} aFilterObject  Filter for the request
     * @param {String}   sModelProperty Save response under this property name
     */
    Component.prototype._firePCountRequest = function (aFilterObject, sModelProperty) {
        Utils.ajax({
            type: "POST",
            url: this.getMetadata().getConfig().patientCountUrl,
            contentType: "application/json;charset=utf-8",
            data: JSON.stringify(aFilterObject)
        }).done(jQuery.proxy(function (mResponse) {
            var iPatientCount = mResponse.data[0]["patient.attributes.pcount"];
            this._oDialog.getModel("selection").setProperty(sModelProperty, iPatientCount);
        }, this));
    };

    /**
     * Formatter for the text of the RadioButtons (Amount of Patients to add to the Cohort).
     * The text consists of the i18n text and the number of patients who are available.
     * @param   {String}  sI18n   i18n text string
     * @param   {Integer} iAmount the amount of patients who are available
     * @returns {String}  the formatted string
     */
    Component.prototype.formatAmountText = function (sI18n, iAmount) {
        return jQuery.sap.formatMessage(sI18n, [iAmount]);
    };

    return Component;
});
