# WebR Notebook — Git Integration UI & Template Dropdown

**Date:** 2026-04-29
**Author:** hengxian.jiang@data4life.care
**Status:** Approved (pending implementation)

## Goal

Bring the git integration affordances from the legacy starboard notebook UI to the new WebR notebook plugin, mirroring user-facing behavior so people moving between the two notebooks see the same controls.

Two visible changes in the WebR plugin:

1. A **Sync from Remote** button in the notebook header that polls for divergence between the local and remote (git-backed) copy of the active notebook and overwrites local from remote on click.
2. A **template dropdown** in the Create Notebook dialog so a new notebook can be initialized either as blank or from a template fetched from the configured templates git repo.

Both features already exist on the backend (`/system-portal/notebook/...`) and in the legacy starboard UI; this spec ports the UI to the new plugin without touching the backend.

## Non-Goals

- No changes to the WebR notebook **library** at `notebook/src/`. Library stays backend-agnostic.
- No changes to backend endpoints, controllers, services, or git config wiring.
- No `overwrite-all-from-remote` UI (backend has it; legacy UI doesn't expose it; we don't either).
- No diff preview, no manual git-config UI, no branch switching.
- No new automated tests in `notebook/example/d2e-plugin/` (matches starboard's posture — this app has no test suite today).

## Context

The legacy starboard notebook UI lives at [plugins/ui/apps/notebook-ui](../../../plugins/ui/apps/notebook-ui). Its git integration is a single component, [SyncFromRemoteButton.tsx](../../../plugins/ui/apps/notebook-ui/src/components/Starboard/components/SyncFromRemoteButton/SyncFromRemoteButton.tsx), wired into [NotebookHeader.tsx](../../../plugins/ui/apps/notebook-ui/src/components/Starboard/components/NotebookHeader/NotebookHeader.tsx). Its template flow is [NotebookTemplateDialog.tsx](../../../plugins/ui/apps/notebook-ui/src/components/Starboard/components/NotebookTemplateDialog/NotebookTemplateDialog.tsx).

The new WebR notebook plugin lives at [notebook/example/d2e-plugin](../../../notebook/example/d2e-plugin). It already wires axios at `/system-portal/notebook` ([request.ts](../../../notebook/example/d2e-plugin/src/api/request.ts)), exposes notebook CRUD ([notebook-api.ts](../../../notebook/example/d2e-plugin/src/api/notebook-api.ts)), and has a [NotebookHeader.tsx](../../../notebook/example/d2e-plugin/src/components/NotebookHeader.tsx), [CreateNotebookDialog.tsx](../../../notebook/example/d2e-plugin/src/components/CreateNotebookDialog.tsx), [NotebookManager.tsx](../../../notebook/example/d2e-plugin/src/components/NotebookManager.tsx), and a [Snackbar.tsx](../../../notebook/example/d2e-plugin/src/components/Snackbar.tsx).

The relevant backend (no changes needed):

| Endpoint | Method | Purpose |
|---|---|---|
| `/system-portal/notebook/{id}/remote-diff-check?datasetId=…` | GET | Returns `{ hasDifferences, reason }` |
| `/system-portal/notebook/{id}/overwrite-from-remote` | POST | Body `{ datasetId }` → overwrites local with remote |
| `/system-portal/notebook/templates?datasetId=…` | GET | Lists `NotebookTemplateDto[]` |
| `/system-portal/notebook/templates/{templateId}` | POST | Body `{ name, datasetId }` → creates a new notebook from the template |

Backend service: [notebook.service.ts](../../../plugins/functions/portal/src/notebook/notebook.service.ts).

## Approach

**Selected: Approach A — extend `CreateNotebookDialog` with a template selector** (rejected alternatives: separate "From Template" dialog, treating templates as an import path).

**File scope** — all changes inside `notebook/example/d2e-plugin/`. Library at `notebook/src/` is not touched.

### New files

- `src/components/SyncFromRemoteButton.tsx` — the polling sync button. Reuses `notebook-header__btn` styling already defined in `NotebookHeader.scss`; no new SCSS.

### Modified files

| File | Change |
|---|---|
| `src/types.ts` | Add `RemoteDiffCheckResponse`, `OverwriteFromRemoteResponse`, `NotebookTemplateDto` |
| `src/api/notebook-api.ts` | Add `checkRemoteDiff`, `overwriteFromRemote`, `getTemplates`, `createNotebookFromTemplate` |
| `src/components/CreateNotebookDialog.tsx` | Add template `<select>`; change `onConfirm` to `(name, templateId \| null)` |
| `src/components/CreateNotebookDialog.scss` | Style the new selector to match the existing input |
| `src/components/NotebookHeader.tsx` | Render `<SyncFromRemoteButton …>` after the Delete button; pass three new props |
| `src/components/NotebookManager.tsx` | Wire props; branch `handleCreateConfirm` on `templateId`; add `handleSyncSuccess` |

### Component dependency direction

`NotebookManager` owns API state and dataset/notebook context, passes callbacks and `datasetId` into `NotebookHeader`, which renders `<SyncFromRemoteButton>` and `<CreateNotebookDialog>`. Same direction the existing code already uses. No new contexts, no new hooks.

## Detailed Design

### 1. Types (`src/types.ts`)

```ts
export interface RemoteDiffCheckResponse {
  hasDifferences: boolean
  reason: string
}

export interface OverwriteFromRemoteResponse {
  message: string
  overwritten: boolean
  notebookId: string
}

export interface NotebookTemplateDto {
  id: string
  name: string
  description: string
  notebookContent: string
}
```

### 2. API additions (`src/api/notebook-api.ts`)

```ts
export async function checkRemoteDiff(
  id: string,
  datasetId: string
): Promise<RemoteDiffCheckResponse> {
  const response = await request.get<RemoteDiffCheckResponse>(
    `/${id}/remote-diff-check`,
    { params: { datasetId } }
  )
  return response.data
}

export async function overwriteFromRemote(
  id: string,
  datasetId: string
): Promise<OverwriteFromRemoteResponse> {
  const response = await request.post<OverwriteFromRemoteResponse>(
    `/${id}/overwrite-from-remote`,
    { datasetId }
  )
  return response.data
}

export async function getTemplates(
  datasetId: string
): Promise<NotebookTemplateDto[]> {
  const response = await request.get<NotebookTemplateDto[]>(`/templates`, {
    params: { datasetId },
  })
  return response.data
}

export async function createNotebookFromTemplate(
  templateId: string,
  name: string,
  datasetId: string
): Promise<NotebookRecord> {
  const response = await request.post<NotebookRecord>(
    `/templates/${templateId}`,
    { name, datasetId }
  )
  return response.data
}
```

### 3. `SyncFromRemoteButton`

```ts
interface SyncFromRemoteButtonProps {
  activeNotebook: NotebookRecord | null
  datasetId: string
  onSyncSuccess: () => Promise<void>
  onFeedback: (type: 'success' | 'error', message: string) => void
}
```

State:

- `diffCheck: RemoteDiffCheckResponse | null`
- `isCheckingDiff: boolean`
- `isSyncing: boolean`

Lifecycle:

- `useEffect` keyed on `(activeNotebook?.id, datasetId)`:
  - if either is missing → no polling
  - else: invoke `checkDiff()` once, then set up `setInterval(checkDiff, 30_000)`; cleanup clears the interval
- `checkDiff` calls `notebookApi.checkRemoteDiff(id, datasetId)`. On error, sets `{ hasDifferences: false, reason: 'Error checking differences' }`. **Why silent fail:** matches starboard. Misconfigured git would otherwise spam toasts every 30s. **How to apply:** never wire `onFeedback` into the polling path.

Click handler:

- Calls `notebookApi.overwriteFromRemote(id, datasetId)`
- On success: `onFeedback('success', 'Notebook overwritten from remote.')` → `await onSyncSuccess()` → `checkDiff()` to flip the button back to disabled
- On error: `onFeedback('error', error?.response?.data?.message || error.message || 'Failed to sync from remote.')`

Render:

- Returns `null` if `!activeNotebook?.id || !datasetId`
- One `<button className="notebook-header__btn">` matching the styling of the other header buttons
- `disabled = isSyncing || isCheckingDiff || !diffCheck?.hasDifferences`
- Label: `isSyncing ? 'Syncing…' : 'Sync from Remote'`

Strings are hardcoded English — d2e-plugin has no i18n yet, and the existing snackbar/dialogs are also hardcoded.

#### Race / concurrency

If the 30s diff-check timer fires while a sync is in flight, both calls are independent reads/writes; the post-sync `checkDiff()` always corrects state. No locking needed. Same posture as starboard.

### 4. `CreateNotebookDialog` — template dropdown

New prop: `datasetId: string`.

New state:

- `templates: NotebookTemplateDto[]`
- `selectedTemplateId: string` (default `''` = no template)
- `loadingTemplates: boolean`

`useEffect` on mount: `getTemplates(datasetId)` → set state. **Errors are swallowed silently** and just leave the dropdown empty. **Why:** matches starboard — a missing or misconfigured template repo must not block notebook creation. **How to apply:** the blank-notebook path must always remain usable regardless of templates fetch outcome.

New `<select>` element below the name input, styled to match. Options:

- `<option value="">— No template (blank notebook) —</option>` (default; mirrors starboard's `(No template)`)
- one `<option value={t.id}>{t.name} — {t.description}</option>` per template
- `disabled` while `loadingTemplates`

`onConfirm` signature changes from `(name: string)` → `(name: string, templateId: string | null)`. When `selectedTemplateId === ''` we pass `null`.

### 5. `NotebookManager` wiring

`handleCreateConfirm` branches on `templateId`:

```ts
const handleCreateConfirm = useCallback(
  async (name: string, templateId: string | null) => {
    setCreateDialogOpen(false)
    if (!datasetId) return
    try {
      const created = templateId
        ? await notebookApi.createNotebookFromTemplate(templateId, name, datasetId)
        : await notebookApi.createNotebook(
            datasetId,
            name,
            serializeIpynb(createEmptyNotebook())
          )
      setNotebooks(prev => [...prev, created])
      setActiveNotebook(created)
      showFeedback('success', `Notebook "${name}" created.`)
    } catch (err) {
      console.error('Failed to create notebook:', err)
      showFeedback('error', 'Failed to create notebook.')
    }
  },
  [datasetId, showFeedback]
)
```

`handleSyncSuccess` re-fetches notebooks and refreshes the active record so the editor reloads:

```ts
const handleSyncSuccess = useCallback(async () => {
  if (!datasetId || !activeNotebook) return
  const list = await notebookApi.getNotebookList(datasetId)
  setNotebooks(list)
  const refreshed = list.find(n => n.id === activeNotebook.id)
  if (refreshed) {
    setActiveNotebook(refreshed)
  }
}, [datasetId, activeNotebook])
```

The existing `useEffect([activeNotebook])` (`NotebookManager.tsx` lines 119–141) handles parsing and `notebookRef.current?.setNotebookData(parsed)` — passing a fresh object reference from `list.find(...)` is enough to re-trigger it.

`<NotebookHeader>` invocation gains:

```tsx
datasetId={datasetId}
onSyncSuccess={handleSyncSuccess}
onFeedback={showFeedback}
```

`<CreateNotebookDialog>` invocation gains `datasetId` and the updated `onConfirm` signature.

### 6. `NotebookHeader` wiring

Three new pass-through props:

```ts
datasetId: string
onSyncSuccess: () => Promise<void>
onFeedback: (type: 'success' | 'error', message: string) => void
```

`<SyncFromRemoteButton …>` rendered immediately after the Delete button — same slot as starboard.

## Behavior Spec

### Sync button

| State | Visible | Disabled | Label |
|---|---|---|---|
| No active notebook OR no datasetId | no | — | — |
| Polling diff (initial or interval) | yes | yes | Sync from Remote |
| Local == remote | yes | yes | Sync from Remote |
| Local != remote | yes | no | Sync from Remote |
| Sync in progress | yes | yes | Syncing… |
| Diff check error (e.g. misconfigured git) | yes | yes | Sync from Remote |

On successful sync:
- toast: "Notebook overwritten from remote."
- notebooks list refetched
- active notebook record replaced with refreshed copy → editor cells reload

On sync error:
- toast: backend message if present, else `error.message`, else "Failed to sync from remote."

**Destructive nature:** any unsaved local edits are blown away. The toast message wording ("overwritten from remote") makes the destructive nature obvious. Same as starboard.

### Create dialog

| Selection | Action |
|---|---|
| `(No template)` (default) | `createNotebook` with empty `serializeIpynb(createEmptyNotebook())` |
| Any template | `createNotebookFromTemplate(templateId, name, datasetId)` |

If templates fetch fails, the dropdown is empty and only the blank-notebook path is available.

## Error Handling Summary

| Failure | Behavior |
|---|---|
| Diff polling network error | Silent. State set to `{ hasDifferences: false, reason: 'Error checking differences' }`. No toast. Button stays disabled. |
| Sync POST error | Toast with backend message if present, otherwise generic. Active notebook & local edits unchanged. |
| Templates fetch error | Silent. Dropdown empty. Blank-notebook path still works. |
| Create-from-template POST error | Toast: "Failed to create notebook." Dialog already closed (existing behavior). |

## Known Issues / Future Work

- **Template format compatibility:** The templates git repo (default `https://github.com/data2evidence/templates.git`) was authored for starboard. If a template's `notebookContent` is not valid `.ipynb`, the new WebR notebook will fail to parse it; the existing `parseNotebookContent` fallback in `NotebookManager.tsx` will log an error and open an empty notebook. The fix is on the template repo / backend side. **Action item:** audit the templates repo and either convert templates to `.ipynb` or add a backend-side conversion. Out of scope for this UI change; tracked here for follow-up.
- The destructive nature of "Sync from Remote" is implicit in the toast wording; a future iteration could add a confirmation dialog before overwrite.

## Test Plan

No automated tests added (matches starboard's posture; the d2e-plugin example has no test suite). Verification:

1. **Type-check / build:** `bun run build` from `notebook/example/d2e-plugin/` passes with no new TS errors.
2. **Lint:** `bun run lint` passes.
3. **Manual smoke (against a running D2E stack):**
   - [ ] Open dialog from "New" button → templates dropdown loads → `(No template)` is the default
   - [ ] Create with `(No template)` → blank notebook appears in selector & editor
   - [ ] Create with a template → notebook appears, content matches template
   - [ ] Sync button hidden when no active notebook
   - [ ] Sync button disabled when remote == local
   - [ ] Sync button enabled when remote != local (force a diff by editing the notebook file in the git remote)
   - [ ] Click Sync → success toast → editor cells refresh to remote content (unsaved local edits discarded — expected)
   - [ ] Misconfigured git → polling fails silently → button stays disabled, no toast spam
   - [ ] Templates repo unreachable → dialog still opens, dropdown is empty, blank-notebook path still works

## References

- Legacy starboard sync button: [SyncFromRemoteButton.tsx](../../../plugins/ui/apps/notebook-ui/src/components/Starboard/components/SyncFromRemoteButton/SyncFromRemoteButton.tsx)
- Legacy starboard template dialog: [NotebookTemplateDialog.tsx](../../../plugins/ui/apps/notebook-ui/src/components/Starboard/components/NotebookTemplateDialog/NotebookTemplateDialog.tsx)
- Legacy starboard header wiring: [NotebookHeader.tsx](../../../plugins/ui/apps/notebook-ui/src/components/Starboard/components/NotebookHeader/NotebookHeader.tsx)
- Backend service: [notebook.service.ts](../../../plugins/functions/portal/src/notebook/notebook.service.ts)
- Backend controller: [notebook.controller.ts](../../../plugins/functions/portal/src/notebook/notebook.controller.ts)
- Target plugin manager: [NotebookManager.tsx](../../../notebook/example/d2e-plugin/src/components/NotebookManager.tsx)
- Target plugin header: [NotebookHeader.tsx](../../../notebook/example/d2e-plugin/src/components/NotebookHeader.tsx)
- Target plugin create dialog: [CreateNotebookDialog.tsx](../../../notebook/example/d2e-plugin/src/components/CreateNotebookDialog.tsx)
