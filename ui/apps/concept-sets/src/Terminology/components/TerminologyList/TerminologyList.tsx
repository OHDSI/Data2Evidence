import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Checkbox from "@mui/material/Checkbox";
import TablePagination from "@mui/material/TablePagination";
import {
  MaterialReactTable,
  MRT_ColumnDef,
  MRT_SortingState,
  useMaterialReactTable,
} from "material-react-table";
import { TablePaginationActions } from "@portal/components";
import { useFeedback, useTranslation } from "../../../hooks";
import {
  FilterOptions,
  TabName,
  FhirValueSetExpansionContainsWithExt,
  TerminologyResult,
} from "../../utils/types";
import { Terminology } from "../../../axios/terminology";
import { api } from "../../../axios/api";
import { tabNames } from "../../utils/constants";
import SearchBar from "../../../components/SearchBar/SearchBar";
import {
  mapd2eWebapiConcept,
  combinedConceptAndConceptRecordCounts,
} from "../../utils/d2eWebapiMappers";
import { i18nKeys } from "../../../context/state";
import { getPortalAPI } from "../../../utils/PortalUtils";

import "./TerminologyList.scss";
import AddIcon from "../../../components/icons/AddIcon";
import RemoveIcon from "../../../components/icons/RemoveIcon";

interface TerminologyListProps {
  userId?: string;
  onConceptClick: (conceptId: number | null) => void;
  selectedConceptId: number | null;
  onSelectConceptId?: (
    conceptData: FhirValueSetExpansionContainsWithExt,
  ) => void;
  initialInput: string;
  selectedConcepts: FhirValueSetExpansionContainsWithExt[];
  tab: TabName;
  toggleDescendantsAndMapped?: (
    conceptId: number,
    type: "DESCENDANTS" | "MAPPED" | "EXCLUDE",
  ) => void;
  showAddIcon: boolean;
  conceptsResult: TerminologyResult | null;
  setConceptsResult: React.Dispatch<
    React.SetStateAction<TerminologyResult | null>
  >;
  datasetId?: string;
  isDrawer: boolean;
  defaultFilters?: {
    id: string;
    value: string[];
  }[];
  mode?:
    | "CONCEPT_MAPPING"
    | "CONCEPT_SET"
    | "CONCEPT_SEARCH"
    | "CONCEPT_MULTI_SELECT";
  isAtlas: boolean;
}

const mapFilterOptions = (options: {
  [key: string]: number;
}): { text: string; value: string }[] => {
  const sortedOptions = Object.keys(options).sort();
  return sortedOptions.map((optionName) => {
    return {
      text: `${optionName}`,
      value: optionName,
    };
  });
};

/**
 * Maps MRT column accessorKey values to the backend sortBy parameter names
 * accepted by the d2e-webapi vocabulary search endpoint.
 */
const MRT_COLUMN_TO_SORT_BY: Record<string, string> = {
  conceptId: "concept_id",
  conceptName: "concept_name",
  vocabularyId: "vocabulary_id",
  conceptCode: "concept_code",
  conceptClassId: "concept_class_id",
  domainId: "domain_id",
  concept: "standard_concept",
  validity: "standard_concept",
  score: "score",
  // Count columns — forwarded as-is to trigger the two-step path in d2e-webapi
  recordCount: "recordCount",
  descendantRecordCount: "descendantRecordCount",
  personCount: "personCount",
  descendantPersonCount: "descendantPersonCount",
};

