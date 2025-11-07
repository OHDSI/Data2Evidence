export const configDefaultValues = {
    "filtercards": {
        "visible": true,
        "initial": false,
        "initialPatientList": false
    },
    "attributes": {
        "ordered": false,
        "cached": true,
        "useRefText": false,
        "useRefValue": false,
        "category": true,
        "measure": true,
        "filtercard": {
            "initial": false,
            "visible": true
        },
        "patientlist": {
            "initial": false,
            "visible": true,
            "linkColumn": false
        }
    },
    "chartOptions": {
        "initialAttributes": {
            "measures": [],
            "categories": []
        },
        "initialChart": "stacked",
        "stacked": {
            "visible": true,
            "pdfDownloadEnabled": true,
            "downloadEnabled": true,
            "imageDownloadEnabled": true,
            "collectionEnabled": true,
            "beginVisible": true,
            "fillMissingValuesEnabled": true
        },
        "boxplot": {
            "visible": true,
            "pdfDownloadEnabled": true,
            "downloadEnabled": true,
            "imageDownloadEnabled": true,
            "collectionEnabled": true,
            "beginVisible": true,
            "fillMissingValuesEnabled": true
        },
        "km": {
            "visible": true,
            "pdfDownloadEnabled": true,
            "downloadEnabled": true,
            "imageDownloadEnabled": true,
            "collectionEnabled": true,
            "beginVisible": true,
            "confidenceInterval": 1.959963984540,
            "filters": [],
            "selectedInteractions": [],
            "selectedEndInteractions": []
        },
        "list": {
            "visible": true,
            "zipDownloadEnabled": true,
            "downloadEnabled": true,
            "collectionEnabled": true,
            "beginVisible": true,
            "pageSize": 20
        },
        "vb": {
            "visible": true,
            "referenceName": "GRCh37"
        },
        "custom": {
            "visible": true,
            "customCharts": []
        },
        "sac": {
            "visible": false,
            "sacCharts": []
        },
        "shared": {
            "enabled": false,
            "systemName": "MRI"
        },
        "minCohortSize": 10
    },
    "panelOptions": {
        "addToCohorts": true,
        "domainValuesLimit": 200,
        "calcViewAccessPoint": true,
        "externalAccessPoints": true,
        "cohortEntryExit": false,
        "atlasCohortDefinition": false,
        "usePaAtlas": false
    },
    "configInformations": {
        "note": ""
    }
}