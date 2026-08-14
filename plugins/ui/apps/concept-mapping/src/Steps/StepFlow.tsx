import React, { FC, useContext, useEffect, useMemo, useState } from "react";
import { Button } from "@portal/components";
import { ConceptMappingContext, ConceptMappingDispatchContext } from "../Context/ConceptMappingContext";
import { DispatchType, ACTION_TYPES } from "../Context/reducers";
import { useTranslation, useFeedback } from "../hooks";
import { i18nKeys } from "../Context/state";
import { Study } from "../types";
import { SourceNodeDTO } from "../types/source";
import { buildApprovedConceptMappingCsv, downloadFile, DownloadColumn } from "../utils/Export";
import { deriveRowStatus } from "../utils/deriveRowStatus";
import { api } from "../axios/api";
import { NodeSuggestionsRow } from "../axios/concept-mapping-suggestions";
import { Step1Source } from "./Step1Source";
import { Step2ColumnMapping } from "./Step2ColumnMapping";
import { Step3ConceptMapping } from "./Step3ConceptMapping";
import { canProceedStep1, canProceedStep2 } from "./gating";
import "./StepFlow.scss";

interface StepFlowProps {
  sourceNode?: SourceNodeDTO;
  datasets: Study[];
  selectedDatasetId: string;
  datasetName?: string;
  onDisconnectSource?: () => void;
  onSaveAndClose?: () => void;
  dataflowId?: string;
  nodeId?: string;
}

export const StepFlow: FC<StepFlowProps> = ({
  sourceNode,
  datasets,
  selectedDatasetId,
  datasetName,
  onDisconnectSource,
  onSaveAndClose,
  dataflowId,
  nodeId,
}) => {
  const { getText } = useTranslation();
  const { setFeedback } = useFeedback();
  const state = useContext(ConceptMappingContext);
  const dispatch = useContext<React.Dispatch<DispatchType>>(ConceptMappingDispatchContext);
  const step = state.wizard.currentStep;

  // Mirrors the suggestions map MappingTable loads (Task 10), so the CSV download button
  // below can decide whether an approved/unflagged row exists without re-fetching itself.
  const [suggestionsByRowId, setSuggestionsByRowId] = useState<Record<string, NodeSuggestionsRow>>({});

  // Reset atomically with the source/dataset change (no cancelable confirm - a
  // confirm dialog would leave the new source paired with the old, now-stale
  // downstream state if the user dismissed it). When there was downstream work
  // worth clearing, surface a brief non-blocking notice via the feedback Snackbar;
  // stay silent on a no-op population (e.g. first mount) to avoid a spurious toast.
  const handleResetDownstream = () => {
    const hasDownstream = !!state.columnMapping.sourceCode || state.csvData.data.length > 0;
    dispatch({ type: ACTION_TYPES.RESET_DOWNSTREAM });
    if (dataflowId && nodeId) {
      api.conceptMappingSuggestions.clearSuggestions(dataflowId, nodeId).catch(() => undefined);
    }
    if (hasDownstream) {
      setFeedback({
        type: "success",
        message: getText(i18nKeys.STEPS__RESET_CONFIRM_MESSAGE),
        autoClose: 4000,
      });
    }
  };

  const canNext = step === 0 ? canProceedStep1(state) : step === 1 ? canProceedStep2(state) : false;
  const goTo = (n: number) => dispatch({ type: ACTION_TYPES.SET_WIZARD_STEP, payload: n });

  // The back arrow now lives in the flow NodeDrawer header (left of the "Configure Concept
  // Mapping" title), since the plugin can't render into that host chrome. It signals back via
  // a window event; we own the actual step transition here. Re-subscribe on `step` so the
  // handler always steps back from the current step.
  useEffect(() => {
    if (step <= 0) return;
    const onBack = () => goTo(step - 1);
    window.addEventListener("concept-mapping-back", onBack);
    return () => window.removeEventListener("concept-mapping-back", onBack);
  }, [step]);

  // Same column set as the (now removed) MappingTable download button: source columns via
  // the columnMapping accessors, plus the resolved concept fields.
  const { sourceCode, sourceName, sourceFrequency, description } = state.columnMapping;
  const downloadColumns: DownloadColumn[] = [
    { header: getText(i18nKeys.OVERVIEW__SOURCE), accessor: sourceCode },
    { header: getText(i18nKeys.OVERVIEW__NAME), accessor: sourceName },
    { header: getText(i18nKeys.OVERVIEW__FREQUENCY), accessor: sourceFrequency },
    { header: getText(i18nKeys.OVERVIEW__DESCRIPTION), accessor: description },
    { header: getText(i18nKeys.OVERVIEW__CONCEPT_ID), accessor: "conceptId" },
    { header: getText(i18nKeys.OVERVIEW__CONCEPT_NAME), accessor: "conceptName" },
    { header: getText(i18nKeys.OVERVIEW__DOMAIN), accessor: "domainId" },
  ];
  // Approved/flagged status is now derived from the backend suggestions list (see
  // MappingTable), not the local reducer's status/flagged fields - merge the two here so
  // the CSV export keeps filtering on the same, current, source of truth.
  const derivedCsvRows = useMemo(
    () =>
      state.csvData.data.map((row) => {
        const backendRow = row.sourceRowId ? suggestionsByRowId[row.sourceRowId] : undefined;
        const derived = deriveRowStatus({ flagged: backendRow?.flagged, suggestions: backendRow?.suggestions });
        return { ...row, status: derived.status, flagged: derived.flagged };
      }),
    [state.csvData.data, suggestionsByRowId]
  );
  const hasApprovedRows = derivedCsvRows.some((row) => row.status === "approved" && !row.flagged);
  const handleDownloadCsv = () => {
    downloadFile({
      data: buildApprovedConceptMappingCsv(derivedCsvRows, downloadColumns),
      fileName: "concept_mappings",
      fileType: "text/csv",
    });
  };

  // Leaving Step 1 for the first time locks the dataset selection in (see mappingStarted on
  // WizardState) - mapping work from here on depends on the chosen dataset staying fixed.
  const handleNext = () => {
    if (step === 0) {
      dispatch({ type: ACTION_TYPES.SET_MAPPING_STARTED, payload: true });
    }
    goTo(step + 1);
  };

  return (
    <div className="concept-mapping__steps">
      <div className="concept-mapping__steps-body">
        {step === 0 && (
          <Step1Source
            sourceNode={sourceNode}
            datasets={datasets}
            onResetDownstream={handleResetDownstream}
            onDisconnectSource={onDisconnectSource}
          />
        )}
        {step === 1 && <Step2ColumnMapping selectedDatasetId={selectedDatasetId} />}
        {step === 2 && (
          <Step3ConceptMapping
            selectedDatasetId={selectedDatasetId}
            datasetName={datasetName}
            dataflowId={dataflowId}
            nodeId={nodeId}
            onSuggestionsChange={setSuggestionsByRowId}
          />
        )}
      </div>

      <div className="concept-mapping__steps-footer">
        {step < 2 && <Button text={getText(i18nKeys.STEPS__NEXT)} disabled={!canNext} onClick={handleNext} />}
        {step === 2 && (
          <>
            <Button
              text={getText(i18nKeys.STEPS__DOWNLOAD_CSV)}
              variant="outlined"
              disabled={!hasApprovedRows}
              onClick={handleDownloadCsv}
            />
            <Button text={getText(i18nKeys.STEPS__SAVE)} onClick={() => onSaveAndClose?.()} />
          </>
        )}
      </div>
    </div>
  );
};
