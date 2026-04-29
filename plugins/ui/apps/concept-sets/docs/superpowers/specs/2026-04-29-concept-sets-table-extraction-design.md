# Design: Extract ConceptSetsTable Component

**Date:** 2026-04-29
**Scope:** `src/ConceptSets/` — pure structural refactor, no behaviour changes

## Context

After migrating the Concept Sets tab to Material React Table (issue #2095), `ConceptSets.tsx` grew to ~340 lines. The MRT setup — column definitions, table config, search state, pagination reset — accounts for ~180 of those lines and belongs to a single responsibility: displaying and interacting with the concept sets list. Extracting it cleans the separation between data-fetching/orchestration (parent) and list display (child).

## New File

**`src/ConceptSets/ConceptSetsTable.tsx`**

### Props

```typescript
interface ConceptSetsTableProps {
  data: ConceptSet[];
  isLoading: boolean;
  userName: string | undefined;
  onAddEdit: (conceptSetId?: number) => void;
  onDelete: (conceptSet: ConceptSet) => void;
}
```

### Owns (moved from `ConceptSets.tsx`)

| Item | Type |
|------|------|
| `searchText` | `useState<string>("")` |
| `sorting` | `useState<MRT_SortingState>([])` |
| `filteredData` | `useMemo([data, searchText])` |
| `columns` | `useMemo` — all 6 column definitions (id, name, createdDate, modifiedDate, userName, actions) |
| `useMaterialReactTable` config | Full MRT setup |
| `updateSearchResult` | `useCallback` — sets `searchText` |
| Pagination reset | `useEffect(() => table.resetPagination(), [searchText])` |
| JSX | `concept-sets__header` (SearchBar + "Add concept set" button) + `concept-sets__table` (`<MaterialReactTable>`) |

### Imports needed

Same as current `ConceptSets.tsx` MRT/SearchBar imports, plus:
- `ConceptSet` type from `../Terminology/utils/types`
- `i18nKeys` and `useTranslation` hook
- `getText` obtained from `useTranslation()` inside the component

## Modified File

**`src/ConceptSets/ConceptSets.tsx`**

Retains:
- `data` state + `fetchData` + `isLoading`
- `tabValue` + `handleTabSelectionChange`
- `handleAddAndEditConceptSet` (passed as `onAddEdit`)
- `handleDeleteClick`, `handleDeleteDialogClose`, `handleConceptSetDeleted`
- `ConceptSetDeleteDialog`
- `<Terminology>` render on ConceptSearch tab
- `<ConceptSetsTable>` render on ConceptSets tab

Removes:
- `searchText`, `sorting` states
- `filteredData` useMemo
- `columns` useMemo
- `useMaterialReactTable` call
- `updateSearchResult`, pagination reset `useEffect`
- All MRT/SearchBar imports no longer needed at this level

### Usage in JSX

```typescript
{tabValue == ConceptSetTab.ConceptSets && (
  <ConceptSetsTable
    data={data}
    isLoading={isLoading}
    userName={userName}
    onAddEdit={handleAddAndEditConceptSet}
    onDelete={handleDeleteClick}
  />
)}
```

## File Size After Refactor

| File | Before | After |
|------|--------|-------|
| `ConceptSets.tsx` | ~340 lines | ~90 lines |
| `ConceptSetsTable.tsx` | — | ~200 lines |

## Constraints

- Pure structural move — zero behaviour changes
- No new logic, no new state beyond what already exists
- All existing imports in `ConceptSets.tsx` that are no longer used must be removed
