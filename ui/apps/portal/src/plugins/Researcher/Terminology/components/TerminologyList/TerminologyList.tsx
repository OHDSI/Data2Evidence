import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Checkbox from "@mui/material/Checkbox";
import TablePagination from "@mui/material/TablePagination";
import { MaterialReactTable, MRT_ColumnDef, useMaterialReactTable } from "material-react-table";
import { TablePaginationActions, AddIcon, RemoveIcon } from "@portal/components";
import { useFeedback, useTranslation } from "../../../../../contexts";
import { FilterOptions, TabName, FhirValueSetExpansionContainsWithExt, TerminologyResult } from "../../utils/types";
import { Terminology } from "../../../../../axios/terminology";
import { tabNames } from "../../utils/constants";
import SearchBar from "../../../../../components/SearchBar/SearchBar";
import "./TerminologyList.scss";

interface TerminologyListProps {
  userId?: string;
  onConceptClick: (conceptId: number | null) => void;
  selectedConceptId: number | null;
  onSelectConceptId?: (conceptData: FhirValueSetExpansionContainsWithExt) => void;
  initialInput: string;
  isConceptSet?: boolean;
  selectedConcepts: FhirValueSetExpansionContainsWithExt[];
  tab: TabName;
  toggleDescendantsAndMapped?: (conceptId: number, type: "DESCENDANTS" | "MAPPED") => void;
  showAddIcon: boolean;
  conceptsResult: TerminologyResult | null;
  setConceptsResult: React.Dispatch<React.SetStateAction<TerminologyResult | null>>;
  datasetId?: string;
  isDrawer: boolean;
  defaultFilters?: {
    id: string;
    value: string[];
  }[];
}

const mapFilterOptions = (options: { [key: string]: number }): { text: string; value: string }[] => {
  const optionsWithCount: string[] = Object.keys(options)
    .filter((key) => options[key])
    .sort();
  const optionsWithNoCount: string[] = Object.keys(options)
    .filter((key) => !options[key])
    .sort();
  const optionNames = [...optionsWithCount, ...optionsWithNoCount];
  return optionNames.map((optionName) => {
    return {
      text: `${optionName} (${options[optionName]})`,
      value: optionName,
    };
  });
};

