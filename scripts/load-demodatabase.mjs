#!/usr/bin/env zx

import crypto from 'crypto';
import dotenv from 'dotenv';

const args = process.argv.slice(2); 
const vIndex_envfile = args.indexOf("-n");
if (vIndex_envfile !== -1 && !args[vIndex_envfile + 1].startsWith('-')) {
    envfile = (args[vIndex_envfile + 1]);
} else {
    var envfile = ".env";
}
console.log(`ENVFILE: ${envfile}`);
try {
    await $`test -f ${envfile}`;
    dotenv.config({ path: `${envfile}` });
} catch (error) {
    console.log(chalk.red(`FATAL ${envfile} not found`));
    process.exit(1)
}

const vIndex_version = args.indexOf("-v");
if (vIndex_version !== -1 && !args[vIndex_version + 1].startsWith('-')) {
    version = (args[vIndex_version + 1]);
} else {
    version = "0.7.0"; //default version
}
console.log(`Version: ${version}`);

const vIndex_dev_mode = args.indexOf("-d");
if (vIndex_dev_mode !== -1 && !args[vIndex_dev_mode + 1].startsWith('-') ) {
    var dev_mode = true;
    path = (args[vIndex_dev_mode + 1]);
    console.log(`Dev Mode: ${dev_mode}, function path: ${path}`);
} else {
    var dev_mode = false;
}


// Database variables
let project_name = process.env.PROJECT_NAME ? `${process.env.PROJECT_NAME}` : 'd2e';
let database_name = 'postgres'; // actual name of database in database_host
let database_host = `${project_name}-demodb`; //PostgreSQL container name /or/ external database FQDN
let DEMO__DB_CODE = 'demo_database'; //display name
let DEMO__DB_CDM_SCHEMA = 'demo_cdm';
let DEMO__DB_USER = 'postgres';
let DEMO__DB_PASSWORD = 'mypass';
var db_extra = {"max": 50, "schema":DEMO__DB_CDM_SCHEMA, "queryTimeout":60000,"statementTimeout":60000,"idleTimeoutMillis":300000,"connectionTimeoutMillis":60000,"idleInTransactionSessionTimeout":300000};

const public_key = process.env.DB_CREDENTIALS__INTERNAL__PUBLIC_KEY;
const app_client_id = process.env.LOGTO__ALP_APP__CLIENT_ID;
let public_fqdn = process.env.CADDY__ALP__PUBLIC_FQDN || 'localhost';
let port = process.env.PORT ? `:${process.env.PORT}` : ':443';
let CADDY__ALP__PUBLIC_FQDN = `${public_fqdn}${port}`;
async function createCredentials (password,public_key) {
    try {
        const salt = crypto.randomBytes(16).toString("base64");
        var passwordSalt = password.concat(salt);
        var encryptedCredential = crypto.publicEncrypt({
            key: String(public_key).replace(/\\n/g, "\n"),
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256"
        },Buffer.from(passwordSalt));
        return [encryptedCredential.toString("base64"),salt];
    } catch {
        console.log(chalk.red('Error in creating credentials'));
    }
}; 
let [encryptedCredentialsRead, saltRead] = await createCredentials(DEMO__DB_PASSWORD, public_key); // read scope
let [encryptedCredentialsAdmin, saltAdmin] = await createCredentials(DEMO__DB_PASSWORD, public_key); // admin scope

var response= await $`curl -iks "https://${CADDY__ALP__PUBLIC_FQDN}/oidc/auth?redirect_uri=https://${CADDY__ALP__PUBLIC_FQDN}/portal/login-callback&client_id=${app_client_id}&response_type=code&state=lbFDB1hcko&scope=openid%20offline_access%20profile%20email&nonce=Osptnuwqc47w&code_challenge=n6eqz8p8jj1L9Qu7pY2_GrWO7XyaQbWrcs54x9OAnPg&code_challenge_method=S256"`

// Extract cookies
var interaction_cookie=await $`echo ${response} | grep _interaction= | awk -F'=' '{print $2}' | awk -F'; ' '{print $1}'`;
var interaction_sig_cookie=await $`echo ${response} | grep _interaction.sig= | awk -F'=' '{print $2}' | awk -F'; ' '{print $1}'`;
var interaction_resume_cookie=await $`echo ${response} | grep _interaction_resume= | awk -F'=' '{print $2}' | awk -F'; ' '{print $1}'`;
var interaction_resume_sig_cookie=await $` echo ${response} | grep _interaction_resume.sig= | awk -F'=' '{print $2}' | awk -F'; ' '{print $1}'`;
var logto_cookie=await $` echo ${response} | grep _logto= | awk -F'=' '{print $2}' | awk -F'; ' '{print $1}'`;

