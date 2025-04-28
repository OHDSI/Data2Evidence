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


const start = Date.now();

try {
    var running_count=1;
    while (running_count>0) { 
        var resp = await $`curl -ks --location --request POST 'https://${CADDY__ALP__PUBLIC_FQDN}/prefect/api/flow_runs/filter' \
            --header 'Content-Type: application/x-www-form-urlencoded' \
            --header 'Authorization: Bearer ${BEARER_TOKEN}'`
        var num_of_jobs = await $`echo ${resp} | jq length`
        var job_runs = await $`echo ${resp} | jq '.[] | ((.name | gsub(" "; "_")), .state_type)' | xargs -n 2 | column -t`
        var result = await $`echo ${resp} |jq -r '.[] | {(.name|tostring):.state_type}'`
        var flow_status = await $`echo ${result} | jq -r 'to_entries|.[] | .value '`
        let lines = flow_status.stdout.trim().split('\n')
        var failed_count = lines.filter(line => line === 'FAILED' || line === 'CRASHED').length;
        var success_count = lines.filter(line => line === 'COMPLETED'|| line === 'SCHEDULED' || line === 'PAUSED').length;
        var cancelled_count = lines.filter(line => line === 'CANCELLED' || line === 'CANCELLING').length;
        var running_count = num_of_jobs-failed_count-success_count-cancelled_count;
        console.log(`Running jobs... Jobs status: Failed:${failed_count}, Success:${success_count}, Running:${running_count}, Cancelled:${cancelled_count}.`);
        await $`sleep 15` 
    }
} catch (error) { 
    console.error(error);
    await $`exit 1` 
}

const end = Date.now();
const durationMs = end - start;
const durationSec = (durationMs / 1000).toFixed(2);
console.log(`=== Summary of Job Runs ===\n${job_runs}\nTime taken: ${durationSec} seconds`);
if (success_count == num_of_jobs) { 
    console.log(chalk.green(`Job runs completed.`));
    await $`exit 0`
} else if (failed_count>0) {
    console.log(chalk.red(`Some job runs have failed. Please refer to the Job Runs in the Admin Portal for more info.`));
    await $`exit 1` 
} else {
    console.log(`An error occurred. Please refer to the Job Runs in the Admin Portal for more info.`)
    await $`exit 1` 
}

