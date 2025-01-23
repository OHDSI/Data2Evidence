import * as childProcess from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as dotenv from "dotenv";

dotenv.config();

let cmdOptions = {
    run_mri: true, run_cdw: true, run_assignment: true, run_bookmark: true,
    run_mriconfig: true, run_query_gen: true, run_chart: true, run_dbmgmt: true,
    run_dev_mri: false, run_dev_cdw: false, run_dev_assignment: false, run_dev_bookmark: false, run_dev_dbmgmt: false,
    run_dev_mriconfig: false, run_dev_query_gen: false, run_dev_chart: false,
    build_only_tsc: false, build_only_mri: false
}

let root = '../../'

let command = process.argv[2];

process.argv.forEach((value) => {
    switch(value) {
        case '--only-tsc':
            cmdOptions.build_only_tsc = true;
            break;
        case '--only-mri':
            cmdOptions.build_only_mri = true;
            break;
        case '--no-mri':
            cmdOptions.run_mri = false;
            break;
        case '--no-cdw':
            cmdOptions.run_cdw = false;
            break;
        case '--no-assignment':
            cmdOptions.run_assignment = false;
            break;
        case '--no-bookmark':
            cmdOptions.run_bookmark = false;
            break;
        case '--no-mriconfig':
            cmdOptions.run_mriconfig = false;
            break;
        case '--no-query-gen':
            cmdOptions.run_query_gen = false;
            break;
        case '--no-chart':
            cmdOptions.run_chart = false;
            break;
        case '--no-dbmgmt':
            cmdOptions.run_dbmgmt = false;
            break;
        case '--dev-dbmgmt':
            cmdOptions.run_dev_dbmgmt = true;
            break;
        case '--dev-mri':
            cmdOptions.run_dev_mri = true;
            break;
        case '--dev-cdw':
            cmdOptions.run_dev_cdw = true;
            break;
        case '--dev-assignment':
            cmdOptions.run_dev_assignment = true;
            break;
        case '--dev-bookmark':
            cmdOptions.run_dev_bookmark = true;
            break;
        case '--dev-mriconfig':
            cmdOptions.run_dev_mriconfig = true;
            break;
        case '--dev-query-gen':
            cmdOptions.run_dev_query_gen = true;
            break;
        case '--dev-chart':
            cmdOptions.run_dev_chart = true;
    }
});

function isWindows() { return process.platform === "win32"; }
function isLinux() { return process.platform === "linux"; }

function getDbMgmtServiceCfg(baseEnv) {
    const hanacert = "-----BEGIN CERTIFICATE-----MIIDDTCCAfUCCAogIBAjESgAMA0GCSqGSIb3DQEBCwUAMEkxETAPBgNVBAsTCEhBTkEgU1NMMQwwCgYDVQQLEwNSSEUxJjAkBgNVBAMTHWhhbmEtc3RhZ2luZy1ibS5mcmExLmhwc2djLmRlMB4XDTIwMTAyMzExMjgwMFoXDTM4MDEwMTAwMDAwMVowSTERMA8GA1UECxMISEFOQSBTU0wxDDAKBgNVBAsTA1JIRTEmMCQGA1UEAxMdaGFuYS1zdGFnaW5nLWJtLmZyYTEuaHBzZ2MuZGUwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDGpiWr3JE9fG28Ov/jaWO9rF1vPSkgTyhK2DIs4KuIy85uA6bL++YpeRtIMznvzKh4/5pJcG/6qQ8LF9gTsrNEmMEKf/5hsNKn/qSuaxXBubS2geskNwxe5Ej2I9Pcbbg4FmmwXyqowhwWWpwTUULUJojx1p/p7YFYpJRG2+jvg06Fi/fGKSfWQ3tl0vz6QyH075gUa0tPrjA4nw5Hwcl+SIZ1+B1VFmP4FxbS8f9Ks5istf7CGEx6jqL5J6bWzzLx/QSiBFE41jnH2ngIPn/kxeWMY8EVg6joyJyPjMkTCok2kzk08lsjtzd+PPKpcG7tHKLFOrcS/YKAd/f+FmLNAgMBAAEwDQYJKoZIhvcNAQELBQADggEBAJSz5wk9HTBswzFYQTfF/3rNr39WUZ5v6oExjz/as6urcpj3+6zyMs2bUpf1V7tJhFM3Rx74oaJMxxFIQFk+CMx5ugX5pNcYr5wnQsoQKx/ae7Jp/1ey9OBYFGmUusY4Kd5kUYwKDjcukemFOA6oSXdrtz0h66sy89CcrtcU4vuPJ/EYsIm+0E0V7N54pEzGW8ZNKw/osXH8SaPqjyJ54ZFD9KM+zn5KlfIVI5HZlHl4LePiLWuzW1fj7dZ0+xGvsvud3w6QfBgYbXUcCaInRGEKMnvovJR+O6DLW5r6M/KAi+eAkSmvOc4bnQ5Ryr/MKuD7fvqBoOZCQauf6u58pio=-----END CERTIFICATE-----";
    const hanahost = "hana-staging-bm.fra1.alp-dev.org";
    const hanadb = process.env.HANA_DBNAME;
    const hanaadminpw = process.env.HANA_ADMIN_PW;
    const hana_read_pw = process.env.HANA_READ_PW;
    const hana_write_pw = process.env.HANA_WRITE_PW;
    const hana_custom_pw = process.env.HANA_CUSTOM_PW;
    let nullExists = [hanadb, hanaadminpw, hana_read_pw, hana_write_pw, hana_custom_pw].some(el => el == null)
    if (!nullExists) {
        return `{"${hanadb}":{"host":"${hanahost}","port":"30113","databaseName":"${hanadb}","validate_certificate":"true","sslTrustStore":"${hanacert}","pooling":"true","autoCommit":"true","encrypt":"true","sslCryptoProvider":"sapcrypto","hanaAdminUser":"TENANT_ADMIN_USER","hanaAdminPassword":"${hanaadminpw}","hanaReadUser":"TENANT_READ_USER","hanaReadPassword":"${hana_read_pw}","hanaWriteUser":"TENANT_WRITE_USER","hanaWritePassword":"${hana_write_pw}","hanaCustomUser":"TENANT_CUSTOM_USER","hanaCustomPassword":"${hana_custom_pw}","updateSchemaOnStartup":"false", "enableAuditPolicies": false}}`
    } else {
        return baseEnv.HANA_TENANT_CONFIGS
    }
}