const TerminologyList: FC<TerminologyListProps> = ({
  userId,
  onConceptClick,
  selectedConceptId,
  onSelectConceptId,
  initialInput,
  selectedConcepts,
  tab,
  toggleDescendantsAndMapped,
  showAddIcon,
  conceptsResult,
  setConceptsResult,
  datasetId,
  isDrawer,
  defaultFilters,
  mode = "CONCEPT_SEARCH",
  isAtlas,
}) => {
  const { getText } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [terminologiesCount, setTerminologiesCount] = useState(0);
  const [searchText, setSearchText] = useState(initialInput);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(
    null,
  );
  const [allFilterOptionsZeroed, setAllFilterOptionsZeroed] =
    useState<FilterOptions>({
      conceptClassId: {},
      domainId: {},
      standardConcept: {},
      vocabularyId: {},
      concept: {},
      validity: {},
    });
  const [columnFilters, setColumnFilters] = useState<
    { id: string; value: unknown }[]
  >(defaultFilters || []);
  const [defaultFiltersValidated, setDefaultFiltersValidated] = useState(false);
  const [sorting, setSorting] = useState<MRT_SortingState>([]);
  const { setFeedback } = useFeedback();
  const tableRef = useRef<HTMLTableElement>(null);
  const fetchDataAbortControllerRef = useRef<AbortController | null>(null);
  const selectedConceptsRef = useRef(selectedConcepts);
  selectedConceptsRef.current = selectedConcepts;

  const listData = useMemo(() => {
    const fullListData =
      tab === tabNames.SELECTED ? selectedConcepts : conceptsResult?.data || [];
    // For PA-Atlas, use client-side pagination for all tabs (SEARCH, SELECTED, RELATED)
    // For regular app, only SELECTED and RELATED tabs use client-side pagination (SEARCH uses server-side)
    const shouldUseClientSidePagination =
      tab === tabNames.SELECTED ||
      tab === tabNames.RELATED ||
      (isAtlas && tab === tabNames.SEARCH);

    // Apply sorting before pagination (when enabled)
    let sortedData = fullListData;
    if (isAtlas && sorting.length > 0) {
      const sortColumn = sorting[0];
      const columnId =
        sortColumn.id as keyof FhirValueSetExpansionContainsWithExt;

      sortedData = [...fullListData].sort((a, b) => {
        const aValue = a[columnId];
        const bValue = b[columnId];

        // Handle null/undefined values
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return sortColumn.desc ? 1 : -1;
        if (bValue == null) return sortColumn.desc ? -1 : 1;

        // Numeric comparison
        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortColumn.desc ? bValue - aValue : aValue - bValue;
        }

        // String comparison
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        const comparison = aStr.localeCompare(bStr);
        return sortColumn.desc ? -comparison : comparison;
      });
    }

    const listData = shouldUseClientSidePagination
      ? sortedData.slice(page * rowsPerPage, (page + 1) * rowsPerPage)
      : sortedData;
    return listData;
  }, [
    tab,
    conceptsResult,
    page,
    rowsPerPage,
    selectedConcepts,
    isAtlas,
    sorting,
  ]);

  const updateSearchResult = useCallback((keyword: string) => {
    setSearchText(keyword);
    setPage(0);
  }, []);

  const fetchData = useCallback(async () => {
    // Abort any in-flight request and set up new abort controller
    if (fetchDataAbortControllerRef.current) {
      fetchDataAbortControllerRef.current.abort();
    }

    const controller = new AbortController();
    fetchDataAbortControllerRef.current = controller;

    if (!userId || !datasetId) {
      return;
    }

    try {
      setIsLoading(true);
      const terminologyAPI = new Terminology();

      // Extract filter values from column filters
      const conceptClassIdFilters = (columnFilters.find(
        (filter) => filter.id === "conceptClassId",
      )?.value || []) as string[];
      const domainIdFilters = (columnFilters.find(
        (filter) => filter.id === "domainId",
      )?.value || []) as string[];
      const vocabularyIdFilters = (columnFilters.find(
        (filter) => filter.id === "vocabularyId",
      )?.value || []) as string[];
      const conceptFilters = (columnFilters.find(
        (filter) => filter.id === "concept",
      )?.value || []) as string[];
      const standardConceptFilters = conceptFilters.map((concept) =>
        concept === "Standard" ? "S" : "Non-standard",
      );
      const validityFilters = (columnFilters.find(
        (filter) => filter.id === "validity",
      )?.value || []) as string[];

      // Resolve sort params for server-side search (non-Atlas SEARCH tab only)
      const activeSortColumn = !isAtlas && sorting.length > 0 ? sorting[0] : null;
      const sortByParam = activeSortColumn
        ? MRT_COLUMN_TO_SORT_BY[activeSortColumn.id]
        : undefined;
      const sortOrderParam = activeSortColumn
        ? (activeSortColumn.desc ? "desc" : "asc")
        : undefined;

      // Fetch data based on current tab
      if (
        tab === "SEARCH" &&
        Array.isArray(conceptClassIdFilters) &&
        Array.isArray(domainIdFilters) &&
        Array.isArray(vocabularyIdFilters) &&
        Array.isArray(standardConceptFilters)
      ) {
        // SEARCH tab - fetch terminologies from API
        let concepts, conceptsCount;
        if (getPortalAPI()?.REACT_APP_USE_PUBLIC_WEBAPI_PROXY === "true") {
          [concepts, conceptsCount] =
            await api.publicWebapiProxyAPI.getTerminologies(
              page,
              rowsPerPage,
              getPortalAPI()?.REACT_APP_PUBLIC_WEBAPI_DATASOURCE as string,
              searchText.toLowerCase(),
              conceptClassIdFilters,
              domainIdFilters,
              vocabularyIdFilters,
              standardConceptFilters,
              validityFilters,
              controller.signal,
            );
        } else {
          [concepts, conceptsCount] = await Promise.all([
            api.d2eWebapi.getTerminologies(
              page,
              rowsPerPage,
              datasetId,
              searchText.toLowerCase(),
              conceptClassIdFilters,
              domainIdFilters,
              vocabularyIdFilters,
              standardConceptFilters,
              validityFilters,
              controller.signal,
              sortByParam,
              sortOrderParam,
            ),
            api.terminology.getConceptsCount(
              datasetId,
              searchText.toLowerCase(),
              conceptClassIdFilters,
              domainIdFilters,
              vocabularyIdFilters,
              standardConceptFilters,
              validityFilters,
              controller.signal,
            ),
          ]);
        }

        // Transform concepts and fetch record counts (non-Atlas only)
        let mappedConcepts;
        if (!isAtlas) {
          const conceptRecordCounts =
            await api.d2eWebapi.getConceptRecordCounts(
              datasetId,
              concepts.map((e) => e.CONCEPT_ID),
              controller.signal,
            );
          mappedConcepts = combinedConceptAndConceptRecordCounts(
            concepts.map(mapd2eWebapiConcept),
            conceptRecordCounts,
          );
        } else {
          mappedConcepts = concepts.map(mapd2eWebapiConcept);
        }

        // Build response and normalize field names
        const response = {
          count: conceptsCount,
          data: mappedConcepts,
        };
        response.data.map((data: any) => {
          data["conceptCode"] = data["code"] as string;
          data["conceptName"] = data["display"] as string;
          data["vocabularyId"] = data["system"] as string;
        });

        setConceptsResult(response);

        // Initialize filter options on first load (non-blocking)
        if (!filterOptions) {
          terminologyAPI
            .getFilterOptions(
              datasetId,
              searchText.toLowerCase(),
              conceptClassIdFilters,
              domainIdFilters,
              vocabularyIdFilters,
              standardConceptFilters,
              controller.signal,
            )
            .then((filterOptions) => {
              const combinedFilterOptions: FilterOptions = {
                conceptClassId: {
                  ...allFilterOptionsZeroed.conceptClassId,
                  ...filterOptions.conceptClassId,
                },
                domainId: {
                  ...allFilterOptionsZeroed.domainId,
                  ...filterOptions.domainId,
                },
                vocabularyId: {
                  ...allFilterOptionsZeroed.vocabularyId,
                  ...filterOptions.vocabularyId,
                },
                standardConcept: {
                  ...allFilterOptionsZeroed.standardConcept,
                  ...filterOptions.standardConcept,
                },
                concept: {
                  ...allFilterOptionsZeroed.concept,
                  ...filterOptions.concept,
                },
                validity: {
                  ...allFilterOptionsZeroed.validity,
                  ...filterOptions.validity,
                },
              };
              setFilterOptions(combinedFilterOptions);
            })
            .catch((e) => {
              if (e?.message === "canceled" || e === "canceled") {
                return;
              }
              console.error("Failed to fetch filter options", e);
            });
        }
      } else {
        // RECOMMENDED tab - fetch recommended concepts
        const response = await terminologyAPI.getRecommendedConcepts(
          selectedConceptsRef.current.map(
            (selectedConcept) => selectedConcept.conceptId,
          ),
          datasetId,
          controller.signal,
        );

        setConceptsResult({ count: response.length, data: response });
      }
    } catch (e) {
      if (e?.message === "canceled" || e === "canceled") {
        return;
      }
      console.error(e);
      setConceptsResult(null);
      setFeedback({
        type: "error",
        message: getText(i18nKeys.TERMINOLOGY_LIST__ERROR),
        description: getText(i18nKeys.TERMINOLOGY_LIST__ERROR_DESCRIPTION),
      });
    } finally {
      if (fetchDataAbortControllerRef.current === controller) {
        setIsLoading(false);
      }
    }
  }, [
    searchText,
    page,
    rowsPerPage,
    setFeedback,
    userId,
    tab,
    datasetId,
    JSON.stringify(columnFilters),
    allFilterOptionsZeroed,
    getText,
    isAtlas,
    sorting,
  ]);

  // clean up abort controller on unmount
  useEffect(() => {
    return () => {
      fetchDataAbortControllerRef.current?.abort();
    };
  }, []);

  const onClickAddRemoveButton = useCallback(
    (terminology: FhirValueSetExpansionContainsWithExt) => {
      onSelectConceptId?.(terminology);
    },
    [onSelectConceptId],
  );

  // Validate defaultFilters against filterOptions once loaded.
  // defaultFilters are already applied at init, so this only updates
  // if casing differs or values don't exist in filterOptions.
  useEffect(() => {
    if (defaultFiltersValidated || !defaultFilters || !filterOptions) {
      return;
    }
    setDefaultFiltersValidated(true);

    const validFilters = defaultFilters
      .map((filter) => {
        const availableOptions =
          filterOptions[filter.id as keyof FilterOptions];
        if (!availableOptions) return filter;

        const validValues = filter.value
          .map((val) => {
            const matchingKey = Object.keys(availableOptions).find(
              (key) => key.toLowerCase() === val.toLowerCase(),
            );
            return matchingKey;
          })
          .filter((val): val is string => val !== undefined);

        return { ...filter, value: validValues };
      })
      .filter((f) => f.value.length > 0);

    // Only update if validation changed something (e.g. casing fix or invalid value removed)
    if (JSON.stringify(validFilters) !== JSON.stringify(columnFilters)) {
      setColumnFilters(validFilters);
    }
  }, [defaultFilters, defaultFiltersValidated, filterOptions]);

  // Reset page to 0 when search criteria change
  useEffect(() => {
    if (tab !== tabNames.SELECTED) {
      setPage(0);
    }
  }, [searchText, tab, JSON.stringify(columnFilters), userId]);

  // Reset page to 0 when sort changes (server-side search only)
  useEffect(() => {
    if (tab === tabNames.SEARCH && !isAtlas) {
      setPage(0);
    }
  }, [JSON.stringify(sorting), tab, isAtlas]);

  // Fetch data when search criteria change
  useEffect(() => {
    if (tab === tabNames.SELECTED) {
      return;
    }
    fetchData();
  }, [
    fetchData,
    userId,
    searchText,
    tab,
    JSON.stringify(columnFilters),
    isAtlas,
  ]);

  // Fetch data when pagination changes (only for non-Atlas SEARCH tab)
  useEffect(() => {
    if (tab === "SEARCH" && !isAtlas) {
      fetchData();
    }
  }, [page, rowsPerPage, isAtlas, tab, fetchData]);

  useEffect(() => {
    if (conceptsResult) {
      // For PA-Atlas, use actual data length since all results are loaded at once
      // For regular app, use the count from API (total across all pages)
      const count =
        isAtlas && tab === tabNames.SEARCH
          ? conceptsResult.data.length
          : conceptsResult.count;

      setTerminologiesCount(count);
    } else {
      setTerminologiesCount(0);
    }
  }, [conceptsResult, isAtlas, tab]);

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
      const filterOptions = await terminologyAPI.getFilterOptions(
        datasetId,
        searchText.toLowerCase(),
        [],
        [],
        [],
        [],
      );
      const filterOptionsZeroed = JSON.parse(JSON.stringify(filterOptions));
      for (const filterKey of [
        "conceptClassId",
        "domainId",
        "vocabularyId",
        "standardConcept",
        "concept",
      ] as const) {
        for (const optionKey in filterOptionsZeroed[filterKey]) {
          filterOptionsZeroed[filterKey][optionKey] = 0;
        }
      }
      setAllFilterOptionsZeroed(filterOptionsZeroed);
    };
    getAllFilterOptions();
  }, [datasetId]);

  const handleChangePage = useCallback(
    (_: React.MouseEvent<HTMLButtonElement> | null, page: number) => {
      setPage(page);
    },
    [],
  );

  const handleChangeRowsPerPage = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setRowsPerPage(Number(event.target.value) || 25);
      setPage(0);
    },
    [],
  );

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
      ...(listData.some((d) => d.score) ? ["score"] : []),
      "vocabularyId",
      "concept",
      "domainId",
      "conceptClassId",
      "validity",
      ...(listData.some((d) => d.recordCount) ? ["recordCount"] : []),
      ...(listData.some((d) => d.descendantRecordCount)
        ? ["descendantRecordCount"]
        : []),
      ...(listData.some((d) => d.personCount) ? ["personCount"] : []),
      ...(listData.some((d) => d.descendantPersonCount)
        ? ["descendantPersonCount"]
        : []),
    ];
    const basicColumns: MRT_ColumnDef<FhirValueSetExpansionContainsWithExt>[] =
      [
        {
          accessorKey: "conceptId",
          header: getText(i18nKeys.TERMINOLOGY_LIST__ID),
          sortDescFirst: false,
          grow: true,
          size: 100,
        },
        {
          accessorKey: "conceptCode",
          header: getText(i18nKeys.TERMINOLOGY_LIST__CODE),
          grow: true,
          size: 120,
        },
        {
          accessorKey: "conceptName",
          header: getText(i18nKeys.TERMINOLOGY_LIST__NAME),
          grow: true,
          size: isDrawer ? 200 : 250,
        },
        ...(listData.some((d) => d.score)
          ? [
              {
                accessorKey: "score",
                header: getText(i18nKeys.TERMINOLOGY_LIST__SCORE),
                grow: true,
                size: 150,
                // Round to 4 decimal places
                accessorFn: (row: FhirValueSetExpansionContainsWithExt) =>
                  `${row.score ? Math.round(row.score * 10000) / 10000 : ""}`,
              },
            ]
          : []),
        {
          accessorKey: "conceptClassId",
          header: getText(i18nKeys.TERMINOLOGY_LIST__CLASS),
          filterVariant: "multi-select",
          filterSelectOptions: filterOptions?.conceptClassId
            ? mapFilterOptions(filterOptions.conceptClassId)
            : [],
          enableColumnFilter: tab === tabNames.SEARCH,
          grow: true,
          size: 180,
        },
        {
          accessorKey: "concept",
          header: getText(i18nKeys.TERMINOLOGY_LIST__CONCEPT),
          filterVariant: "multi-select",
          filterSelectOptions: filterOptions?.concept
            ? mapFilterOptions(filterOptions.concept)
            : [],
          enableColumnFilter: tab === tabNames.SEARCH,
          grow: true,
          size: 180,
        },
        {
          accessorKey: "domainId",
          header: getText(i18nKeys.TERMINOLOGY_LIST__DOMAIN),
          filterVariant: "multi-select",
          filterSelectOptions: filterOptions?.domainId
            ? mapFilterOptions(filterOptions.domainId)
            : [],
          enableColumnFilter: tab === tabNames.SEARCH,
          grow: true,
          size: 180,
        },
        {
          accessorKey: "vocabularyId",
          header: getText(i18nKeys.TERMINOLOGY_LIST__VOCABULARY),
          filterVariant: "multi-select",
          filterSelectOptions: filterOptions?.vocabularyId
            ? mapFilterOptions(filterOptions.vocabularyId)
            : [],
          enableColumnFilter: tab === tabNames.SEARCH,
          grow: true,
          size: 180,
        },
        {
          accessorKey: "validity",
          header: getText(i18nKeys.TERMINOLOGY_LIST__VALIDITY),
          filterVariant: "multi-select",
          filterSelectOptions: filterOptions?.validity
            ? mapFilterOptions(filterOptions.validity)
            : [],
          enableColumnFilter: tab === tabNames.SEARCH,
          grow: true,
          size: 150,
        },
        ...(listData.some((d) => d.recordCount)
          ? [
              {
                accessorKey: "recordCount",
                header: getText(i18nKeys.TERMINOLOGY_LIST__RECORD_COUNT),
                muiTableHeadCellProps: {
                  title: getText(i18nKeys.TERMINOLOGY_LIST__RECORD_COUNT_TOOLTIP),
                },
                sortDescFirst: true,
                grow: true,
                size: 100,
              },
            ]
          : []),
        ...(listData.some((d) => d.descendantRecordCount)
          ? [
              {
                accessorKey: "descendantRecordCount",
                header: getText(
                  i18nKeys.TERMINOLOGY_LIST__DESCENDANT_RECORD_COUNT,
                ),
                muiTableHeadCellProps: {
                  title: getText(i18nKeys.TERMINOLOGY_LIST__DESCENDANT_RECORD_COUNT_TOOLTIP),
                },
                sortDescFirst: true,
                grow: true,
                size: 100,
              },
            ]
          : []),
        ...(listData.some((d) => d.personCount)
          ? [
              {
                accessorKey: "personCount",
                header: getText(i18nKeys.TERMINOLOGY_LIST__PERSON_COUNT),
                muiTableHeadCellProps: {
                  title: getText(i18nKeys.TERMINOLOGY_LIST__PERSON_COUNT_TOOLTIP),
                },
                sortDescFirst: true,
                grow: true,
                size: 100,
              },
            ]
          : []),
        ...(listData.some((d) => d.descendantPersonCount)
          ? [
              {
                accessorKey: "descendantPersonCount",
                header: getText(
                  i18nKeys.TERMINOLOGY_LIST__DESCENDANT_PERSON_COUNT,
                ),
                muiTableHeadCellProps: {
                  title: getText(i18nKeys.TERMINOLOGY_LIST__DESCENDANT_PERSON_COUNT_TOOLTIP),
                },
                sortDescFirst: true,
                grow: true,
                size: 100,
              },
            ]
          : []),
      ];

    const addButton: MRT_ColumnDef<FhirValueSetExpansionContainsWithExt>[] = [
      {
        accessorKey: "",
        header: "",
        id: "addButton",
        Cell: ({ row }: { row: any }) => {
          const terminology =
            row.original as FhirValueSetExpansionContainsWithExt;
          const isSelected = selectedConcepts.find(
            (concept) => concept.conceptId === terminology.conceptId,
          );
          return (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                cursor: "pointer",
              }}
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
      if (mode === "CONCEPT_MULTI_SELECT") {
        // Simplified selected concepts - only show add/remove button and basic columns
        return {
          columns: [...addButton, ...basicColumns],
          columnOrder: ["addButton", ...basicColumnOrder],
        };
      } else {
        // Full concept set mode with descendants/mapped/exclude options
        const descendantsAndMapped: MRT_ColumnDef<FhirValueSetExpansionContainsWithExt>[] =
          [
            {
              accessorKey: "useDescendants",
              header: getText(i18nKeys.TERMINOLOGY_LIST__DESCENDANTS),
              Cell: ({ row }: { row: any }) => {
                const terminology =
                  row.original as FhirValueSetExpansionContainsWithExt;
                return (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Checkbox
                      checked={!!terminology.useDescendants}
                      onClick={() =>
                        toggleDescendantsAndMapped?.(
                          terminology.conceptId,
                          "DESCENDANTS",
                        )
                      }
                      sx={{ padding: 0 }}
                    />
                  </div>
                );
              },
              grow: false,
              size: 120,
              muiTableBodyCellProps: {
                sx: { justifyContent: "center", border: "none" },
              },
            },
            {
              accessorKey: "useMapped",
              header: getText(i18nKeys.TERMINOLOGY_LIST__MAPPED),
              Cell: ({ row }: { row: any }) => {
                const terminology =
                  row.original as FhirValueSetExpansionContainsWithExt;
                return (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Checkbox
                      checked={terminology?.useMapped}
                      onClick={() =>
                        toggleDescendantsAndMapped?.(
                          terminology.conceptId,
                          "MAPPED",
                        )
                      }
                      sx={{ padding: 0 }}
                    />
                  </div>
                );
              },
              grow: false,
              size: 80,
              muiTableBodyCellProps: {
                sx: { justifyContent: "center", border: "none" },
              },
            },
            {
              accessorKey: "isExcluded",
              header: getText(i18nKeys.TERMINOLOGY_LIST__EXCLUDE),
              Cell: ({ row }: { row: any }) => {
                const terminology =
                  row.original as FhirValueSetExpansionContainsWithExt;
                return (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Checkbox
                      checked={terminology?.isExcluded}
                      onClick={() =>
                        toggleDescendantsAndMapped?.(
                          terminology.conceptId,
                          "EXCLUDE",
                        )
                      }
                      sx={{ padding: 0 }}
                    />
                  </div>
                );
              },
              grow: false,
              size: 80,
              muiTableBodyCellProps: {
                sx: { justifyContent: "center", border: "none" },
              },
            },
          ];
        return {
          columns: [...addButton, ...descendantsAndMapped, ...basicColumns],
          columnOrder: [
            "addButton",
            "useDescendants",
            "useMapped",
            "isExcluded",
            ...basicColumnOrder,
          ],
        };
      }
    }
    if (showAddIcon && onSelectConceptId) {
      return {
        columns: [...addButton, ...basicColumns],
        columnOrder: ["addButton", ...basicColumnOrder],
      };
    }
    return { columns: basicColumns, columnOrder: basicColumnOrder };
  }, [
    filterOptions,
    tab,
    JSON.stringify(listData),
    selectedConcepts,
    getText,
    mode,
    isAtlas,
    searchText,
    JSON.stringify(columnFilters),
  ]);

  const table = useMaterialReactTable({
    layoutMode: "grid",
    columns,
    data: listData,
    initialState: {
      density: "compact",
      // Hide column filters for Atlas when filterOptions are empty
      showColumnFilters: isAtlas ? false : true,
    },
    defaultColumn: {
      enableGlobalFilter: false,
      enableHiding: false,
      enableSorting: isAtlas || tab === tabNames.SEARCH,
      enableColumnFilter: false,
      enableColumnActions: false,
    },
    enableStickyHeader: true,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    manualSorting: isAtlas ? false : true, // Let MRT handle UI, we handle data sorting
    state: { columnFilters, columnOrder, isLoading, sorting },
    enablePagination: false, // Use TablePagination instead of built in
    muiTableBodyRowProps: ({ row, staticRowIndex }) => ({
      onClick: () => {
        if (isAtlas) {
          return;
        }
        const terminology = row.original;
        onConceptClick(terminology.conceptId);
      },
      sx: {
        cursor: isAtlas ? "auto" : "pointer", //you might want to change the cursor too when adding an onClick
        "&.MuiTableRow-root": {
          backgroundColor:
            selectedConceptId === row.original.conceptId
              ? "#ccdef1 !important"
              : staticRowIndex % 2
              ? "#fafafa  !important"
              : "white !important",
          cursor:
            selectedConceptId === row.original.conceptId || isAtlas
              ? "auto"
              : "pointer",
        },
        "&.MuiTableRow-root:hover": {
          backgroundColor: "#f2f0f1 !important",
        },
      },
    }),
    muiTableBodyCellProps: {
      sx: {
        whiteSpace: "normal",
        wordWrap: "break-word",
        color: "#000080",
        border: "none",
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
        color: "var(--color-primary, #000080)",
      },
    },
    enableTopToolbar: false,
  });
  return (
    <>
      {tab === "SEARCH" ? (
        <div className="terminology__list-search">
          <SearchBar
            keyword={searchText}
            onEnter={updateSearchResult}
            width={"806px"}
          />
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
            handleChangeRowsPerPage(event);
          }}
          onPageChange={(event, page) => {
            handleChangePage(event, page);
          }}
          ActionsComponent={TablePaginationActions}
          sx={{
            overflow: "visible",
            height: "52px",
          }}
        />
      ) : null}
    </>
  );
};

export default TerminologyList;
