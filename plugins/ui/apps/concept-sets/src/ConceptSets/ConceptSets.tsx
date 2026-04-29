import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import SearchBar from "../components/SearchBar/SearchBar";
import {
  MaterialReactTable,
  MRT_ColumnDef,
  MRT_SortingState,
  useMaterialReactTable,
} from "material-react-table";
import {
  Button,
  EditIcon,
  IconButton,
  Loader,
  VisibilityOnIcon,
} from "@portal/components";
import DeleteIcon from "@mui/icons-material/Delete";
import { api } from "../axios/api";
import Terminology from "../Terminology/Terminology";
import { ConceptSet } from "../Terminology/utils/types";
import { TerminologyProps } from "../Terminology/Terminology";
import { useFeedback, usePortal, useTranslation } from "../hooks";
import { mapd2eWebapiConceptSet } from "../Terminology/utils/d2eWebapiMappers";
import { i18nKeys } from "../context/state/translation-state";
import "./ConceptSets.scss";
import ConceptSetDeleteDialog from "./ConceptSetDeleteDialog";

enum ConceptSetTab {
  ConceptSearch = "ConceptSearch",
  ConceptSets = "ConceptSets",
}

interface ConceptSetsProps {
  isAtlas: boolean;
}

export const ConceptSets: FC<ConceptSetsProps> = ({ isAtlas }) => {
  const { getText } = useTranslation();
  const { datasetId, userId, userName } = usePortal();
  const [isLoading, setIsLoading] = useState(false);
  const [sorting, setSorting] = useState<MRT_SortingState>([]);
  const [searchText, setSearchText] = useState<string>("");
  const { setFeedback } = useFeedback();
  const [data, setData] = useState<ConceptSet[]>([]);
  const [tabValue, setTabValue] = useState(ConceptSetTab.ConceptSearch);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conceptSetToDelete, setConceptSetToDelete] = useState<
    { id: number; name: string } | undefined
  >(undefined);

  const handleTabSelectionChange = async (
    _event: React.SyntheticEvent,
    value: ConceptSetTab,
  ) => {
    setTabValue(value);
  };

  const fetchData = useCallback(async () => {
    if (!datasetId) return;

    try {
      setIsLoading(true);

      const response = (await api.d2eWebapi.getConceptSets(datasetId)).map(
        mapd2eWebapiConceptSet,
      );
      // Sort by name, with user's own concept sets first
      const sortFn = (a: ConceptSet, b: ConceptSet) => {
        const aIsOwn = a.createdBy === userName;
        const bIsOwn = b.createdBy === userName;
        if (aIsOwn && !bIsOwn) return -1;
        if (!aIsOwn && bIsOwn) return 1;
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
      };
      setData([...response].sort(sortFn));
    } catch (e) {
      console.error(e);
      setFeedback({
        type: "error",
        message: getText(i18nKeys.CONCEPT_SETS__ERROR),
        description: getText(i18nKeys.CONCEPT_SETS__ERROR_DESCRIPTION),
      });
    } finally {
      setIsLoading(false);
    }
  }, [getText, setFeedback, datasetId, userName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddAndEditConceptSet = useCallback(
    (conceptSetId?: number) => {
      if (!datasetId) {
        return;
      }
      const event = new CustomEvent<{ props: TerminologyProps }>(
        "alp-terminology-open",
        {
          detail: {
            props: {
              selectedConceptSetId: conceptSetId,
              onClose: () => {
                fetchData();
              },
              mode: "CONCEPT_SET",
              selectedDatasetId: datasetId,
              isAtlas,
            },
          },
        },
      );
      window.dispatchEvent(event);
    },
    [fetchData, datasetId],
  );

  const handleDeleteClick = useCallback((conceptSet: ConceptSet) => {
    setConceptSetToDelete({ id: conceptSet.id, name: conceptSet.name });
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteDialogClose = useCallback(() => {
    setDeleteDialogOpen(false);
    setConceptSetToDelete(undefined);
  }, []);

  const handleConceptSetDeleted = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const filteredData = useMemo(
    () =>
      data.filter((row) =>
        row.name.toLowerCase().includes(searchText.toLowerCase()),
      ),
    [data, searchText],
  );

  const columns = useMemo<MRT_ColumnDef<ConceptSet>[]>(
    () => [
      {
        accessorKey: "id",
        header: getText(i18nKeys.CONCEPT_SETS__ID),
        size: 80,
        sortDescFirst: false,
      },
      {
        accessorKey: "name",
        header: getText(i18nKeys.CONCEPT_SETS__Name),
        size: 260,
        Cell: ({ row }) => (
          <>
            {row.original.name}
            {row.original.shared
              ? ` (${getText(i18nKeys.CONCEPT_SETS__SHARED)})`
              : ""}
          </>
        ),
      },
      {
        accessorKey: "createdDate",
        header: getText(i18nKeys.CONCEPT_SETS__CREATED),
        size: 130,
        Cell: ({ row }) => {
          const d = row.original.createdDate;
          if (!d) return "";
          const [y, m, day] = d.split("-").map(Number);
          return new Date(y, m - 1, day).toLocaleDateString();
        },
      },
      {
        accessorKey: "modifiedDate",
        header: getText(i18nKeys.CONCEPT_SETS__UPDATED),
        size: 130,
        Cell: ({ row }) => {
          const d = row.original.modifiedDate;
          if (!d) return "";
          const [y, m, day] = d.split("-").map(Number);
          return new Date(y, m - 1, day).toLocaleDateString();
        },
      },
      {
        accessorKey: "userName",
        header: getText(i18nKeys.CONCEPT_SETS__AUTHOR),
        size: 160,
      },
      {
        accessorKey: "" as keyof ConceptSet,
        id: "actions",
        header: "",
        size: 90,
        enableSorting: false,
        Cell: ({ row }) => (
          <>
            <IconButton
              startIcon={
                row.original.createdBy === userName ? (
                  <EditIcon />
                ) : (
                  <VisibilityOnIcon />
                )
              }
              onClick={() => handleAddAndEditConceptSet(row.original.id)}
            />
            {row.original.createdBy === userName && (
              <IconButton
                startIcon={<DeleteIcon />}
                onClick={() => handleDeleteClick(row.original)}
              />
            )}
          </>
        ),
      },
    ],
    [getText, userName, handleAddAndEditConceptSet, handleDeleteClick],
  );

  const table = useMaterialReactTable({
    layoutMode: "grid",
    columns,
    data: filteredData,
    localization: {
      noRecordsToDisplay: getText(i18nKeys.CONCEPT_SETS__NO_CONCEPT_SETS),
    },
    initialState: { density: "compact" },
    defaultColumn: {
      enableGlobalFilter: false,
      enableHiding: false,
      enableSorting: true,
      enableColumnFilter: false,
      enableColumnActions: false,
    },
    enableStickyHeader: true,
    enablePagination: true,
    manualSorting: false,
    onSortingChange: setSorting,
    state: { sorting, isLoading },
    muiTableBodyCellProps: {
      sx: {
        whiteSpace: "normal",
        wordWrap: "break-word",
        color: "#000080",
        border: "none",
      },
    },
    muiTableHeadCellProps: {
      sx: {
        backgroundColor: "#edf2f7",
        padding: "6px",
      },
    },
    muiTableContainerProps: { sx: { overflowY: "auto" } },
    muiCircularProgressProps: {
      sx: { color: "var(--color-primary, #000080)" },
    },
    enableTopToolbar: false,
  });

  const updateSearchResult = useCallback(
    (keyword: string) => {
      if (keyword === searchText) return;
      setSearchText(keyword);
    },
    [searchText],
  );

  useEffect(() => {
    table.resetPagination();
  }, [searchText]);

  if (!datasetId) return <Loader />;

  if (!userId) {
    return null;
  }

  return (
    <>
      <div className="concept-sets">
        <div className="concept-sets__content">
          <div className="concept-sets__tabs">
            <Tabs value={tabValue} onChange={handleTabSelectionChange}>
              <Tab
                disableRipple
                label={getText(i18nKeys.CONCEPT_SETS__SEARCH)}
                value={ConceptSetTab.ConceptSearch}
              />
              <Tab
                disableRipple
                label={getText(i18nKeys.TERMINOLOGY__CONCEPT_SETS)}
                value={ConceptSetTab.ConceptSets}
              />
            </Tabs>
          </div>

          <div className="concept-sets__break"></div>

          {tabValue == ConceptSetTab.ConceptSearch && (
            <Terminology userId={userId} isAtlas={isAtlas} />
          )}

          {tabValue == ConceptSetTab.ConceptSets && (
            <>
              <div className="concept-sets__header">
                <div className="concept-sets__search">
                  <SearchBar
                    keyword={searchText}
                    onEnter={updateSearchResult}
                    width={"480px"}
                  />
                </div>
                <Button
                  variant="contained"
                  onClick={() => handleAddAndEditConceptSet()}
                  text={getText(i18nKeys.CONCEPT_SETS__ADD_CONCEPT_SET)}
                />
              </div>
              <div className="concept-sets__table">
                <MaterialReactTable table={table} />
              </div>
            </>
          )}
        </div>
      </div>
      <ConceptSetDeleteDialog
        conceptSet={conceptSetToDelete}
        open={deleteDialogOpen}
        datasetId={datasetId}
        setMainFeedback={setFeedback}
        onClose={handleDeleteDialogClose}
        onDeleted={handleConceptSetDeleted}
      />
    </>
  );
};
