import React, { ChangeEvent, FC, useCallback, useEffect, useState } from "react";
import { PageProps, ResearcherStudyMetadata } from "@portal/plugin";
import { Button, Checkbox } from "@portal/components";
import TerminologyList from "./components/TerminologyList/TerminologyList";
import TerminologyDetail from "./components/TerminologyDetail/TerminologyDetail";
import "./Terminology.scss";
import { Box, Drawer, Tab, Tabs, TextField, Typography } from "@mui/material";
import { OnCloseReturnValues, FhirValueSetExpansionContainsWithExt, TerminologyResult } from "./utils/types";
import { tabNames } from "./utils/constants";
import { TabName, ConceptSet } from "./utils/types";
import { terminologyApi } from "../../../axios/terminology";
import { useActiveDataset, useToken, useTranslation, useUser } from "../../../contexts";
import env from "../../../env";

const nameProp = env.REACT_APP_IDP_NAME_PROP;

export interface TerminologyProps extends PageProps<ResearcherStudyMetadata> {
  onConceptIdSelect?: (conceptData: any) => void;
  initialInput?: string;
  baseUserId?: string;
  open?: boolean;
  onClose?: (values: OnCloseReturnValues) => void;
  selectedConceptSetId?: string;
  mode?: "CONCEPT_MAPPING" | "CONCEPT_SET" | "CONCEPT_SEARCH";
  selectedDatasetId?: string;
  defaultFilters?: {
    id: string;
    value: string[];
  }[];
}

const WithDrawer = ({
  onClose,
  children,
  open,
  isDrawer,
}: {
  onClose?: (values: any) => void;
  children: JSX.Element;
  open?: boolean;
  isDrawer: boolean;
}) =>
  isDrawer ? (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      anchor="right"
      PaperProps={{
        sx: { width: "85%", overflowY: "hidden" },
      }}
    >
      {children}
    </Drawer>
  ) : (
    children
  );

const NameSection = ({
  conceptSetName,
  setConceptSetName,
  conceptSetShared,
  setConceptSetShared,
  isUserConceptSet,
  saveConceptSet,
  isLoading,
  conceptSetId,
  onClickClose,
  errorMsg,
}: {
  conceptSetName: string;
  setConceptSetName: React.Dispatch<React.SetStateAction<string>>;
  conceptSetShared: boolean;
  setConceptSetShared: React.Dispatch<React.SetStateAction<boolean>>;
  isUserConceptSet: boolean;
  saveConceptSet(): void;
  isLoading: boolean;
  conceptSetId: string | null;
  onClickClose(): void;
  errorMsg: string;
}) => {
  const { getText, i18nKeys } = useTranslation();

  return (
    <Box sx={{ borderBottom: "1px solid #d4d4d4" }}>
      <Box
        sx={{
          height: "60px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          "& .MuiTextField-root": { width: "50%" },
        }}
      >
        <Typography>{getText(i18nKeys.TERMINOLOGY__NAME)}:</Typography>
        <TextField
          placeholder={getText(i18nKeys.TERMINOLOGY__CONCEPT_SET_NAME)}
          sx={{ marginLeft: "5px", width: "100%" }}
          id="standard-basic"
          variant="standard"
          value={conceptSetName}
          onChange={(e) => setConceptSetName(e.target.value)}
          disabled={isLoading}
        />
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "32px",
            "& .button.alp-button.sc-d4l-button": {
              width: `120px`,
            },
          }}
        >
          <div style={{ marginBottom: -15, marginLeft: 10 }}>
            <Checkbox
              checked={conceptSetShared}
              label={getText(i18nKeys.TERMINOLOGY__SHARED)}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setConceptSetShared(event.target.checked);
              }}
              disabled={!isUserConceptSet}
            />
          </div>
          {isUserConceptSet && (
            <Button
              text={conceptSetId ? getText(i18nKeys.TERMINOLOGY__UPDATE) : getText(i18nKeys.TERMINOLOGY__CREATE)}
              style={{ marginLeft: 10 }}
              onClick={saveConceptSet}
              disabled={isLoading}
            />
          )}
          <Button
            variant="outlined"
            text={getText(i18nKeys.TERMINOLOGY__CLOSE)}
            style={{ marginLeft: 10 }}
            onClick={onClickClose}
          />
        </Box>
      </Box>
      {errorMsg ? <div style={{ color: "red", textAlign: "center" }}>{errorMsg}</div> : null}
    </Box>
  );
};
const TabSection = ({
  currentTabNo,
  changeTab,
  selectedConceptsCount,
}: {
  currentTabNo: TabName;
  changeTab(tabName: TabName): void;
  selectedConceptsCount: number;
}) => {
  const { getText, i18nKeys } = useTranslation();
  const tabWidthPx = 220;
  return (
    <div style={{ height: "60px" }}>
      <Tabs
        value={currentTabNo}
        onChange={(e, value) => {
          changeTab(value);
        }}
        centered
        sx={{
          paddingBottom: 0,
          borderBottom: "1px solid #d4d4d4",
          "& .MuiTab-root": {
            color: "#000080",
          },
        }}
      >
        <Tab sx={{ width: `${tabWidthPx}px` }} label={getText(i18nKeys.TERMINOLOGY__SEARCH)} value={tabNames.SEARCH} />
        <Tab
          sx={{ width: `${tabWidthPx}px` }}
          label={
            <>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                {selectedConceptsCount ? (
                  <div
                    style={{
                      backgroundColor: "#000080",
                      color: "white",
                      minWidth: "20px",
                      height: "20px",
                      borderRadius: "10px",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ paddingLeft: "5px", paddingRight: "5px" }}>{selectedConceptsCount}</div>
                  </div>
                ) : null}
                <div style={{ marginLeft: "10px" }}>{getText(i18nKeys.TERMINOLOGY__SELECTED_CONCEPTS)}</div>
              </div>
            </>
          }
          value={tabNames.SELECTED}
        />
        <Tab
          sx={{ width: `${tabWidthPx}px` }}
          label={getText(i18nKeys.TERMINOLOGY__RELATED_CONCEPTS)}
          value={tabNames.RELATED}
        />
      </Tabs>
    </div>
  );
};