let apiCounter = 0;
const TerminologyList: FC<TerminologyListProps> = ({
  userId,
  onConceptClick,
  selectedConceptId,
  onSelectConceptId,
  initialInput,
  isConceptSet = false,
  selectedConcepts,
  tab,
  toggleDescendantsAndMapped,
  showAddIcon,
  conceptsResult,
  setConceptsResult,
  datasetId,
  isDrawer,
  defaultFilters,
}) => {
  const { getText, i18nKeys } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [terminologiesCount, setTerminologiesCount] = useState(0);
  const [searchText, setSearchText] = useState(initialInput);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    conceptClassId: {},
    domainId: {},
    standardConcept: {},
    vocabularyId: {},
    concept: {},
    validity: {},
  });
  const [allFilterOptionsZeroed, setAllFilterOptionsZeroed] = useState<FilterOptions>({
    conceptClassId: {},
    domainId: {},
    standardConcept: {},
    vocabularyId: {},
    concept: {},
    validity: {},
  });
  const [columnFilters, setColumnFilters] = useState<{ id: string; value: unknown }[]>([]);
  const [useDefaultFilters, setUseDefaultFilters] = useState(true);
  const { setFeedback } = useFeedback();
  const tableRef = useRef<HTMLTableElement>(null);

  const listData = useMemo(() => {
    const fullListData = tab === tabNames.SELECTED ? selectedConcepts : conceptsResult?.data || [];
    const listData =
      tab === tabNames.SELECTED || tab === tabNames.RELATED
        ? fullListData.slice(page * rowsPerPage, (page + 1) * rowsPerPage)
        : fullListData;
    return listData;
  }, [tab, conceptsResult, page, rowsPerPage, selectedConcepts]);

  const updateSearchResult = useCallback((keyword: string) => {
    setSearchText(keyword);
    setPage(0);
  }, []);

  const fetchData = useCallback(
    async (counter: number) => {
      if (userId && datasetId) {
        try {
          setIsLoading(true);
          const terminologyAPI = new Terminology();
          const conceptClassIdFilters = (columnFilters.find((filter) => filter.id === "conceptClassId")?.value ||
            []) as string[];
          const domainIdFilters = (columnFilters.find((filter) => filter.id === "domainId")?.value || []) as string[];
          const vocabularyIdFilters = (columnFilters.find((filter) => filter.id === "vocabularyId")?.value ||
            []) as string[];
          const conceptFilters = (columnFilters.find((filter) => filter.id === "concept")?.value || []) as string[];
          const standardConceptFilters = conceptFilters.map((concept) =>
            concept === "Standard" ? "S" : "Non-standard"
          );
          const validityFilters = (columnFilters.find((filter) => filter.id === "validity")?.value || []) as string[];
          if (
            tab === "SEARCH" &&
            Array.isArray(conceptClassIdFilters) &&
            Array.isArray(domainIdFilters) &&
            Array.isArray(vocabularyIdFilters) &&
            Array.isArray(standardConceptFilters)
          ) {
            const filterOptions = await terminologyAPI.getFilterOptions(
              datasetId,
              searchText.toLowerCase(),
              conceptClassIdFilters,
              domainIdFilters,
              vocabularyIdFilters,
              standardConceptFilters
            );
            const combinedFilterOptions: FilterOptions = {
              conceptClassId: { ...allFilterOptionsZeroed.conceptClassId, ...filterOptions.conceptClassId },
              domainId: { ...allFilterOptionsZeroed.domainId, ...filterOptions.domainId },
              vocabularyId: { ...allFilterOptionsZeroed.vocabularyId, ...filterOptions.vocabularyId },
              standardConcept: { ...allFilterOptionsZeroed.standardConcept, ...filterOptions.standardConcept },
              concept: { ...allFilterOptionsZeroed.concept, ...filterOptions.concept },
              validity: { ...allFilterOptionsZeroed.validity, ...filterOptions.validity },
            };
            setFilterOptions(combinedFilterOptions);
            const fhirResponse = await terminologyAPI.getTerminologies(
              page,
              rowsPerPage,
              datasetId,
              searchText.toLowerCase(),
              conceptClassIdFilters,
              domainIdFilters,
              vocabularyIdFilters,
              standardConceptFilters,
              validityFilters
            );
            const response = {
              count: fhirResponse.expansion.total,
              data: fhirResponse.expansion.contains,
            };
            response.data.map((data: any) => {
              data["conceptCode"] = data["code"] as string;
              data["conceptName"] = data["display"] as string;
              data["vocabularyId"] = data["system"] as string;
            });
            if (counter === apiCounter) {
              setFilterOptions(combinedFilterOptions);
              setConceptsResult(response);
            }
          } else {
            const response = await terminologyAPI.getRecommendedConcepts(
              selectedConcepts.map((selectedConcept) => selectedConcept.conceptId),
              datasetId
            );
            if (counter === apiCounter) {
              setConceptsResult({ count: response.length, data: response });
            }
          }
        } catch (e) {
          console.error(e);
          setFeedback({
            type: "error",
            message: getText(i18nKeys.TERMINOLOGY_LIST__ERROR),
            description: getText(i18nKeys.TERMINOLOGY_LIST__ERROR_DESCRIPTION),
          });
        } finally {
          if (counter === apiCounter) {
            setIsLoading(false);
          }
        }
      }
    },
    [
      searchText,
      page,
      rowsPerPage,
      setFeedback,
      userId,
      tab,
      datasetId,
      selectedConcepts,
      JSON.stringify(columnFilters),
      allFilterOptionsZeroed,
      getText,
    ]
  );

  const onClickAddRemoveButton = useCallback(
    (terminology: FhirValueSetExpansionContainsWithExt) => {
      onSelectConceptId?.(terminology);
    },
    [onSelectConceptId]
  );

  useEffect(() => {
    if (columnFilters.length || !defaultFilters) {
      setUseDefaultFilters(false);
    }
  }, [columnFilters.length, defaultFilters]);

  useEffect(() => {
    if (useDefaultFilters && defaultFilters && filterOptions && listData.length) {
      // Only include valid filters
      const filters = JSON.parse(JSON.stringify(defaultFilters)) as typeof defaultFilters;
      const validFilters = filters
        .map((f) => {
          const valueKeys = filterOptions[f.id as keyof typeof filterOptions];
          const valueKeysArr = Object.keys(valueKeys);
          const value = f.value.filter((v) => valueKeysArr.includes(v));
          return { ...f, value };
        })
        .filter((f) => {
          // Empty value arrays should be removed as it is not compatible with the react table
          return Object.keys(filterOptions).includes(f.id) && f.value.length;
        });
      setColumnFilters(validFilters);
    }
  }, [defaultFilters, filterOptions, listData, useDefaultFilters]);

  useEffect(() => {
    if (tab === tabNames.SELECTED) {
      return;
    }
    setPage(0);
    fetchData(++apiCounter);
  }, [setFeedback, userId, searchText, tab, JSON.stringify(columnFilters)]);

  useEffect(() => {
    if (conceptsResult) setTerminologiesCount(conceptsResult.count);
    else setTerminologiesCount(0);
  }, [conceptsResult]);

  useEffect(() => {
    if (tab === "SEARCH") {
      fetchData(++apiCounter);
      return;
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    if (tab === tabNames.SELECTED) {
      if (selectedConcepts.length) {
        setTerminologiesCount(selectedConcepts.length);
        setPage(0);
      } else {
        setTerminologiesCount(0);
        return;
      }
    }
    // Scroll table to top when changing tabs on page 0
    tableRef?.current?.scrollIntoView();
  }, [tab]);

  useEffect(() => {
    const getAllFilterOptions = async () => {
      if (!datasetId) {
        return;
      }
      const terminologyAPI = new Terminology();
      const filterOptions = await terminologyAPI.getFilterOptions(datasetId, searchText.toLowerCase(), [], [], [], []);
      const filterOptionsZeroed = JSON.parse(JSON.stringify(filterOptions));
      for (const filterKey of ["conceptClassId", "domainId", "vocabularyId", "standardConcept", "concept"] as const) {
        for (const optionKey in filterOptionsZeroed[filterKey]) {
          filterOptionsZeroed[filterKey][optionKey] = 0;
        }
      }
      setAllFilterOptionsZeroed(filterOptionsZeroed);
    };
    getAllFilterOptions();
  }, [datasetId]);

  const handleChangePage = useCallback((event: React.MouseEvent<HTMLButtonElement> | null, page: number) => {
    setPage(page);
  }, []);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(Number(event.target.value) || 25);
    setPage(0);
  }, []);

  useEffect(() => {
    // Only applies to selected tab as it is the only one that can remove items
    if (tab === tabNames.SELECTED) {
      setTerminologiesCount(selectedConcepts.length);
      if (!listData.length && page !== 0) {
        setPage(0);
      }
    }
  }, [JSON.stringify(listData)]);

  const { columns, columnOrder } = useMemo<{
    columns: MRT_ColumnDef<FhirValueSetExpansionContainsWithExt>[];
    columnOrder: string[];
  }>(() => {
    const basicColumnOrder = [
      "conceptId",
      "conceptCode",
      "conceptName",
      "vocabularyId",
      "concept",
      "domainId",
      "conceptClassId",
      "validity",
    ];
    const basicColumns: MRT_ColumnDef<FhirValueSetExpansionContainsWithExt>[] = [
      {
        accessorKey: "conceptId",
        header: getText(i18nKeys.TERMINOLOGY_LIST__ID),
        grow: true,
        size: 100,
      },
      {
        accessorKey: "conceptCode",
        header: getText(i18nKeys.TERMINOLOGY_LIST__CODE),
        grow: true,
        size: 180,
      },
      {
        accessorKey: "conceptName",
        header: getText(i18nKeys.TERMINOLOGY_LIST__NAME),
        grow: true,
        size: isDrawer ? 250 : 350,
      },
      {
        accessorKey: "conceptClassId",
        header: getText(i18nKeys.TERMINOLOGY_LIST__CLASS),
        filterVariant: "multi-select",
        filterSelectOptions: filterOptions?.conceptClassId ? mapFilterOptions(filterOptions.conceptClassId) : [],
        enableColumnFilter: tab === tabNames.SEARCH,
        grow: true,
        size: 180,
      },
      {
        accessorKey: "concept",
        header: getText(i18nKeys.TERMINOLOGY_LIST__CONCEPT),
        filterVariant: "multi-select",
        filterSelectOptions: filterOptions?.concept ? mapFilterOptions(filterOptions.concept) : [],
        enableColumnFilter: tab === tabNames.SEARCH,
        grow: true,
        size: 180,
      },
      {
        accessorKey: "domainId",
        header: getText(i18nKeys.TERMINOLOGY_LIST__DOMAIN),
        filterVariant: "multi-select",
        filterSelectOptions: filterOptions?.domainId ? mapFilterOptions(filterOptions.domainId) : [],
        enableColumnFilter: tab === tabNames.SEARCH,
        grow: true,
        size: 180,
      },
      {
        accessorKey: "vocabularyId",
        header: getText(i18nKeys.TERMINOLOGY_LIST__VOCABULARY),
        filterVariant: "multi-select",
        filterSelectOptions: filterOptions?.vocabularyId ? mapFilterOptions(filterOptions.vocabularyId) : [],
        enableColumnFilter: tab === tabNames.SEARCH,
        grow: true,
        size: 180,
      },
      {
        accessorKey: "validity",
        header: getText(i18nKeys.TERMINOLOGY_LIST__VALIDITY),
        filterVariant: "multi-select",
        filterSelectOptions: filterOptions?.validity ? mapFilterOptions(filterOptions.validity) : [],
        enableColumnFilter: tab === tabNames.SEARCH,
        grow: true,
        size: 180,
      },
    ];

    const addButton: MRT_ColumnDef<FhirValueSetExpansionContainsWithExt>[] = [
      {
        accessorKey: "",
        header: "",
        id: "addButton",
        Cell: ({ row }: { row: any }) => {
          const terminology = row.original as FhirValueSetExpansionContainsWithExt;
          const isSelected = selectedConcepts.find((concept) => concept.conceptId === terminology.conceptId);
          return (
            <div
              style={{ display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer" }}
              onClick={(event) => {
                event.stopPropagation();
                onClickAddRemoveButton(terminology);
              }}
            >
              {isSelected ? <RemoveIcon /> : <AddIcon />}
            </div>
          );
        },
        grow: false,
        size: 30,
      },
    ];
    if (tab === "SELECTED") {
      const descendantsAndMapped: MRT_ColumnDef<FhirValueSetExpansionContainsWithExt>[] = [
        {
          accessorKey: "useDescendants",
          header: getText(i18nKeys.TERMINOLOGY_LIST__DESCENDANTS),
          Cell: ({ row }: { row: any }) => {
            const terminology = row.original as FhirValueSetExpansionContainsWithExt;
            return (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                <Checkbox
                  checked={!!terminology.useDescendants}
                  onClick={() => toggleDescendantsAndMapped?.(terminology.conceptId, "DESCENDANTS")}
                  sx={{ padding: 0 }}
                />
              </div>
            );
          },
          grow: false,
          size: 120,
          muiTableBodyCellProps: {
            sx: { justifyContent: "center" },
          },
        },
        {
          accessorKey: "useMapped",
          header: getText(i18nKeys.TERMINOLOGY_LIST__MAPPED),
          Cell: ({ row }: { row: any }) => {
            const terminology = row.original as FhirValueSetExpansionContainsWithExt;
            return (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                <Checkbox
                  checked={terminology?.useMapped}
                  onClick={() => toggleDescendantsAndMapped?.(terminology.conceptId, "MAPPED")}
                  sx={{ padding: 0 }}
                />
              </div>
            );
          },
          grow: false,
          size: 80,
          muiTableBodyCellProps: {
            sx: { justifyContent: "center" },
          },
        },
      ];
      return {
        columns: [...addButton, ...descendantsAndMapped, ...basicColumns],
        columnOrder: ["addButton", "useDescendants", "useMapped", ...basicColumnOrder],
      };
    }
    if (showAddIcon && onSelectConceptId) {
      return { columns: [...addButton, ...basicColumns], columnOrder: ["addButton", ...basicColumnOrder] };
    }
    return { columns: basicColumns, columnOrder: basicColumnOrder };
  }, [filterOptions, tab, JSON.stringify(listData), selectedConcepts, getText]);
  const table = useMaterialReactTable({
    layoutMode: "grid",
    columns,
    data: listData,
    initialState: { density: "compact", showColumnFilters: true },
    defaultColumn: {
      enableGlobalFilter: false,
      enableHiding: false,
      enableSorting: false,
      enableColumnFilter: false,
      enableColumnActions: false,
    },
    onColumnFiltersChange: setColumnFilters,
    state: { columnFilters, columnOrder, isLoading },
    enablePagination: false, // Use TablePagination instead of built in
    muiTableBodyRowProps: ({ row, staticRowIndex }) => ({
      onClick: () => {
        const terminology = row.original;
        onConceptClick(terminology.conceptId);
      },
      sx: {
        cursor: "pointer", //you might want to change the cursor too when adding an onClick
        "&.MuiTableRow-root": {
          backgroundColor:
            selectedConceptId === row.original.conceptId
              ? "#ccdef1 !important"
              : staticRowIndex % 2
              ? "#edf2f7  !important"
              : "transparent !important",
          cursor: selectedConceptId === row.original.conceptId ? "auto" : "pointer",
        },
        "&.MuiTableRow-root:hover": {
          backgroundColor: "#ccdef1 !important",
        },
      },
    }),
    muiTableBodyCellProps: {
      sx: {
        whiteSpace: "normal",
        wordWrap: "break-word",
        color: "#000080",
      },
    },
    muiTableContainerProps: {
      sx: { overflowY: "auto", height: "100%" },
    },
    muiTableHeadCellProps: {
      sx: {
        backgroundColor: "#edf2f7",
        padding: "6px",
        "& .MuiSelect-select": {
          fontSize: 12,
          paddingRight: "0px !important",
          "& .MuiChip-label": {
            fontSize: 10,
          },
        },
      },
    },
    muiCircularProgressProps: {
      sx: {
        color: "#000080",
      },
    },
    enableTopToolbar: false,
  });
  return (
    <>
      {tab === "SEARCH" ? (
        <div className="terminology__list-search">
          <SearchBar keyword={searchText} onEnter={updateSearchResult} width={"806px"} />
        </div>
      ) : null}
      <MaterialReactTable table={table} />
      {terminologiesCount ? (
        <TablePagination
          component="div"
          count={terminologiesCount}
          page={page}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            onConceptClick(null);
            handleChangeRowsPerPage(event);
          }}
          onPageChange={(event, page) => {
            onConceptClick(null);
            handleChangePage(event, page);
          }}
          ActionsComponent={TablePaginationActions}
          sx={{ overflow: "visible", height: "52px", "& .MuiButtonBase-root:not(.Mui-disabled)": { color: "#000080" } }}
        />
      ) : null}
    </>
  );
};

export default TerminologyList;
