#!/usr/bin/env zx
import dotenv from 'dotenv';

if ( await $`[ -f .env ]` ) {  
    dotenv.config('.env');
} else { 
    console.log(chalk.red(`FATAL .env file not found`));
    await $`exit 1`
}

const app_client_id = process.env.LOGTO__ALP_APP__CLIENT_ID;
let public_fqdn = process.env.CADDY__ALP__PUBLIC_FQDN || 'localhost';
let port = process.env.PORT ? `:${process.env.PORT}` : ':443';
let CADDY__ALP__PUBLIC_FQDN = `${public_fqdn}${port}`;

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

// Setup demo dataset
var resp = await $`curl -ks --location 'https://${CADDY__ALP__PUBLIC_FQDN}/demo/setup-dataset' \
        --header 'Content-Type: application/x-www-form-urlencoded' \
        --header 'Authorization: Bearer ${BEARER_TOKEN}' \
        --data-urlencode 'client_id=${app_client_id}'`
var resp_message = await $`echo ${resp} | grep -o '"message":"[^"]*"' | sed 's/"message":"\\([^"]*\\)"/\\1/'`
var progress_id = await $`echo ${resp} | grep -o '"id":"[^"]*"' | sed 's/"id":"\\([^"]*\\)"/\\1/'`
console.log(chalk.blue(`${resp_message}`));        
var progress_status = "inprogress";

try { 
    while (progress_status == "inprogress") {
        var resp = await $`curl -ks --location --request GET 'https://${CADDY__ALP__PUBLIC_FQDN}/demo/progress/${progress_id}' \
        --header 'Content-Type: application/x-www-form-urlencoded' \
        --header 'Authorization: Bearer ${BEARER_TOKEN}' \
        --data-urlencode 'client_id=${app_client_id}'`
        var progress_status = await $`echo ${resp} | grep -o '"status":"[^"]*"' | tail -n 1 | sed 's/"status":"\\([^"]*\\)"/\\1/'`
        console.log(`progress_status: ${progress_status}\n`);
        if (progress_status == "inprogress") { 
            console.log(`Setting up demo dataset...\n`);
           await $`sleep 15`
        } else if (progress_status == "completed") {
            console.log(chalk.green(`Setup completed succcessfully. Go to Job Runs to view the result.\n`));
        }
        else {
            console.log(`Setup unsuccessful. progress_status: ${progress_status}`);
            process.exit(1)
        }
    }
} catch (error) { 
    console.error(error);
    process.exit(1)
}

if (progress_status == "completed") {
    // Adding admin user access permissions to demo dataset  
    console.log(chalk.blue(`Adding admin user access permissions to demo dataset...\n`));
    var resp = await $`curl -ks --location 'https://${CADDY__ALP__PUBLIC_FQDN}/system-portal/dataset/list/systemadmin' \
            --header 'Content-Type: application/x-www-form-urlencoded' \
            --header 'Authorization: Bearer ${BEARER_TOKEN}'`    
    var resp = JSON.parse(resp);
    for (var i = 0; i < resp.length; i++) {
        var data = resp[i];
        var databaseName = data['databaseName'];
        if (databaseName == "demo_database") {
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
    console.log(chalk.green(`Completed adding admin user access permissions to demo dataset.`));
}