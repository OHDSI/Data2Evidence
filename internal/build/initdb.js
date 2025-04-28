const hdb = require("hdb");
const fs = require("fs");
const dbCredentials = {
  host: process.env.HANASERVER,
  port: process.env.HANAPORT,
//   instanceNumber: "90", //default
  databaseName: process.env.DATABASE,
  user: process.env.HANAUSER,
  password: process.env.HANAPW,
};
const client = hdb.createClient(dbCredentials);
const TESTSCHEMA = process.env.TESTSCHEMA;

console.log(`DB creadentils: ${JSON.stringify(dbCredentials, null, 2)}`);
console.log(`DB client: ${JSON.stringify(client, null, 2)}`);

if (process.argv.length < 3)
  console.log("usage: node build/initdb.js <demo|test|rmonly> schema");
var rmonly = process.argv[2] === "rmonly" ? true : false;
var includeData = process.argv[2] === "test" ? false : true;

const sqlScript = fs.readFileSync(`${__dirname}/httptest-ddl.sql`).toString();
const tmp = sqlScript.split(";");
const tmp2 = tmp.slice(0, tmp.length - 1);

const queries = [];

tmp2.forEach((element) => {
  queries.push(
    element
      .replaceAll("HTTPTEST_SCHEMA", TESTSCHEMA) // replace with actual schema name
      .replaceAll("PLACE_HOLDER_STR", ";,.:-") // replace with the actual delimiting characters
  );
});

function main() {
  client.on("error", function (err) {
    console.error("Network connection error", err);
  });
  console.log(`Connection state: ${client.readyState}`);

  if (rmonly) {
    // drop test schema
    console.log("Dropping test schema...");

    client.connect((err) => {
      if (err) {
        return console.error("Error:", err);
      }
      const query = `DROP SCHEMA ${TESTSCHEMA} CASCADE`;
      console.log(`query: ${query}`);

      client.exec(query, (err) => {
        if (err) {
          return console.error("Error:", err);
        }
        console.log(`Dropped test schema ${TESTSCHEMA} succussfully...`);
        process.exit(0);
      });
    });
  } else {
    // setup test schema
    console.log("Setting up test schema...");

    client.connect((err) => {
      if (err) {
        return console.error("Error:", err);
      }
      queries.forEach((query, index) => {
        console.log(`query: ${query}`);

        client.exec(query, (err) => {
          if (err) {
            return console.error("Error:", err);
          }
          // console.log(`Table ${index} has been created`);
          if (index === queries.length - 1) {
            console.log(`All DB artefacts are created succussfully...`);
            process.exit(0);
          }
        });
      });
    });
  }
}

try {
  main();
} catch (e) {
  console.error("Setting up test schema failed. Retrying once more...");
  main();
}
