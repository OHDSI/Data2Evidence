import { Loader, MenuItem, Select, SelectChangeEvent } from "@portal/components";
import { PageProps, SystemAdminPageMetadata } from "@portal/plugin";
import React, { FC, useCallback, useEffect, useState } from "react";
import { api } from "../../../axios/api";
import { useFeedback, useTranslation } from "../../../contexts";
import { useDatasets } from "../../../hooks";
import { StrategusStudy } from "../../../types";
import { StudyCard } from "./StudyCard";
import "./StudyPage.scss";

interface StudyPageProps extends PageProps<SystemAdminPageMetadata> {}

interface StrategusStudiesData {
  [studyId: string]: StrategusStudy;
}

export const StudyPage: FC<StudyPageProps> = () => {
  // TODO: Add translation
  const { getText, i18nKeys } = useTranslation();
  const { setFeedback } = useFeedback();
  const [datasets, loadingDatasets, error] = useDatasets("systemAdmin");
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [strategusStudies, setStrategusStudies] = useState<StrategusStudy[]>([]);
  const [loadingStudies, setLoadingStudies] = useState<boolean>(false);
  const [studiesError, setStudiesError] = useState<string | null>(null);

  const handleDatasetChange = useCallback((event: SelectChangeEvent) => {
    setSelectedDatasetId(event.target.value);
  }, []);

  useEffect(() => {
    const fetchStudies = async () => {
      setLoadingStudies(true);
      setStudiesError(null);

      try {
        const studiesData = (await api.systemPortal.getStudiesFromRepo()) as StrategusStudiesData;
        const convertedStudies: StrategusStudy[] = Object.entries(studiesData).map(
          ([studyId, strategusStudy]: [string, StrategusStudy]) => ({
            ...strategusStudy,
            id: studyId,
            name: strategusStudy.name || studyId,
          })
        );

        setStrategusStudies(convertedStudies);
      } catch (error) {
        console.error("Error fetching studies from repository:", error);
        setStudiesError("Failed to fetch studies from repository");
        setStrategusStudies([]);
      } finally {
        setLoadingStudies(false);
      }
    };

    fetchStudies();
  }, [setFeedback]);

  const handleDownloadResults = useCallback((study: StrategusStudy) => {
    console.log("Downloading results for study:", study.name || study.id);
  }, []);

  const handleShareResults = useCallback((study: StrategusStudy) => {
    console.log("Sharing results for study:", study.name || study.id);
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
        <h2 className="study-page__section-title">Study list</h2>
        {loadingStudies && <Loader />}
        {studiesError && <div className="study-page__error">Repository service issue: {studiesError}</div>}
        {!loadingStudies && (
          <div className={`study-page__studies ${!selectedDatasetId ? "study-page__studies--disabled" : ""}`}>
            {strategusStudies.length > 0 ? (
              strategusStudies.map((study) => (
                <StudyCard
                  key={study.id}
                  study={study}
                  selectedDatasetId={selectedDatasetId}
                  setFeedback={setFeedback}
                  onDownloadResults={handleDownloadResults}
                  onShareResults={handleShareResults}
                />
              ))
            ) : (
              <div className="study-page__empty-state">
                {studiesError ? "No studies available due to repository error" : "No studies found in repository"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
