# Dataset management

The **Datasets management page** provides users with the ability to register, view, manage, and update datasets along with their metadata and schema. It includes features to perform various dataset-specific actions such as creating data marts, running quality checks, and updating schemas.

---

## Table structure

| Column                        | Description                                                                 |
|-------------------------------|-----------------------------------------------------------------------------|
| **Dataset ID**                | Unique identifier of the dataset (UUID), with an option to copy to clipboard. |
| **Name**                      | Descriptive label of the dataset.                                           |
| **Schema Name**               | Name of the applied schema (with namespace), copyable.                      |
| **Schema Version**            | Version of the schema currently applied to the dataset.                     |
| **Latest Available Schema**   | Latest schema version available for the dataset.                            |
| **Data Model**                | The model the dataset adheres to (e.g., OMOP5-4), along with its plugin.    |
| **Actions**                   | Dropdown menu to trigger various dataset-specific operations.               |

---

## Page actions

| Button                     | Functionality                                               |
|----------------------------|-------------------------------------------------------------|
| **Add dataset**            | Opens a dialog to register a new dataset into the system [(more information)](./1-create-dataset.md).   |
| **Update dataset metadata**| Enables bulk or individual metadata updates for datasets.   |

---

## Dataset action menu

Accessible via the **"Select action"** dropdown for each dataset:

| Action                       | Description                                                                 |
|------------------------------|-----------------------------------------------------------------------------|
| **Update dataset**           | Edit metadata such as name, description, or tags for the dataset.          |
| **Create data mart**         | Generates a filtered or transformed version of the dataset for a specific use case. |
| **Permissions**              | Manage access control and dataset sharing options.                         |
| **Resources**                | View and manage associated files or storage locations for the dataset.     |
| **Update schema**            | Apply the latest schema version to the dataset.                            |
| **Delete dataset**           | Permanently remove the dataset and all associated resources.               |
| **Create release** *(disabled)* | Placeholder for releasing datasets (not currently active).             |
| **Run data quality**         | Execute quality assessment routines to validate dataset consistency [(more information)](./2-dqd-job.md).       |
| **Run data characterization**| Run characterization scripts to generate descriptive statistics and metadata. |
| **Create cache**             | Generate cached views for faster access or downstream processing.          |

:::note

- Schema versioning is tightly coupled with data quality and compatibility. Always verify before applying updates.
- Dataset names should be unique and semantically meaningful.
- Some actions (e.g., "Create release") may be disabled depending on platform configuration.

:::

---

## Permissions

- Only users with appropriate dataset or platform-level roles (e.g., `Admin`) can execute most actions.
- Dataset-specific permissions (via the "Permissions" action) can be adjusted to allow individual users access to the data.

---

## Best practices

- Regularly run **data quality** and **characterization** checks after schema updates or data mart creation.
- Use **caching** for datasets with heavy read operations to improve performance.
- Maintain version control and documentation externally to support traceability.
