import React, { FC, useCallback, useContext, useEffect } from "react";
import { ConceptMappingContext, ConceptMappingDispatchContext } from "../../Context/ConceptMappingContext";
import { TerminologyProps } from "../../types";
import { DispatchType, ACTION_TYPES } from "../../Context/reducers";
import { api } from "../../axios/api";
import { ConceptInput } from "../../axios/concept-mapping-suggestions";

interface MappingDrawerProps {
  selectedDatasetId: string;
  dataflowId?: string;
  nodeId?: string;
  // Called after a suggestion has been persisted, so a sibling MappingTable (which owns its
  // own suggestions fetch) knows to refetch.
  onSuggestionAdded?: () => void;
}

export const MappingDrawer: FC<MappingDrawerProps> = ({ selectedDatasetId, dataflowId, nodeId, onSuggestionAdded }) => {
  const dispatch: React.Dispatch<DispatchType> = useContext(ConceptMappingDispatchContext);
  const conceptMappingState = useContext(ConceptMappingContext);
  const selectedData = conceptMappingState.selectedData;
  const { sourceCode, sourceName, sourceFrequency, description, domainId } =
    conceptMappingState.columnMapping;

  // A concept was picked in the terminology drawer: persist it as a suggestion on the
  // backend (rather than writing straight into the local reducer, as before) so other users
  // see it too, then close the drawer. The concept columns on the row itself are still only
  // filled client-side by Recommend (see MappingTable) - Suggest only affects Status.
  const handleTerminologySelect = useCallback(
    (concept: ConceptInput) => {
      const sourceRowId = selectedData.sourceRowId;
      if (dataflowId && nodeId && sourceRowId) {
        api.conceptMappingSuggestions
          .addSuggestion(dataflowId, nodeId, sourceRowId, {
            conceptId: concept.conceptId,
            conceptName: concept.conceptName,
            conceptCode: concept.conceptCode,
            domainId: concept.domainId,
            vocabularyId: concept.vocabularyId,
          })
          .then(() => onSuggestionAdded?.());
      }
      dispatch({ type: ACTION_TYPES.CLEAR_SELECTED_DATA });
    },
    [dataflowId, nodeId, selectedData, dispatch, onSuggestionAdded]
  );

  const getDefaultFilters = useCallback(() => {
    if (domainId) {
      return [
        { id: "concept", value: ["Standard"] },
        { id: "domainId", value: [domainId] },
      ];
    } else {
      return [{ id: "concept", value: ["Standard"] }];
    }
  }, [domainId]);

  useEffect(() => {
    if (Object.keys(selectedData).length > 0) {
      const event = new CustomEvent<{ props: TerminologyProps }>("alp-terminology-open", {
        detail: {
          props: {
            onConceptIdSelect: handleTerminologySelect,
            onClose: () => dispatch({ type: ACTION_TYPES.CLEAR_SELECTED_DATA }),
            initialInput: selectedData[sourceName],
            mode: "CONCEPT_MAPPING",
            selectedDatasetId: selectedDatasetId,
            defaultFilters: getDefaultFilters(),
            sourceRow: {
              code: selectedData[sourceCode],
              name: selectedData[sourceName],
              frequency: selectedData[sourceFrequency],
              description: selectedData[description],
              status: selectedData.status,
            },
          },
        },
      });
      window.dispatchEvent(event);
    }
  }, [
    selectedData,
    sourceCode,
    sourceName,
    sourceFrequency,
    description,
    dispatch,
    handleTerminologySelect,
    selectedDatasetId,
    getDefaultFilters,
  ]);

  return null;
};
