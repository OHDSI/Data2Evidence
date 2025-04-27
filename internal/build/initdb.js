const hdb = require("hdb");
const fs = require("fs");

const client = hdb.createClient({
  host: process.env.HANASERVER,
  port: process.env.HANAPORT,
  databaseName: process.env.DATABASE,
  user: process.env.HANAUSER,
  password: process.env.HANAPW,
});
const TESTSCHEMA = process.env.TESTSCHEMA;

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
  console.log("Setting up test schema...");

  client.on("error", function (err) {
    console.error("Network connection error", err);
  });
  console.log(`Connection state: ${client.readyState}`);

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

try {
  main();
} catch (e) {
  console.error("Setting up test schema failed. Retrying once more...");
  main();
}
