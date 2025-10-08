#!/usr/bin/env node
const { execSync } = require('child_process');
const { spawn } = require('child_process');
const path = require('path');

try {
    const pwd = execSync('pwd').toString().trim();
        console.log(`Current directory: ${pwd}`);
} catch (error) {
        console.error(`execSync error: ${error}`);
}

console.log('Starting mock server...');
process.env.WEBAPI_URL = process.env.WEBAPI_URL ?? 'https://atlas-demo.ohdsi.org/WebAPI';
process.env.SOURCE = process.env.SOURCE ?? 'SYNPUF1K';
process.env.USE_CACHE = process.env.USE_CACHE ?? 'false';
process.env.SERVER_URL = process.env.SERVER_URL ?? 'http://localhost:3131';
const runtimePath = path.join(__dirname, 'src', 'query-filter', 'mock-server');
console.log(`Runtime path: ${runtimePath}`);
const ls = spawn(`npm`, [`--prefix`, runtimePath, `start`], {
    env: process.env,
});

ls.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
});

ls.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
});