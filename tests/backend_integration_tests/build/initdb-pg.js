const fs = require("fs");
const pg = require("pg");
const format = require("pg-format");

const { Pool } = pg;
const pool = new Pool({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  max: 20,
});
const csv = require("fast-csv");
const path = require("path");
const TESTSCHEMA = process.env.TESTSCHEMA;

var rmOnly = process.argv[2] === "rmonly" ? true : false;
var includeData = process.argv[2] === "test" ? true : false;

async function createTestSchema() {
  const script = fs
    .readFileSync(`${__dirname}/sql/httptest-ddl-pg.sql`)
    .toString();
  await executeQuery(script.replaceAll("HTTPTEST_SCHEMA", TESTSCHEMA));
  console.log("All PostgreSQL database artefacts are successfully created.");
  return null;
}

async function executeQuery(query) {
//   console.log(`query: ${query}`);
  pool.on("error", (err, client) => {
    console.error("Unexpected error on idle client", err);
    client.release(true);
    throw err;
  });
  const client = await pool.connect();
  const res = await client.query(query);

  // console.log(`SQL script query executed`);
  client.release();
  return res;
}

async function dropTestSchema() {
  await executeQuery(`DROP SCHEMA ${TESTSCHEMA} CASCADE`);
  return null;
}

async function insertDataToTable(
  csvFile,
  delimiter,
  tableName,
  columns
) {
  let loadCSV = new Promise((resolve, reject) => {
    let data = [];
    let filePath = path.resolve(
      __dirname,
      "data",
      csvFile
    );
    fs.createReadStream(filePath)
      .pipe(csv.parse({ headers: true, delimiter, escape: "\\" }))
      .on("error", (error) => reject(error))
      .on("data", (row) => {
        let r = [];
        Object.values(row).forEach((c) => {
          r.push(c === "" ? null : c);
        });
        data.push(r);
      })
      .on("end", (rowCount) => {
        // console.log(`Parsed ${rowCount} rows`);
        resolve(data);
      });
  });

  let result = await loadCSV.then((data) => {
    const query = `INSERT INTO "${TESTSCHEMA}"."${tableName}" (%I) VALUES %L`;
    const finalQuery = format(query, columns, data);
    return executeQuery(finalQuery);
  });

  return result ? result.rowCount : 0;
}

