# ETL

The **ETL** page lets an administrator build a dataflow that reads source data, inspects its
structure, and maps it towards the OMOP data model. It is reached from the Admin Portal under
**ETL**, and requires the `SYSTEM_ADMIN` role.

A dataflow is built from nodes on a canvas. This page covers the **White Rabbit** node, which
scans source data and reports the tables, fields, and value distributions it finds. The scan
report is the input to the mapping work that follows.

:::note

The **White Rabbit** and **Rabbit in a Hat** nodes are marked *Experimental*.

:::

---

## Scanning source data

Add a **White Rabbit** node to the canvas and open it. Until a scan has been run, the node shows
*"Please scan data to see Source tables"*.

- Select **Scan Data** to open the scan dialog.
- Under **Select Data Location**, choose the source type:

| Source type | Fields to complete |
|---|---|
| **CSV files** | **Upload file** (accepts `.csv`), and **Delimiter** |
| **PostgreSQL** | **Database** and **Schema Name** |

- For CSV sources, **Delimiter** offers `,` `;` `|` `Tab` and `Space`. The default is `,`.
- **Clear all** resets the entries in the section.
- Under **Table to Scan**, select **Scan tables**. The button reads *Scanning...* while the
  source is being read. For a CSV source with nothing uploaded, the list shows
  *No files to scan*.
- Select the tables or files to include, then select **Apply**.

The scan then runs as a background job and the progress dialog opens.

---

## Following scan progress

The progress dialog shows a progress bar and the current job state. It polls the job every few
seconds and updates as the job advances.

| State | Meaning |
|---|---|
| **Scheduled** / **Late** | The job is queued but has not started. |
| **Pending** / **AwaitingRetry** | The job is being prepared. |
| **Running** / **Retrying** | The scan is in progress. |
| **Paused** | The job is paused. |
| **Cancelling** | The job is being cancelled. |
| **Completed** | The scan succeeded. |
| **Failed** / **Crashed** / **Cancelled** / **TimedOut** | The scan ended without a usable report. |

Three buttons are available:

| Button | Behaviour |
|---|---|
| **Back** | Returns to the scan dialog so the settings can be adjusted and the scan re-run. Available at any time, including while a scan is still running or has stalled. It is only unavailable while **Link tables** is in progress. |
| **Save report** | Downloads the generated `ScanReport.xlsx`. Enabled only after the scan completes successfully. |
| **Link tables** | Adds the scanned tables to the node as source tables, so they can be connected to later nodes. Enabled only after the scan completes successfully. |

Once **Link tables** has been used, the node lists the discovered source tables instead of the
*Scan Data* prompt.

### When the scan does not finish

If the job ends in **Failed**, **Crashed**, **Cancelled**, or **TimedOut**, the dialog stops
polling and reports that state. **Save report** and **Link tables** stay unavailable, because no
usable report was produced. Use **Back** to adjust the settings and try again.

If the dialog cannot reach the job at all — for example the dataflow worker is not running — it
retries a few times and then stops polling and shows:

> Lost contact with the scan job. It may still be running — close this dialog and check the flow
> run status.

The scan job itself may still be running on the server; this message only means the page gave up
asking. Leave the dialog with **Back** and check the job run status.

:::note

Re-opening the dialog after a failed scan resets it, so a new scan starts from a clean state.

:::

---

## Repeat scans

Each file scan clears the working directory before downloading the current node's files. A scan
therefore reports only the files belonging to that node and that run, and is not affected by
files left behind by an earlier scan or by another node.

---

## Requirements

Scanning is executed by the dataflow worker, which must contain the WhiteRabbit distribution.
This is provisioned into the `alp-dataflow-gen-worker` image at build time.

If a worker is running without it, the scan job fails and the job log names the missing path
rather than failing on an unrelated file, for example:

```
WhiteRabbit distribution not found at /app/whiterabbit/dist/bin.
```

If this appears, the worker image is misprovisioned and needs to be rebuilt.
