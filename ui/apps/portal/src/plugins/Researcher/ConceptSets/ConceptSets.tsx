import React, { ChangeEvent, FC, useCallback, useEffect, useState } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableHead from "@mui/material/TableHead";
import TableContainer from "@mui/material/TableContainer";
import TablePagination from "@mui/material/TablePagination";
import {
  Button,
  EditIcon,
  IconButton,
  Loader,
  TableCell,
  TablePaginationActions,
  TableRow,
  VisibilityOnIcon,
} from "@portal/components";
import { Tabs, Tab } from "@mui/material";
import { api } from "../../../axios/api";
import Terminology from "../../Researcher/Terminology/Terminology";
import { ConceptSetWithConceptDetails } from "../../Researcher/Terminology/utils/types";
import { TerminologyProps } from "../../Researcher/Terminology/Terminology";
import SearchBar from "../../../components/SearchBar/SearchBar";
import { PageProps, ResearcherStudyMetadata } from "@portal/plugin";
import { useActiveDataset, useFeedback, useTranslation, useUser } from "../../../contexts";
import "./ConceptSets.scss";

enum ConceptSetTab {
  ConceptSearch = "ConceptSearch",
  ConceptSets = "ConceptSets",
}

interface ConceptSetsProps extends PageProps<ResearcherStudyMetadata> {}

export const ConceptSets: FC<ConceptSetsProps> = ({ metadata }) => {
  const { getText, i18nKeys } = useTranslation();
  const { user, userId } = useUser();
  const { activeDataset } = useActiveDataset();
  const activeDatasetId = activeDataset.id;
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState<string>("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const { setFeedback } = useFeedback();
  const [data, setData] = useState<ConceptSetWithConceptDetails[]>([]);
  const [tabValue, setTabValue] = useState(ConceptSetTab.ConceptSearch);

  const handleTabSelectionChange = async (event: React.SyntheticEvent, value: ConceptSetTab) => {
    setTabValue(value);
  };

  const updateSearchResult = useCallback(
    (keyword: string) => {
      if (keyword === searchText) {
        return;
      }
      setSearchText(keyword);
      setPage(0);
    },
    [searchText]
  );

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      const response = await api.terminology.getConceptSets(activeDatasetId);
      const sortFn = (a: ConceptSetWithConceptDetails, b: ConceptSetWithConceptDetails) => {
        if (a.name < b.name) {
          return -1;
        }
        return 0;
      };
      const userConceptSets = response
        .filter((conceptSet) => {
          return conceptSet.createdBy === user.idpUserId;
        })
        .sort(sortFn);
      const sharedConceptSets = response
        .filter((conceptSet) => {
          return conceptSet.createdBy !== user.idpUserId && conceptSet.shared;
        })
        .sort(sortFn);
      const list = [...userConceptSets, ...sharedConceptSets];
      setData(list);
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
  }, [getText, setFeedback, i18nKeys.CONCEPT_SETS__ERROR, i18nKeys.CONCEPT_SETS__ERROR_DESCRIPTION, activeDatasetId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddAndEditConceptSet = useCallback(
    (conceptSetId?: string) => {
      if (!activeDatasetId) {
        return;
      }
      const event = new CustomEvent<{ props: TerminologyProps }>("alp-terminology-open", {
        detail: {
          props: {
            selectedConceptSetId: conceptSetId,
            onClose: () => {
              fetchData();
            },
            mode: "CONCEPT_SET",
            selectedDatasetId: activeDatasetId,
          },
        },
      });
      window.dispatchEvent(event);
    },
    [fetchData, activeDatasetId]
  );

  const handleRowsPerPageChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(Number(event.target.value) || 25);
    setPage(0);
  }, []);

  const handlePageChange = useCallback((event: React.MouseEvent<HTMLButtonElement> | null, page: number) => {
    setPage(page);
  }, []);

  const filteredData = data.filter((row) => row.name.toLowerCase().includes(searchText.toLowerCase()));
  const pageData = filteredData.slice(rowsPerPage * page, rowsPerPage * (page + 1));

  if (isLoading || !activeDatasetId) return <Loader />;

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
              ></Tab>
              <Tab
                disableRipple
                label={getText(i18nKeys.TERMINOLOGY__CONCEPT_SETS)}
                value={ConceptSetTab.ConceptSets}
              ></Tab>
            </Tabs>
          </div>

          <div className="concept-sets__break"></div>

          {tabValue == ConceptSetTab.ConceptSearch && <Terminology baseUserId={userId} />}

          {tabValue == ConceptSetTab.ConceptSets && (
            <>
              <div className="concept-sets__header">
                <div className="concept-sets__search">
                  <SearchBar keyword={searchText} onEnter={updateSearchResult} width={"480px"} />
                </div>
                <Button
                  text={getText(i18nKeys.CONCEPT_SETS__ADD_CONCEPT_SET)}
                  onClick={() => handleAddAndEditConceptSet()}
                />
              </div>
              <TableContainer className="concept-sets__table">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{getText(i18nKeys.CONCEPT_SETS__ID)}</TableCell>
                      <TableCell>{getText(i18nKeys.CONCEPT_SETS__Name)}</TableCell>
                      <TableCell>{getText(i18nKeys.CONCEPT_SETS__CREATED)}</TableCell>
                      <TableCell>{getText(i18nKeys.CONCEPT_SETS__UPDATED)}</TableCell>
                      <TableCell>{getText(i18nKeys.CONCEPT_SETS__AUTHOR)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pageData.map((row) => {
                      return (
                        <TableRow key={row.id}>
                          <TableCell>{row.id}</TableCell>
                          <TableCell>
                            {row.name}
                            {row.shared ? ` (${getText(i18nKeys.CONCEPT_SETS__SHARED)})` : ""}
                          </TableCell>
                          <TableCell>{row.createdDate}</TableCell>
                          <TableCell>{row.modifiedDate}</TableCell>
                          <TableCell>{row.userName}</TableCell>
                          <TableCell>
                            <IconButton
                              startIcon={row.createdBy === user.idpUserId ? <EditIcon /> : <VisibilityOnIcon />}
                              onClick={() => handleAddAndEditConceptSet(row.id)}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {filteredData.length > 0 && (
                <TablePagination
                  component="div"
                  count={filteredData.length}
                  page={page}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleRowsPerPageChange}
                  onPageChange={handlePageChange}
                  ActionsComponent={TablePaginationActions}
                  sx={{
                    overflow: "visible",
                    height: "52px",
                    "& .MuiButtonBase-root:not(.Mui-disabled)": { color: "#000080" },
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};
