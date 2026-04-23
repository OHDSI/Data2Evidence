

// create enum for type

enum StrategusDataset {
    TYPE = "strategus_analysis",
    DIALECT = "postgres",
}

export function getDummyDataset() {
    const datasetInput = {
            id: "dummy-dataset-id",
            type: StrategusDataset.TYPE,
            tokenDatasetCode: "dummy-token-dataset-code",
            tenantId: "dummy-tenant-id",
            dialect: StrategusDataset.DIALECT,
            databaseCode: "dummy",
            schemaName: `dummy_schema`,
            vocabSchemaName: "",
            resultsSchemaName: "",
            dataModel: "dummy",
            visibilityStatus: "DEFAULT",
            detail: {
                name: "Dummy Dataset",
                summary: "Strategus analysis dataset",
                description: "",
                showRequestAccess: false,
            },
            dashboards: [],
            attributes: [],
            tags: [],
        };
  return datasetInput;
}
