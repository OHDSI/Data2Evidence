# Data2Evidence
[![GitHub Activity](https://img.shields.io/github/commit-activity/m/data2evidence/d2e?logo=github&color=lightgreen)](https://github.com/data2evidence/d2e/graphs/contributors)
[![D2E CLI Version](https://img.shields.io/npm/v/d2e?label=d2e%20installer&logo=npm&color=blue)](https://www.npmjs.com/package/d2e) 
[![D2E Release](https://img.shields.io/github/v/release/data2evidence/d2e?color=blue&label=latest%20release&logo=github)](https://github.com/data2evidence/d2e/releases/latest)
[![D2E Docs](https://img.shields.io/badge/docs-d2e.sg-lightblue?logo=googledocs&logoColor=white)](https://docs.d2e.sg)
[![Discord](https://img.shields.io/discord/1189126876577403001?label=discord&logo=discord&logoColor=white)](https://discord.gg/5XtHky2BZe) 


<!--- [![GitHub Release](https://img.shields.io/github/v/release/data2evidence/d2e?label=notes&logo=github)](https://github.com/data2evidence/d2e/releases) --->

:construction: **Data2Evidence is under development. There might be breaking changes.** :construction:


### Why the Data2Evidence platform?

- **End-to-End Platform:**  
Get started with our all-in-one platform that simplifies ingestion, integration, ongoing management, and analysis of your research data.

- **Interactive Dataset Exploration:**  
Explore datasets with interactive views of the data to evaluate the utility of the dataset to your research question.

- **Visual Cohort Creation:**  
Easily create and manage cohorts using a visual interface without any coding knowledge.

- **Integrated OHDSI Solutions:**  
OHDSI solutions like **Achilles** for descriptive analytics, **Data Quality Dashboard** for data quality analysis and **ATLAS** for cohort building are integrated in the platform.

- **Efficient Data Management:**  
Organize, store, and secure your research datasets with robust governance and streamlined access.


#### Data2Evidence Cohort Functionality

[<img src="https://github.com/data2evidence/d2e/blob/develop/internal/portal.png?raw=true" alt="D2E Portal" width="48%"/>](https://d2e.sg) [<img src="https://github.com/data2evidence/d2e/blob/develop/internal/pa.png?raw=true" alt="D2E Analyze" width="48%"/>](https://d2e.sg)
[<img src="https://github.com/data2evidence/d2e/blob/develop/internal/atlas.png?raw=true" alt="D2E Atlas" width="48%"/>](https://d2e.sg) [<img src="https://github.com/data2evidence/d2e/blob/develop/internal/notebook.png?raw=true" alt="D2E Notebook" width="48%"/>](https://d2e.sg)

You can find a video of Data2Evidence Cohort Functionality [here](https://www.youtube.com/watch?v=PxkCutzJgkI)

### Data2Evidence Quick Start

Data2Evidence requires **Docker** and **npm** to be installed. You can find more information [here](https://docs.d2e.sg)

Install the Data2Evidence CLI by running:
```bash
npm i -g d2e
```

Create folder for Data2Evidence:
```bash
mkdir d2e
cd d2e
```

Generate `.env` file for Data2Evidence with random generated secretes and certificats:
```bash
d2e init
```

Start the Data2Evidence services by running:
```bash
d2e -e start
```

Create and load demo dataset by running:
```bash
d2e setupdemo
```

You should now be able to see the d2e portal when opening **[https://localhost:443](https://localhost:443)**. You can login with the **username** `admin` and the **password** `Updatepassword12345`.

For additional setup details and configuration options, please visit the **[D2E documentation](https://docs.d2e.sg)**.

### Issues & Bug Reports
Encounter an issue or have a feature request? Please help us improve by reporting them through the [GitHub Issues](https://github.com/data2evidence/d2e/issues) page.

### CICD

#### Build / Tests
| d2e services  | d2e  functions | d2e ui  |
|:-:|:-:|:-:|
| [![d2e/cli build and publish](https://github.com/data2evidence/d2e/actions/workflows/cli-setup-npm.yml/badge.svg)](https://github.com/data2evidence/d2e/actions/workflows/cli-setup-npm.yml) |  [![d2e-functions build plugin](https://github.com/data2evidence/d2e/actions/workflows/functions-plugin-ci.yml/badge.svg)](https://github.com/data2evidence/d2e/actions/workflows/functions-plugin-ci.yml) | [![d2e-ui build plugin](https://github.com/data2evidence/d2e/actions/workflows/ui-plugin-ci.yml/badge.svg)](https://github.com/data2evidence/d2e/actions/workflows/ui-plugin-ci.yml)  |  
| [![d2e/services Docker Build](https://github.com/data2evidence/d2e/actions/workflows/services-docker-push.yml/badge.svg)](https://github.com/data2evidence/d2e/actions/workflows/services-docker-push.yml)   | [![d2e-functions/pa Run HTTP tests](https://github.com/data2evidence/d2e/actions/workflows/functions-http-tests.yml/badge.svg)](https://github.com/data2evidence/d2e/actions/workflows/functions-http-tests.yml)  | [![d2e-ui/pa (vue)](https://github.com/data2evidence/d2e/actions/workflows/ui-test-vue.yml/badge.svg)](https://github.com/data2evidence/d2e/actions/workflows/ui-test-vue.yml)   |  
| [![d2e/services Docker Compose Up](https://github.com/data2evidence/d2e/actions/workflows/services-docker-compose-up.yml/badge.svg)](https://github.com/data2evidence/d2e/actions/workflows/services-docker-compose-up.yml)| **d2e flows** | [![d2e-ui/portal unit tests (Frontend)](https://github.com/data2evidence/d2e/actions/workflows/ui-alp-portal-test-fe.yml/badge.svg)](https://github.com/data2evidence/d2e/actions/workflows/ui-alp-portal-test-fe.yml)  |   
|[![d2e/services Cachedb tests](https://github.com/data2evidence/d2e/actions/workflows/services-cachedb-test.yml/badge.svg)](https://github.com/data2evidence/d2e/actions/workflows/services-cachedb-test.yml)|  [![d2e-flows Docker Build](https://github.com/data2evidence/d2e/actions/workflows/flows-docker-build-push.yaml/badge.svg)](https://github.com/data2evidence/d2e/actions/workflows/flows-docker-build-push.yaml)  | [![d2e-ui/portal unit tests (Components Library)](https://github.com/data2evidence/d2e/actions/workflows/ui-alp-portal-test-components.yml/badge.svg)](https://github.com/data2evidence/d2e/actions/workflows/ui-alp-portal-test-components.yml) | 
|[![d2e/services envConverter unit tests](https://github.com/data2evidence/d2e/actions/workflows/services-env-converter-test.yml/badge.svg)](https://github.com/data2evidence/d2e/actions/workflows/services-env-converter-test.yml)| [![d2e-flows build plugin](https://github.com/data2evidence/d2e/actions/workflows/flows-plugin-ci.yml/badge.svg)](https://github.com/data2evidence/d2e/actions/workflows/flows-plugin-ci.yml) | [![d2e-ui/pyqe unit tests](https://github.com/data2evidence/d2e/actions/workflows/ui-pyqe-test.yml/badge.svg)](https://github.com/data2evidence/d2e/actions/workflows/ui-pyqe-test.yml) |  

### Get in contact

Please [click here](https://discord.gg/5XtHky2BZe) to join us in Discord.

