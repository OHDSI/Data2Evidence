import React, { FC, useState } from "react";
import { Button } from "@portal/components";
import { TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Typography } from "@mui/material";
import { Study } from "../../../../types";
import { HistoryJob } from "../types";
import { useDialogHelper } from "../../../../hooks/useDialogHelper";
import ResultsDialog from "../ResultsDialog/ResultsDialog";
import "./HistoryTable.scss";
import { useDatasets } from "../../../../hooks";
import { FlowRunJobStateTypes } from "../types";
import { useTranslation } from "../../../../contexts";

const JobStatusColorMapping = {
  // Blue
  [FlowRunJobStateTypes.COMPLETED]: "#050080",
  // Orange
  [FlowRunJobStateTypes.SCHEDULED]: "#FCA130",
  [FlowRunJobStateTypes.PENDING]: "#FCA130",
  [FlowRunJobStateTypes.RUNNING]: "#FCA130",
  [FlowRunJobStateTypes.PAUSED]: "#FCA130",
  // Red
  [FlowRunJobStateTypes.CANCELLING]: "#d53939",
  [FlowRunJobStateTypes.CANCELLED]: "#d53939",
  [FlowRunJobStateTypes.FAILED]: "#d53939",
  [FlowRunJobStateTypes.CRASHED]: "#d53939",
};

const inProgressJobStates = [
  FlowRunJobStateTypes.SCHEDULED as string,
  FlowRunJobStateTypes.PENDING as string,
  FlowRunJobStateTypes.RUNNING as string,
  FlowRunJobStateTypes.PAUSED as string,
];

interface ExpandingRowProps {
  handleStudySelect: (schemaName: string, studyId: string) => void;
  handleViewDetailClick: (job: HistoryJob) => void;
  row: HistoryJob;
  studies: Study[];
  handleCancelJobClick: (id: string) => void;
}

const ExpandingRow: FC<ExpandingRowProps> = ({
  row,
  studies,
  handleViewDetailClick,
  handleStudySelect,
  handleCancelJobClick,
}) => {
  const { getText, i18nKeys } = useTranslation();
  const [statusDetailShowMore, setStatusDetailShowMore] = useState(false);

  const study = studies.find((s) => s.id === row.datasetId);
  return (
    <>
      <TableRow key={row.schemaName + row.type + row.completedAt}>
        <TableCell sx={{ color: "#050080" }} align="left">
          {study?.studyDetail?.name || ""}
        </TableCell>
        <TableCell sx={{ color: "#050080" }} align="left">
          {row.databaseCode}
        </TableCell>
        <TableCell sx={{ color: "#050080" }} align="left">
          {row.schemaName}
        </TableCell>
        <TableCell sx={{ color: "#050080" }} align="left">
          {row.type}
        </TableCell>
        <TableCell sx={{ color: "#050080" }} align="left">
          {row.dataCharacterizationSchema ? row.dataCharacterizationSchema : "-"}
        </TableCell>
        <TableCell sx={{ color: "#050080" }} align="left">
          {row.cohortDefinitionId ? row.cohortDefinitionId : "-"}
        </TableCell>
        <TableCell sx={{ color: "#050080" }} align="left">
          {row.createdAt}
        </TableCell>
        <TableCell sx={{ color: "#050080" }} align="left">
          {row.completedAt}
        </TableCell>
        <TableCell sx={{ color: JobStatusColorMapping[row.status as keyof typeof JobStatusColorMapping] }} align="left">
          {row.status}
        </TableCell>
        <TableCell
          sx={{ color: "#050080" }}
          align="left"
          onClick={() => setStatusDetailShowMore(!statusDetailShowMore)}
        >
          <Typography
            // Set style of status details text based on cell click
            style={
              statusDetailShowMore
                ? {}
                : {
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    display: "block",
                    overflow: "hidden",
                  }
            }
            sx={{
              "&:hover": {
                cursor: "pointer",
              },
            }}
          >
            {row.error === null ? "-" : row.error}
          </Typography>
        </TableCell>
        <TableCell sx={{ color: "#050080" }} align="left">
          {row.status === FlowRunJobStateTypes.COMPLETED ? (
            // If status is COMPLETED, show view detail button
            <Button
              onClick={() => {
                const studyId = row.datasetId ?? (studies.find((s) => s.schemaName === row.schemaName)?.id || "");
                handleStudySelect(row.schemaName, studyId);
                handleViewDetailClick(row);
              }}
              text={getText(i18nKeys.HISTORY_TABLE__VIEW_DETAIL)}
            />
          ) : // If status is "in progress", show abort button
          inProgressJobStates.includes(row.status) ? (
            <Button
              className="cancel-job-button"
              onClick={() => handleCancelJobClick(row.flowRunId)}
              text={getText(i18nKeys.HISTORY_TABLE__CANCEL_JOB)}
              variant="outlined"
            />
          ) : (
            "-"
          )}
        </TableCell>
        <TableCell sx={{ color: "#050080" }} align="left">
          {row.comment ?? ""}
        </TableCell>
      </TableRow>
    </>
  );
};

