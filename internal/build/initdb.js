const _execSync = require('child_process').execSync;
const path = require('path');

if (process.argv.length < 3)
    console.log("usage: node build/initdb.js <demo|test|rmonly> schema");

var includeData = process.argv[2] === 'test' ? false : true;
var rmonly = process.argv[2] === 'rmonly' ? true : false;
var schema = process.argv.length === 4 ? process.argv[3] : process.env.TESTSCHEMA;
var HDI___SYS_DI__USER = process.env.HDIUSER;

var _env = {
    PATH: process.env.PATH,
    HDI__HOST: process.env.HANASERVER,
    HDI__PORT: process.env.HDIPORT,
    HDI___SYS_DI__USER: HDI___SYS_DI__USER,
    HDI___SYS_DI__PASSWORD: process.env.HDIPW,
    SCHEMA: schema
}

_env[`HDI__${schema}__USER`] = process.env.HDIUSER;
_env[`HDI__${schema}__PASSWORD`] = process.env.HDIPW;
console.log(_env);

function exec(cmd) { console.log(_execSync(cmd, { env: _env, cwd: "services/mri-db" }).toString()); }

function main() {
    try {
        exec(`node ../../node_modules/@alp/alp-dbcli/hdi.js drop-container -f ${schema}`);
    } catch (err) {
        console.log("Can't drop container. It does not exist.");
    }
    if (!rmonly) {
        exec(`node ../../node_modules/@alp/alp-dbcli/hdi.js create-container -X ${HDI___SYS_DI__USER} ${schema}`);

        exec(`node ../../node_modules/@alp/alp-dbcli/hdi.js write -r ${schema} src/ cfg/`);

        // exec(`node ../../node_modules/@alp/alp-dbcli/hdi.js delete -r ${schema} src/data/`);
        if (!includeData) {
            console.log("including data")
            exec(`node ../../node_modules/@alp/alp-dbcli/hdi.js delete -r ${schema} src/config_data/`);
        }
        exec(`node ../../node_modules/@alp/alp-dbcli/hdi.js make ${schema} @ src/ cfg/`);

        exec(`node ../../node_modules/@alp/alp-dbcli/hdi.js grant-container-schema-privilege ${schema} SELECT ${HDI___SYS_DI__USER}`);
        exec(`node ../../node_modules/@alp/alp-dbcli/hdi.js grant-container-schema-privilege ${schema} EXECUTE ${HDI___SYS_DI__USER}`);
        exec(`node ../../node_modules/@alp/alp-dbcli/hdi.js grant-container-schema-privilege ${schema} INSERT ${HDI___SYS_DI__USER}`);
        exec(`node ../../node_modules/@alp/alp-dbcli/hdi.js grant-container-schema-privilege ${schema} DELETE ${HDI___SYS_DI__USER}`);
        exec(`node ../../node_modules/@alp/alp-dbcli/hdi.js grant-container-schema-privilege ${schema} UPDATE ${HDI___SYS_DI__USER}`);

        // Grant same priveleges found in TENANT_READ_ROLE of other schemas
        exec(`node ../../node_modules/@alp/alp-dbcli/hdi.js grant-container-schema-privilege ${schema} SELECT TENANT_READ_USER`);
        exec(`node ../../node_modules/@alp/alp-dbcli/hdi.js grant-container-schema-privilege ${schema} EXECUTE TENANT_READ_USER`);
        exec(`node ../../node_modules/@alp/alp-dbcli/hdi.js grant-container-schema-privilege ${schema} 'CREATE TEMPORARY TABLE' TENANT_READ_USER`);

        exec(`yarn inittables`);
    }
}

try {
    main()
} catch (e) {
    console.error("Failed. Retrying once ...");

    main();
}
