# Cohort Generator Plugin

- Sample parameter values:
```
{
  "options": {
    "token": "testtoken",
    "datasetId": "67f4015c-04f0-4a92-939b-20c361c2e50a",
    "cohortJson": {
      "id": 1783342,
      "name": "Test Cohort",
      "createdDate": 1689067241969,
      "modifiedDate": 1696477773166,
      "hasWriteAccess": false,
      "tags": [],
      "expressionType": "SIMPLE_EXPRESSION",
      "expression": {
        "cdmVersionRange": ">=5.0.0",
        "PrimaryCriteria": {
          "CriteriaList": [
            { "VisitOccurrence": { "VisitTypeExclude": false } }
          ],
          "ObservationWindow": { "PriorDays": 0, "PostDays": 0 },
          "PrimaryCriteriaLimit": { "Type": "All" }
        },
        "ConceptSets": [],
        "QualifiedLimit": { "Type": "First" },
        "ExpressionLimit": { "Type": "All" },
        "InclusionRules": [
          {
            "name": "Age",
            "expression": {
              "Type": "ALL",
              "CriteriaList": [],
              "DemographicCriteriaList": [
                { "Age": { "Value": 18, "Op": "gt" } }
              ],
              "Groups": []
            }
          }
        ],
        "CensoringCriteria": [],
        "CollapseSettings": { "CollapseType": "ERA", "EraPad": 0 },
        "CensorWindow": {}
      }
    },
    "schemaName": "cdmdefault",
    "description": "testdescription",
    "databaseCode": "alpdev_pg",
    "vocabSchemaName": "cdmvocab"
  }
}

```