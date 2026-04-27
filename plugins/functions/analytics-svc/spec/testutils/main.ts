// tslint:disable:no-console
import * as testenvironmentLib from "./testenvironment";

function cleanup() {
    let testSchemaName: String = process.env.TESTSCHEMA;
    console.log("Test schema name:" + testSchemaName);
    dropTestSchema(testSchemaName);
}

function createTestSchema() {
    console.log("creating test schema...");
    let testEnvironment = null;
    let testSchema = "TEST_SCHEMA_" + Math.floor(Math.random() * 10000000);
    process.env.TESTSCHEMA = testSchema;
    process.env.ROOTPATH = "./";
    testenvironmentLib.runPreTestTasks(testSchema, (err, data, testenv) => {
        if (err) {
            console.error(err);
        } else {
            console.log("Completed creating test schema (" + testSchema + ")...");
        }
        process.exit(0);
    });
}

function dropTestSchema(schemaName) {
    testenvironmentLib.dropTestSchem(schemaName, (err, data, testenv) => {
        if (err) {
            console.error(err);
        } else {
            console.log("Successfully dropped test schema (" + schemaName + ")...");
        }
        process.exit(0);
    });
}

function truncateTestSchema(schemaName) {
    testenvironmentLib.truncateTestSchema(schemaName, (err, data, testenv) => {
        if (err) {
            console.error(err);
        } else {
            console.log("Successfully truncated test schema (" + schemaName + ")...");
        }
        process.exit(0);
    });
}

export function exe(argv) {

    switch (argv[2]) {
        case "testschema":
            console.log("TEST_SCHEMA_" + Math.floor(Math.random() * 10000000));
            break;
        case "pretest":
            let ts = process.env.TESTSCHEMA;
            console.log(ts);
            testenvironmentLib.runPreTestTasks(ts, (err, data, testenv) => {
                if (err) {
                    console.error(err);
                    process.exit(1);
                }
                process.exit(0);
            });
            break;
        case "create_test_schema":
            createTestSchema();
            break;
        case "drop_test_schema":
            if (!argv[3]) {
                console.error("Test schema name is not specified!");
                process.exit(1);
            } else {
                dropTestSchema(argv[3]);
                break;
            }
        case "truncate_test_schema":
            if (!argv[3]) {
                console.error("Test schema name is not specified!");
                process.exit(1);
            } else {
                truncateTestSchema(argv[3]);
                break;
            }
        case "cleanup":
            cleanup();
            break;
        default:
            //console.error("Error: command not found: " + argv[2]);
            break;
    }
}

exe(process.argv);