interface HistoryTableProps {
  handleStudySelect: (schemaName: string, studyId: string) => void;
  data: HistoryJob[];
  handleCancelJobClick: (id: string) => void;
}

const HistoryTable: FC<HistoryTableProps> = ({ data, handleStudySelect, handleCancelJobClick }) => {
  const { getText, i18nKeys } = useTranslation();
  const datasets = useDatasets("systemAdmin")[0];
  // Dialog show hooks
  const [showResultsDialog, openResultsDialog, closeResultsDialog] = useDialogHelper(false);
  const [selectedJob, setSelectedJob] = useState<HistoryJob | null>(null);
  const handleViewDetailClick = (job: HistoryJob) => {
    setSelectedJob(job);
    openResultsDialog();
  };

  if (data.length === 0) {
    return <div className="info__section">{getText(i18nKeys.HISTORY_TABLE__NO_JOBS)}</div>;
  }

  return (
    <>
      <TableContainer className="history__list">
        <Table sx={{ minWidth: 700 }} aria-label="spanning table">
          <TableHead>
            <TableRow>
              <TableCell align="left" colSpan={1}>
                {getText(i18nKeys.HISTORY_TABLE__STUDY)}
              </TableCell>
              <TableCell align="left" colSpan={1}>
                {getText(i18nKeys.HISTORY_TABLE__DATABASE)}
              </TableCell>
              <TableCell align="left" colSpan={1}>
                {getText(i18nKeys.HISTORY_TABLE__SCHEMA)}
              </TableCell>
              <TableCell align="left" colSpan={1}>
                {getText(i18nKeys.HISTORY_TABLE__TYPE)}
              </TableCell>
              <TableCell align="left" colSpan={1}>
                {getText(i18nKeys.HISTORY_TABLE__DC_SCHEMA)}
              </TableCell>
              <TableCell align="left" colSpan={1}>
                {getText(i18nKeys.HISTORY_TABLE__COHORT_DEFINITION_ID)}
              </TableCell>
              <TableCell align="left" colSpan={1}>
                {getText(i18nKeys.HISTORY_TABLE__CREATED_TIME)}
              </TableCell>
              <TableCell align="left" colSpan={1}>
                {getText(i18nKeys.HISTORY_TABLE__COMPLETED_TIME)}
              </TableCell>
              <TableCell align="left" colSpan={1}>
                {getText(i18nKeys.HISTORY_TABLE__STATUS)}
              </TableCell>
              <TableCell align="left" colSpan={1}>
                {getText(i18nKeys.HISTORY_TABLE__STATUS_DETAIL)}
              </TableCell>
              <TableCell align="left" colSpan={1}>
                {getText(i18nKeys.HISTORY_TABLE__ACTION)}
              </TableCell>
              <TableCell align="left" colSpan={1}>
                {getText(i18nKeys.HISTORY_TABLE__COMMENT)}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => (
              <ExpandingRow
                key={row.flowRunId}
                row={row}
                studies={datasets}
                handleStudySelect={handleStudySelect}
                handleViewDetailClick={handleViewDetailClick}
                handleCancelJobClick={handleCancelJobClick}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {selectedJob !== null && (
        <ResultsDialog job={selectedJob} open={showResultsDialog} onClose={closeResultsDialog} />
      )}
    </>
  );
};

export default HistoryTable;
