import React, { ChangeEvent, FC, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { NodeProps } from "reactflow";
import { Box, TextInput, Checkbox } from "@portal/components";
import { useFormData } from "~/features/flow/hooks";
import {
  markStatusAsDraft,
  selectNodeById,
  setNode,
} from "~/features/flow/reducers";
import { NodeState } from "~/features/flow/types";
import { RootState, dispatch } from "~/store";
import { NodeDrawer, NodeDrawerProps } from "../../NodeDrawer/NodeDrawer";
import { NodeChoiceMap } from "..";
import { CohortDiagnosticsNodeData } from "./CohortDiagnosticsNode";

export interface CohortIncidentDrawerProps
  extends Omit<NodeDrawerProps, "children"> {
  node: NodeProps<CohortDiagnosticsNodeData>;
  onClose: () => void;
}

interface FormData extends CohortDiagnosticsNodeData {}

const EMPTY_FORM_DATA: FormData = {
  name: "",
  description: "",
  runInclusionStatistics: true,
  runIncludedSourceConcepts: true,
  runOrphanConcepts: true,
  runTimeSeries: false,
  runVisistContext: true,
  runBreakdownIndexEvents: true,
  runIncidenceRate: true,
  runCohortRelationship: true,
  runTemporalCohortCharacterization: true,
  incremental: false,
};

export const CohortDiagnosticsDrawer: FC<CohortIncidentDrawerProps> = ({
  node,
  onClose,
  ...props
}) => {
  const { formData, setFormData, onFormDataChange } =
    useFormData<FormData>(EMPTY_FORM_DATA);
  const nodeState = useSelector((state: RootState) =>
    selectNodeById(state, node.id)
  );
  const selectBoxConfig = [
    {
      label: "RunInclusionStatistics",
      value: formData.runInclusionStatistics,
      onChange: (value: boolean) =>
        onFormDataChange({ runInclusionStatistics: value }),
    },
    {
      label: "RunIncludedSourceConcepts",
      value: formData.runIncludedSourceConcepts,
      onChange: (value: boolean) =>
        onFormDataChange({ runIncludedSourceConcepts: value }),
    },
    {
      label: "RunOrphanConcepts",
      value: formData.runOrphanConcepts,
      onChange: (value: boolean) =>
        onFormDataChange({ runOrphanConcepts: value }),
    },
    {
      label: "RunTimeSeries",
      value: formData.runTimeSeries,
      onChange: (value: boolean) => onFormDataChange({ runTimeSeries: value }),
    },
    {
      label: "RunVisistContext",
      value: formData.runVisistContext,
      onChange: (value: boolean) =>
        onFormDataChange({ runVisistContext: value }),
    },
    {
      label: "RunBreakdownIndexEvents",
      value: formData.runBreakdownIndexEvents,
      onChange: (value: boolean) =>
        onFormDataChange({ runBreakdownIndexEvents: value }),
    },
    {
      label: "RunIncidenceRate",
      value: formData.runIncidenceRate,
      onChange: (value: boolean) =>
        onFormDataChange({ runIncidenceRate: value }),
    },
    {
      label: "RunCohortRelationship",
      value: formData.runCohortRelationship,
      onChange: (value: boolean) =>
        onFormDataChange({ runCohortRelationship: value }),
    },
    {
      label: "RunTemporalCohortCharacterization",
      value: formData.runTemporalCohortCharacterization,
      onChange: (value: boolean) =>
        onFormDataChange({ runTemporalCohortCharacterization: value }),
    },
    {
      label: "Incremental",
      value: formData.incremental,
      onChange: (value: boolean) => onFormDataChange({ incremental: value }),
    },
  ];

  useEffect(() => {
    if (node.data) {
      setFormData({
        name: node.data.name,
        description: node.data.description,
        runInclusionStatistics: node.data.runInclusionStatistics,
        runIncludedSourceConcepts: node.data.runIncludedSourceConcepts,
        runOrphanConcepts: node.data.runOrphanConcepts,
        runTimeSeries: node.data.runTimeSeries,
        runVisistContext: node.data.runVisistContext,
        runBreakdownIndexEvents: node.data.runBreakdownIndexEvents,
        runIncidenceRate: node.data.runIncidenceRate,
        runCohortRelationship: node.data.runCohortRelationship,
        runTemporalCohortCharacterization:
          node.data.runTemporalCohortCharacterization,
        incremental: node.data.incremental,
      });
    } else {
      setFormData({
        ...EMPTY_FORM_DATA,
        ...NodeChoiceMap["cohort_diagnostics_node"].defaultData,
      });
    }
  }, [node.data]);

  const handleOk = useCallback(() => {
    const updated: NodeState<CohortDiagnosticsNodeData> = {
      ...nodeState,
      data: formData,
    };
    dispatch(setNode(updated));
    dispatch(markStatusAsDraft());

    typeof onClose === "function" && onClose();
  }, [formData]);

  const renderSelectBox = useCallback(
    (label: string, value: boolean, onChange: (value: boolean) => void) => (
      <Box mb={4}>
        <Checkbox
          checked={value}
          label={label}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange(e.target.checked)
          }
        />
      </Box>
    ),
    []
  );

  return (
    <NodeDrawer {...props} onOk={handleOk} onClose={onClose} width="500px">
      <Box mb={4}>
        <TextInput
          label="Name"
          value={formData.name}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ name: e.target.value })
          }
        />
      </Box>
      <Box mb={4}>
        <TextInput
          label="Description"
          value={formData.description}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onFormDataChange({ description: e.target.value })
          }
        />
      </Box>
      {selectBoxConfig.map(({ label, value, onChange }) =>
        renderSelectBox(label, value, onChange)
      )}
    </NodeDrawer>
  );
};
