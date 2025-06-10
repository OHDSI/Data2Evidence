import { Loader, MenuItem, Select, SelectChangeEvent } from "@portal/components";
import { PageProps, SystemAdminPageMetadata } from "@portal/plugin";
import React, { FC, useCallback, useMemo, useState } from "react";
import { useTranslation } from "../../../contexts";
import { useDataset, useDatasets } from "../../../hooks";
import { Study } from "../../../types";
import { StudyCard } from "./StudyCard";
import "./StudyPage.scss";

interface StudyPageProps extends PageProps<SystemAdminPageMetadata> {}

export const StudyPage: FC<StudyPageProps> = ({ metadata }) => {
  const { getText, i18nKeys } = useTranslation();
  const [datasets, loadingDatasets, error] = useDatasets("systemAdmin");
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");

  const [selectedDataset] = useDataset(selectedDatasetId);

  const handleDatasetChange = useCallback((event: SelectChangeEvent) => {
    setSelectedDatasetId(event.target.value);
  }, []);

  const studies = useMemo(() => {
    if (!selectedDataset) return [];

    const baseStudy = selectedDataset;
    return [
      {
        ...baseStudy,
        id: `${baseStudy.id}-study-a`,
        studyDetail: {
          ...baseStudy.studyDetail,
          name: "Study A",
          summary:
            "This demo dataset contains 5% the Data Entrepreneurs' Synthetic Public Use File (DE-SynPUF) based on deidentified metadata from the Center's for Medicare & Medicaid Services (CMS) claims data.",
        },
      },
      {
        ...baseStudy,
        id: `${baseStudy.id}-study-b`,
        studyDetail: {
          ...baseStudy.studyDetail,
          name: "Study B",
          summary:
            "This demo dataset contains 5% the Data Entrepreneurs' Synthetic Public Use File (DE-SynPUF) based on deidentified metadata from the Center's for Medicare & Medicaid Services (CMS) claims data.",
        },
      },
      {
        ...baseStudy,
        id: `${baseStudy.id}-study-c`,
        studyDetail: {
          ...baseStudy.studyDetail,
          name: "Study C",
          summary:
            "This demo dataset contains 5% the Data Entrepreneurs' Synthetic Public Use File (DE-SynPUF) based on deidentified metadata from the Center's for Medicare & Medicaid Services (CMS) claims data.",
        },
      },
      {
        ...baseStudy,
        id: `${baseStudy.id}-study-d`,
        studyDetail: {
          ...baseStudy.studyDetail,
          name: "Study D",
          summary:
            "This demo dataset contains 5% the Data Entrepreneurs' Synthetic Public Use File (DE-SynPUF) based on deidentified metadata from the Center's for Medicare & Medicaid Services (CMS) claims data.",
        },
      },
    ] as Study[]; // TODO: Fix the type here
  }, [selectedDataset]);

  const handleRunStudy = useCallback((study: Study) => {
    console.log("Running study:", study.studyDetail?.name);
  }, []);

  const handleDownloadResults = useCallback((study: Study) => {
    console.log("Downloading results for study:", study.studyDetail?.name);
  }, []);

  const handleUserResults = useCallback((study: Study) => {
    console.log("Viewing user results for study:", study.studyDetail?.name);
  }, []);

  const handleShareResults = useCallback((study: Study) => {
    console.log("Sharing results for study:", study.studyDetail?.name);
  }, []);

  if (loadingDatasets) return <Loader />;

  if (error) {
    console.error(error.message);
    return <div className="study-page__error">Error loading datasets: {error.message}</div>;
  }

  return (
    <div className="study-page">
      <div className="study-page__header">
        <div className="study-page__dataset-selector">
          <label htmlFor="dataset-select" className="study-page__dataset-label">
            Select a dataset:
          </label>
          <Select
            id="dataset-select"
            className="study-page__dataset-select"
            variant="outlined"
            value={selectedDatasetId}
            onChange={handleDatasetChange}
            displayEmpty
            sx={{
              minWidth: "200px",
              "& .MuiSelect-select": {
                padding: "8px 14px",
              },
            }}
          >
            <MenuItem value="" disabled>
              Choose a dataset
            </MenuItem>
            {datasets.map((dataset) => (
              <MenuItem key={dataset.id} value={dataset.id}>
                {dataset.studyDetail?.name || dataset.tokenStudyCode}
              </MenuItem>
            ))}
          </Select>
        </div>
      </div>

      <div className="study-page__content">
        {selectedDatasetId && (
          <>
            <h2 className="study-page__section-title">Study list</h2>
            <div className="study-page__studies">
              {studies.map((study) => (
                <StudyCard
                  key={study.id}
                  study={study}
                  onRunStudy={handleRunStudy}
                  onDownloadResults={handleDownloadResults}
                  onUserResults={handleUserResults}
                  onShareResults={handleShareResults}
                />
              ))}
            </div>
          </>
        )}

        {!selectedDatasetId && <div className="study-page__empty-state">Please select a dataset to view studies</div>}
      </div>
    </div>
  );
};