// Sign in
var response=await $`(curl -iks --request PUT 'https://${CADDY__ALP__PUBLIC_FQDN}/api/interaction' \
    --header 'content-type: application/json' \
    --header 'Referer: https://${CADDY__ALP__PUBLIC_FQDN}/sign-in' \
    --header "Cookie: _interaction=${interaction_cookie}; _interaction.sig=${interaction_sig_cookie}; _logto={\"appId\":\"${app_client_id}\"}" \
    --data '{
    "event": "SignIn",
    "identifier": {
        "username": "admin",
        "password": "Updatepassword12345"
    }
}')`

// Submit sign in page
var response=await $`curl -iks --request POST 'https://${CADDY__ALP__PUBLIC_FQDN}/api/interaction/submit' \
--header 'accept: application/json' \
--header 'origin: https://${CADDY__ALP__PUBLIC_FQDN}' \
    --header 'referer: https://${CADDY__ALP__PUBLIC_FQDN}/sign-in' \
    --header "Cookie: _interaction=${interaction_cookie}; _interaction.sig=${interaction_sig_cookie}; _logto={\"appId\":\"${app_client_id}\"}"`

// Get session
var response=await $`curl -iks "https://${CADDY__ALP__PUBLIC_FQDN}/oidc/auth/${interaction_cookie}" \
    --header 'referer: https://${CADDY__ALP__PUBLIC_FQDN}/sign-in' \
    --header "Cookie: _interaction=${interaction_cookie}; _interaction.sig=${interaction_sig_cookie}; _interaction_resume=${interaction_resume_cookie}; _interaction_resume.sig=${interaction_resume_sig_cookie}; _logto={\"appId\":\"${app_client_id}\"}"`

var interaction_cookie=await $`echo ${response} | grep _interaction= | awk -F'=' '{print $2}' | awk -F'; ' '{print $1}'`;
var interaction_sig_cookie=await $`echo ${response} | grep _interaction.sig= | awk -F'=' '{print $2}' | awk -F'; ' '{print $1}'`;
var interaction_resume_cookie=await $`echo ${response} | grep _interaction_resume= | awk -F'=' '{print $2}' | awk -F'; ' '{print $1}'`;
var interaction_resume_sig_cookie=await $` echo ${response} | grep _interaction_resume.sig= | awk -F'=' '{print $2}' | awk -F'; ' '{print $1}'`;
var logto_cookie=await $` echo ${response} | grep _logto= | awk -F'=' '{print $2}' | awk -F'; ' '{print $1}'`;
var session_cookie=await $` echo ${response} | grep _session= | awk -F'=' '{print $2}' | awk -F'; ' '{print $1}'`;
var session_sig_cookie=await $` echo ${response} | grep _session.sig= | awk -F'=' '{print $2}' | awk -F'; ' '{print $1}'`;

// Submit consent page
var response=await $`curl -iks 'https://${CADDY__ALP__PUBLIC_FQDN}/consent' \
    --header 'accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7' \
    --header 'referer: https://${CADDY__ALP__PUBLIC_FQDN}/sign-in' \
    --header "Cookie: _interaction=${interaction_cookie}; _interaction.sig=${interaction_sig_cookie}; _interaction_resume=${interaction_resume_cookie}; _interaction_resume.sig=${interaction_resume_sig_cookie}; _session=${session_cookie}; _session.sig=${session_sig_cookie}; _logto={\"appId\":\"${app_client_id}\"}"`
    
// Get authorization code
var response=await $`curl -iks "https://${CADDY__ALP__PUBLIC_FQDN}/oidc/auth/${interaction_cookie}" \
    --header 'accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7' \
    --header 'referer: https://${CADDY__ALP__PUBLIC_FQDN}/sign-in' \
    --header "Cookie: _interaction=${interaction_cookie}; _interaction.sig=${interaction_sig_cookie}; _interaction_resume=${interaction_resume_cookie}; _interaction_resume.sig=${interaction_resume_sig_cookie}; _session=${session_cookie}; _session.sig=${session_sig_cookie}; _logto={\"appId\":\"${app_client_id}\"}"`

var authorization_code=await $`echo ${response} | sed -n 's/.*code=\\([^&]*\\).*/\\1/p' | head -n 1`;

