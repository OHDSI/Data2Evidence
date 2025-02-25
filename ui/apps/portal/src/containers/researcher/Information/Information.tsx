import React, { FC, useState, useCallback, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableHead from "@mui/material/TableHead";
import TableContainer from "@mui/material/TableContainer";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import {
  Button,
  Card,
  Loader,
  TableCell,
  TableRow,
  SubTitle,
  IconButton,
  DownloadIcon,
  Title,
} from "@portal/components";
import { StudyAttribute, StudyTag, DatasetResource } from "../../../types";
import { useActiveDataset, useFeedback, useTranslation, useUser } from "../../../contexts";
import { useDatasetResources, useDataset, useDatasetReleases } from "../../../hooks";
import { DQDJobResults } from "../../../plugins/SystemAdmin/DQD/DQDJobResults/DQDJobResults";
import DataQualityHistory from "./DataQualityHistory/DataQualityHistory";
import { Roles } from "../../../config";
import { saveBlobAs } from "../../../utils";
import { api } from "../../../axios/api";
import { DQD_TABLE_TYPES } from "../../../plugins/SystemAdmin/DQD/types";
import { i18nKeys } from "../../../contexts/app-context/states";
import "./Information.scss";

enum Access {
  None,
  Pending,
  Approved,
}

enum DatasetInfoTab {
  DatasetInfo = "info",
  DataQuality = "quality",
  DataCharacterization = "characterization",
  History = "history",
  Dashboard = "dashboard",
}

interface StudyAccessRequest {
  id: string;
  userId: string;
  studyId: string;
  role: string;
}

export const Information: FC = () => {
  const { getText } = useTranslation();
  const { setFeedback } = useFeedback();
  const [requestLoading, setRequestLoading] = useState(false);

  const { user } = useUser();

  const { activeDataset } = useActiveDataset();
  const activeDatasetId = activeDataset.id;
  const activeReleaseId = activeDataset.releaseId;

  const [tabValue, setTabValue] = useState(DatasetInfoTab.DatasetInfo);
  const [downloading, setDownloading] = useState<string>();
  const [accessRequests, setAccessRequests] = useState<StudyAccessRequest[]>([]);

  const [dataset, loading, error] = useDataset(activeDatasetId);
  const [resources, resourcesLoading, resourcesError] = useDatasetResources(activeDatasetId);
  const [releases] = useDatasetReleases(activeDatasetId);

  const attributes = useMemo(() => dataset?.attributes || [], [dataset]);
  const tags = useMemo(() => dataset?.tags || [], [dataset]);

  const loadAccessRequests = useCallback(async (): Promise<void> => {
    const accessRequests = await api.userMgmt.getMyStudyAccessRequests();
    setAccessRequests(accessRequests);
  }, []);

  useEffect(() => {
    loadAccessRequests();
  }, [loadAccessRequests]);

  useEffect(() => {
    setTabValue(DatasetInfoTab.DatasetInfo);
    window.scrollTo(0, 0);
  }, []);

  const handleTabSelectionChange = useCallback(async (event: React.SyntheticEvent, newValue: DatasetInfoTab) => {
    setTabValue(newValue);
  }, []);

  const handleDownloadResource = useCallback(
    async (resource: DatasetResource) => {
      try {
        setDownloading(resource.name);
        const blob = await api.systemPortal.downloadResource(activeDatasetId, resource.name);
        saveBlobAs(blob, resource.name);
      } finally {
        setDownloading(undefined);
      }
    },
    [activeDatasetId]
  );

  const handleRequestAccess = useCallback(async () => {
    if (activeDatasetId && user?.userId) {
      try {
        setRequestLoading(true);
        await api.userMgmt.addStudyAccessRequest(user.userId, activeDatasetId, Roles.STUDY_RESEARCHER);
        loadAccessRequests();

        setFeedback({
          type: "success",
          message: getText(i18nKeys.INFORMATION__FEEDBACK_MESSAGE),
          autoClose: 6000,
        });
      } catch (e) {
        setFeedback({
          type: "error",
          message: getText(i18nKeys.INFORMATION__FEEDBACK_ERROR_MESSAGE),
          description: getText(i18nKeys.INFORMATION__FEEDBACK_ERROR_DESCRIPTION),
        });
      } finally {
        setRequestLoading(false);
      }
    }
  }, [activeDatasetId, user, getText, loadAccessRequests, setFeedback]);

  const getAccess = useCallback(() => {
    if (user.isDatasetResearcher[activeDatasetId]) {
      return Access.Approved;
    } else if (accessRequests?.some((req) => req.role === Roles.STUDY_RESEARCHER && req.studyId === activeDatasetId)) {
      return Access.Pending;
    }
    return Access.None;
  }, [activeDatasetId, user, accessRequests]);

  if (error || resourcesError) console.error(error?.message || resourcesError?.message);
  if (loading || resourcesLoading) return <Loader />;

  return (
    <Card
      className="information__container"
      title={
        <Tabs value={tabValue} onChange={handleTabSelectionChange}>
          <Tab
            disableRipple
            sx={{
              "&.MuiTab-root": {
                width: "200px",
              },
              marginRight: "8px",
            }}
            label={getText(i18nKeys.INFORMATION__TAB_DATASET_INFO)}
            id="tab-0"
            value="info"
          />
          <Tab
            disableRipple
            sx={{
              "&.MuiTab-root": {
                width: "200px",
              },
            }}
            label={getText(i18nKeys.INFORMATION__TAB_DATA_QUALITY)}
            id="tab-1"
            value="quality"
          />
          <Tab
            disableRipple
            sx={{
              "&.MuiTab-root": {
                width: "200px",
              },
            }}
            label={getText(i18nKeys.INFORMATION__TAB_DATA_CHARACTERIZATION)}
            id="tab-2"
            value="characterization"
          />
          {releases.length !== 0 && (
            <Tab
              disableRipple
              sx={{
                "&.MuiTab-root": {
                  width: "200px",
                },
              }}
              label={getText(i18nKeys.INFORMATION__TAB_HISTORY)}
              id="tab-4"
              value="history"
            />
          )}
        </Tabs>
      }
    >
      <div className="tab__content">
        <div className="tab__content__container">
          <Title>{dataset?.studyDetail?.name || getText(i18nKeys.INFORMATION__UNTITLED)}</Title>
          {tabValue === DatasetInfoTab.DatasetInfo && (
            <div className="dataset__info">
              <ReactMarkdown>
                {dataset?.studyDetail?.description || getText(i18nKeys.INFORMATION__NO_DATASET_DESCRIPTION)}
              </ReactMarkdown>
              <div className="metadata_tags_files__container">
                {(tags.length > 0 || attributes.length > 0) && (
                  <div className="metadata_tags__container">
                    {tags.length > 0 && (
                      <>
                        <div className="tags__content">
                          <SubTitle>{getText(i18nKeys.INFORMATION__TAGS)}</SubTitle>
                          <Paper component="ul" className="tag__list" elevation={0}>
                            {tags.map((tag: StudyTag) => (
                              <li key={tag.name}>
                                <Chip label={tag.name} />
                              </li>
                            ))}
                          </Paper>
                        </div>
                      </>
                    )}
                    {attributes.length > 0 && (
                      <>
                        <div className="metadata__content">
                          <SubTitle>{getText(i18nKeys.INFORMATION__METADATA)}</SubTitle>
                          <TableContainer className="study-metadata">
                            <Table>
                              <colgroup>
                                <col style={{ width: "40%" }} />
                                <col style={{ width: "60%" }} />
                              </colgroup>
                              <TableHead>
                                <TableRow>
                                  <TableCell>{getText(i18nKeys.INFORMATION__RESOURCE_TYPE)}</TableCell>
                                  <TableCell>{getText(i18nKeys.INFORMATION__DATASET)}</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {attributes.map((studyAttribute: StudyAttribute) => (
                                  <TableRow key={studyAttribute.attributeId}>
                                    <TableCell>{studyAttribute.attributeConfig.name}</TableCell>
                                    <TableCell>{studyAttribute.value}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {resources.length > 0 && (
                  <div className="files__container">
                    <SubTitle>{getText(i18nKeys.INFORMATION__FILES)}</SubTitle>
                    <TableContainer>
                      <Table>
                        <colgroup>
                          <col />
                          <col style={{ width: 140 }} />
                          <col style={{ width: 150 }} />
                        </colgroup>
                        <TableHead>
                          <TableRow>
                            <TableCell>{getText(i18nKeys.INFORMATION__FILENAME)}</TableCell>
                            <TableCell>{getText(i18nKeys.INFORMATION__SIZE)}</TableCell>
                            <TableCell>{getText(i18nKeys.INFORMATION__DOWNLOAD_FILE)}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(!resources || resources.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={4} align="center">
                                {getText(i18nKeys.INFORMATION__NO_FILE_AVAILABLE)}
                              </TableCell>
                            </TableRow>
                          )}
                          {resources.map((res) => (
                            <TableRow key={res.name}>
                              <TableCell style={{ color: "#000e7e" }}>{res.name}</TableCell>
                              <TableCell style={{ color: "#000e7e" }}>{res.size}</TableCell>
                              <TableCell>
                                <IconButton
                                  startIcon={<DownloadIcon />}
                                  title={getText(i18nKeys.INFORMATION__DOWNLOAD)}
                                  onClick={() => handleDownloadResource(res)}
                                  loading={downloading === res.name}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </div>
                )}
              </div>

              {dataset?.studyDetail?.showRequestAccess && [Access.None, Access.Pending].includes(getAccess()) && (
                <>
                  <div className="tab__content__subtitle">{getText(i18nKeys.INFORMATION__REQUEST_ACCESS)}</div>
                  {getAccess() === Access.None && (
                    <Button
                      text={getText(i18nKeys.INFORMATION__REQUEST_ACCESS)}
                      className="button__request"
                      loading={requestLoading}
                      onClick={handleRequestAccess}
                    />
                  )}
                  {getAccess() === Access.Pending && (
                    <Button
                      text={getText(i18nKeys.INFORMATION__PENDING_APPROVAL)}
                      className="button__request"
                      disabled
                    />
                  )}
                </>
              )}
            </div>
          )}
          {tabValue === DatasetInfoTab.DataCharacterization && (
            <>
              {!dataset?.schemaName ? (
                <div className="info__section">
                  <div>{getText(i18nKeys.INFORMATION__SCHEMA_NAME_UNDEFINED)}</div>
                </div>
              ) : (
                <DQDJobResults
                  datasetId={activeDatasetId}
                  datasetName={dataset?.schemaName}
                  tableType={DQD_TABLE_TYPES.DATA_CHARACTERIZATION}
                />
              )}
            </>
          )}
          {tabValue === DatasetInfoTab.DataQuality && (
            <>
              {!dataset?.schemaName ? (
                <div className="info__section">
                  <div>{getText(i18nKeys.INFORMATION__DATABASE_NAME_UNDEFINED)}</div>
                </div>
              ) : (
                <>
                  <SubTitle>{getText(i18nKeys.INFORMATION__OVERVIEW)}</SubTitle>
                  <DQDJobResults
                    datasetId={activeDatasetId}
                    datasetName={dataset?.schemaName}
                    tableType={DQD_TABLE_TYPES.DATA_QUALITY_OVERVIEW}
                    activeReleaseId={activeReleaseId}
                  />
                  <SubTitle>{getText(i18nKeys.INFORMATION__RESULTS)}</SubTitle>
                  <DQDJobResults
                    datasetId={activeDatasetId}
                    datasetName={dataset?.schemaName}
                    tableType={DQD_TABLE_TYPES.DATA_QUALITY_RESULTS}
                    activeReleaseId={activeReleaseId}
                  />
                </>
              )}
            </>
          )}
          {tabValue === DatasetInfoTab.History && <DataQualityHistory activeDatasetId={activeDatasetId} />}
        </div>
      </div>
    </Card>
  );
};
