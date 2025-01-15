# Data2Evidence Standard Setup

The following document outlines a Standard setup procedure & builds all containers in this repository from source code. For the QuickStart see: [here](../README.md).

> [!NOTE]
>
> This document describes setups for both local workstation setup (`ENV_TYPE=local`) & remote server with functional Fully Qualified Domain Name (`ENV_TYPE=remote`). For more details see: [here](1-setup/env-types.md)

> [!NOTE]
>
> - If you are starting the application for first time start from the [Environment Variables and Credentials Setup](#environment-variables-and-credentials-setup) section
> - If you have setup the application before, start from the [Application Setup](#application-setup) section

# Getting Started

## Pre-requisites

- Install pre-requisite software for running D2E. See: the Setup Guide [here](1-setup/README.md)
- Clone the GitHub repository d2e in your terminal. See: [Cloning a GitHub repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository)

```bash
git clone https://github.com/data2evidence/d2e.git
cd d2e
```

## Environment Variables and Credentials Setup

> [!NOTE]
>
> `ENV_TYPE` refers to environment types:
>
> - `local` - workstation with portal URL [https//localhost:41000](https://localhost:41000/portal)
> - `remote` - server with Fully Qualified Domain Name (FQDN) with portal `https://<FQDN>/portal`

- See: [here](./1-setup/README.md) for how create the GitHub credentials to pull docker images and npm packages from GitHub. We recommend to create a dedicated GitHub access token with read:packages rights only

  - GitHub Username (`GH_USERNAME`)
  - GitHub Personal Access token (`GH_TOKEN`)

- See: [here](1-setup/env-types.md) for an explanations of:

  - Environment Type (`ENV_TYPE`)
  - Fully Qualified Domain Name (`CADDY__ALP__PUBLIC_FQDN`)
  - Certificate Signing Directive (`TLS__CADDY_DIRECTIVE`)

- Populate `.env.user`:

```bash
GH_USERNAME=<GH_USERNAME>
GH_TOKEN=<GH_TOKEN>
ENV_TYPE=<ENV_TYPE> # local|remote
CADDY__ALP__PUBLIC_FQDN=<CADDY__ALP__PUBLIC_FQDN> # Remote Virtual Machine Server scenario (otherwise unset)
TLS__CADDY_DIRECTIVE='' # (blank) - Publicly Resolvable FQDN scenario (otherwise unset)
```

### Generate variables

- Invoke the following commands to generate random secrets & environment variable values to the `.env.${ENV_TYPE}` file:

```bash
source .env.user
source .env.user.local
source .env.user.remote
CADDY__ALP__PUBLIC_FQDN=$CADDY__ALP__PUBLIC_FQDN TLS__CADDY_DIRECTIVE=$TLS__CADDY_DIRECTIVE GH_USERNAME=$GH_USERNAME GH_TOKEN=$GH_TOKEN ENV_TYPE=$ENV_TYPE yarn gen:dotenv && grep -E "TLS__CADDY_DIRECTIVE|CADDY__ALP__PUBLIC_FQDN|ENV_TYPE|GH_USERNAME|GH_TOKEN" .env.${ENV_TYPE}
```

- See: [here](./1-setup/env-vars.md) for a description of the environment variables generated

### Authenticate to GitHub Container Registry

- to pull D2E containers

```bash
docker login -u $GH_USERNAME -p $GH_TOKEN ghcr.io
```

## Application Setup

### Initialize D2E

- Initialize the authentication database based on secrets in `.env.${ENV_TYPE}`

```bash
yarn init:logto
```

### Build D2E

- Run the following command to build the necessary docker images to run D2E. Time for a Coffee ☕️ break!

```bash
yarn build:minerva
```

### Start D2E

- ENV_TYPE=local

```bash
yarn start:minerva && sleep 60
```

- ENV_TYPE=remote

```bash
yarn remote:minerva up --wait && sleep 60
```

### Application logs

```bash
yarn logs:minerva
```

# D2E Guide

## Authentication Portal

- Input the D2E Portal URL into a Chrome Web Browser:

  - [https://localhost:41100/portal](https://localhost:41100/portal) - local workstation
  - `https://<FQDN>/portal` - remote server

- A ["**Proceed to localhost**"](images/chrome/chrome-proceed-to-localhost.png) display is expected.
- Select **Advanced** > **Proceed to localhost (unsafe)**

> **The expected display is:**
>
> ![](./images/portal/LoginPage.png)

## Accessing Admin Portal

The Admin Portal allows authorized personnel to login and perform the management of users, datasets and job plugins.

- Login as Admin with following credentials:

  - username - `admin`
  - password - `Updatepassword12345`

- Click on **Account** on the top right > **Switch to admin portal**

> **The expected display is:** > ![AdminPortal](./images/portal/AdminPortal.png)

Additional info:

- [Performing password change](./2-load/1-initial-admin.md)
- [Performing user management](./2-load/2-users-roles.md)

> [!TIP]
> For quick access to the Admin Portal, input the following URL in the search bar:
>
> - [https://localhost:41100/portal/systemadmin/user-overview](https://localhost:41100/portal/systemadmin/user-overview) - local workstation
> - [https://`<FQDN>`/portal/systemadmin/user-overview](https://<FQDN>/portal/systemadmin/user-overview) - remote server

## Adding Existing Databases

This sections assumes that there is an existing database available. The database should be in a Postgres docker container name or external database with a Fully Qualified Domain Name (FQDN).

- In the Admin Portal, navigate to **Setup** > **Databases** > **Configure** > **Add database**
  > **The expected display is:** ![DatabaseListEmpty](./images/database/DatabaseListEmpty.png)
- Select **Add database** and provide the database information accordingly.
- Please refer to [documentation here](./2-load/4-setup-db-credentials.md) for more details on the input parameters for database creation.
  > **The expected result after adding a database is:** ![DatabaseList](./images/database/DatabaseList.png)
- Perform a restart of the system for new connection details to be provisioned to the data services using the command:

- ENV_TYPE=local

```bash
yarn start:minerva --force-recreate && sleep 60
```

- ENV_TYPE=remote

```bash
yarn remote:minerva up --wait --force-recreate && sleep 60
```

If there is no existing databases available, you may consider using the following sample database below and continue with the guide from section [Plugins](#plugins) onwards.

- [Synthetic Public Use Files (SynPUFs)](./2-load/): Perform sub-steps [3](./2-load/3-setup-pg-permissions.md), [4](./2-load/4-setup-db-credentials.md), [6](./2-load/6-load-synpuf1k.md) and [7](./2-load/7-load-vocab.md)
- broadsea-atlasdb: Refer to the docs [here](/docs/2-load/8-load-broadsea.md)

## Plugins

The Admin portal allows the admin user to manage plugins in the platform, for instance installation, version updates and uninstallation of plugins.

- In the Admin Portal, navigate to **Setup** > **Plugins** > **Configure**
  > **The expected display is:**![PluginTable](./images/plugins/PluginTable.png)

## Jobs Portal

The Admin portal allows the admin user to perform customized and scheduled job runs from [plugins](#plugins) that have been installed.

- In the Admin Portal, navigate to **Jobs** and select the **Jobs** tab.

  > **The expected display is**: ![JobsPortal](./images/dataflow/JobsPortal.png)

- Select the `⋮` icon to perform the respective job functions.
- Select **Job Runs** tab to get the job run status.

## Creating Datasets

- In the Admin Portal, navigate to **Datasets** > **Add dataset**

  > **The expected display is:**![DatasetList](./images/datasets/DatasetList.png)

- Provide the dataset [parameters](./3-configure/1-create-dataset.md) accordingly.
  > **The expected result upon successful addition of dataset**: ![Datasets](./images/datasets/ConfirmDatasetsPortal.png)

## Dataset Permissions

The Admin Portal allows the admin to perform dataset management to provide users with permissions for selected datasets.

- In the Admin Portal, navigate to **Datasets**.
- Navigate to the dataset you wish to provide/revoke permission access for users.
- Under **Actions** dropdown, select **Permissions** to view users who have requested for access or provide access to existing users.
- Refer to the [documentation here](./3-configure/2-dataset-permissions.md) for a detailed guide on setting permissions.

## Platform Configuration

### Generating Data Quality Dashboard (DQD)

This section generates the Data Quality Dashboard based on the dataset of interest.

- In the Admin Portal, navigate to **Datasets**. Navigate to the dataset of interest and click **Select Action**.
- Select **Run data quality** and select the **Run Analysis** button.
- Repeat the step for **Run data characterization**.
- After completing the **Data Quality** and **Data Characterization** job runs, section, refer to the [documentation here](./3-configure/4-dqd-dashboard.md) to access the Data Quality Dashboard for the respective datasets in the Researcher portal.

  > **The expected result is:** ![dqd-dashboard](./images/dqd/dqd-dashboard-1.png)

### Create Cache

This section provides the steps for setting up the analytics environment.

- Navigate to the dataset of interest and click **Select Action**.
- Select **Create cache**.
- Refer to the [documentation here](./3-configure/5-create-duckdb-file.md) to create cache via the Jobs Portal.

### Update Datasets Metadata

- In the Admin Portal, navigate to **Datasets** tab and select **Update dataset metadata**.
- Refer to the [documentation here](./3-configure/7-fetch-datasets-metadata.md) for more details.

**The expected result is as follows:**

> ![Researcher Portal Dataset Donut Chart](./images/metadata/DatasetDonutChart.png) >![Researcher Portal Dataset Metadata](./images/metadata/DatasetMetadataInfo.png)

## Researcher Portal

### Cohort Creation

- Navigate to [Researcher Portal](https://localhost:41100/portal/researcher) and select **Cohort** tab.
- Refer to the [documentation here](./3-configure/8-cohort.md) for more details.

## Stopping the Application

Enter the following command:

```bash
yarn stop:minerva
```

## Removing the Resources

Removes the containers, volumes & networks

```bash
yarn clean:minerva
```

> [!WARNING]
>
> Removes all d2e data

> [!NOTE]
>
> - If you are starting the application for first time start from the [Environment Variables and Credentials Setup](#environment-variables-and-credentials-setup) section
> - If you have setup the application before, start from the [Application Setup](#application-setup) section

# D2E Support
