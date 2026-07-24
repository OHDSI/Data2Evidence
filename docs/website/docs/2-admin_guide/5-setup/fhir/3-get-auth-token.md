# Get auth token

## Authorization

The fhir endpoint follows OAuth client-credentials flow where an incoming request is authorised based on the token it carries in the Authorisation header.

## How to obtain access token

Obtain an access token using the below curl command.

``` bash
curl -ik 'https://$D2E__PUBLIC__FQDN/oauth/token' \
--header 'accept: application/json, text/javascript, */*; q=0.01' \
--header 'content-type: application/x-www-form-urlencoded' \
--data-urlencode 'grant_type=client_credentials' \
--data-urlencode "client_id=$LOGTO__ALP_DATA__CLIENT_ID" \
--data-urlencode "client_secret=$LOGTO__ALP_DATA__CLIENT_SECRET"
```

Replace

- `D2E__PUBLIC__FQDN` with
  - localhost:41100 - local workstation
  - FQDN - remote server
- `LOGTO__ALP_DATA__CLIENT_ID` with the value from .env file
- `LOGTO__ALP_DATA__CLIENT_SECRET` with the value from .env file