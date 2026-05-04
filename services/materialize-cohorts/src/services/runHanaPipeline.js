import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import { promisify } from "node:util";

import hana from "@sap/hana-client";
import PromiseModule from "@sap/hana-client/extension/Promise.js";
import hanaStream from '@sap/hana-client/extension/Stream.js';


function flattenParameter(parameters) {
  const flatList = [];
  if (parameters) {
    parameters.forEach((p) => {
      flatList.push(p.value === undefined ? null : p.value);
    });
  }
  return flatList;
}

export async function runHanaReadWritePipeline({
  host,
  port,
  user,
  password,
  databaseName,
  useTLS,
  sessionVariables,
  query,
  sqlQueryParameters,
  cohortDefinitionId,
  resultsSchema
}) {
  const conn = hana.createConnection();
  const connectionString = `serverNode=${host}:${port};uid=${user};pwd=${password};encrypt=${useTLS};sslValidateCertificate=false;databaseName=${databaseName};pooling=true;compress=true;${sessionVariables}`;
  await PromiseModule.connect(
    conn,
    connectionString,
  );

  const insertConn = hana.createConnection();
  await PromiseModule.connect(
    insertConn,
    connectionString,
  );

  const runId = Date.now();
  let processedRows = 0;

  console.time(`hana-streaming-${runId}`);

  try {
    const [readStatement, insertStatement] = await Promise.all([
      PromiseModule.prepare(conn, query),
      PromiseModule.prepare(
        insertConn,
        `INSERT INTO ${resultsSchema}.COHORT (COHORT_DEFINITION_ID, SUBJECT_ID, COHORT_START_DATE, COHORT_END_DATE) VALUES (${cohortDefinitionId}, ?, ?, ?)`,
      ),
    ]);
    const resultSet = await PromiseModule.execQuery(readStatement, flattenParameter(sqlQueryParameters));

    // 2. Create the Object Stream from the ResultSet
    // This stream emits plain JavaScript objects for each row
    const sourceStream = hanaStream.createObjectStream(resultSet);
    
    let processedCount = 0;
    //3. Transform: Batching logic with backpressure support
    const batcher = new Transform({
      objectMode: true,
      async transform(row, encoding, callback) {
        this.batch = this.batch || [];
        //console.log(row.SUBJECT_ID);
        this.batch.push([
          row.SUBJECT_ID,
          row.COHORT_START_DATE,
          row.COHORT_END_DATE,
        ]);

        if (this.batch.length >= 30000) {
          try {
            await PromiseModule.execBatch(insertStatement, this.batch);
            processedCount += this.batch.length;
            this.batch = [];
            callback();
          } catch (err) {
            callback(err);
          }
        } else {
          callback();
        }
      },
      async flush(callback) {
        // Insert remaining rows at the end of the stream
        if (this.batch && this.batch.length > 0) {
          try {
            await PromiseModule.execBatch(insertStatement, this.batch);
            processedCount += this.batch.length;
            callback();
          } catch (err) {
            callback(err);
          }
        } else {
          callback();
        }
      },
    });

    // 3. Execute the pipeline
    // pipeline handles error propagation and stream cleanup automatically
    await pipeline(sourceStream, batcher);
    console.timeEnd(`hana-streaming-${runId}`);
    return { processedRows: processedCount };
  } catch (err) {
    console.error(err);
    throw err;
  } finally {
    conn.disconnect();
    insertConn.disconnect();
  }
}
