# fhir-to-omop

## Sample json as input to trigger the plugin 
```
{
  "options": {
    "dataEndDate": "2099-12-31",
    "dataBeginDate": "2022-01-01",
    "omopCDMSchema": "cdmdefault",
    "batchChunksize": "5000",
    "omopCDMJdbcCurl": "jdbc:postgresql://alp-minerva-postgres-1.alp.local:5432/alpdev_pg",
    "omopCDMPassword": "",
    "omopCDMUsername": "",
    "fhirGatewayTable": "resources",
    "fhirGatewayJdbcCurl": "jdbc:postgresql://alp-minerva-postgres-1.alp.local:5432/alpdev_pg?currentSchema=fhir",
    "fhirGatewayPassword": "",
    "fhirGatewayUsername": ""
  }
}
```
