jQuery.sap.declare("com.sap.it.spc.webui.mapping.ExtSearchFieldRenderer");
jQuery.sap.require("sap.ui.core.Renderer");
jQuery.sap.require("sap.ui.commons.SearchFieldRenderer");
/**
 * @class ExtSearchField renderer.
 * @static
 */
com.sap.it.spc.webui.mapping.ExtSearchFieldRenderer =
  sap.ui.core.Renderer.extend(sap.ui.commons.SearchFieldRenderer);
/**
 * Renders the HTML for the given control, using the provided
 * {@link sap.ui.core.RenderManager}.
 *
 * @param {sap.ui.core.RenderManager}
 *            oRm the RenderManager that can be used for writing to the render
 *            output buffer
 * @param {sap.ui.core.Control}
 *            oControl an object representation of the control that should be
 *            rendered
 */
com.sap.it.spc.webui.mapping.ExtSearchFieldRenderer.render = function (
  oRm,
  oControl
) {
  if (!oControl.getVisible()) {
    return;
  }
  oRm.write("<div");
  oRm.writeControlData(oControl);
  oRm.addClass("webuiExtSearchField");
  oRm.addClass("sapUiSearchField");
  if (!oControl.getEditable() || !oControl.getEnabled()) {
    oRm.addClass("sapUiSearchFieldDsbl");
  }
  if (!oControl.hasListExpander()) {
    oRm.addClass("sapUiSearchFieldNoExp");
  }
  if (oControl.getEnableClear()) {
    oRm.addClass("sapUiSearchFieldClear");
  }
  if (oControl.getWidth()) {
    oRm.addStyle("width", oControl.getWidth());
  }
  oRm.writeClasses();
  oRm.writeStyles();
  oRm.write(">");
  oRm.renderControl(oControl._ctrl);
  if (oControl.getShowExternalButton()) {
    oRm.renderControl(oControl._btn);
  }
  if (oControl.getShowNavigationButtons()) {
    oRm.renderControl(oControl._btnPrev);
    oRm.renderControl(oControl._btnNext);
  }
  if (oControl.getInfoText()) {
    oRm.renderControl(oControl._infoTV);
  }
  oRm.write("</div>");
};
