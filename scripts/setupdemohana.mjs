#!/usr/bin/env zx
import dotenv from 'dotenv';
import crypto from 'crypto';

const args = process.argv.slice(2); 
const vIndex_envfile = args.indexOf("-n");
let envfile;
if (vIndex_envfile !== -1 && !args[vIndex_envfile + 1].startsWith('-')) {
    envfile = (args[vIndex_envfile + 1]);
} else {
    envfile = ".env";
}
try {
    await $`test -f ${envfile}`;
    dotenv.config({ path: `${envfile}` });
} catch (error) {
    console.log(`FATAL ${envfile} not found`);
    process.exit(1)
}

const app_client_id = process.env.LOGTO__ALP_APP__CLIENT_ID;
const public_key = process.env.DB_CREDENTIALS__INTERNAL__PUBLIC_KEY;
let public_fqdn = process.env.CADDY__ALP__PUBLIC_FQDN || 'localhost';
let port = process.env.PORT ? `:${process.env.PORT}` : ':443';
let CADDY__ALP__PUBLIC_FQDN = `${public_fqdn}${port}`;
const HANA_SYSTEM_PASSWORD = process.env.HANA_SYSTEM_PASSWORD;

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


async function createCredentials (password, public_key) {
    try {
        var salt = crypto.randomBytes(16).toString('base64');
        var passwordSalt = password.concat(salt);
        var encryptedCredential = crypto.publicEncrypt({
            key: public_key,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256",
            passphrase:`${process.env.DB_CREDENTIALS__INTERNAL__PRIVATE_KEY_PASSPHRASE}`
        },Buffer.from(passwordSalt));
        return [encryptedCredential.toString("base64"),salt];
    } catch (error) {
        console.log('Error in creating credentials');
        console.error(error);
        process.exit(1);
    }
}; 

let [encryptedCredentialsHanaRead, saltHanaRead] = await createCredentials(HANA_SYSTEM_PASSWORD, public_key);
let [encryptedCredentialsHanaAdmin, saltHanaAdmin] = await createCredentials(HANA_SYSTEM_PASSWORD, public_key); 

// Setup demo dataset hana
const encryptionKeysObjDb = {
    id: "demo_database_hana",
    host: "hana",
    port: 39041,
    code: "demo_database_hana",
    name: "HXE",
    dialect: "hana",
    authenticationMode: "Password",
    extra: {
    "Internal": {
        "Internal": {
            "schema": "CDMSYNPUF5PCT",
            "useTLS": false,
            "encrypt": false,
            "pooling": true,
            "autoCommit": true,
            "probeSchema": "TEST",
            "vocabSchema": "TEST",
            "enableAuditPolicies": true,
            "validateCertificate": false,
            "hostnameInCertificate": "hana"

        }
    }
},
    credentials: [
        {
            "username": "SYSTEM",
            "password": encryptedCredentialsHanaAdmin,
            "salt": saltHanaAdmin,
            "userScope": "Admin",
            "serviceScope": "Internal"
        },
        {
            "username": "SYSTEM",
            "password": encryptedCredentialsHanaRead,
            "salt": saltHanaRead,
            "userScope": "Read",
            "serviceScope": "Internal"
        }
    ],
    vocabSchemas: ["CDMVOCAB"],
    publications: [],
    DataPlatform: "",
    Internal: public_key,
};
const payloadDb = JSON.stringify(encryptionKeysObjDb);
console.log(`Initiating setup of HANA demo dataset...`);
var resp = await $`curl -X POST -ks --location 'https://${CADDY__ALP__PUBLIC_FQDN}/trex/db/' \
    --header 'Content-Type: application/json' \
    --header 'Authorization: Bearer ${BEARER_TOKEN}' \
    --data ${payloadDb}`;

try { 
    const hana_db = JSON.parse(resp).id;
    if (hana_db === "demo_database_hana") {
        console.log(`HANA demo dataset setup initiated successfully.`);
    } else {
        console.log(`Failed to initiate HANA demo dataset setup.`);
    }
} catch (err) { 
    console.log(`Failed to initiate HANA demo dataset setup.`);
    process.exit(1);
}

console.log(`Adding hana dataset...`);
let encryptionKeysObjDataset = {
    tenantId: "e0348e4d-2e17-43f2-a3c6-efd752d17c23",
    detail: {
        "name": "Demo dataset HANA",
        "summary": "",
        "description": "",
        "showRequestAccess": false
    },
    type: "hana__omop",
    tokenStudyCode: "demohana",
    schemaOption: "create_cdm",
    cdmSchemaValue: "",
    vocabSchemaValue: "",
    resultSchemaValue: "cdmdemohana",
    cleansedSchemaOption: false,
    dataModel: "omop5-3",
    plugin: "hana_load_plugin",
    databaseCode: "demo_database_hana",
    dialect: "hana",
    paConfigId: "92d7c6f8-3118-4256-ab22-f2f7fd19d4e7",
    visibilityStatus: "DEFAULT",
    attributes: [],
    tags: [],
    dashboards: [],
    cacheDatasetName: "",
    cacheDatasetType: "omop"
};
let payloadDataset = JSON.stringify(encryptionKeysObjDataset);

var resp = await $`curl -X POST -ks --location 'https://${CADDY__ALP__PUBLIC_FQDN}/gateway/api/dataset' \
    --header 'Content-Type: application/json' \
    --header 'Authorization: Bearer ${BEARER_TOKEN}' \
    --data ${payloadDataset}`;
var resp = JSON.parse(resp);

if (resp['id'] !== undefined) {
    console.log(`HANA demo dataset added successfully.`);
    var resp = await $`curl -ks --location 'https://${CADDY__ALP__PUBLIC_FQDN}/system-portal/dataset/list/systemadmin' \
            --header 'Content-Type: application/x-www-form-urlencoded' \
            --header 'Authorization: Bearer ${BEARER_TOKEN}'`    
    var resp = JSON.parse(resp);
    for (var i = 0; i < resp.length; i++) {
        var data = resp[i];
        var databaseName = data['databaseName'];
        var studyName = data['studyDetail']['name'];
        if (databaseName == "demo_database_hana" && studyName == "Demo dataset HANA") {
            var studyId = data['id'];
            var tenantId = data['tenant']['id'];
        }
    }
    var response = await $`curl -iks --location 'https://${CADDY__ALP__PUBLIC_FQDN}/usermgmt/api/user-group/register-study-roles' \
            --header 'Referer: https://${CADDY__ALP__PUBLIC_FQDN}/sign-in' \
            --header 'client_id: ${app_client_id}' \
            --header 'Content-Type: application/json' \
            --header 'Authorization: Bearer ${BEARER_TOKEN}' \
            --data '{
            "userIds": ["a6660e40-261e-4782-873e-f76b4328aecf"],
            "tenantId": "${tenantId}",
            "studyId": "${studyId}",
            "roles": ["RESEARCHER"]
            }'`
    console.log(`Completed adding admin user access permissions to demo dataset hana.`);
} else {
    console.log(`Failed to add HANA demo dataset.`);
    process.exit(1);
}