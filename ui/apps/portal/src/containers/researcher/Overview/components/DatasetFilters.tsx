import React, { ChangeEvent, FC, useCallback, useEffect, useMemo, useState } from "react";
import { Box, Checkbox } from "@portal/components";
import { AutocompleteOption, FilterAutocomplete } from "./FilterAutocomplete";
import { FilterNumberRange } from "./FilterNumberRange";
import { FilterNumberSlider } from "./FilterNumberSlider";
import { useDatasetFilterScopes } from "../../../../hooks";
import "./DatasetFilters.scss";
import { useTranslation } from "../../../../contexts";

interface DatasetFiltersProps {
  onChange?: (filters: Record<string, string>) => void;
}

interface NumberRange {
  from: number;
  to: number;
}

interface FormData {
  domains: AutocompleteOption[];
  age?: NumberRange;
  observationYear?: NumberRange;
  cumulativeObservationMonths?: number;
}

const EMPTY_FORM_DATA: FormData = {
  domains: [],
  age: { from: 0, to: 0 },
  observationYear: { from: 1990, to: 2021 },
  cumulativeObservationMonths: 10,
};

export const DatasetFilters: FC<DatasetFiltersProps> = ({ onChange }) => {
  const { getText, i18nKeys } = useTranslation();
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM_DATA);
  const [filterByAge, setFilterByAge] = useState(false);
  const [filterByObsYear, setFilterByObsYear] = useState(false);
  const [filterByCumulativeObsMths, setFilterByCumulativeObsMths] = useState(false);
  const [filterScopes] = useDatasetFilterScopes();
  const domainOptions = useMemo(() => mapRecordToOptions(filterScopes?.domains || {}), [filterScopes]);

  useEffect(() => {
    setFormData({
      ...EMPTY_FORM_DATA,
      age: { from: filterScopes?.age.min || 0, to: filterScopes?.age.max || 0 },
      observationYear: { from: filterScopes?.observationYear.min || 0, to: filterScopes?.observationYear.max || 0 },
      cumulativeObservationMonths: filterScopes?.cumulativeObservationMonths.min || 0,
    });
  }, [filterScopes]);

  const raiseChangeEvent = useCallback(
    (formData: FormData) => {
      if (typeof onChange !== "function") return;

      const { domains, age, observationYear, cumulativeObservationMonths } = formData;
      const filters: Record<string, string> = {};

      if (domains && domains.length > 0) {
        filters["domains"] = domains.map((d) => d.id).join(",");
      }

      if (filterByAge) {
        if (age && typeof age.from === "number" && typeof age.to === "number") {
          filters["age[gte]"] = age.from.toString();
          filters["age[lte]"] = age.to.toString();
        }
      }

      if (filterByObsYear) {
        if (observationYear && typeof observationYear.from === "number" && typeof observationYear.to === "number") {
          filters["obsYr[gte]"] = observationYear.from.toString();
          filters["obsYr[lte]"] = observationYear.to.toString();
        }
      }

      if (filterByCumulativeObsMths) {
        if (typeof cumulativeObservationMonths === "number") {
          filters["minObsMth"] = cumulativeObservationMonths.toString();
        }
      }

      onChange(filters);
    },
    [onChange, filterByAge, filterByObsYear, filterByCumulativeObsMths]
  );

  useEffect(() => raiseChangeEvent(formData), [formData, raiseChangeEvent]);

  const handleFormDataChange = useCallback(
    (updates: { [field: string]: any }) => {
      setFormData((formData) => {
        const updated = { ...formData, ...updates };
        raiseChangeEvent(updated);
        return updated;
      });
    },
    [raiseChangeEvent]
  );

  return (
    <div className="dataset-filters">
      <div className="dataset-filter">
        <div className="dataset-filter__header">{getText(i18nKeys.DATASET_FILTERS__DOMAIN_REQUIREMENT)}</div>
        <div className="dataset-filter__body">
          <FilterAutocomplete
            options={domainOptions}
            value={formData.domains}
            placeholder={getText(i18nKeys.DATASET_FILTERS__SELECT_REQUIREMENT)}
            onChange={(_event: any, domains: AutocompleteOption[]) => handleFormDataChange({ domains })}
          />
        </div>
      </div>
      <div className="dataset-filter">
        <div className="dataset-filter__header">{getText(i18nKeys.DATASET_FILTERS__RANGE_REQUIREMENT)}</div>
        <div className="dataset-filter__body">
          <span className="dataset-filter__description">
            {getText(i18nKeys.DATASET_FILTERS__SELECT_APPLICABLE_FILTERS)}:
          </span>
          <Box display="flex" flexDirection="column" gap={1}>
            <Checkbox
              checked={filterByAge}
              label={getText(i18nKeys.DATASET_FILTERS__AGE_RANGE)}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setFilterByAge(event.target.checked);
              }}
            />
            <FilterNumberRange
              label={getText(i18nKeys.DATASET_FILTERS__ENTER_RANGE)}
              min={filterScopes?.age.min}
              max={filterScopes?.age.max}
              from={formData.age?.from || 0}
              to={formData.age?.to || 0}
              onChange={(from: number, to: number) => {
                setFilterByAge(true);
                handleFormDataChange({ age: { from, to } });
              }}
            />
            <Checkbox
              checked={filterByObsYear}
              label={getText(i18nKeys.DATASET_FILTERS__OBSERVATION_YEAR_RANGE)}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setFilterByObsYear(event.target.checked);
              }}
            />
            <FilterNumberRange
              label={getText(i18nKeys.DATASET_FILTERS__YEAR_RANGE)}
              min={filterScopes?.observationYear.min}
              max={filterScopes?.observationYear.max}
              from={formData.observationYear?.from || 0}
              to={formData.observationYear?.to || 0}
              onChange={(from: number, to: number) => {
                setFilterByObsYear(true);
                handleFormDataChange({ observationYear: { from, to } });
              }}
            />
            <Checkbox
              checked={filterByCumulativeObsMths}
              label={getText(i18nKeys.DATASET_FILTERS__MIN_CUMULATIVE_OBSERVATION)}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setFilterByCumulativeObsMths(event.target.checked);
              }}
            />
            <FilterNumberSlider
              label={`${getText(i18nKeys.DATASET_FILTERS__MIN_CUMULATIVE_OBSERVATION)}:`}
              min={filterScopes?.cumulativeObservationMonths.min}
              max={filterScopes?.cumulativeObservationMonths.max}
              value={formData.cumulativeObservationMonths || 0}
              onChange={(cumulativeObservationMonths: number) => {
                setFilterByCumulativeObsMths(true);
                handleFormDataChange({ cumulativeObservationMonths });
              }}
            />
          </Box>
        </div>
      </div>
    </div>
  );
};

const mapRecordToOptions = (record: Record<string, string>): AutocompleteOption[] =>
  Object.keys(record).map((d) => ({ id: d, label: record[d] } as AutocompleteOption));
