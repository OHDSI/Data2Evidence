# Integration Guide for the Patient Summary Component

This document is supposed to give you an overview about the API offered/required by the Patient Summary Component and should enable you, to integrate Patient Summary in your own applications.

## API
### PS Properties
- **[required]** patientId
    + Details: Id of the patient to display. A change of this property leads to a reloading and rerending.
    + Type: "string"
- showHeader
    + Details: Whether to show the header with patient masterdata. A change of this property leads to a reloading and rerending.
    + Type: "boolean"
    + DefaultValue: true
- tab
    + Details: The selected tab.
    + Type: "string"
    + DefaultValue: "timeline"
- urlParams
    + Details: Maps navigation targets for tabs representing the application state to their values. Navigation targets are prefixed with the tab key.
    + Type: "object"
    + DefaultValue: {}
- [deprecated] navTargets
    + Details: Alias to urlParams

### PS Function API
- resetSettings()
    + Details: Resets all customized timeline settings.
- getTitle()
    + Details: Gets the title based on currently applicable configuration.
    + Returns: {string} Configured title
- openConfigSelectionDialog()
    + Details: Load the list of available configurations and open the selection Dialog.

### PS Events
- configSelectionFailed
```
/**
 * Event to be fired if the selection of the config fails.
 * This can have two reasons:
 * 1. There is no config assigned to the current user
 * 2. There are several configs assigned but the user cancelled the manual selection
 * The reasons are reflected in the parameter.
 */
configSelectionFailed: {
    parameters: {
        /**
         * True, if the user cancelled the config selection
         * @type {Boolean}
         */
        cancelled: {
            type: "boolean",
            default: false
        }
    }
}
```

- tabChange
```
/**
 * Event to be fired when the selected tab is changed.
 * Hint: You can also use a two-way binding of the tab property, to get updates of selected tab.
 */
tabChange: {
    parameters: {
        /**
         * The newly selected tab.
         * @type {sap.hc.hph.patient.app.ui.content.Component.Tab}
         */
        tab: {
            type: "sap.hc.hph.patient.app.ui.content.Component.Tab"
        }
    }
}
```

- beforeDataLoad
```
/**
 * Event to be fired before the patient masterdata has been loaded.
 */
beforeDataLoad: {}
```

- afterDataLoad
```
/**
 * Event to be fired after the patient masterdata has been loaded.
 */
afterDataLoad: {}
```

- patientNotFound
```
/**
 * Event to be fired if no patient data was found for the given patient id.
 */
patientNotFound: {
    parameters: {
        /**
         * The given patient id.
         * @type {string}
         */
        patientId: {
            type: "string"
        }
    }
}
```

- navigationTargetChange
```
/**
 * Event to be fired when a navigation target gets changed.
 * Hint: You can also use a two-way binding of the urlParams property, to get updates of URL parameters.
 * As the urlParams is an object, you should use a DeepJSONModel/DeepJSONPropertyBinding.
 */
navigationTargetChange: {
    parameters: {
        navTarget: {
            type: "string"
        },
        value: {
            type: "any"
        }
    }
}
```

## Example 1

Integration.html
```html
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta charset="UTF-8" />

    <title>Patient Summary Integration</title>

    <script id="sap-ui-bootstrap"
        src="/sap/ui5/1/resources/sap-ui-core.js"
        data-sap-ui-libs="sap.ui.core, sap.m"
        data-sap-ui-theme="sap_bluecrystal"
        data-sap-ui-compatVersion="edge"
        data-sap-ui-preload="async"
        data-sap-ui-resourceroots='{"sap.hc": "/sap/hc"}'>
    </script>

    <script>
        sap.ui.getCore().attachInit(function() {
            sap.ui.require([
                "sap/m/Button"
            ], function (Button) {

                var oComp = sap.ui.getCore().createComponent({
                    name: "sap.hc.hph.patient.app.ui.content",
                    id: "Example",
                    settings: {
                        showHeader: true,
                        patientId: "49534830316E5438346F6433424656544D4734386D596176476543"
                    }
                });

                oComp.attachConfigSelectionFailed(function () {
                    alert("Config Selection Failed");
                });
                oComp.attachPatientNotFound(function () {
                    alert("Patient not found");
                });
                oComp.attachTabChange(function (oEvent) {
                    var sTab = oEvent.getParameter("tab");
                    console.log("Received Event: urlChange; Now showing tab \"" + sTab + "\"");
                });
                oComp.attachBeforeDataLoad(function () {
                    console.log("Received Event: beforeDataLoad");
                });
                oComp.attachAfterDataLoad(function () {
                    console.log("Received Event: afterDataLoad");
                });
                oComp.attachNavigationTargetChange(function (oEvent) {
                    var sNavTarget = oEvent.getParameter("navTarget");
                    var vValue = oEvent.getParameter("value");
                    console.log("Received Event: navigationTargetChanged; \"" + sNavTarget + "\" = \"" + vValue + "\"");
                });

                var oCompCont = new sap.ui.core.ComponentContainer("ExampleCont", {
                    component: oComp
                });
                oCompCont.placeAt("content");

                var oConfigSelectionButton = new Button({
                    text: "Change Config",
                    press: function () {
                        oComp.openConfigSelectionDialog();
                    }
                });
                oConfigSelectionButton.placeAt("content");
                var oResetSettingsButton = new Button({
                    text: "Reset Settings",
                    press: function () {
                        oComp.resetSettings();
                    }
                });
                oResetSettingsButton.placeAt("content");
            });
        });
    </script>
</head>

<body class="sapUiBody" id="content"></body>
</html>
```


