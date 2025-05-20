const fs = require("fs");
const hdb = require("hdb");
const csv = require("fast-csv");
const path = require("path");

const { functionsAndProcedures } = require("./db-functions-procedures.js");

const dbCredentials = {
  host: process.env.HANASERVER,
  port: process.env.HANAPORT,
  databaseName: process.env.DATABASE,
  user: process.env.HANAUSER,
  password: process.env.HANAPW,
};
const client = hdb.createClient(dbCredentials);
const TESTSCHEMA = process.env.TESTSCHEMA;

var rmOnly = process.argv[2] === "rmonly" ? true : false;
var includeData = process.argv[2] === "test" ? true : false;

async function initNWConnection() {
  console.log(`Initializing network connection ...`);
  client.on("error", function (err) {
    console.error("Network connection error", err);
    throw err;
  });
  console.log(`Network connection status: ${client.readyState}`);
  return null;
}

async function loadDDLScript() {
  // console.log(`loadDDLScript...`);
  const sqlScript = fs.readFileSync(`${__dirname}/httptest-ddl.sql`).toString();

  const tmp = sqlScript.split(";");
  const tmp2 = tmp.slice(0, tmp.length - 1);

  const queries = [];

  tmp2.forEach((element) => {
    queries.push(
      element.replaceAll("PLACE_HOLDER_STR", ";,.:-") // replace with the actual delimiting characters
    );
  });

  return queries;
}

async function createDBArtefacts(sqlStatements) {
  // console.log(`runDDLScript...`);
  let executeQueries = new Promise((resolve, reject) => {
    client.connect((err) => {
      if (err) {
        reject(err);
      }
      sqlStatements.forEach((query, index) => {
        // console.log(`query: ${query}`);
        client.exec(query.replaceAll("HTTPTEST_SCHEMA", TESTSCHEMA), (err) => {
          if (err) {
            reject(err);
          }
          if (index === sqlStatements.length - 1) {
            client.end();
            resolve(sqlStatements.length);
          }
        });
      });
    });
  });

  let result = await executeQueries;

  return result;
}

async function dropTestSchema() {
  let executeQueries = new Promise((resolve, reject) => {
    client.connect((err) => {
      if (err) {
        reject(err);
      }
      client.exec(`DROP SCHEMA ${TESTSCHEMA} CASCADE`, (err) => {
        if (err) {
          reject(err);
        }
        console.log(`Dropped test schema[${TESTSCHEMA}] succussfully ...`);
        client.end();
        resolve(null);
      });
    });
  });
  return await executeQueries;
}

async function createTestSchema() {
  console.log(`Creating test schema ...`);

  // load tables & views ddl script
  const queries = await loadDDLScript();

  // run tables & views ddl script
  let result = await createDBArtefacts(queries);
  console.log(`Created ${result} tables & views succussfully ...`);

  // run functions & procedures ddl script
  result = await createDBArtefacts(functionsAndProcedures);
  console.log(`Created ${result} functions & procedures succussfully ...`);

  return null;
}

async function insertDataToTable(csvFile, query) {
  let loadCSV = new Promise((resolve, reject) => {
    let data = [];
    let filePath = path.resolve(
      __dirname,
      "..",
      "..",
      "services",
      "mri-db",
      "src",
      "data",
      "cdw",
      csvFile
    );
    fs.createReadStream(filePath)
      .pipe(csv.parse({ headers: true }))
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
    // console.log(`data: ${JSON.stringify(data)}`);
    return new Promise((resolve, reject) => {
      client.connect((err) => {
        if (err) {
          reject(err);
        }
        client.prepare(
          query.replaceAll("HTTPTEST_SCHEMA", TESTSCHEMA),
          (err, statement) => {
            if (err) {
              console.error("Prepare error:", err);
              reject(err);
            }
            statement.exec(data, (err, affectedRows) => {
              if (err) {
                console.error("Exec error:", err);
                reject(err);
              }
              // console.log("Array of affected rows:", affectedRows);
              client.end();
              resolve(affectedRows ? affectedRows.length : 0);
            });
          }
        );
        // });
      });
    });
  });

  // console.log(`affectedRows: ${result}`);
  return result;
}

async function loadTestData() {
  console.log(`Loading test data ...`);
  const csvFileSQLArray = [
    [
      "PATIENT_KEY.csv",
      `INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Key" VALUES (HEXTOBIN(?), ?, ?, ?)`,
    ],
    [
      "INTERACTIONS_KEY.csv",
      `INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Key" VALUES (HEXTOBIN(?), ?, ?, ?)`,
    ],
    [
      "OBSERVATIONS_KEY.csv",
      `INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Key" VALUES (HEXTOBIN(?), ?, ?, ?)`,
    ],
    [
      "PATIENT_ATTR.csv",
      `INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Patient_Attr" VALUES (TO_TIMESTAMP(?), HEXTOBIN(?), TO_TIMESTAMP(?), ?, TO_DATE(?), TO_DATE(?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TO_SECONDDATE(?), ?, TO_SECONDDATE(?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ],
    [
      "OBSERVATIONS_ATTR.csv",
      `INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Observations_Attr" VALUES (TO_TIMESTAMP(?), HEXTOBIN(?), TO_TIMESTAMP(?), ?, HEXTOBIN(?), ?, ?, TO_DECIMAL(?), ?, TO_TIMESTAMP(?), ?)`,
    ],
    [
      "INTERACTION_MEASURES.csv",
      `INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Measures" VALUES (TO_TIMESTAMP(?), HEXTOBIN(?), ?, TO_TIMESTAMP(?), ?, ?, ?, ?, ?, TO_DECIMAL(?))`,
    ],
    [
      "INTERACTION_DETAILS.csv",
      `INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntitiesEAV.Interaction_Details" VALUES (TO_TIMESTAMP(?), HEXTOBIN(?), ?, TO_TIMESTAMP(?), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ],
    [
      "INTERACTIONS_ATTR.csv",
      `INSERT INTO HTTPTEST_SCHEMA."legacy.cdw.db.models::DWEntities.Interactions_Attr" VALUES (TO_TIMESTAMP(?), HEXTOBIN(?), TO_TIMESTAMP(?), ?, HEXTOBIN(?), HEXTOBIN(?), HEXTOBIN(?), ?, ?, ?, ?, ?, TO_TIMESTAMP(?), TO_TIMESTAMP(?), ?, ?)`,
    ],
    [
      "CONCEPT_TERMS.csv",
      `INSERT INTO HTTPTEST_SCHEMA."legacy.ots.internal::Entities.ConceptTerms" VALUES (?, ?, ?, ?, ?, ?, ?, ?, TO_BOOLEAN(?), ?, ?)`,
    ],
  ];

  for (let i = 0; i < csvFileSQLArray.length; i++) {
    let affectedRows = await insertDataToTable(
      csvFileSQLArray[i][0],
      csvFileSQLArray[i][1]
    );
    console.log(
      `Inserted ${affectedRows} records from ${csvFileSQLArray[i][0]} ...`
    );
  }
  console.log(`Data loading completed ...`);
}

async function main() {
  try {
    await initNWConnection();

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
