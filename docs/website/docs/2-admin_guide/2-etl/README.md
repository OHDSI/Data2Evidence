# ETL dataflow editor

The **ETL page** in the Admin Portal is a canvas for building extract-transform-load
dataflows out of connected nodes. Two nodes are used to map a source database or set of
CSV files onto the OMOP model:

| Node | Purpose |
|------|---------|
| **White Rabbit** | Scans a source database schema or uploaded CSV files and produces the list of source tables. |
| **Rabbit in a Hat** | Maps the scanned source tables and fields onto the target CDM tables and fields. |

Both nodes appear in the **Add node** dialog once **Show experimental** is ticked.

---

## Saving node configuration

Node configuration is part of the dataflow, not of the node drawer. It is written to the
server only when you click **Save** on the ETL toolbar, which stores a new revision of the
dataflow.

- Open **Admin Portal** > **ETL** and select or create a dataflow.
- Configure the node — for example, open **White Rabbit** and run a scan.
- Close the node drawer. Your changes are kept in the editor, and the toolbar status
  changes from **Up to date** to **draft**.
- Click **Save**.

:::caution

Closing a node drawer does **not** save the dataflow. Until you click **Save**, the
configuration exists only in your browser and will be lost if the session ends.

:::

Once saved, reopening the node restores its configuration, so a White Rabbit scan does not
have to be repeated after a page refresh.

---

## What is stored

| Node | Stored in the dataflow revision |
|------|---------------------------------|
| **White Rabbit** | Data type (database or CSV), database code and schema name, CSV delimiter, the tables or files selected for scanning, and the names of any uploaded CSV files. |
| **Rabbit in a Hat** | The scanned source schema, the chosen CDM version, and the table and field mappings. |

Uploaded CSV files themselves are held on the server against the node, not inside the
dataflow revision. The revision records only a reference to them, which is why reopening a
saved White Rabbit node can list the previously uploaded files without asking you to upload
them again.

---

## Unsaved changes warning

If a dataflow has White Rabbit or Rabbit in a Hat configuration that differs from the last
saved revision, the platform warns you before you lose it:

| Action | Behaviour |
|--------|-----------|
| Refreshing the page | The browser asks you to confirm before leaving. |
| Closing the tab or window | The browser asks you to confirm before leaving. |
| Navigating to another portal page | A dialog offers to stay on the page or leave and discard the changes. |

The warning tracks the two ETL nodes specifically. Moving a node on the canvas, or editing
an unrelated node, does not trigger it. The warning also clears by itself once the dataflow
is saved, or if you manually change the configuration back to the saved values.

:::note

The browser **Back** and **Forward** buttons are not covered by the in-portal navigation
dialog. Use the portal navigation, and save before leaving the page.

:::

---

## Working with multiple Rabbit in a Hat nodes

Each Rabbit in a Hat node keeps its own working copy of your mapping in the browser session
while you edit it, so several of these nodes on the same canvas do not overwrite one
another's work.

This working copy is a convenience for the current browser tab only:

- It is discarded when the tab is closed.
- The saved dataflow revision is always the authoritative version.

Save the dataflow to keep mapping work beyond the current session.

---

## Best practices

- Save the dataflow immediately after a scan completes, so the scan does not have to be
  repeated.
- Give each node a meaningful name before saving; node names appear in the revision history.
- When several people work on the same dataflow, save early and reload before editing to
  avoid working from a stale revision.
