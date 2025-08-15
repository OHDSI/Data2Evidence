#!/usr/bin/env zx

import crypto from 'crypto';
import dotenv from 'dotenv';

if ( await $`[ -f .env.local ]` ) { 
    dotenv.config({ path: '.env.local' });
} else if ( await $`[ -f .env ]` ) { 
    dotenv.config({ path: '.env' });
} else { 
    console.log(chalk.red(`FATAL .env file not found`));
    await $`exit 1`;
}

// Check required environment variables
const requiredEnvVars = ['HDIPW', 'ENCSALT', 'DB_CREDENTIALS__INTERNAL__PUBLIC_KEY'];
const missingVars = [];

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        missingVars.push(envVar);
    }
}

if (missingVars.length > 0) {
    console.log(chalk.red(`FATAL: Missing required environment variables: ${missingVars.join(', ')}`));
    await $`exit 1`;
}

async function createCredentials (password,public_key) {
    try {
        //const salt = crypto.randomBytes(16).toString("base64");
        var passwordSalt = password.concat(process.env.ENCSALT);
        var encryptedCredential = crypto.publicEncrypt({
            key: String(public_key).replace(/\\n/g, "\n"),
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256"
        },Buffer.from(passwordSalt));
        return [encryptedCredential.toString("base64")];
    } catch (error) {
        console.log(chalk.red('Error in creating credentials:'), error.message);
        await $`exit 1`;
    }
}; 

const encryptedCredentials = await createCredentials(process.env.HDIPW , process.env.DB_CREDENTIALS__INTERNAL__PUBLIC_KEY); // read scope

console.log(encryptedCredentials[0]);
