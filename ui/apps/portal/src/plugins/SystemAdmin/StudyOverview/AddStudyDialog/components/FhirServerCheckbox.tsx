import React, { FC, ChangeEvent } from "react";
import { useTranslation } from "../../../../../contexts";
import { FeatureGate, FEATURE_FHIR_SERVER } from "../../../../../config";
import { i18nKeys } from "../../../../../contexts/app-context/states";
import { Checkbox } from "@portal/components";

interface FhirServerCheckboxProps {
  checked: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export const FhirServerCheckbox: FC<FhirServerCheckboxProps> = ({ checked, onChange }) => {
  const { getText } = useTranslation();
  return (
    <FeatureGate featureFlags={[FEATURE_FHIR_SERVER]}>
      <div>
        <Checkbox
          checked={checked}
          checkbox-id="create-fhir-server"
          label={getText(i18nKeys.ADD_STUDY_DIALOG__CREATE_FHIR)}
          onChange={onChange}
        />
      </div>
    </FeatureGate>
  );
};
