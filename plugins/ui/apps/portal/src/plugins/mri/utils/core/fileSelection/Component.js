/****   component wrapper for the fileSelector to be extended for all plugins ****/
jQuery.sap.declare("hc.hph.core.ui.fileSelection.Component");
jQuery.sap.registerModulePath("hc.hph", "/sap/hc/hph");
jQuery.sap.registerModulePath("hc.hph.core.ui", "/hc/hph/core/ui");
jQuery.sap.registerModulePath(
  "hc.hph.di.cockpit.ui.Component",
  "/hc/hph/di/cockpit/ui/Component"
);
jQuery.sap.registerModulePath(
  "hc.hph.core.ui.maptool.lib",
  "/hc/hph/core/ui/maptool/lib"
);
jQuery.sap.registerModulePath(
  "hc.hph.di.cockpit.ui.util",
  "/hc/hph/di/cockpit/ui/util"
);
jQuery.sap.registerModulePath(
  "hc.hph.genomics.ui.lib.plugins",
  "/hc/hph/genomics/ui/lib/plugins"
);
jQuery.sap.registerModulePath(
  "hc.hph.core.cockpit.ui.view",
  "/hc/hph/core/cockpit/ui/view"
);
jQuery.sap.registerModulePath(
  "hc.hph.core.ui.fileSelection",
  "/hc/hph/core/ui/fileSelection"
);
jQuery.sap.registerModulePath(
  "hc.hph.core.ui.fileSelection.view.FileSelect",
  "/hc/hph/core/ui/fileSelection/view/FileSelect"
);
jQuery.sap.registerModulePath(
  "hc.hph.plugins.vcf.ui",
  "/hc/hph/plugins/vcf/ui"
);
jQuery.sap.registerModulePath(
  "hc.hph.plugins.vcf.ui.view",
  "/hc/hph/plugins/vcf/ui/view"
);
jQuery.sap.registerModulePath(
  "hc.hph.plugins.ped.ui.view",
  "/hc/hph/plugins/ped/ui/view"
);
jQuery.sap.registerModulePath(
  "com.sap.it.spc.webui.mapping",
  "/hc/hph/core/ui/maptool/com/sap/it/spc/webui/mapping"
);
jQuery.sap.includeStyleSheet(
  "/hc/hph/core/ui/fileSelection/themes/style.css",
  "file_selector"
);
jQuery.sap.includeStyleSheet(
  "/hc/hph/core/ui/maptool/com/sap/it/spc/webui/mapping/themes/sap_bluecrystal/library.css",
  "blue_style1"
);
jQuery.sap.require("sap.m.MessageBox");
jQuery.sap.require("sap/ui/model/json/JSONModel");
jQuery.sap.require("hc.hph.genomics.ui.icons.sap-hc-hph-genomics-icons");
sap.ui.core.UIComponent.extend("hc.hph.core.ui.fileSelection.Component", {
  metadata: {
    properties: {
      path: {
        type: "string",
        defaultValue: "",
      },
      service: {
        type: "string",
        defaultValue: "",
      },
      secondViewId: {
        type: "string",
        defaultValue: "",
      },
      secondViewName: {
        type: "string",
        defaultValue: "",
      },
    },
  },
  createContent: function () {
    // create the root view
    if (!this.runview) {
      this.runview = sap.ui.view({
        id: this.getId(),
        viewName: "hc.hph.core.ui.fileSelection.view.FileSelect",
        type: sap.ui.core.mvc.ViewType.XML,
      });
    }
    // set the i18n model
    var i18nModel = new sap.ui.model.resource.ResourceModel({
      bundleUrl:
        "/hc/hph/genomics/ui/i18n/plugins/messagebundle.hdbtextbundle",
    });
    this.runview.setModel(i18nModel, "i18n");
    return this.runview;
  },
  onInitRunView: function (
    ProfileID,
    ExtensionID,
    appController,
    DIUtil,
    files
  ) {
    var viewId = this.getViewId();
    var runview = sap.ui.getCore().byId(viewId);
    var footer = runview.getContent()[0].getFooter();
    footer.insertContentRight(this.nextButton(appController, DIUtil), 0);
    DIUtil.submitButton().setVisible(false);
    sap.ui.getCore().byId("Next").setVisible(true);
    runview.getContent()[0].setFooter(footer);
    var oController = runview.getController();
    oController.profileID = ProfileID;
    oController.oFileSelected = files;
    oController.testType = " ";
    oController.onInit();
    oController.onInitFiles({
      profileID: ProfileID,
      path: this.getPath(),
      service: "FileSelection.xsjs",
      remoteSourceParameter: this.getRemoteSourceParameter(),
      schemaNameParameter: this.getSchemaNameParameter(),
      tableNameParameter: this.getTableNameParameter(),
    });
  },
  onCancelRunView: function () {
    var that = this;
    var viewId = that.getViewId();
    var runview = sap.ui.getCore().byId(viewId);
    var oController = runview.getController();
    oController.onCancelFileInit();
    var secondView = sap.ui.getCore().byId(this.getSecondViewId());
    if (secondView) {
      secondView.destroy();
    }
  },
  onSubmitRunView: function () {
    var that = this;
    var viewId = that.getSecondViewId();
    //getViewId();
    var runview = sap.ui.getCore().byId(viewId);
    var oController = runview.getController();
    var oEventBus = sap.ui.getCore().getEventBus();
    oEventBus.unsubscribe(
      "UpdateChCount",
      oController.updateCount,
      oController
    );
    oEventBus.unsubscribe(
      "EnableDataImportButton",
      oController.updateOutModelFromView,
      oController
    );
    oEventBus.unsubscribe(
      "EnableDataImportButton",
      oController.enableDataImport,
      oController
    );
    var oFinalPayload = oController.oFinalPayload;
    runview.destroy();
    return {
      status: 200,
      additionalJSONParameters: oFinalPayload,
    };
  },
  addPageToApplication: function (oEvent, appController, DIUtil) {
    var that = this,
      viewId = that.getViewId(),
      runview = sap.ui.getCore().byId(viewId);
    var oController = runview.getController();
    var secondView = sap.ui.getCore().byId(that.getSecondViewId());
    if (!secondView) {
      secondView = sap.ui.view({
        id: that.getSecondViewId(),
        viewName: that.getSecondViewName(),
        type: sap.ui.core.mvc.ViewType.XML,
      });
    }
    var footer = runview.getContent()[0].getFooter();
    sap.ui.getCore().byId("Next").setVisible(false);
    DIUtil.submitButton().setVisible(true);
    DIUtil.submitButton().setEnabled(false);
    secondView.getContent()[0].setFooter(footer);
    secondView.getController().profileID = oController.profileID;
    // get the array of selected files from the first controller
    var oSelectedFiles = oController.getSelectedFiles();
    // only the path name should be passed to the parameters of the ajax call
    var aPath = [];
    for (var i = 0; i < oSelectedFiles.length; i++) {
      var sPath = oSelectedFiles[i].Path;
      aPath.push(sPath);
    }
    var oPathModel = new sap.ui.model.json.JSONModel(aPath);
    secondView.setModel(oPathModel, "pathModel");
    oSelectedFiles.Path = this.aSelectedFiles;
    secondView.getController().oSelectedFiles = oController.oSelectedFiles;
    secondView.getController().onInitInternal(DIUtil);
    appController
      .getOwnerComponent()
      .appcontroller.to(secondView.getId(), secondView);
  },
  getViewId: function () {
    var view = sap.ui.getCore().byId(this.runview.getId());
    if (!view) {
      view = sap.ui.view({
        id: this.getId(),
        viewName: "hc.hph.core.ui.fileSelection.view.FileSelect",
        type: sap.ui.core.mvc.ViewType.XML,
      });
    }
    var viewid = view.getId();
    return viewid;
  },
  nextButton: function (appController, DIUtil) {
    var nextButton = sap.ui.getCore().byId("Next");
    var that = this;
    if (!nextButton) {
      nextButton = new sap.m.Button({
        text: "{i18n>NEXT}",
        id: "Next",
        type: "Accept",
        enabled: false,
        press: function (oEvent) {
          var msg = that.runview.getModel("i18n").getProperty("MAP_PROCEED");
          sap.m.MessageToast.show(msg);
          that.addPageToApplication(oEvent, appController, DIUtil);
        },
      });
    }
    nextButton.setVisible(false);
    return nextButton;
  },
});
