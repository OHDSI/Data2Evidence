/* -----------------------------------------------------------------------------------
 * Hint: This is a derived (generated) file. Changes should be done in the underlying
 * source files only (*.type, *.js) or they will be lost after the next generation.
 * ----------------------------------------------------------------------------------- */
/**
 * Initialization Code and shared classes of library com.sap.it.spc.webui.mapping (0.0)
 */
jQuery.sap.declare("com.sap.it.spc.webui.mapping.library");
jQuery.sap.require("sap.ui.core.Core");
/**
 * [Enter description for com.sap.it.spc.webui.mapping]
 *
 * @namespace
 * @name com.sap.it.spc.webui.mapping
 * @public
 */
// library dependencies
jQuery.sap.require("sap.ui.core.library");
// delegate further initialization of this library to the Core
sap.ui.getCore().initLibrary({
  name: "com.sap.it.spc.webui.mapping",
  dependencies: ["sap.ui.core"],
  types: [],
  interfaces: [],
  controls: [
    "com.sap.it.spc.webui.mapping.ExtSearchField",
    "com.sap.it.spc.webui.mapping.InformationTable",
    "com.sap.it.spc.webui.mapping.MappingControl",
    "com.sap.it.spc.webui.mapping.MessageTreeTable",
  ],
  elements: [],
  version: "0.0",
});
