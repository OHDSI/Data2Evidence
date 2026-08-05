import { FC, useContext } from "react";
import { ConceptMappingContext } from "../Context/ConceptMappingContext";
import { MappingTable } from "../components/MappingTable/MappingTable";
import { MappingDrawer } from "../components/MappingDrawer/MappingDrawer";

interface Step3Props {
  selectedDatasetId: string;
  datasetName?: string;
  dataflowId?: string;
  nodeId?: string;
}

export const Step3ConceptMapping: FC<Step3Props> = ({ selectedDatasetId, datasetName, dataflowId, nodeId }) => {
  const state = useContext(ConceptMappingContext);
  return (
    <div className="concept-mapping__step3">
      <MappingTable
        selectedDatasetId={selectedDatasetId}
        autoPopulate={state.wizard.loadRecommendationByDefault}
        datasetName={datasetName}
        dataflowId={dataflowId}
        nodeId={nodeId}
      />
      <MappingDrawer selectedDatasetId={selectedDatasetId} />
    </div>
  );
};