function build(opt, options: any) {
    options = (<any>Object).assign({eslint: false, pkg: true, tsc: true, tslint: true, grunt: false, lib: false, name: '', tscbuild: false}, options);
    try {
        _build(opt, options);
    } catch (err) {
        console.log(err);
        _build(opt, options);
    }
}

function _build(opt, options = {eslint: false, pkg: true, tslint: true, grunt: false, lib: false, name: '', tscbuild: false}) {
    //options = Object.assign({pkg: true, tsc: true, tslint: true, grunt: false, lib: false, name: '', tscbuild: false}, options);
    console.log(`🚧 BUILD ${options.name} 🚧 ${JSON.stringify(options)}`)

    opt.cwd = path.normalize(opt.cwd);
    opt.shell = isWindows();
    opt.stdio = [0,1,2];
    
    childProcess.execFileSync('npx', ['tsc'], opt);
    
    if(!cmdOptions.build_only_tsc) {
        if (options.eslint) childProcess.execFileSync('npx', ['eslint','*/**/*.{js,ts,tsx}', '--max-warnings', '0'], opt);
        if (options.tslint) childProcess.execFileSync('npx', ['tslint','--config', './tslint.json', '--project', './tsconfig.json'], opt);
        if (options.grunt) childProcess.execFileSync('npx', ['grunt', 'production'], opt);
    }
    if(!options.tslint && !options.eslint) console.log(`✋ NO LINTING @ ${options.name} ✋ Please setup eslint`)
}


function buildMRI() {
    const doBuildMRI = cmdOptions.build_only_mri || (!cmdOptions.build_only_tsc);
    const doBuildTsc = cmdOptions.build_only_tsc || (!cmdOptions.build_only_mri);

    if (doBuildTsc) {
        build({cwd:'alp-libs/nodejs/alp-base-utils'}, {lib: true, tslint: false, name:'alp-base-utils'})
        build({cwd:'alp-libs/nodejs/alp-config-utils'}, {lib: true, tslint: false, name:'alp-config-utils'})

        // build({cwd:'services/alp-db-svc'}, {eslint: false, tslint:false, name:'alp-db-svc'});
        // build({cwd:'../services/alp-approuter'}, {eslint: false, tslint:false, name:'alp-approuter'});
        build({cwd:'services/analytics-svc'}, {name:'analytics', tslint:false});
        build({cwd:'services/bookmark-svc'}, {name:'bookmark', tslint:false});
        // build({cwd:'../services/assignment-svc'}, {tslint:false, tscbuild:true, name:'chp-assignment-config'});
        // build({cwd:'../services/cdw-svc'}, {tslint:false, tscbuild:true, name:'chp-cdw-config'});
        // build({cwd:'../services/mri-pa-config'}, {tscbuild:true, tslint:false, name:'pa-config'})
        build({cwd:'services/query-gen-svc'}, {tscbuild:true, tslint:false, name:'query-gen'});
    }

    try {
        childProcess.execFileSync('yarn', ['outdated'], { stdio: [0,1,2]});
    } catch(err) {
        console.error("✋ Outdated dependencies!");
    }
    
    console.log('done')

}

