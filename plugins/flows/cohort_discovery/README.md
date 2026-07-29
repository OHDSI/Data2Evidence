# cohort_discovery flow group

A scheduled Prefect flow that connects a d2e dataset to a **Hutch Relay Task
API** through [Hutch Bunny](https://github.com/Health-Informatics-UoN/hutch-bunny),
enabling federated cohort discovery: on each run, it polls Relay for one
pending task, executes it against the dataset's OMOP database, and returns
the result — without the dataset's data ever leaving d2e.

Each run:

1. Polls the Relay Task API for one pending task.
2. Executes the task against the dataset's OMOP database.
3. Submits the result back to Relay.
4. Persists a Prefect artifact with the result, on both success and failure,
   so every run stays inspectable.

Cadence is controlled by the Prefect deployment's schedule. Which dataset a
run targets is a parameter of that run, not something tied to the
deployment — a single deployment can serve any number of datasets over time.

## Inputs

Each run takes:

| Parameter      | Meaning                                    |
| -------------- | ------------------------------------------ |
| `datasetId`    | The d2e dataset to poll/execute tasks for. |
| `databaseCode` | The dataset's database code.               |
| `schemaName`   | The OMOP CDM schema to query.              |
| `cacheId`      | Optional; cachedb id, if the dataset uses one. |

## Environment variables

Set once for the worker (same for every run, regardless of dataset):

| Env var                            | Meaning                                             |
| ----------------------------------- | --------------------------------------------------- |
| `TASK_API_BASE_URL`                 | Relay Task API base URL.                             |
| `TASK_API_USERNAME`                 | Relay Task API username.                             |
| `TASK_API_PASSWORD`                 | Relay Task API password.                             |
| `TASK_API_TYPE`                     | `a` = availability, `b` = distribution.              |
| `TASK_API_ENFORCE_HTTPS`            | Set `false` only for a non-HTTPS Relay URL.          |
| `LOW_NUMBER_SUPPRESSION_THRESHOLD`  | Low-number suppression threshold applied to results. |
| `ROUNDING_TARGET`                   | Rounding target applied to results.                  |



## Tests

See `cohort_discovery_plugin/tests/README.md`.
