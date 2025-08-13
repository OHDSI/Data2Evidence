#!/usr/bin/env zx

import crypto from 'crypto';
import dotenv from 'dotenv';

if ( await $`[ -f .env.local ]` ) { 
    dotenv.config({ path: '.env.local' });
} else { 
    console.log(chalk.red(`FATAL .env file not found`));
    await $`exit 1`;
}

const DEMO__DB_PASSWORD = "TestPW1234"

async function createCredentials (password,public_key) {
    try {
        //const salt = crypto.randomBytes(16).toString("base64");
        var passwordSalt = password.concat("salt");
        var encryptedCredential = crypto.publicEncrypt({
            key: String(public_key).replace(/\\n/g, "\n"),
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256"
        },Buffer.from(passwordSalt));
        return [encryptedCredential.toString("base64")];
    } catch {
        console.log(chalk.red('Error in creating credentials'));
    }
}; 

const encryptedCredentials = await createCredentials(process.env.DEMO__DB_PASSWORD || "TestPW1234", process.env.DB_CREDENTIALS__INTERNAL__PUBLIC_KEY); // read scope

console.log(encryptedCredentials[0]);
