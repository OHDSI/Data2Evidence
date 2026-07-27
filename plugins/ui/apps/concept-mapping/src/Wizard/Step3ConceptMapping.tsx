import { FC, useContext } from "react";
import { ConceptMappingContext } from "../Context/ConceptMappingContext";
import { MappingTable } from "../components/MappingTable/MappingTable";
import { MappingDrawer } from "../components/MappingDrawer/MappingDrawer";

interface Step3Props {
  selectedDatasetId: string;
}

export const Step3ConceptMapping: FC<Step3Props> = ({ selectedDatasetId }) => {
  const state = useContext(ConceptMappingContext);
  return (
    <div className="concept-mapping__step3">
      <MappingTable
        selectedDatasetId={selectedDatasetId}
        autoPopulate={state.wizard.loadRecommendationByDefault}
      />
      <MappingDrawer selectedDatasetId={selectedDatasetId} />
    </div>
  );
};
