jQuery.sap.declare("com.sap.it.spc.webui.mapping.MappingControlRenderer");
/**
 * @class Mapping renderer.
 * @static
 */
com.sap.it.spc.webui.mapping.MappingControlRenderer = {};
/**
 * Renders the HTML for the given control, using the provided {@link sap.ui.core.RenderManager}.
 *
 * @param {sap.ui.core.RenderManager} oRm the RenderManager that can be used for writing to the render output buffer
 * @param {sap.ui.core.Control} oControl an object representation of the control that should be rendered
 */
com.sap.it.spc.webui.mapping.MappingControlRenderer.render = function (
  oRm,
  oControl
) {
  // write the HTML into the render manager
  oRm.write("<div");
  oRm.writeControlData(oControl);
  oRm.addClass("webuiMapping");
  oRm.writeClasses();
  if (oControl.getWidth()) {
    oRm.addStyle("width", oControl.getWidth());
  }
  if (oControl.getHeight()) {
    oRm.addStyle("height", oControl.getHeight());
  }
  oRm.writeStyles();
  oRm.write(">");
  oRm.renderControl(oControl.getAggregation("_layout"));
  oRm.write("</div");
};
