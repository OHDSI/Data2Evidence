# ETL Add Dataflow import workflow — implementation plan

## Goal

Implement GitHub issue #2126 by replacing the separate toolbar controls for creating and importing ETL dataflows with one **Add Dataflow** dialog. The dialog will create an empty/template-based flow or persist a valid imported JSON flow as a **new** dataflow, then open that newly created flow without mutating the previously open canvas.

## Settled design decisions

- The modal is fixed at **600px wide × 460px high**, with a **16px** radius.
- When the import content exceeds available height, the dialog **body scrolls internally**; the footer remains visible.
- The dialog backdrop is `rgba(0, 0, 0, 0.4)`.
- Typography is IBM Plex Sans: heading `18px` at weight 600; body `16px` regular.
- Inputs are `48px` high with an `8px` radius.
- Primary/accent color is the existing navy `#000080`.
- Footer uses `#FBFBFD`.
- Upload success and error styling will use existing design-system semantic colors, not newly invented hex values.

## Verified current implementation

- `FlowLayout.tsx` currently renders both `SaveNewFlowButton` and `ImportFlowButton`.
- `SaveNewFlowButton.tsx` opens `SaveFlowDialog` with `dataflowId: null`.
- `SaveFlowDialog.tsx` already creates empty flows through `saveDataflow` and template flows through `createCanvasFromTemplate`.
- `ImportFlowButton.tsx` currently parses imported JSON, sanitizes nodes/edges, and directly dispatches `replace*` actions into Redux. This is the source of the overwrite behavior.
- `saveDataflow` POSTs `SaveDataflowDto` to `jobplugins/dataflow`. An undefined `id` means create and returns the new flow ID. It invalidates the dataflow list cache.
- `DataflowExportDto` has the exact serializable flow data required for a new `SaveDataflowDto` payload: nodes, edges, variables, importLibs, databases, and schemas.
- The E2E test currently imports into a second already-created flow and later imports again to add deleted content back. Those scenarios no longer match the requested behavior and must be replaced.

## Implementation steps

### 1. Consolidate the creation entry point

**Files**
- `plugins/ui/apps/flow/src/features/flow/containers/FlowLayout.tsx`
- `plugins/ui/apps/flow/src/features/flow/containers/Flow/SaveFlow/SaveNewFlowButton.tsx`
- `plugins/ui/apps/flow/src/features/flow/containers/Flow/ImportFlow/ImportFlowButton.tsx` — remove

**Changes**

1. Keep the existing create trigger component as the one Add Dataflow launcher, but rename/rework it only if its resulting name and export remain clear in the local convention.
2. Change its accessible tooltip/label to **Add Dataflow** and retain the existing mechanism that opens `SaveFlowDialog` for a new flow (`dataflowId: null`).
3. Remove `ImportFlowButton` from the toolbar and delete its standalone component after moving its safe JSON parsing responsibilities into the dialog.
4. Retain the existing empty-state entry point (`EmptyFlow.tsx`) because it already opens the same new-flow dialog. Update its visible copy only if required to make the entry point consistent with the settled Add Dataflow naming; do not alter unrelated empty-state behavior.

### 2. Turn `SaveFlowDialog` into a combined create/import dialog while preserving save behavior

**File**
- `plugins/ui/apps/flow/src/features/flow/containers/Flow/SaveFlow/SaveFlowDialog.tsx`

**Changes**

1. Preserve the existing save-dataflow path for existing flows (`dataflowId` present): its name/edit mode, revision behavior, error handling, and save labels must remain unchanged.
2. For the new-flow path (`dataflowId === null`), change the title to **Add Dataflow** and add local dialog state for:
   - selected mode: `create` or `import`, defaulting to `create`;
   - selected imported file metadata;
   - parsed, sanitized imported flow payload;
   - file-processing state: idle, uploading/reading, success, or error;
   - a user-visible parsing/validation error message.
3. Render Name and Comment fields first, followed by an accessible, mutually exclusive radio group:
   - Create a new dataflow
   - Import a dataflow
4. In create mode, retain the optional template selector and existing two creation behaviors:
   - selected template: call `createCanvasFromTemplate`;
   - no template: call `saveDataflow` with empty arrays and the supplied comment.
5. In import mode, hide/disable the template selector and render an accessible `.json` file drop zone with:
   - a hidden file input initiated by browse/click;
   - `dragenter`, `dragover`, `dragleave`, and `drop` handling, preventing browser navigation on drop;
   - visual/semantic idle, reading, success, and invalid-file states;
   - selected-file name in the successful state;
   - only one file accepted, with the input reset so selecting the same file again reprocesses it.
6. Reuse the former import logic without dispatching Redux canvas replacements:
   - use `FileReader` to read the file;
   - parse it as `DataflowExportDto`;
   - sanitize nodes through `sanitizeFlowNodes` and edges through `sanitizeFlowEdges`;
   - default optional variables, import libraries, databases, and schemas to empty arrays;
   - store that sanitized payload locally for later submission.
7. Treat malformed JSON, unreadable files, missing/invalid expected flow data, or sanitation/parsing failures as the error state. Do not call the API and do not modify current Redux canvas state in these cases.
8. On Create/Import confirmation in import mode, construct `SaveDataflowDto` with `id: undefined`, the trimmed name, comment, and the local sanitized flow data. Invoke the existing `saveDataflow` mutation. This creates a new persisted dataflow via the existing API.
9. Only after successful API response, dispatch `setDataflowId(response.data.id)`, clear/set revision and saved status as appropriate, close the dialog, and rely on `FlowLayout`’s existing fetch-by-ID effect to load the new persisted flow into the canvas.
10. Do not open the add-node-type dialog for imported flows. Preserve the current add-node-type prompt for newly created empty flows only. Template-created flows retain their existing post-create behavior.
11. Disable confirmation until a nonblank name exists and, in import mode, a valid parsed payload has reached the success state. Keep Cancel and the close affordance available when no save/import mutation is in progress.
12. Reset mode, form fields, file state, errors, and hidden-input value each time the dialog opens/closes so stale files and errors cannot leak into subsequent creation attempts.
13. Surface server mutation errors with the existing Snackbar/error mapping, and file errors in the upload section using the design-system error treatment.

