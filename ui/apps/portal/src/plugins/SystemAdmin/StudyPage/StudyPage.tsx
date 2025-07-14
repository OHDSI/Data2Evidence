import { Loader, MenuItem, Select, SelectChangeEvent } from "@portal/components";
import { PageProps, SystemAdminPageMetadata } from "@portal/plugin";
import React, { FC, useCallback, useEffect, useState } from "react";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { Typography } from "@mui/material";
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

  if (loadingDatasets) return <Loader />;

  if (error) {
    console.error(error.message);
    return (
      <div className="study-page__error">{getText(i18nKeys.STUDY_PAGE__ERROR_LOADING_DATASETS, [error.message])}</div>
    );
  }

  return (
    <div className="study-page">
      <div className="study-page__header">
        <div className="study-page__dataset-selector">
          <label htmlFor="dataset-select" className="study-page__dataset-label">
            {getText(i18nKeys.STUDY_PAGE__SELECT_DATASET)}
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
              {getText(i18nKeys.STUDY_PAGE__CHOOSE_DATASET)}
            </MenuItem>
            {datasets.map((dataset) => (
              <MenuItem key={dataset.id} value={dataset.id}>
                {dataset.studyDetail?.name || dataset.tokenStudyCode}
              </MenuItem>
            ))}
          </Select>
        </div>
        <FormControlLabel
          control={<Switch />}
          label={<Typography fontWeight={500}>{getText(i18nKeys.STUDY_PAGE__TOGGLE_NETWORK_STUDIES)}</Typography>}
          sx={{ fontWeight: 500 }}
        />
      </div>

      <div className="study-page__content">
        <h2 className="study-page__section-title">{getText(i18nKeys.STUDY_PAGE__STUDY_LIST)}</h2>
        {loadingStudies && <Loader />}
        {studiesError && (
          <div className="study-page__error">
            {getText(i18nKeys.STUDY_PAGE__REPOSITORY_SERVICE_ISSUE, [studiesError])}
          </div>
        )}
        {!loadingStudies && (
          <div className={`study-page__studies ${!selectedDatasetId ? "study-page__studies--disabled" : ""}`}>
            {strategusStudies.length > 0 ? (
              strategusStudies.map((study) => (
                <StudyCard
                  key={study.id}
                  study={study}
                  selectedDatasetId={selectedDatasetId}
                  setFeedback={setFeedback}
                />
              ))
            ) : (
              <div className="study-page__empty-state">
                {studiesError
                  ? getText(i18nKeys.STUDY_PAGE__NO_STUDIES_REPOSITORY_ERROR)
                  : getText(i18nKeys.STUDY_PAGE__NO_STUDIES_FOUND)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
