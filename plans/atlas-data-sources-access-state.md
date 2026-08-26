# Atlas data-source list and access-state implementation plan

## Scope and non-negotiable constraints

Implement issues [#2959](https://github.com/OHDSI/Data2Evidence/issues/2959) and [#2963](https://github.com/OHDSI/Data2Evidence/issues/2963) as an end-to-end data-source experience.

1. **All UI work is confined to `plugins/atlas`.** Do not change any `plugins/ui/apps/portal` dataset/list/card/detail component, hook, translation, stylesheet, or portal UI client.
2. Preserve existing **write** access. The implementation adds a display/API state; it must not remove, replace, downgrade, or otherwise interfere with existing write roles and capabilities.
3. The canonical authenticated states are: `no_access`, `pending`, `restricted`, `read`, and `write`.
4. Reuse the existing `usermgmt.group_access_request` request persistence and group membership model. Do not introduce a new table unless a concurrency-safe unresolved-request constraint is absent.
5. The Atlas plugin will own the data-source list, cards, detail header, sorting, and request-access UX rather than embedding the legacy portal data-source UI.

## Issue-derived behaviour

### List and cards (#2959)

- Display the configurable organisation banner, image/logo, description/tagline, and search for both authenticated and anonymous users.
- Rename the visible experience to **Data Sources**.
- Render two cards per desktop row and one card per row at the Figma narrow breakpoint.
- Each card shows name, short description, subject count, published date, data source type/model, version, visibility badge, and authenticated access-state badge.
- Visibility is independent of a user's access state: public/non-public is always derived from the data source configuration.
- A card navigates to its individual data-source page.
- Authenticated default sort is **Access**: `write` and `read` first, then `pending`, `no_access`, `restricted`; break ties by case-insensitive name. Offer **Data source name (A–Z)** and **Name (Z–A)**.
- Anonymous users receive public data sources only, default to **Name (A–Z)**, can choose **Name (Z–A)**, and must not see the Access sort option or user-specific access badge/action.

### Detail header and request flow (#2963)

- For `no_access` with requests enabled, show **Request access** in the detail header top-right.
- On a successful request, update the UI immediately to orange **Pending access** without leaving the page; update the matching list card in the same Atlas UI cache.
- For `restricted`, show the red restricted chip with its Figma icon, no request action, and this tooltip: `Access to this dataset is restricted. Contact your administrator to gain access.`
- `read` and `write` display green Access status. Write may have an accessible secondary Write label, but its existing entitlement and authorizations remain unchanged.
- Card badges follow Figma semantics: green check for access, red lock for no access, red restricted/affirmation mark for restricted, and orange clock for pending.

## Access contract and server rules

### State calculation

The portal server is the source of truth for authenticated access state. For each data source, derive exactly one `accessState` using this precedence:

1. `write` when the user is a member of the source's existing write group.
2. `read` when the user is a member of its existing `STUDY_RESEARCHER` group.
3. `pending` when there is an unresolved request for that user and source.
4. `restricted` when the user lacks entitlement and `showRequestAccess` is false.
5. `no_access` when the user lacks entitlement and requests are enabled.

The anonymous public endpoint continues to expose only public visibility/data-source information and must not expose authenticated state or request actions.

### Request and decision rules

- The request endpoint derives the requester from the authenticated token; it must not trust a caller-provided `userId`.
- Request creation validates that the source exists and permits requests, returns an existing unresolved request idempotently, and does not create a request for a user who already has read or write access.
- A pending request can be approved for **read** or **write**, or rejected. A write approval uses the existing write group; a read approval uses the existing `STUDY_RESEARCHER` group.
- Resolving a request must never delete an existing write membership. A user with write membership remains `write` even if they also have a read request/membership.
- A rejected request does not confer access. A later response is `restricted` only if requests are disabled; otherwise it is `no_access` and the user may submit a new request.
- All authorization remains server-side: only the authenticated user creates their own request and only current authorized administrators resolve one.

## Exact files and changes

### 1. Server contract and state derivation

1. **`plugins/functions/portal/src/types.d.ts`**
   - Add `DataSourceAccessState = 'no_access' | 'pending' | 'restricted' | 'read' | 'write'`.
   - Add `accessState` to the authenticated `IDatasetResponseDto`; retain all existing role-related fields and DTO compatibility.

2. **`plugins/functions/portal/src/user-mgmt/user-mgmt.api.ts`**
   - Add authenticated user-management calls to retrieve study memberships by role, including read/researcher and write groups, plus unresolved requests for the current user in a batched form.

3. **`plugins/functions/portal/src/user-mgmt/user-mgmt.service.ts`**
   - Replace the read-only `getResearcherDatasetIds`-only usage with methods that return role-specific study IDs and unresolved-request study IDs.
   - Keep `getResearcherDatasetIds` for existing callers until they are migrated; do not remove it in this change.

4. **`plugins/functions/portal/src/user-mgmt/user-mgmt.api.spec.ts`**
   - Cover request construction and token forwarding for the new membership/pending-request calls.

5. **`plugins/functions/portal/src/user-mgmt/user-mgmt.service.spec.ts`**
   - Verify role-specific results preserve write membership separately from researcher/read membership.

6. **`plugins/functions/portal/src/dataset/query/dataset-query.service.ts`**
   - Batch-load current-user membership and pending-request information once per list/detail query.
   - Add `accessState` to each authenticated list and single-source response using the specified write-first precedence.
   - Retain current visibility filtering and anonymous behaviour.

7. **`plugins/functions/portal/src/dataset/query/dataset-query.service.spec.ts`**
   - Add coverage for each derived state, precedence (`write` over `read`/pending), and list/detail parity.

8. **`plugins/functions/portal/src/dataset/public/public-dataset-query.service.spec.ts`**
   - Confirm anonymous responses remain public-only and omit user-specific state.

### 2. User-management request APIs and role preservation

9. **`plugins/functions/alp-usermgmt/src/types.ts`**
   - Add DTO/type definitions for role-specific study membership and the request role allowed during approval.

10. **`plugins/functions/alp-usermgmt/src/routes/MeRouter.ts`**
    - Extend the authenticated current-user roles response (or add an adjacent authenticated endpoint) to return source IDs grouped by read and write role without exposing other users' memberships.

11. **`plugins/functions/alp-usermgmt/src/routes/StudyAccessRequestRouter.ts`**
    - Change request creation to use `req.user.userId` rather than a submitted user ID.
    - Add requestable-source validation through the portal API/service boundary.
    - Return an existing unresolved request for duplicate submissions.
    - Permit an administrator decision to explicitly select read or write only through validated role values; preserve existing authorization middleware.

12. **`plugins/functions/alp-usermgmt/src/services/StudyAccessRequestService.ts`**
    - Add idempotent request lookup/return.
    - On approval, register the user to the selected read/write group in the same transaction.
    - Do not remove memberships. In particular, no branch may remove or overwrite the existing write group.

13. **`plugins/functions/alp-usermgmt/src/repositories/GroupAccessRequestRepository.ts`**
    - Add the precise query needed to batch unresolved requests by current user and source group/study.
    - Add repository support for idempotent retrieval under a race.

14. **`plugins/functions/alp-usermgmt/src/dtos/StudyAccessRequest.ts`**
    - Include approved/requested role data required by the API response without breaking current administration consumers.

15. **`plugins/functions/alp-usermgmt/src/db/init/create-schema.sql`**
    - **Conditional change only:** add a partial unique index on unresolved `(user_id, group_id)` requests if inspection confirms the current schema lacks equivalent protection. Do not change group or role tables.

16. **`plugins/functions/alp-usermgmt/src/routes/StudyAccessRequestRouter.spec.ts`** *(add if this package has no colocated router test; otherwise use its established test location)*
    - Cover requester identity enforcement, enabled/disabled requests, idempotency, authorization, read approval, write approval, rejection, and write-membership preservation.

17. **`plugins/functions/alp-usermgmt/src/services/StudyAccessRequestService.spec.ts`** *(add if this package has no colocated service test; otherwise use its established test location)*
    - Cover transactional group grant selection and the no-write-removal regression.

### 3. Atlas-only UI implementation

18. **`plugins/atlas/src/types/data-source.ts`** *(new)*
    - Define the Atlas UI's API response types, `DataSourceAccessState`, data-source card/detail shape, sort options, and request response.

19. **`plugins/atlas/src/services/dataSourceApi.ts`** *(new)*
    - Fetch authenticated and anonymous data-source responses from the portal service.
    - Submit a request-access operation to user management with only allowed inputs.
    - Keep token usage in the Authorization header sourced through plugin props/local storage; never put it in a URL.

20. **`plugins/atlas/src/composables/useDataSources.ts`** *(new)*
    - Own Atlas-local list/detail loading, anonymous/authenticated mode, search, sort, and a shared in-memory store keyed by source ID.
    - On successful request, change that source from `no_access` to `pending` immediately in both list and detail data; refetch after server mutations/route entry to converge with approved `read` or `write` state.

21. **`plugins/atlas/src/components/data-sources/AccessStatusBadge.vue`** *(new)*
    - Render all five access states with Figma-matched status label, icon, colour, accessible text, and restricted tooltip.
    - Keep `write` distinct in semantic metadata/assistive text while rendering Access status as specified.

22. **`plugins/atlas/src/components/data-sources/DataSourceBanner.vue`** *(new)*
    - Render the currently configured organisation image/logo and descriptive banner for both user modes using data returned by the portal configuration endpoint.

23. **`plugins/atlas/src/components/data-sources/DataSourceCard.vue`** *(new)*
    - Render the Figma card fields, public/non-public badge, access badge for authenticated users, and accessible card navigation.

24. **`plugins/atlas/src/components/data-sources/DataSourceSort.vue`** *(new)*
    - Render Figma sort control.
    - Expose Access/A–Z/Z–A to authenticated users and A–Z/Z–A only to anonymous users.

25. **`plugins/atlas/src/components/data-sources/DataSourceList.vue`** *(new)*
    - Render banner, search, sorting, empty/loading/error states, and responsive two-column/single-column card grid.
    - Apply the exact sorting model in the issue: Access order has `write` and `read` first, followed by pending, no-access, restricted, stable by name.

26. **`plugins/atlas/src/components/data-sources/DataSourceDetailHeader.vue`** *(new)*
    - Render the source name and top-right state/action region from Figma.
    - Invoke the composable request action, disable while submitting, show pending after success, and retain server-derived status after failure.

27. **`plugins/atlas/src/components/data-sources/DataSourceDetail.vue`** *(new)*
    - Render the detail route's header plus existing returned source detail fields; it does not replace or alter any legacy portal component.

28. **`plugins/atlas/src/components/DataSourcesApp.vue`** *(new)*
    - Provide Atlas-local routing/state composition between the list and `data-sources/:id` detail views.

29. **`plugins/atlas/src/portal-main.ts`**
    - Mount `DataSourcesApp` for this Atlas plugin entry instead of the iframe-only wrapper for the data-source route. Preserve existing plugin lifecycle and token provisioning.

30. **`plugins/atlas/src/types/index.ts`**
    - Extend plugin properties only if the Atlas UI needs an explicitly provided portal API base URL or configuration. Preserve existing token, username, dataset, and locale fields.

31. **`plugins/atlas/src/styles/data-sources.css`** *(new)*
    - Implement Figma-derived typography, spacing, badge states, responsive breakpoints, card grid, header placement, tooltip, focus styles, and loading/error presentation.

32. **`plugins/atlas/src/components/data-sources/__tests__/AccessStatusBadge.spec.ts`** *(new)*
    - Test labels, icons/accessibility, and restricted tooltip for all five states.

33. **`plugins/atlas/src/components/data-sources/__tests__/DataSourceList.spec.ts`** *(new)*
    - Test card data, authenticated and anonymous sorting, public-only anonymous content, and no anonymous access-status/action display.

34. **`plugins/atlas/src/components/data-sources/__tests__/DataSourceDetailHeader.spec.ts`** *(new)*
    - Test no-access request action, pending transition, restricted no-action tooltip, read state, and write state/regression semantics.

35. **`plugins/atlas/src/composables/__tests__/useDataSources.spec.ts`** *(new)*
    - Test the shared optimistic pending transition and server refresh replacing pending with read/write.

36. **`plugins/atlas/vite.portal.config.mjs`**
    - Update only if CSS/module routing or test aliases require a build configuration adjustment; otherwise leave unchanged.

37. **`plugins/atlas/resources/portal/index.js` and `plugins/atlas/resources/portal/atlas.css`**
    - Generated build output only. Regenerate through `npm run build:portal`; do not hand-edit either artifact.

## Implementation order

1. Inspect actual current role names and the user-management schema before changing logic; confirm the existing write group used by this deployment and whether an unresolved-request uniqueness constraint already exists.
2. Implement server-side access contract types, role/pending batch lookups, and access-state derivation with tests.
3. Harden request creation/decision handling and add explicit read/write approval with write-preservation tests. Make the conditional schema index only if step 1 shows it is required.
4. Create the Atlas API client, access types, and shared composable/store.
5. Build the Atlas-only status badge, banner, sort control, cards, list, detail header, and detail route according to Figma.
6. Integrate the Atlas app at its plugin entry point and generate the plugin portal artifact. Do not touch portal dataset UI files.
7. Run focused and full test/build/runtime/browser checks; compare desktop and narrow viewports with the Figma nodes `1709:215181`, `1709:220262`, and `1762:478519`.

## Verification plan

### Automated server checks

- Portal query tests: list and detail return the same `accessState`; cover no_access, pending, restricted, read, write and write precedence.
- User-management tests: authenticated requester identity, request-disabled handling, duplicate request idempotency, authorization, approved read, approved write, rejected request, and preserved pre-existing write membership.
- Public endpoint regression: anonymous users receive public data sources only, no access-state fields/actions.
- Run the relevant package unit tests and TypeScript checks for `plugins/functions/portal` and `plugins/functions/alp-usermgmt`.

### Atlas UI checks

- Run the Atlas component/composable test suite for all badges, sorting options/order, request transition, restricted tooltip, anonymous behaviour, and write status.
- Run `npm run build:portal` from `plugins/atlas` and verify generated resources are current.
- Type-check `plugins/atlas`.

### Real runtime and browser checks

- Exercise modified D2E functions through the deployed edge runtime: fetch list/detail as an authenticated user, create a request, resolve it as read, resolve it as write, and verify that write capability remains available.
- Build the Atlas plugin, deploy/serve its resources through the live app route, and test with browser automation:
  1. anonymous public-only cards and A–Z/Z–A sorts;
  2. authenticated two-column list with access-first order;
  3. request action updates detail and list card to pending immediately;
  4. restricted state has no action and shows the required tooltip;
  5. read and write approvals update to Access and write functionality continues to work.
- Capture desktop and narrow viewport visual checks against the linked Figma nodes.

## Completion criteria

The work is complete when all UI files changed are under `plugins/atlas`, the server exposes a canonical state without losing write entitlement, Atlas data-source list/card/detail UI consistently displays that state, request-to-pending and approval-to-read/write transitions synchronize list and detail, anonymous visibility/sorting remains constrained, and tests prove that existing write access still functions.