### 3. Apply the Figma styling with a fixed modal and scrollable body

**File**
- `plugins/ui/apps/flow/src/features/flow/containers/Flow/SaveFlow/SaveFlowDialog.scss`

**Changes**

1. Replace the minimal current styles with scoped dialog styles that set the modal to 600px by 460px, `border-radius: 16px`, and use the existing theme variables for navy and neutral values where they match the supplied tokens.
2. Structure the dialog styling into title/header, scrollable content body, and fixed footer:
   - dialog container uses a vertical flex layout and clips overflow;
   - content body flexes and scrolls vertically when import controls exceed height;
   - footer does not scroll, uses `#FBFBFD`, has a top divider, and retains the specified action spacing.
3. Use the Figma spacing: 24px content/title horizontal padding, 24px section spacing, 12px title-bottom spacing, and 16px/24px footer padding.
4. Style text inputs/selects to 48px height, 8px radius, neutral border, and the specified typography.
5. Style the radio row and full-size click targets to express selected navy and neutral unselected states while preserving component-library focus behavior.
6. Style the drop zone, drag-active state, selected-file success state, error state, and uploading state using existing design-system success/error colors and component tokens.

### 4. Confirm and use existing semantic status colors

**Files to inspect during implementation**
- `plugins/ui/apps/flow/src/theme/_variables.scss`
- installed `@portal/components` theme/component APIs as used by this app

**Required check before styling upload feedback**

The local flow SCSS variables provide navy and neutral colors and a secondary red palette, but do not expose an obvious semantic success token. Before implementation, identify the supported success and error tokens/classes from `@portal/components` or the shared design-system theme. Use those APIs/tokens for upload status colors. If no semantic success token is available, stop and report the exact absence rather than introducing an arbitrary green.

### 5. Update and focus end-to-end coverage

**File**
- `tests/e2e/tests/18-flows/data/export-import-nodestest.spec.ts`

**Changes**

1. Replace selectors that target `Create new dataflow` and `Import flow` with stable accessible selectors for the Add Dataflow launcher, dialog heading, radio labels, upload control, and status text.
2. Keep the template-based source-flow creation and export assertions.
3. Replace the old workflow that creates an empty second flow then imports into it with this flow:
   - keep the template-based source flow selected and record its visible node set;
   - open Add Dataflow;
   - fill the unique imported-flow name and comment;
   - select Import a dataflow;
   - upload the exported JSON via file chooser;
   - assert success state/file name and confirmation availability;
   - confirm the import;
   - assert the dialog closes, the selected flow is the newly named dataflow, and the imported nodes are visible;
   - verify the source dataflow remains available and unchanged by selecting it and asserting its expected nodes, then return to the imported flow.
4. Add invalid-file coverage by using an invalid JSON fixture or generated temporary file, verifying the error state and that confirmation is disabled/no new dataflow is created. Clean up all temporary files and generated dataflows in the existing cleanup path.
5. Remove the old behavior that re-imported JSON into an existing flow to restore a deleted node, because the standalone import action no longer exists and imports must always create new dataflows.
6. Retain downstream save/run/output checks only for the newly created imported flow if they remain valid for the new behavior and do not make the test rely on mutating a source flow.

## Verification plan

1. Run the flow UI type check/lint command identified in the app package scripts after implementation.
2. Run the targeted Playwright E2E test for `export-import-nodestest.spec.ts` against the live d2e UI using the mandated d2e UI testing workflow, including authentication and a screenshot of the combined dialog’s import state.
3. Verify manually through browser automation that:
   - Add Dataflow is the only creation/import toolbar entry point;
   - blank new flows, template flows, valid imports, invalid imports, cancel, and drag/drop all behave as designed;
   - imported content does not alter the active canvas before confirmation;
   - successful import opens the new persisted dataflow;
   - the dialog body scrolls while its footer stays visible at the fixed 460px height.
4. Capture the actual command/test output and browser evidence before reporting completion.

## Expected file changes

- Modify: `plugins/ui/apps/flow/src/features/flow/containers/FlowLayout.tsx`
- Modify or rename: `plugins/ui/apps/flow/src/features/flow/containers/Flow/SaveFlow/SaveNewFlowButton.tsx`
- Modify: `plugins/ui/apps/flow/src/features/flow/containers/Flow/SaveFlow/SaveFlowDialog.tsx`
- Modify: `plugins/ui/apps/flow/src/features/flow/containers/Flow/SaveFlow/SaveFlowDialog.scss`
- Remove after logic relocation: `plugins/ui/apps/flow/src/features/flow/containers/Flow/ImportFlow/ImportFlowButton.tsx`
- Potential copy-only adjustment: `plugins/ui/apps/flow/src/features/flow/containers/Flow/EmptyFlow/EmptyFlow.tsx`
- Modify: `tests/e2e/tests/18-flows/data/export-import-nodestest.spec.ts`

No endpoint, database schema, or Redux state-shape change is currently expected: import mode can be component-local, and the existing create-dataflow mutation already accepts the required persisted flow payload.
