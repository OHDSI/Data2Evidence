import { FC, useCallback, useContext, useState } from "react";
import { ConceptMappingContext } from "../Context/ConceptMappingContext";
import { MappingTable } from "../components/MappingTable/MappingTable";
import { MappingDrawer } from "../components/MappingDrawer/MappingDrawer";
import { NodeSuggestionsRow } from "../axios/concept-mapping-suggestions";

interface Step3Props {
  selectedDatasetId: string;
  datasetName?: string;
  dataflowId?: string;
  nodeId?: string;
  // Forwarded from StepFlow, which needs the latest suggestions map to decide whether the
  // CSV download button should be enabled (Task 10).
  onSuggestionsChange?: (suggestionsByRowId: Record<string, NodeSuggestionsRow>) => void;
}

export const Step3ConceptMapping: FC<Step3Props> = ({
  selectedDatasetId,
  datasetName,
  dataflowId,
  nodeId,
  onSuggestionsChange,
}) => {
  const state = useContext(ConceptMappingContext);
  // MappingTable owns/fetches the suggestions map itself; MappingDrawer only writes to the
  // backend (via addSuggestion), so it has no direct way to tell MappingTable to refetch.
  // Bumping this shared counter is that signal.
  const [refreshSignal, setRefreshSignal] = useState(0);
  const bumpRefreshSignal = useCallback(() => setRefreshSignal((signal) => signal + 1), []);

  return (
    <div className="concept-mapping__step3">
      <MappingTable
        selectedDatasetId={selectedDatasetId}
        autoPopulate={state.wizard.loadRecommendationByDefault}
        datasetName={datasetName}
        dataflowId={dataflowId}
        nodeId={nodeId}
        refreshSignal={refreshSignal}
        onSuggestionsChange={onSuggestionsChange}
      />
      <MappingDrawer
        selectedDatasetId={selectedDatasetId}
        dataflowId={dataflowId}
        nodeId={nodeId}
        onSuggestionAdded={bumpRefreshSignal}
      />
    </div>
  );
};