async function loadTestData() {
  console.log(`Loading test data ...`);
  const csvFileSQLArray = [
    [
      "PATIENT_KEY.csv",
      ",",
      "legacy.cdw.db.models::DWEntities.Patient_Key",
      ["DWID", "DWSource", "DWAuditID", "PatientID"],
    ],
    [
      "INTERACTIONS_KEY.csv",
      ",",
      "legacy.cdw.db.models::DWEntities.Interactions_Key",
      ["DWID", "DWSource", "DWAuditID", "InteractionID"],
    ],
    [
      "OBSERVATIONS_KEY.csv",
      ",",
      "legacy.cdw.db.models::DWEntities.Observations_Key",
      ["DWID", "DWSource", "DWAuditID", "ObsID"],
    ],
    [
      "PATIENT_ATTR.csv",
      ",",
      "legacy.cdw.db.models::DWEntities.Patient_Attr",
      [
        "DWDateFrom",
        "DWID",
        "DWDateTo",
        "DWAuditID",
        "ValidFrom",
        "ValidTo",
        "FamilyName",
        "GivenName",
        "Title.OriginalValue",
        "Title.Code",
        "Title.CodeSystem",
        "Title.CodeSystemVersion",
        "Gender.OriginalValue",
        "Gender.Code",
        "Gender.CodeSystem",
        "Gender.CodeSystemVersion",
        "BirthDate",
        "MultipleBirthOrder",
        "DeceasedDate",
        "MaritalStatus.OriginalValue",
        "MaritalStatus.Code",
        "MaritalStatus.CodeSystem",
        "MaritalStatus.CodeSystemVersion",
        "Nationality.OriginalValue",
        "Nationality.Code",
        "Nationality.CodeSystem",
        "Nationality.CodeSystemVersion",
        "Address.StreetName",
        "Address.StreetNumber",
        "Address.PostOfficeBox",
        "Address.City",
        "Address.PostalCode",
        "Address.State",
        "Address.Region",
        "Address.Country.OriginalValue",
        "Address.Country.Code",
        "Address.Country.CodeSystem",
        "Address.Country.CodeSystemVersion",
        "Telecom.Phone",
        "Telecom.Mobile",
        "Telecom.Fax",
        "Telecom.Email",
        "OrgID",
      ],
    ],
    [
      "OBSERVATIONS_ATTR.csv",
      ",",
      "legacy.cdw.db.models::DWEntities.Observations_Attr",
      [
        "DWDateFrom",
        "DWID",
        "DWDateTo",
        "DWAuditID",
        "DWID_Patient",
        "ObsType",
        "ObsCharValue",
        "ObsNumValue",
        "ObsUnit",
        "ObsTime",
        "OrgID",
      ],
    ],
    [
      "INTERACTION_MEASURES.csv",
      ",",
      "legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures",
      [
        "DWDateFrom",
        "DWID",
        "DWAuditID",
        "DWDateTo",
        "Attribute.OriginalValue",
        "Attribute.Code",
        "Attribute.CodeSystem",
        "Attribute.CodeSystemVersion",
        "Unit",
        "Value",
      ],
    ],
    [
      "INTERACTION_DETAILS.csv",
      ",",
      "legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details",
      [
        "DWDateFrom",
        "DWID",
        "DWAuditID",
        "DWDateTo",
        "Attribute.OriginalValue",
        "Attribute.Code",
        "Attribute.CodeSystem",
        "Attribute.CodeSystemVersion",
        "Value.OriginalValue",
        "Value.Code",
        "Value.CodeSystem",
        "Value.CodeSystemVersion",
        "ValueVocabularyID",
      ],
    ],
    [
      "INTERACTIONS_ATTR.csv",
      ",",
      "legacy.cdw.db.models::DWEntities.Interactions_Attr",
      [
        "DWDateFrom",
        "DWID",
        "DWDateTo",
        "DWAuditID",
        "DWID_Patient",
        "DWID_ParentInteraction",
        "DWID_Condition",
        "InteractionType.OriginalValue",
        "InteractionType.Code",
        "InteractionType.CodeSystem",
        "InteractionType.CodeSystemVersion",
        "InteractionStatus",
        "PeriodStart",
        "PeriodEnd",
        "PeriodTimezone",
        "OrgID",
      ],
    ],
    [
      "CONCEPT_TERMS.csv",
      ",",
      "legacy.ots.internal::Entities.ConceptTerms",
      [
        "ConceptVocabularyID",
        "ConceptCode",
        "ConceptTypeVocabularyID",
        "ConceptTypeCode",
        "TermContext",
        "TermLanguage",
        "TermText",
        "TermType",
        "TermIsPreferred",
        "Provider",
        "DWAuditID",
      ],
    ],
    [
      "AssignmentHeader.csv",
      ",",
      "ConfigDbModels_AssignmentHeader",
      [
        "Id",
        "Name",
        "EntityType",
        "EntityValue",
        "Creator",
        "Created",
        "Modifier",
        "Modified",
      ],
    ],
    [
      "AssignmentDetail.csv",
      ",",
      "ConfigDbModels_AssignmentDetail",
      ["HeaderId", "ConfigId", "ConfigVersion", "ConfigType"],
    ],
    [
      "Config.csv",
      "!",
      "ConfigDbModels_Config",
      [
        "Id",
        "Version",
        "Status",
        "Name",
        "Type",
        "Data",
        "ParentId",
        "ParentVersion",
        "Creator",
        "Created",
        "Modifier",
        "Modified",
      ],
    ],
  ];

  for (let i = 0; i < csvFileSQLArray.length; i++) {
    let affectedRows = await insertDataToTable(
      csvFileSQLArray[i][0],
      csvFileSQLArray[i][1],
      csvFileSQLArray[i][2],
      csvFileSQLArray[i][3]
    );
    console.log(
      `Inserted ${affectedRows} records from ${csvFileSQLArray[i][0]} ...`
    );
  }
  console.log(`Data loading completed ...`);
}

async function main() {
  try {
    if (rmOnly) {
      // drop test schema
      await dropTestSchema();
    } else {
      // setup test schema
      await createTestSchema();

      if (includeData) {
        // insert test data
        await loadTestData();
      }
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
