## Pre-requisites

Following must be installed on your machine
- Node.js >= v20.0
- npm >= v5.2

## Install node package

- Open a terminal and create a new directory, example `atlas-ui`.
- Navigate to the new directory and Run the below command to install a new package `atlas-ui`

`npm i atlas-ui --registry <registry-url>`

## Start server

After successful installation above, Run

`npx atlas`

Open in browser with url `http://localhost:3131`

## Environment variables

| Environment variable | Description                                                | Default value                       |
|----------------------|------------------------------------------------------------|-------------------------------------|
| WEBAPI_URL           | Remote / local URL for WebAPI with authentication disabled | https://atlas-demo.ohdsi.org/WebAPI |
| SOURCE               | Datasource name                                            | SYNPUF1K                            |
| USE_CACHE            | Used to speeden the concepts fetch on subsequent requests  | false                               |
| SERVER_URL           | local port number for the server to run on                 | http://localhost:3131               |


### To override any of the above default values, simply export them as environment variables and run npx atlas

For example on a bash terminal

```bash
WEBAPI_URL=https://webapi.alp-dev.org/WebAPI
SERVER_URL=http://localhost:3005
SOURCE=EUNOMIA
USE_CACHE=true
npx atlas
```

Open in browser with url `http://localhost:3005`
