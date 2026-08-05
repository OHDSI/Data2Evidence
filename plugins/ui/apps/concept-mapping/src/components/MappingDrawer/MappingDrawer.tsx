import React, { FC, useCallback, useContext, useEffect } from "react";
import { ConceptMappingContext, ConceptMappingDispatchContext } from "../../Context/ConceptMappingContext";
import { conceptData, TerminologyProps } from "../../types";
import { DispatchType, ACTION_TYPES } from "../../Context/reducers";

interface MappingDrawerProps {
  selectedDatasetId: string;
}

export const MappingDrawer: FC<MappingDrawerProps> = ({ selectedDatasetId }) => {
  const dispatch: React.Dispatch<DispatchType> = useContext(ConceptMappingDispatchContext);
  const conceptMappingState = useContext(ConceptMappingContext);
  const selectedData = conceptMappingState.selectedData;
  const { sourceCode, sourceName, sourceFrequency, description, domainId } =
    conceptMappingState.columnMapping;

  // get data from terminology
  // passes data to reducer to update list
  const handleTerminologySelect = useCallback(
    (conceptData: conceptData) => {
      dispatch({
        type: ACTION_TYPES.SET_SINGLE_MAPPING,
        payload: {
          conceptId: conceptData.conceptId,
          conceptName: conceptData.conceptName,
          domainId: conceptData.domainId,
          system: conceptData.system,
          validStartDate: conceptData.validStartDate,
          validEndDate: new Date(),
          validity: conceptData.validity === "Valid" ? null : "D",
        },
      });
      dispatch({ type: ACTION_TYPES.CLEAR_SELECTED_DATA });
    },
    [dispatch]
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