function run(service_name, opt) {
    if(cmdOptions[`run_${service_name}`]) {
        if(cmdOptions[`run_dev_${service_name}`]) {
            let env = (<any>Object).assign({}, opt.env, process.env);
            opt.env = env;
            opt.shell = true;
            let mainpath = "";
            if(service_name==='chart' || service_name==='dbmgmt') {
                mainpath = "src/app.ts";
            } else { 
                mainpath = "src/main.ts";
            }
            let bash = childProcess.spawn('node', [path.normalize(root + 'node_modules/nodemon/bin/nodemon.js'), 
            '--watch',  'src', '-e', 'js,ts,json', '--exec', path.normalize(root + 'node_modules/.bin/ts-node') + " --files "+mainpath], opt); 
            bash.stdout.on('data', data => {
                console.log('\x1b[44m%s\x1b[0m',`${service_name}   📄 ${data}`.trim());
              });
            bash.stderr.on( 'data', data => {
                console.log('\x1b[101m%s\x1b[0m', `${service_name}   💥 ${data}`.trim() );
            });
            bash.on( 'close', code => {
                console.log('\x1b[41m%s\x1b[0m', `🔥 ${service_name} 🔥 nodemon child process exited with code ${code}`.trim() );
            });

            //opt.env = Object.assign({}, process.env, opt.env);
            //opt.shell = true
            //console.log(`>>> Starting ${service_name} in dev mode <<<`);
            //childProcess.fork(`${root}node_modules/.bin/nodemon`, ['--inspect', '--watch', 'src', '-e', 'js,ts,json', '--exec', `'${root}node_modules/.bin/ts-node src/main.ts'`], opt);
        } else {
            console.log(`🚀 STARTING ${service_name} 🚀 at port ${opt.env.PORT}`);
            opt.silent = true;
            let p;
            if(service_name==='chart' || service_name==='dbmgmt') {
                p = childProcess.fork('target/app.js', opt);
            } else { 
                p = childProcess.fork('target/src/main.js', opt); 
            }
            p.stdout.on( 'data', data => {
                console.log(`${service_name}   📄 ${data}`.trim() );
            });
            p.stderr.on( 'data', data => {
                console.log('\x1b[31m%s\x1b[0m', `${service_name}   💥 ${data}`.trim() );
            });
            p.on( 'close', code => {
                console.log('\x1b[41m%s\x1b[0m', `🔥 ${service_name} 🔥 exited with code ${code}`.trim() );
            });
            
        }
    } else {
        console.log(`🔥${service_name}🔥  is disabled <<<`);
    }
}

function loadAppEnv(appFolder) {
    let appEnvExample;
    let appEnv;
    try {
        appEnvExample = dotenv.parse(fs.readFileSync(path.normalize(path.join(appFolder, '.env.example'))));
        appEnv = dotenv.parse(fs.readFileSync(path.normalize(path.join(appFolder, '.env'))));
    } finally {
        return { ...appEnvExample, ...(appEnv || {}), ...process.env };
    }
}

function runMRI() {
    console.log("🏁 Starting Apps...");
 
    const approuterEnv = loadAppEnv('../services/alp-approuter/');
    console.log(approuterEnv);
    childProcess.fork('./index.js', [], { cwd:'services/alp-approuter/target', env: approuterEnv });
 
    const qeEnv = loadAppEnv('./services/analytics-svc/');

    run('mri', {cwd:'services/analytics-svc', env: qeEnv});
 
    const cdwEnv = loadAppEnv('../services/cdw-svc/');

    run('cdw', {cwd:'services/cdw-svc', env: cdwEnv});

    const dbMgmtEnv = loadAppEnv('./services/alp-db-svc/');

    dbMgmtEnv.HANA_TENANT_CONFIGS = getDbMgmtServiceCfg(dbMgmtEnv);
    dbMgmtEnv.ALP_DB_ENV_DEBUG = "true";
    dbMgmtEnv.ALP_DB_LOGLEVEL = "debug";
    dbMgmtEnv.SKIP_AUTH = "true";
    run('dbmgmt', {cwd:'services/alp-db-svc', env: dbMgmtEnv});

    const bmEnv = loadAppEnv('./services/bookmark-svc/');
    run('bookmark', {cwd:'services/bookmark-svc', env: bmEnv});

    const pacfgEnv = loadAppEnv('../services/mri-pa-config/');
    run('mriconfig', {cwd:'services/mri-pa-config', env: pacfgEnv});
    
    const queryGenEnv = loadAppEnv('./services/query-gen-svc/');
    run('query_gen', {cwd:'services/query-gen-svc', env: queryGenEnv});
}

function printBuildInfo() {
    if(isWindows()) {
        console.log("windows")
    } else if(isLinux()) {
        console.log("linux")
    } else console.log("mac?")
    console.log(cmdOptions)
}


switch(command) {
    case 'build':
        printBuildInfo();
        buildMRI();
        break;
    case 'run':
        printBuildInfo();
        runMRI();
        break;
    default:
        console.log(' \
        Usage: buildservices.js [build|run]\
        ')
}