## Example 2 (two-way binding of tab and urlParams)

Integration.html
```html
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta charset="UTF-8" />

    <title>[DEV] Patient Summary</title>

    <script id="sap-ui-bootstrap"
        src="/sap/ui5/1/resources/sap-ui-core-dbg.js"
        data-sap-ui-libs="sap.ui.core, sap.m"
        data-sap-ui-theme="sap_bluecrystal"
        data-sap-ui-compatVersion="edge"
        data-sap-ui-preload="async"
        data-sap-ui-resourceroots='{"sap.hc": "/sap/hc"}'>
    </script>

    <script>
        sap.ui.getCore().attachInit(function() {
            sap.ui.require([
                "sap/hc/hph/core/ui/JSONBinding/DeepJSONModel",
                "sap/hc/hph/core/ui/JSONBinding/DeepJSONPropertyBinding",
                "sap/hc/hph/tests/core/ui/MockServer",
                "sap/hc/hph/tests/eula/ui/MockServer",
                "sap/hc/hph/tests/patient/ui/MockServer",
                "sap/m/Button"
            ], function (DeepJSONModel, DeepJSONPropertyBinding, CoreMockServer, EulaMockServer, PSMockServer, Button) {

                CoreMockServer.init();
                EulaMockServer.init();
                PSMockServer.init();

                var oModel = new DeepJSONModel({
                    tab: "custom",
                    urlParams: {
                        custom_page: "fefe"
                    }
                });

                var oComp = sap.ui.getCore().createComponent({
                    name: "sap.hc.hph.patient.app.ui.content",
                    id: "Example",
                    settings: {
                        showHeader: true,
                        patientId: "007"
                    },
                });
                oComp.setModel(oModel);
                oComp.bindProperty("tab", "/tab");
                oComp.bindProperty("urlParams", "/urlParams");


                oComp.attachConfigSelectionFailed(function () {
                    alert("Config Selection Failed");
                });
                oComp.attachPatientNotFound(function () {
                    alert("Patient not found");
                });
                new DeepJSONPropertyBinding(oModel, "/tab").attachChange(function (oEvent) {
                    var sTab = oModel.getProperty("/tab");
                    console.log("Received Event: urlChange; Now showing tab \"" + sTab + "\"");
                });
                oComp.attachBeforeDataLoad(function () {
                    console.log("Received Event: beforeDataLoad");
                });
                oComp.attachAfterDataLoad(function () {
                    console.log("Received Event: afterDataLoad");
                });
                new DeepJSONPropertyBinding(oModel, "/urlParams").attachChange(function (oEvent) {
                    var oUrlParams = oModel.getProperty("/urlParams");
                    console.log("Received Event: navigationTargetChanged; " + JSON.stringify(oUrlParams));
                });

                var oCompCont = new sap.ui.core.ComponentContainer("ExampleCont", {
                    component: oComp
                });
                oCompCont.placeAt("content");

                var oConfigSelectionButton = new Button({
                    text: "Change Config",
                    press: function () {
                        oComp.openConfigSelectionDialog();
                    }
                });
                oConfigSelectionButton.placeAt("content");
                var oResetSettingsButton = new Button({
                    text: "Reset Settings",
                    press: function () {
                        oComp.resetSettings();
                    }
                });
                oResetSettingsButton.placeAt("content");
            });
        });
    </script>
</head>

<body class="sapUiBody" id="content"></body>
</html>
```
