# Data2Evidence Quick Start

[![DockerCompose AzureTest CD](https://github.com/data2evidence/d2e/actions/workflows/az-dc-cd.yml/badge.svg)](https://github.com/data2evidence/d2e/actions/workflows/az-dc-cd.yml) &nbsp;&nbsp; [![Docker Build & Push](https://github.com/data2evidence/d2e/actions/workflows/docker-push.yml/badge.svg)](https://github.com/data2evidence/d2e/actions/workflows/docker-push.yml) &nbsp;&nbsp; [![Docker compose Build & Up](https://github.com/data2evidence/d2e/actions/workflows/docker-compose-up.yml/badge.svg)](https://github.com/data2evidence/d2e/actions/workflows/docker-compose-up.yml)

The following document outlines the Quick Start setup with demo data & pulls all images from the GitHub container registry.

> [!NOTE]
>
> - If you are starting the application for first time start from the [Environment Variables and Credentials Setup](#environment-variables-and-credentials-setup) section
> - If you have setup the application before, start from the [Application Setup](#application-setup) section

# Getting Started

## Pre-requisites

- Install pre-requisite softwares for running D2E. Refer to the installation guide [here](./docs/1-setup/README.md)
- Install the d2e cli client by run the command in your terminal:

```bash
npm install -g https://github.com/data2evidence/d2e/releases/download/latest/data2evidence-cli.tgz
```

## Environment Variables and Credentials Setup

- Create directory to store d2e configuration files and go to it. Please note that subsequent commands need to be executed in the directory:

```bash
mkdir d2e
cd d2e
```

### GitHub Personal Access Token

> [!NOTE] 
> The GitHub Personal Access Token is required to pull docker images and npm packages from GitHub. We recommend to create a dedicated GitHub access token with read:packages rights only.

- See: [here](./docs/1-setup/README.md) how create the values for GitHub Username (`GH_USERNAME`) & GitHub Personal Access token (`GH_TOKEN`)

- Export the environment variables

```bash
export GH_USERNAME=<GH_USERNAME>
export GH_TOKEN=<GH_TOKEN>
```

#### Custom Environment Variables (optional)

Export additional shell variables as relevant. See: [here](docs/1-setup/env-types.md)

- `export CADDY__ALP__PUBLIC_FQDN=<FQDN>` - Remote Virtual Machine Server scenario (otherwise unset)
- `export TLS__CADDY_DIRECTIVE=''` (blank) - Publicly Resolvable FQDN scenario (otherwise unset)

### Environment Variables & Secrets

- Invoke the following commands to generate random secrets & suitable environment-variables to the `.env` file

```bash
GH_USERNAME=$GH_USERNAME GH_TOKEN=$GH_TOKEN d2e init
```

- See: [here](./docs/1-setup/env-vars.md) for a description of the environment variables generated

### Authenticate to GitHub Container Registry

- to pull D2E containers

```bash
d2e login
```

## Application Setup

### Initialize D2E

- Initializes authentication database based on secrets in `.env`

```bash
d2e setup
```

### Start D2E

Navigate to the folder where d2e repo is downloaded. Run the folllowing:

- Run the command to get the necessary docker images and run D2E:

```bash
d2e startdemo
```

# D2E Guide

## Authentication Portal

- Input the D2E Portal URL into a Chrome Web Browser:

  - [https://localhost:41100/portal](https://localhost:41100/portal) - local workstation
  - `https://<FQDN>/portal` - remote server

- A ["**Proceed to localhost**"](docs/images/chrome/chrome-proceed-to-localhost.png) display is expected.
- Select **Advanced** > **Proceed to localhost (unsafe)**
- You will see the [**D2E login screen**](./docs/images/portal/LoginPage.png)

## Accessing Admin Portal

The Admin Portal allows authorized personnel to login and perform the management of users, datasets and job plugins.

- Login as Admin with following credentials:

  - username - `admin`
  - password - `Updatepassword12345`

- Click on **Account** on the top right > **Switch to admin portal**

> **The expected display is:** > ![AdminPortal](./docs/images/portal/AdminPortal.png)

Additional info:

- [Performing password change](./docs/2-load/1-initial-admin.md)
- [Performing user management](./docs/2-load/2-users-roles.md)

> [!TIP]
> For quick access to the Admin Portal, input the following URL in the search bar:
>
> - [https://localhost:41100/portal/systemadmin/user-overview](https://localhost:41100/portal/systemadmin/user-overview) - local workstation
> - [https://`<FQDN>`/portal/systemadmin/user-overview](https://<FQDN>/portal/systemadmin/user-overview) - remote server

## Configure D2E with a custom dataset

Please find information on how to add a custom dataset and configure D2E [here](./docs/2-load/README.md)

## Configure D2E using the demo dataset

> [!NOTE]
> You need to start Data2Evidence with `d2e startdemo` in order to use the demo dataset

- Open the D2E Portal and click **Switch to the Admin Portal**.

- In the Admin portal click on **Setup** menu
- Click the **Demo Setup** - **Configure** button & follow the Demo Setup steps:

1. **Setup demo database** - Click on the **Run** Button
2. **Please restart all services** - by executing the following commands in the terminal: `d2e stopdemo`, `d2e startdemo` & `d2d patchdemodb`
3. **Setup demo dataset** - Click on the **Run** Button

The researcher portal is now populated with a demo dataset.

## Researcher Portal

### Cohort Creation

- Navigate to Researcher Portal and select **Cohort** tab at URL:
  - [https://localhost:41100/portal/researcher](https://localhost:41100/portal/researcher) - local workstation
  - `https://<FQDN>/portal/researcher` - remote server
- Refer to the [documentation here](./docs/3-configure/8-cohort.md) for more details.

## Stopping the Application

Enter the following command:

- `d2e stop` - if started with `d2e start`
- `d2e stopdemo` - if started with `d2e startdemo`

## Removing the Resources

Removes the containers, volumes & networks

- `d2e clean` - if started with `d2e start`
- `d2e cleandemo` - if started with `d2e startdemo`

> [!WARNING]
>
> Removes all d2e data

- For a fresh startup, re-run from the [Initialize D2E](#Initialize-D2E) section