// Complete login
var response=await $`curl -iks "https://${CADDY__ALP__PUBLIC_FQDN}/portal/login-callback?code=${authorization_code}&state=lbFDB1hcko&iss=https%3A%2F%2Flocalhost%3A41100%2Foidc" \
    --header 'accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7' \
    --header 'referer: https://${CADDY__ALP__PUBLIC_FQDN}/sign-in' \
    --header "Cookie: _interaction=${interaction_cookie}; _interaction.sig=${interaction_sig_cookie}; _interaction_resume=${interaction_resume_cookie}; _interaction_resume.sig=${interaction_resume_sig_cookie}; _session=${session_cookie}; _session.sig=${session_sig_cookie}; _logto={\"appId\":\"${app_client_id}\"}"`

// Get Bearer token
var response=await $`curl -iks 'https://${CADDY__ALP__PUBLIC_FQDN}/oauth/token' \
    --header 'accept: application/json, text/javascript, */*; q=0.01' \
    --header 'content-type: application/x-www-form-urlencoded' \
    --header "Cookie: _interaction=${interaction_cookie}; _interaction.sig=${interaction_sig_cookie}; _interaction_resume=${interaction_resume_cookie}; _interaction_resume.sig=${interaction_resume_sig_cookie}; _session=${session_cookie}; _session.sig=${session_sig_cookie}; _logto={\"appId\":\"${app_client_id}\"}" \
    --header 'origin: https://${CADDY__ALP__PUBLIC_FQDN}' \
    --header 'referer: https://${CADDY__ALP__PUBLIC_FQDN}/portal/login-callback?code=2sxkx6uCahwOfKo1cwzLaAq5MfdBJrMcqCLNHvOTXFv&state=odSrnZhVyE&iss=https%3A%2F%2Flocalhost%3A41100%2Foidc' \
    --data-urlencode 'grant_type=authorization_code' \
    --data-urlencode "client_id=${app_client_id}" \
    --data-urlencode 'redirect_uri=https://${CADDY__ALP__PUBLIC_FQDN}/portal/login-callback' \
    --data-urlencode "code=${authorization_code}" \
    --data-urlencode 'code_verifier=kqVLhCyXRJ3Y9mXie6F9d1FW8AUbTUzIuJiqUf1SM9I'`

var BEARER_TOKEN=await $`echo ${response} | grep -o '"access_token":"[^"]*"' | sed 's/"access_token":"\\([^"]*\\)"/\\1/'`

var payload = JSON.stringify({
    "host": database_host,
    "port": 5432,
    "code": DEMO__DB_CODE,
    "name": database_name,
    "dialect": "postgres",
    "extra": {
        "Internal": db_extra
    },
    "credentials": [
        {
            "username": DEMO__DB_USER,
            "password": encryptedCredentialsAdmin,
            "salt": saltAdmin,
            "userScope": "Admin",
            "serviceScope": "Internal"
        },
        {
            "username": DEMO__DB_USER,
            "password": encryptedCredentialsRead,
            "salt": saltRead,
            "userScope": "Read",
            "serviceScope": "Internal"
        }
    ],
    "vocabSchemas": [
        DEMO__DB_CDM_SCHEMA
    ], 
    "authenticationMode": "Password",
    "publications" : [
       { 
            "slot": "data2evidence",
            "publication": `${DEMO__DB_CODE}_publication`,
       }
    ]
})
try { 
    var resp = await $`(curl -ks -w "status_code:%{http_code}" --location --request POST 'https://${CADDY__ALP__PUBLIC_FQDN}/trex/db/' \
    --header 'Referer: https://${CADDY__ALP__PUBLIC_FQDN}/sign-in' \
    --header 'Content-Type: application/json' \
    --header 'Authorization: Bearer ${BEARER_TOKEN}' \
    --data ${payload})`
} catch (error) { 
    console.error(error);
}
var resp_status_code = await $`echo ${resp} | grep -o 'status_code:[0-9]*' | awk -F':' '{print $2}'`

if (resp_status_code == '200') { 
    console.log(chalk.green(`Setup database completed successfully.`));
} else {
    console.log(chalk.red(`Setup database unsuccessful.`));
    console.log(`resp: ${resp}`)
    process.exit(1)
}

/*
if (dev_mode) {
    console.log(`Restarting services with ENV_TYPE=${ENV_TYPE} CADDY__CONFIG=${CADDY__CONFIG} npx d2e -e -v ${version} -d ${path} stop`);
    await $`ENV_TYPE=${ENV_TYPE} CADDY__CONFIG=${CADDY__CONFIG} npx d2e -e -v ${version} -d ${path} stop`
    await $`ENV_TYPE=${ENV_TYPE} CADDY__CONFIG=${CADDY__CONFIG} npx d2e -e -v ${version} -d ${path} start`
} else { 
    console.log(`Restarting services with d2e -e -v ${version} stop`);
    await $`d2e -e -v ${version} stop`
    await $`d2e -e -v ${version} start`
}*/
