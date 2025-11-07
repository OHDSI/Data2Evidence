var childProcess = require('child_process');
var fs = require('fs');
var path = require('path');
let pathToroot = '../../';
let mri_utils_ver = "1.1.0";

/*
let wait = function (timetowaitinMs) {
    let start = new Date().getTime();
    var end = start;
    while (end < start + timetowaitinMs) {
        end = new Date().getTime();
    }
} */

let execSynCmdIntDelay = function (cmd, opt) {
    //wait(3000);
    childProcess.execSync(cmd, opt);
}

if (process.argv.length > 2) {
    switch (process.argv[2]) {
        case 'preinstall':
            if (process.env.NODE_ENV && process.env.NODE_ENV == 'production' && !process.env.CF_STACK) {
                if (process.argv[3] == 'mri') {
                    pathToroot = '../';
                }
                let opt = { env: process.env, shell: true, stdio: 'inherit' };
                execSynCmdIntDelay(`mkdir temp-libs && cp -avr ${pathToroot}libs/. ./temp-libs/`, opt); //copy libs from root
                console.log("copied temp-libs ...");

                opt = { cwd: path.normalize(`./temp-libs/alp-base-utils`), env: process.env, stdio: 'inherit' };
                execSynCmdIntDelay('rm -rf node_modules', opt); //cleanup
                execSynCmdIntDelay('npm install --only=dev --ignore-scripts --no-package-lock', opt);
                execSynCmdIntDelay('npm install --ignore-scripts --no-package-lock', opt);
                execSynCmdIntDelay('node node_modules/typescript/bin/tsc', opt);
                execSynCmdIntDelay('rm -rf node_modules', opt);
                execSynCmdIntDelay('npm install --ignore-scripts --no-package-lock', opt);
                execSynCmdIntDelay('npm pack', opt);
                execSynCmdIntDelay(`cp -a mri-utils-${mri_utils_ver}.tgz ${path.normalize(`../../pkg/mri-utils-${mri_utils_ver}.tgz`)}`, opt); //place it under mri/pkg/
                console.log("building mri-utils done");

                opt.cwd = path.normalize(`./temp-libs/alp-config-utils`);
                execSynCmdIntDelay('rm -rf node_modules', opt); //cleanup
                execSynCmdIntDelay(`cp -a ${path.normalize(`../../pkg`)} .`, opt); //get mri-utils from mri/pkg
                execSynCmdIntDelay('npm install --only=dev --ignore-scripts --no-package-lock', opt);
                execSynCmdIntDelay('npm install --ignore-scripts --no-package-lock', opt);
                execSynCmdIntDelay('node node_modules/typescript/bin/tsc', opt);
                execSynCmdIntDelay('rm -rf node_modules', opt);
                execSynCmdIntDelay('npm install --ignore-scripts --no-package-lock', opt);
                execSynCmdIntDelay('npm pack', opt);
                execSynCmdIntDelay(`cp -a mri-config-utils-1.0.0.tgz ${path.normalize(`../../pkg/config-utils.tgz`)}`, opt);
                console.log("building config-utils done");
                console.log("copied libraries ...");

                opt = { env: process.env, shell: true, stdio: 'inherit' };
                execSynCmdIntDelay('rm -rf temp-libs', opt);
                console.log("Deleted temp libraries ...");

                execSynCmdIntDelay('npm install --only=dev --ignore-scripts --no-package-lock', opt);
                execSynCmdIntDelay('npm install --ignore-scripts --no-package-lock', opt);
                execSynCmdIntDelay('node node_modules/typescript/bin/tsc', opt);
                execSynCmdIntDelay('rm -rf node_modules', opt);
            }
            break;
        case 'prepare':
            if (process.env.NODE_ENV && process.env.NODE_ENV != 'production') {
            } else {
                childProcess.execSync('node node_modules/typescript/bin/tsc');
            }
            break;
    }
}