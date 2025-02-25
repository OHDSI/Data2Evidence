import React, { FC, useCallback, useState, useEffect, SetStateAction } from "react";
import {
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Paper,
} from "@mui/material";
import { Loader, TablePaginationActions } from "@portal/components";
import { useFeedback, useTranslation } from "../../../../contexts";
import { api } from "../axios/api";
import { conceptMap } from "../types";
import "./SourceToConceptMapTable.scss";
import { i18nKeys } from "../../../../contexts/app-context/states";

interface SourceToConceptMapTableProps {
  selectedDatasetId: string;
}

export const SourceToConceptMapTable: FC<SourceToConceptMapTableProps> = ({ selectedDatasetId }) => {
  const { getText } = useTranslation();
  const { setFeedback, setGenericErrorFeedback } = useFeedback();
  const [loading, setLoading] = useState(false);
  const [sourceToConceptMaps, setSourceToConceptMaps] = useState<conceptMap[]>([]);

  const fetchSourceToConceptMaps = useCallback(
    async (withLoading = false) => {
      try {
        if (withLoading) setLoading(true);

        const maps = await api.ConceptMapping.getConceptMappings(selectedDatasetId);
        setSourceToConceptMaps(maps);
      } catch (error: any) {
        if (error.data?.message) {
          setFeedback({ type: "error", message: error.data?.message });
        } else {
          setGenericErrorFeedback();
        }
        console.error("err", error);
      } finally {
        if (withLoading) setLoading(false);
      }
    },
    [selectedDatasetId, setFeedback, setGenericErrorFeedback]
  );

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPageData, setCurrentPageData] = useState([]);
  const handleChangePage = useCallback((event: React.MouseEvent<HTMLButtonElement> | null, page: number) => {
    setPage(page);
  }, []);
  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(Number(event.target.value) || 10);
    setPage(0);
  }, []);

  const tableDataCount: number = sourceToConceptMaps.length;

  useEffect(() => {
    setCurrentPageData(
      sourceToConceptMaps.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage) as SetStateAction<Array<never>>
    );
  }, [page, rowsPerPage, sourceToConceptMaps]);

  useEffect(() => {
    fetchSourceToConceptMaps(true);
  }, [fetchSourceToConceptMaps, selectedDatasetId]);

  if (loading) return <Loader />;

  return (
    <div className="source-to-concept-map-table__container">
      <div className="source-to-concept-map-table__table">
        <TableContainer
          component={Paper}
          sx={{ "& .MuiTableCell-root": { color: "#000080" }, maxHeight: 320, width: 1, border: "1px solid #dad7d7" }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>{getText(i18nKeys.SOURCE_TO_CONCEPT_MAP_TABLE__SOURCE_CODE)}</TableCell>
                <TableCell>{getText(i18nKeys.SOURCE_TO_CONCEPT_MAP_TABLE__SOURCE_CONCEPT_ID)}</TableCell>
                <TableCell>{getText(i18nKeys.SOURCE_TO_CONCEPT_MAP_TABLE__SOURCE_VOCABULARY_ID)}</TableCell>
                <TableCell>{getText(i18nKeys.SOURCE_TO_CONCEPT_MAP_TABLE__SOURCE_CODE_DESCRIPTION)}</TableCell>
                <TableCell>{getText(i18nKeys.SOURCE_TO_CONCEPT_MAP_TABLE__TARGET_CONCEPT_ID)}</TableCell>
                <TableCell>{getText(i18nKeys.SOURCE_TO_CONCEPT_MAP_TABLE__TARGET_VOCABULARY_ID)}</TableCell>
                <TableCell>{getText(i18nKeys.SOURCE_TO_CONCEPT_MAP_TABLE__VALID_START_DATE)}</TableCell>
                <TableCell>{getText(i18nKeys.SOURCE_TO_CONCEPT_MAP_TABLE__VALID_END_DATE)}</TableCell>
                <TableCell>{getText(i18nKeys.SOURCE_TO_CONCEPT_MAP_TABLE__INVALID_REASON)}</TableCell>
              </TableRow>
            </TableHead>
            {sourceToConceptMaps.length === 0 ? (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    {getText(i18nKeys.EXPORT_MAPPING_DIALOG__NO_DATA)}
                  </TableCell>
                </TableRow>
              </TableBody>
            ) : (
              <TableBody>
                {currentPageData.map((sourceToConceptMap: conceptMap, index: React.Key) => (
                  <TableRow
                    key={index}
                    sx={{
                      "&:nth-of-type(even)": {
                        backgroundColor: "#f8f8f8",
                      },
                    }}
                  >
                    {Object.values(sourceToConceptMap).map((data, index: React.Key) => (
                      <TableCell key={index}>{data}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={tableDataCount}
          page={page}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          onPageChange={handleChangePage}
          ActionsComponent={TablePaginationActions}
          sx={{
            overflow: "visible",
            height: "52px",
            "& .MuiButtonBase-root:not(.Mui-disabled)": { color: "#000080" },
          }}
        />
      </div>
    </div>
  );
};