export const Terminology: FC<TerminologyProps> = ({
  metadata,
  onConceptIdSelect,
  initialInput = "",
  baseUserId,
  open,
  onClose,
  selectedConceptSetId,
  mode = "CONCEPT_SEARCH",
  selectedDatasetId,
  defaultFilters,
}: TerminologyProps) => {
  const { getText, i18nKeys } = useTranslation();
  const userId = baseUserId || metadata?.userId;
  const { user } = useUser();
  const [conceptId, setConceptId] = useState<null | number>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedConcepts, setSelectedConcepts] = useState<FhirValueSetExpansionContainsWithExt[]>([]);
  const [tab, setTab] = useState<TabName>(tabNames.SEARCH);
  const [conceptSetName, setConceptSetName] = useState("");
  const [conceptSetId, setConceptSetId] = useState<string | null>(null);
  const [conceptSetShared, setConceptSetShared] = useState(false);
  const [isUserConceptSet, setIsUserConceptSet] = useState(false);
  const [isConceptSetLoading, setIsConceptSetLoading] = useState(false);
  const [currentConceptSet, setCurrentConceptSet] = useState<ConceptSet | null>(null);
  const [conceptsResult, setConceptsResult] = useState<TerminologyResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const { activeDataset } = useActiveDataset();
  const { idTokenClaims } = useToken();
  const activeDatasetId = selectedDatasetId || activeDataset.id;
  const isConceptSet = mode === "CONCEPT_SET";

  const resetState = useCallback(() => {
    setConceptId(null);
    setShowDetails(false);
    setSelectedConcepts([]);
    setTab(tabNames.SEARCH);
    setConceptSetName("");
    setConceptSetId(null);
    setIsConceptSetLoading(false);
    setCurrentConceptSet(null);
    setErrorMsg("");
    setConceptSetShared(false);
    setIsUserConceptSet(false);
    setConceptsResult(null);
  }, []);

  const changeTab = useCallback((tabName: TabName) => {
    setTab(tabName);
  }, []);

  const sortAndSetSelectedConcepts = useCallback((selectedConceptsCopy: FhirValueSetExpansionContainsWithExt[]) => {
    selectedConceptsCopy.sort((concept1, concept2) => {
      return concept1.conceptId < concept2.conceptId ? -1 : 1;
    });
    setSelectedConcepts(selectedConceptsCopy);
  }, []);

  const saveConceptSet = useCallback(async () => {
    const conceptSet = {
      concepts: selectedConcepts.map((concept) => {
        return {
          id: concept.conceptId,
          useDescendants: !!concept.useDescendants,
          useMapped: !!concept.useMapped,
        };
      }),
      name: conceptSetName,
      shared: conceptSetShared,
      ...(!conceptSetId && { userName: idTokenClaims[nameProp] }),
    };
    setIsConceptSetLoading(true);
    try {
      const updatedConceptSetId = conceptSetId
        ? await terminologyApi.updateConceptSet(conceptSetId, conceptSet, activeDatasetId)
        : await terminologyApi.createConceptSet(conceptSet, activeDatasetId);
      if (typeof updatedConceptSetId !== "string") {
        if (updatedConceptSetId?.statusCode === 500) {
          setErrorMsg(
            getText(i18nKeys.TERMINOLOGY__ERROR, [
              conceptSetId ? getText(i18nKeys.TERMINOLOGY__UPDATING) : getText(i18nKeys.TERMINOLOGY__CREATING),
            ])
          );
        }
        return;
      }
      setErrorMsg("");
      setCurrentConceptSet({ ...conceptSet, id: updatedConceptSetId });
      setConceptSetId(updatedConceptSetId);
      return;
    } finally {
      setIsConceptSetLoading(false);
    }
  }, [selectedConcepts, conceptSetName, conceptSetId, conceptSetShared, activeDatasetId]);

  const getConceptSet = useCallback(
    async (conceptSetId: string) => {
      if (!activeDatasetId) {
        return;
      }
      setIsConceptSetLoading(true);
      try {
        const conceptSet = await terminologyApi.getConceptSet(conceptSetId, activeDatasetId);
        setConceptSetName(conceptSet.name);
        sortAndSetSelectedConcepts(conceptSet.concepts);
        setCurrentConceptSet(conceptSet);
        setConceptSetShared(conceptSet.shared);
        setIsUserConceptSet(conceptSet.createdBy === user.idpUserId);
        return;
      } finally {
        setIsConceptSetLoading(false);
      }
    },
    [activeDatasetId]
  );
  const isDrawer = !!onClose;

  const terminologyHeaderHeightPx = 40;
  const portalHeaderHeightPx = 72;
  const conceptSetNameHeightPx = 60;
  const conceptSetTabsHeightPx = 60;
  const datasetSelectorHeightPx = 38;
  const searchAndDetailsHeightOffsetPx =
    (isDrawer ? terminologyHeaderHeightPx : terminologyHeaderHeightPx + portalHeaderHeightPx) +
    (isConceptSet ? conceptSetNameHeightPx + conceptSetTabsHeightPx : 0) +
    (!activeDatasetId ? datasetSelectorHeightPx : 0);

  const onSelectConceptId = useCallback(
    (concept: FhirValueSetExpansionContainsWithExt) => {
      if (isConceptSet) {
        const selectedConceptsCopy = JSON.parse(
          JSON.stringify(selectedConcepts)
        ) as FhirValueSetExpansionContainsWithExt[];
        const conceptIndex = selectedConcepts.findIndex(
          (selectedConcept) => selectedConcept.conceptId === concept.conceptId
        );
        if (conceptIndex > -1) {
          selectedConceptsCopy.splice(conceptIndex, 1);
        } else {
          // Initialize values used for selected concepts
          const conceptToSelect: FhirValueSetExpansionContainsWithExt = {
            ...concept,
            useDescendants: false,
            useMapped: false,
          };
          selectedConceptsCopy.push(conceptToSelect);
        }
        sortAndSetSelectedConcepts(selectedConceptsCopy);
        return;
      }
      if (onConceptIdSelect) {
        onConceptIdSelect(concept);
        resetState();
        return;
      }
    },
    [isConceptSet, onConceptIdSelect, resetState, selectedConcepts, sortAndSetSelectedConcepts]
  );

  const toggleDescendantsAndMapped = useCallback(
    (conceptId: number, type: "DESCENDANTS" | "MAPPED") => {
      const selectedConceptsCopy = JSON.parse(
        JSON.stringify(selectedConcepts)
      ) as FhirValueSetExpansionContainsWithExt[];
      selectedConceptsCopy.map((concept) => {
        if (concept.conceptId === conceptId) {
          if (type === "DESCENDANTS") {
            concept.useDescendants = !concept.useDescendants;
          } else if (type === "MAPPED") {
            concept.useMapped = !concept.useMapped;
          }
        }
      });
      sortAndSetSelectedConcepts(selectedConceptsCopy);
    },
    [selectedConcepts, sortAndSetSelectedConcepts]
  );

  const showAddIcon = !!(onConceptIdSelect || isConceptSet);

  useEffect(() => {
    // If new concept set
    if (!conceptSetId) {
      setIsUserConceptSet(true);
    }
  }, [conceptSetId]);

  useEffect(() => {
    if (mode === "CONCEPT_MAPPING" || !conceptsResult?.data) {
      return;
    }
    if (conceptId === null) {
      setShowDetails(false);
    } else {
      setShowDetails(true);
    }
  }, [conceptId, conceptsResult, mode]);

  useEffect(() => {
    if (selectedConceptSetId) {
      setConceptSetId(selectedConceptSetId);
      getConceptSet(selectedConceptSetId);
    }
  }, [getConceptSet, selectedConceptSetId]);

  const onClickClose = useCallback(() => {
    if (!onClose) {
      return;
    }
    const onCloseReturnValues: OnCloseReturnValues = {
      currentConceptSet,
    };
    // Run some callback to make data available to caller app
    // When using drawer, component is no unmounted
    // To return values for non drawer mode, return from useEffect.
    onClose(onCloseReturnValues);
    resetState();
  }, [currentConceptSet, onClose, resetState]);

  if (!activeDatasetId) {
    return null;
  }
  return (
    <WithDrawer onClose={onClickClose} isDrawer={isDrawer} open={open}>
      <div className="terminology__container">
        {isDrawer && (
          <div
            style={{
              height: "40px",
              width: "100%",
              backgroundColor: "#edf2f7",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ color: "#000080", marginLeft: 10, fontWeight: 500 }}>
              {isConceptSet ? getText(i18nKeys.TERMINOLOGY__CONCEPT_SETS) : getText(i18nKeys.TERMINOLOGY__CONCEPTS)}
            </div>

            <div style={{ color: "#000080", marginRight: 10, cursor: "pointer" }} onClick={onClickClose}>
              x
            </div>
          </div>
        )}

        {isConceptSet ? (
          <NameSection
            conceptSetName={conceptSetName}
            setConceptSetName={setConceptSetName}
            conceptSetShared={conceptSetShared}
            setConceptSetShared={setConceptSetShared}
            isUserConceptSet={isUserConceptSet}
            saveConceptSet={saveConceptSet}
            isLoading={isConceptSetLoading}
            conceptSetId={conceptSetId}
            onClickClose={onClickClose}
            errorMsg={errorMsg}
          />
        ) : null}
        <div
          style={{
            height: `calc(100vh - ${searchAndDetailsHeightOffsetPx}px)`,
            padding: "10px",
            paddingLeft: "20px",
            paddingRight: "20px",
          }}
        >
          {isConceptSet ? (
            <TabSection currentTabNo={tab} changeTab={changeTab} selectedConceptsCount={selectedConcepts.length} />
          ) : null}
          <div
            className="terminology__search"
            style={{ height: showDetails ? "65%" : "100%", display: "flex", flexDirection: "column" }}
          >
            {!userId && <div>{getText(i18nKeys.TERMINOLOGY__MISSING_USER_ID)}</div>}
            {userId && (
              <TerminologyList
                userId={userId}
                onConceptClick={setConceptId}
                selectedConceptId={conceptId}
                onSelectConceptId={onSelectConceptId}
                initialInput={initialInput}
                isConceptSet={isConceptSet}
                selectedConcepts={selectedConcepts}
                tab={tab}
                toggleDescendantsAndMapped={toggleDescendantsAndMapped}
                showAddIcon={showAddIcon}
                conceptsResult={conceptsResult}
                setConceptsResult={setConceptsResult}
                datasetId={activeDatasetId}
                isDrawer={isDrawer}
                defaultFilters={defaultFilters}
              />
            )}
          </div>
          <div className="terminology__details" style={{ height: showDetails ? "35%" : "0%" }}>
            {showDetails && conceptId !== null ? (
              <TerminologyDetail
                conceptId={conceptId}
                setConceptId={setConceptId}
                userId={userId}
                datasetId={activeDatasetId}
              />
            ) : null}
          </div>
        </div>
      </div>
    </WithDrawer>
  );
};

export default Terminology;
