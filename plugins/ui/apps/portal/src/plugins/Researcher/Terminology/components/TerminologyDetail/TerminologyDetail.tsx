import React, { FC, useEffect, useState, useCallback, Dispatch, SetStateAction } from "react";
import { Table, TableBody, TableHead, Tabs, Tab, Typography, Paper } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { TableRow, TableCell, Loader, IconButton } from "@portal/components";
import { useFeedback, useTranslation } from "../../../../../contexts";
import { TerminologyDetailsList } from "../../utils/types";
import { Terminology } from "../../../../../axios/terminology";
import ConceptHierarchy from "../ConceptHierarchy/ConceptHierarchy";
import { i18nKeys } from "../../../../../contexts/app-context/states";
import "./TerminologyDetail.scss";

interface TerminologyDetailProps {
  setShowDetails: Dispatch<SetStateAction<boolean>>;
  userId?: string;
  setConceptId: Dispatch<SetStateAction<null | number>>;
  conceptId: number;
  datasetId?: string;
}

enum TerminologyDetailsTab {
  Hierarchy = "Hierarchy",
  RelatedConcepts = "Related Concepts",
}

const TerminologyDetail: FC<TerminologyDetailProps> = ({
  setShowDetails,
  userId,
  setConceptId,
  conceptId,
  datasetId,
}) => {
  const { getText } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<TerminologyDetailsList | null>();
  const { setFeedback } = useFeedback();
  const [tabValue, setTabValue] = useState(TerminologyDetailsTab.RelatedConcepts);

  const handleTabSelectionChange = useCallback((event: React.SyntheticEvent, value: TerminologyDetailsTab) => {
    setTabValue(value);
  }, []);

  const closePage = useCallback(() => {
    setShowDetails(false);
    setConceptId(null);
  }, []);

  useEffect(() => {
    if (userId && datasetId) {
      setIsLoading(true);
      const fetchData = async () => {
        if (userId) {
          try {
            const terminologyApi = new Terminology();
            const fhirResponse = await terminologyApi.getTerminologyConnections(conceptId, datasetId);
            const response: TerminologyDetailsList = {
              details: fhirResponse.group[0]?.element?.[0]?.valueSet.expansion.contains[0],
              connections: [],
            };
            for (const item of fhirResponse.group) {
              response.connections.push(...item.element[0].target);
            }
            setData(response);
          } catch (e) {
            console.error(e);
            setFeedback({
              type: "error",
              message: getText(i18nKeys.TERMINOLOGY_DETAIL__ERROR),
              description: getText(i18nKeys.TERMINOLOGY_DETAIL__ERROR_DESCRIPTION),
            });
          } finally {
            setIsLoading(false);
          }
        }
      };
      fetchData();
    }
  }, [userId, conceptId, setData, setFeedback, datasetId, getText]);

  if (isLoading) {
    return <Loader />;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", marginLeft: "5px" }}>
      <div className="terminology_detail__tabs">
        <div className="terminology_detail__tabs_container">
          <Tabs value={tabValue} onChange={handleTabSelectionChange}>
            <Tab
              disableRipple
              label={getText(i18nKeys.TERMINOLOGY_DETAIL__HIERARCHY)}
              value={TerminologyDetailsTab.Hierarchy}
            />
            <Tab
              disableRipple
              label={getText(i18nKeys.TERMINOLOGY_DETAIL__RELATED_CONCEPTS)}
              value={TerminologyDetailsTab.RelatedConcepts}
            />
          </Tabs>
        </div>

        <IconButton startIcon={<CloseIcon />} disableRipple onClick={closePage} />
      </div>
      <Paper
        className="terminology_detail__container"
        style={{
          visibility: data ? "inherit" : "hidden",
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {tabValue == TerminologyDetailsTab.Hierarchy && (
          <ConceptHierarchy datasetId={datasetId} conceptId={conceptId} userId={userId} />
        )}

        {tabValue == TerminologyDetailsTab.RelatedConcepts && (
          <div className="terminology_detail__related-concepts">
            <div
              style={{
                visibility: data ? "inherit" : "hidden",
                overflow: "auto",
                width: "100%",
                flex: 1,
              }}
            >
              <div className="terminology_detail__table-connections">
                <Table size="small" stickyHeader sx={{ "& .MuiTableCell-root": { color: "#000080" } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell width="20%">{getText(i18nKeys.TERMINOLOGY_DETAIL__RELATIONSHIP)}</TableCell>
                      <TableCell width="30%">{getText(i18nKeys.TERMINOLOGY_DETAIL__RELATES_TO)}</TableCell>
                      <TableCell width="30%">{getText(i18nKeys.TERMINOLOGY_DETAIL__CONCEPT_ID)}</TableCell>
                      <TableCell width="20%">{getText(i18nKeys.TERMINOLOGY_DETAIL__VOCABULARY)}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody
                    sx={{
                      "& .MuiTableRow-root:nth-of-type(odd)": {
                        backgroundColor: "white",
                      },
                      "& .MuiTableRow-root:nth-of-type(even)": {
                        backgroundColor: "#fafafa",
                      },
                      "& .MuiTableCell-body": {
                        border: "none",
                      },
                    }}
                  >
                    {data &&
                      data?.connections.length > 0 &&
                      data.connections.map((conn, index) => (
                        <TableRow
                          key={conn.code + index}
                          onClick={() => setConceptId(conn.code)}
                          sx={{
                            cursor: "pointer",
                            "&.MuiTableRow-root:hover": {
                              backgroundColor: "#f2f0f1",
                            },
                          }}
                        >
                          <TableCell>{conn.equivalence}</TableCell>
                          <TableCell>{conn.display}</TableCell>
                          <TableCell>{conn.code}</TableCell>
                          <TableCell>{conn.vocabularyId}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div style={{ flex: 1, overflow: "auto" }}>
              <div className="terminology_detail__table-details">
                {data && data?.connections.length > 0 && (
                  <Table size="small" sx={{ "& .MuiTableCell-root": { color: "#000080" } }} stickyHeader>
                    <TableBody
                      sx={{
                        "& .MuiTableRow-root:nth-of-type(even)": {
                          backgroundColor: "transparent",
                        },
                        "& .MuiTableCell-root:nth-of-type(odd)": { fontWeight: 500 },
                      }}
                    >
                      <TableRow>
                        <TableCell variant="head" colSpan={5}>
                          {getText(i18nKeys.TERMINOLOGY_DETAIL__DETAILS)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>{getText(i18nKeys.TERMINOLOGY_LIST__ID)}</TableCell>
                        <TableCell>{data?.details?.conceptId ?? ""}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>{getText(i18nKeys.TERMINOLOGY_LIST__CODE)}</TableCell>
                        <TableCell>{data?.details?.code ?? ""}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>{getText(i18nKeys.TERMINOLOGY_LIST__NAME)}</TableCell>
                        <TableCell>{data?.details?.display ?? ""}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>{getText(i18nKeys.TERMINOLOGY_LIST__CLASS)}</TableCell>
                        <TableCell>{data?.details?.conceptClassId ?? ""}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>{getText(i18nKeys.TERMINOLOGY_LIST__CONCEPT)}</TableCell>
                        <TableCell>{data?.details?.concept ?? ""}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>{getText(i18nKeys.TERMINOLOGY_LIST__DOMAIN)}</TableCell>
                        <TableCell>{data?.details?.domainId ?? ""}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>{getText(i18nKeys.TERMINOLOGY_LIST__VOCABULARY)}</TableCell>
                        <TableCell>{data?.details?.system ?? ""}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>{getText(i18nKeys.TERMINOLOGY_LIST__VALIDITY)}</TableCell>
                        <TableCell>{data?.details?.validity ?? ""}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </div>
        )}
      </Paper>

      <div style={{ height: "52px", display: "flex", justifyContent: "center", alignItems: "center" }}>
        {data && data.details && (
          <Typography>
            Currently viewing: {data?.details.conceptId} | {data?.details.display}
          </Typography>
        )}
      </div>
    </div>
  );
};

export default TerminologyDetail;
