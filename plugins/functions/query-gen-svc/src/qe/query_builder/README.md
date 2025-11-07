# Query Builder Tutorial

- [Introduction](#introduction)
- [Background Information](#background-information)
- [How to build a Query](#how-to-build-a-fast-query)
- [Limitations](#limitations)
- [Misc Info](#misc-info)
- [Useful Links](#useful-links)


## Introduction

This document will help you get started to build a request for the query engine in json format, convert it to SQL and execute the SQL query as well. The query builder classes are developed in typescript and present in this file 
<a href="https://github.com/data2evidence/alp/blob/develop/services/query-gen-svc/src/qe/query_builder/FastQueryBuilder.ts" target="_blank">FastQueryBuilder.ts</a>. 

## Background Information
### CQL Query

We are going to describe a very simple query over here and create a json out of it by using the query builder (FAST) library.

```
library CMS26 version '2'
using QUICK

context Patient

define "Primary Diagnosis Females":
   ["Patient"] P0
            where P0.gender = 'F'
   with ["priDiag"] priDiag1
            such that priDiag1.icd_10 = 'C00'
   group by priDiag1.icd_10, P0.pid

```

We will be ignoring the lines 1 and 2 as it isn't relevant for us. Line 1 is to declare a library name for the CQL query. However line 2, tells which data model to use and the clinical terms described in the CQL query is drawn from  here [(QUICK)](http://hl7.org/fhir/2015May/quick/index-files.html). In our case it will be the "<B>MRI Data model</B>" defined in the CDM config.

<B>Line 3</B>
>context Patient

Describes the context in which the following statement would be executed and in this case it will be executed for a patient.

<B>Line 4</B>
>define "Primary Diagnosis Females":

Defines the name of the statement definition.

<B>Line 5</B>
> ["Patient"] P0

Describes the <B>retrieve</B> source or the <B>type of data</B> for which the data is to be fetched. The terms described within the square brackets is usually taken from what is defined in the data model. Usually this could be a patient, condition or an interaction type.

<B>Line 6</B>
>where P0.gender = 'F'

Where clause starts which describes an attribute being filtered for a value.

<B>Line 7</B>
>with ["priDiag"] pri

Joins the query to another source for which data needs to be fetched from there as well. 

<B>Line 8</B>

>such that pri.icd_10 = 'C00'

Specifies a filter condition within the "priDiag" type. <B>Please note</B> that the join condition with the <B>Patient</B> type isnt specified here, because this info will be automatically populated in the sql by joining the patient_id key of both the sources. Same goes for the interaction type (priDiag in this case) as well regarding getting filtered in the database, the defaultFilter attribute from interaction type in the CDM config will be picked up and used to form the sql to filter out for the specific priDiag type.

<B>Line 9</B>

>group by pri.icd_10, P0.pid

 Attributes to be grouped by and subsequently these terms are added automatically in the <B>Select</B> clause of the sql which means data would be fetched for these attributes. Please note that the <B>group by does not exist in the CQL</B> specification and is a customized feature added.

### Query Engine Request (FAST)

The term <B>FAST</B> is a name for the intermediate format (json or javascript object) that is used during the CQL to SQL transformation. In this case we are just building the FAST directly and converting it to SQL. The equivalent FAST query to the CQL example is below. This is just to give an idea of how the json would like after building the javascript objects using the fast library.

```
{
   "statement": {
      "def": [
         {
            "name": "Primary Diagnosis Females",
            "context": "patient",
            "accessLevel": "public",
            "expression": {
               "type": "Query",
               "where": {
                  "type": "Equal",
                  "operand": [
                     {
                        "type": "Property",
                        "path": "gender",
                        "scope": "P0",
                        "alias": "patient.attributes.gender"
                     },
                     {
                        "type": "Literal",
                        "valueType": "String",
                        "value": "F"
                     }
                  ]
               },
               "source": [
                  {
                     "alias": "P0",
                     "expression": {
                        "type": "Retrieve",
                        "dataType": "patient",
                        "templateId": "patient"
                     }
                  }
               ],
               "groupBy": [
                  {
                     "type": "Property",
                     "path": "icd_10",
                     "scope": "priDiag1",
                     "alias": "patient.conditions.acme.interactions.priDiag.1.attributes.icd_10"
                  },
                  {
                     "type": "Property",
                     "path": "pid",
                     "scope": "P0",
                     "alias": "patient.attributes.pid"
                  }
               ],
               "relationship": [
                  {
                     "type": "With",
                     "alias": "priDiag1",
                     "expression": {
                        "type": "Retrieve",
                        "dataType": "priDiag",
                        "templateId": "patient-conditions-acme-interactions-priDiag"
                     },
                     "suchThat": {
                        "type": "Equal",
                        "operand": [
                           {
                              "type": "Property",
                              "path": "icd_10",
                              "scope": "priDiag1",
                              "alias": "patient.conditions.acme.interactions.priDiag.1.attributes.icd_10"
                           },
                           {
                              "type": "Literal",
                              "valueType": "String",
                              "value": "C00"
                           }
                        ]
                     }
                  }
               ]
            }
         }
      ]
   }
}
```

### Sql Object

Just for your reference, this is the equivalent SQL which is generated from fast.

```
QueryObject {
  queryString: 'WITH  Primary_Diagnosis_Females AS (SELECT LEFT("patient.priDiag1INTERACTION_DETAILS_EAV___CODEATTRIBUTEICD10".VALUE,3) AS "patient.conditions.acme.interactions.priDiag.1.attributes.icd_10", P0.PATIENT_ID AS "patient.attributes.pid"  FROM CDMDEFAULT."legacy.cdw.db.models::InterfaceViews.PATIENT" P0  INNER JOIN ( CDMDEFAULT."legacy.cdw.db.models::InterfaceViews.INTERACTIONS" "patient.priDiag1"  INNER JOIN CDMDEFAULT."legacy.cdw.db.models::InterfaceViews.INTERACTION_DETAILS_EAV" "patient.priDiag1INTERACTION_DETAILS_EAV___CODEATTRIBUTEICD10" ON ("patient.priDiag1".INTERACTION_ID = "patient.priDiag1INTERACTION_DETAILS_EAV___CODEATTRIBUTEICD10".INTERACTION_ID AND "patient.priDiag1INTERACTION_DETAILS_EAV___CODEATTRIBUTEICD10".ATTRIBUTE = \'ICD_10\') ) ON (P0.PATIENT_ID = "patient.priDiag1".PATIENT_ID AND "patient.priDiag1".INTERACTION_TYPE = \'ACME_M03\')  WHERE (UPPER(LEFT("patient.priDiag1INTERACTION_DETAILS_EAV___CODEATTRIBUTEICD10".VALUE,3))  =  UPPER({f9304b46-10e8-4efd-9559-714f5348414d})) AND (UPPER(P0.GENDER)  =  UPPER({96233240-9c72-44bf-b643-a2176661909d}))   GROUP BY LEFT("patient.priDiag1INTERACTION_DETAILS_EAV___CODEATTRIBUTEICD10".VALUE,3), P0.PATIENT_ID)  SELECT * FROM Primary_Diagnosis_Females',
  parameterPlaceholders:
   [ { key: '{f9304b46-10e8-4efd-9559-714f5348414d}',
       value: 'C00',
       type: 'text' },
     { key: '{96233240-9c72-44bf-b643-a2176661909d}',
       value: 'F',
       type: 'text' } ],
  sqlReturnOn: true,
  identifierMap: {} }
```

## How to build a FAST Query

Lets now begin to build the FAST Object in xsjs based on our CQL query and generate the FAST Query. Post this, we will also generate the SQL from fast and execute the sql query.

<B>Step 1 : Import the required libraries</B>

```
   a. QueryBuilder
   b. QueryEngine
```

<B>Step 2 : Initialize Builder Object and Create a definition</B>

><B>define "Primary Diagnosis Females":</B>

```
var oBuilder = new FqbLib.FastQueryBuilder();
var define = oBuilder.definition("Primary Diagnosis Females");
```

<B>Step 3 : Create a Retrieve of source or data type</B>

><B>["Patient"] P0</B>

```
define.retrieve("P0", "patient", "patient");
```

<B>Step 4 : Add a where clause</B>

><B>where P0.gender = 'F'</B>

```
define.whereClause(FqbLib.BoolExpr.compare("Equal")
    .LHS(FqbLib.Operand.property("gender", "P0", "patient.attributes.gender"))
    .RHS(FqbLib.Operand.literal("String", "F")));
```


<B>Step 5 : Add a Relationship / another source or data type</B>

><B>with ["priDiag"] priDiag1</B>

```
define.with(FqbLib.FastQueryBuilder.with("priDiag1")
    .retrieve("priDiag", "patient-conditions-acme-interactions-priDiag")
```

<B>Step 6 : Add a Filter for the other data type</B>

><B>such that priDiag1.icd_10 = 'C00'</B>

```
 .suchThatClause(FqbLib.BoolExpr.compare("Equal")
    .LHS(FqbLib.Operand.property("icd_10", "priDiag1", "patient.conditions.acme.interactions.priDiag.1.attributes.icd_10"))
    .RHS(FqbLib.Operand.literal("String", "C00"))));
```


<B>Step 7 : Add Group by terms</B>

><B>group by priDiag1.icd_10, P0.pid</B>

```
 define.group("icd_10", "priDiag1", "patient.conditions.acme.interactions.priDiag.1.attributes.icd_10");

  define.group("pid", "P0", "patient.attributes.pid");
```

<B>Step 8 : Test and generate FAST JSON</B>

```
oBuilder.getFastJson();        //Gives you json
oBuilder.getFast(); // Gives you Javascript object
```

<B>Step 9 : Generate SQL and Execute it</B>

```
sqlGen.executeQuery(oModelConfig,       //data model config (CDM)
                  oPlaceholderTableMap, 
                  oBuilder.getFast(),  //Pass the Builder Class
                  oConnection,                        // DB Connection
                  function (error, result) {          // Callback method
                                                      //******* Please add your implementation *******
                  });
```

## Limitations

### Patient as retrieve source / data type

Lets say you have a CQL query which bothers only about the interaction types and nothing to filter about for the patient as like the below example.
```
context Patient

define "Primary Diagnosis Females":
   ["priDiag"] pri
            where pri.icd_10 = 'C00'
   group by pri.icd_10
```

Currently the sql generator checks if the context is "Patient", then it automatically includes the patient as the table in the <B> from clause </B> of the SQL. This is a temporary limitation which will be removed in the future. Hence irrespective of which data type other than patient the retrieve could be, the <B>CQL should always have the retrieve source / data type as Patient</B>. The other data types (ex: for a interaction type) would be part of the relationships with the retrieve as per the below example which is similar to build tutorial CQL example we saw earlier.

```
context Patient

define "Primary Diagnosis Females":
   ["Patient"] P0            
   with ["priDiag"] priDiag1
            such that priDiag1.icd_10 = 'C00'
   group by priDiag1.icd_10

```

## Misc Info

#### Generate SQL query for FAST

```
var sqlObject = sqlGen.getSQL(
                  oModelConfig,       //data model config (CDM)
                  oPlaceholderTableMap, 
                  oBuilder.getFast());

JSON.stringify(sqlObject);
```

#### Generate FAST JSON

```
oBuilder.getFastJson(); //After Initializing oBuilder
```

#### Generate FAST Object

```
oBuilder.getFast(); //After Initializing oBuilder
```

#### Statement Object

>"Statement" attribute is the root of the fast object and the Fast Builder needs to be initialized in order to start building the statement object. Each fast builder object will have its own statement and Multiple definitions for that statement.

#### Get all the definition objects for the fast
This is the raw version of the javascript objects built using the library.  JSON parse or stringify is not run internally as it happens in the case of getFast() and getFastJson() methods from the query builder.
```
oBuilder.getStatement().getDefintions(); 
```



#### Implement Boolean Expression (Equal)

```
with ["PriDiag"] priDiag1
            such that priDiag1.icd_10 = "C00"
```

```
FqbLib.BoolExpr.compare("Equal")
    .LHS(FqbLib.Operand.property("icd_10", "priDiag1", "patient.conditions.acme.interactions.priDiag.1.attributes.icd_10"))
    .RHS(FqbLib.Operand.literal("String", "C00"))
```

#### Implement Boolean Expression (GreaterEqual) & Duration Between in FAST

```
with ["Chemo"] chemo1
            such that (duration between (chemo1.end, chemo1.start)) >= 5
```

```
FqbLib.BoolExpr.compare("GreaterOrEqual")
    .LHS(FqbLib.Expression.durationBetween()
        .start("end", "chemo1", "patient.conditions.acme.interactions.chemo.1.attributes._succ.end")
        .end("start", "chemo1", "patient.conditions.acme.interactions.chemo.1.attributes._succ.start"))
    .RHS(FqbLib.Operand.literal("Integer", "5"))
```

#### Implement Outer Join

If there is a case where there is more than one definition within a statement and there needs to be a outer join defined between those definitions, it is possible to do that using the <B>SXor</B> definition type in the fast library.

```


/**** Initialize Fast Builder and Define your definitions *****/

//Fetch those definitions
var existingDefinitionList = oBuilder.getStatement().getDefintions(); 

var sXorDefinition = oBuilder.definition("SXorDef", "sXor"); //pass the sXor type of definition

if (existingDefinitionList) {
     existingDefinitionList.forEach(function (definition) {
         sXorDefinition.addOperand(FqbLib.FastQueryBuilder.ref(definition.name)); //create a expression reference to those definitions
     });
 }

//Equivalent sXor fast definition in json (assuming we had created 2 definitions prior to this)
{
   "name":"SXorDef",
   "context":"patient",
   "accessLevel":"public",
   "expression":{
      "type":"SXor",
      "operand":[
         {
            "type":"ExpressionRef",
            "name":"PRequests0"
         },
         {
            "type":"ExpressionRef",
            "name":"PRequests1"
         }
      ]
   }
}

//Equivalent SQL part for sXor:
(SELECT * 
 FROM   (SELECT * 
         FROM   PRequests0) 
        FULL OUTER JOIN (SELECT * 
                         FROM   PRequests1) 
                     ON 1 <> 1) 

SELECT * 
FROM   SXorDef
```



## Useful Links

#### <a href="https://github.com/data2evidence/alp/blob/develop/services/query-gen-svc/src/qe/query_builder/sample.js" target="_blank">sample.js</a>

This is a pure javascript implementation of fast query that generates fast json as output as well as the SQL query generated from fast. This will be useful for your local testing. Once you have cloned this repo (hopefully you have installed node version 5+), you can just run the following commands and it will print the FAST json to the console.

```
<From root folder> 
npm install
npm run postinstall
node src/qe/query_builder/sample.js
```

#### <a href="https://github.com/data2evidence/alp/blob/develop/services/query-gen-svc/src/qe/sql_generator2/SqlGenerator.ts" target="_blank">Query Engine (Sql Generator Wrapper)</a>

The wrapper functions to generate and execute SQL.
