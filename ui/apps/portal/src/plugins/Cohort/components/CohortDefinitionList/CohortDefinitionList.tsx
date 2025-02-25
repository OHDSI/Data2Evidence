import React, { FC, useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableHead from "@mui/material/TableHead";
import TableContainer from "@mui/material/TableContainer";
import TablePagination from "@mui/material/TablePagination";
import { Button, Loader, TableCell, TableRow, TablePaginationActions } from "@portal/components";
import { useFeedback, useTranslation, useActiveDataset } from "../../../../contexts";
import { CohortMapping } from "../../../../types";
import { CohortMgmt } from "../../../../axios/cohort-mgmt";
import "./CohortDefinitionList.scss";

import DataQualityDialog from "../DataQualityDialog/DataQualityDialog";
import { useDialogHelper } from "../../../../hooks";
import { i18nKeys } from "../../../../contexts/app-context/states";

interface CohortDefinitionListProps {
  userId?: string;
  cohortMgmtClient: CohortMgmt;
  refetch: boolean;
  setRefetch: React.Dispatch<React.SetStateAction<boolean>>;
}

dayjs.extend(customParseFormat);

const CohortDefinitionList: FC<CohortDefinitionListProps> = ({ userId, cohortMgmtClient, refetch, setRefetch }) => {
  const { getText } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<CohortMapping[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowPerPage] = useState(10);
  const { setFeedback } = useFeedback();

  const [activeCohort, setActiveCohort] = useState<CohortMapping>();
  const [showDataQualityDialog, openDataQualityDialog, closeDataQualityDialog] = useDialogHelper(false);

  const { activeDataset } = useActiveDataset();

  useEffect(() => {
    setIsLoading(true);
    const fetchData = async () => {
      if (userId) {
        try {
          const result = await cohortMgmtClient.getCohorts();
          setData(result.data);
        } catch (err) {
          setFeedback({
            type: "error",
            message: getText(i18nKeys.COHORT_DEFINITION_LIST__ERROR_OCCURRED),
            description: getText(i18nKeys.COHORT_DEFINITION_LIST__TRY_AGAIN),
          });
        } finally {
          setIsLoading(false);
          setRefetch(false);
        }
      }
    };
    fetchData();
  }, [userId, cohortMgmtClient, refetch, setRefetch, setFeedback, page, rowsPerPage, getText]);

  const handleChangePage = useCallback((event: React.MouseEvent<HTMLButtonElement> | null, page: number) => {
    setPage(page);
  }, []);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowPerPage(Number(event.target.value) || 10);
  }, []);

  const handleDataQualityButtonPress = useCallback(
    (cohort: CohortMapping) => {
      setActiveCohort(cohort);
      openDataQualityDialog();
    },
    [openDataQualityDialog, setActiveCohort]
  );

  if (isLoading) return <Loader />;

  const isEmpty = !data || data.length === 0;
  return (
    <>
      <div className="cohort__list">
        <div className="cohort__list-header"></div>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{getText(i18nKeys.COHORT_DEFINITION_LIST__ID)}</TableCell>
                <TableCell>{getText(i18nKeys.COHORT_DEFINITION_LIST__NAME)}</TableCell>
                <TableCell>{getText(i18nKeys.COHORT_DEFINITION_LIST__DESCRIPTION)}</TableCell>
                <TableCell>{getText(i18nKeys.COHORT_DEFINITION_LIST__PATIENT_COUNT)}</TableCell>
                <TableCell>{getText(i18nKeys.COHORT_DEFINITION_LIST__CREATION_TIMESTAMP)}</TableCell>
                <TableCell>{getText(i18nKeys.COHORT_DEFINITION_LIST__JOBS)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(isLoading || isEmpty) && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    {!isLoading && isEmpty && "No data available"}
                    {isLoading && <Loader />}
                  </TableCell>
                </TableRow>
              )}
              {data.length > 0 &&
                data.map((cohort) => (
                  <TableRow key={cohort.id}>
                    <TableCell>{cohort.id}</TableCell>
                    <TableCell>{cohort.name}</TableCell>
                    <TableCell>{cohort.description}</TableCell>
                    <TableCell>{cohort.patientIds.length}</TableCell>
                    <TableCell>
                      {cohort.creationTimestamp && dayjs(cohort.creationTimestamp).format("DD/MM/YYYY")}
                    </TableCell>
                    <TableCell className="col-action">
                      <Button
                        onClick={() => handleDataQualityButtonPress(cohort)}
                        text={getText(i18nKeys.JOBS__DATA_QUALITY_ANALYSIS)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={Object.keys(data).length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          ActionsComponent={TablePaginationActions}
        />
      </div>

      {showDataQualityDialog && activeCohort && (
        <DataQualityDialog
          datasetId={activeDataset.id}
          cohort={activeCohort}
          open={showDataQualityDialog}
          onClose={closeDataQualityDialog}
        />
      )}
    </>
  );
};

export default CohortDefinitionList;
