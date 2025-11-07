sap.ui.define([], function () {
  "use strict";

  var MessageStrip = sap.ui.layout.VerticalLayout.extend(
    "hc.hph.config.global.ui.lib.MessageStrip",
    {
      metadata: {
        properties: {
          text: {
            type: "string",
            defaultValue: "",
          },
        },

        aggregations: {},

        events: {},
      },
      renderer: function (rm, ctrl) {
        rm.write("<div");
        rm.writeControlData(ctrl);
        rm.writeClasses(ctrl);
        rm.write(">");
        rm.renderControl(ctrl.layout);
        rm.write("</div>");
      },
    }
  );

  MessageStrip.prototype.init = function () {
    this.textArea = new sap.m.Text({
      wrapping: true,
      enabled: false,
    });

    this.icon = new sap.ui.core.Icon({
      src: "sap-icon://error",
      size: "12pt",
    });

    this.layout = new sap.ui.layout.HorizontalLayout({
      width: "100%",
      content: [this.icon, this.textArea],
    });

    this.addStyleClass("sapMeValidityElem");
  };

  MessageStrip.prototype.setText = function (newText) {
    var textList = newText.trim().split(" ");
    if (textList.length > 0) {
      newText = textList[0];
    }
    var translatedText =
      this.getModel("i18n")._oResourceBundle.getText(newText);
    this.setProperty("text", newText);
    this.textArea.setText(translatedText);
    this.textArea.setTooltip(translatedText);
  };

  MessageStrip.prototype.onBeforeRendering = function () {
    this.removeStyleClass("sapMeValid");
    this.removeStyleClass("sapMeInvalid");
    this.removeStyleClass("sapMeWarning");

    if (this.getText().trim() === "") {
      this.addStyleClass("sapMeValid");
    } else {
      this.addStyleClass("sapMeInvalid");
    }
  };

  return MessageStrip;
});
