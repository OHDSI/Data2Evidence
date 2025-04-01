import React, { FC, useCallback, useContext, useState, useEffect, SetStateAction } from "react";
import {
  TableContainer,
  TablePagination,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  Box,
  Divider,
  FormHelperText,
  Paper,
} from "@mui/material";
import { Button, Dialog, TablePaginationActions } from "@portal/components";
import { Feedback, CloseDialogType } from "../../../../types";
import { useTranslation } from "../../../../contexts";
import { i18nKeys } from "../../../../contexts/app-context/states";
import { ConceptMappingContext } from "../Context/ConceptMappingContext";
import { conceptMap } from "../types";
import { api } from "../axios/api";
import StringToBinary from "../../../../utils/mri/StringToBinary";
import "./ExportDialog.scss";

interface ExportDialogProps {
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  selectedDatasetId: string;
}

interface FormData {
  source_vocabulary_id: string;
}

interface FormError {
  source_vocabulary_id: {
    required: boolean;
  };
}
const EMPTY_FORM_ERROR: FormError = {
  source_vocabulary_id: { required: false },
};

const EMPTY_FORM_DATA: FormData = { source_vocabulary_id: "" };

const columns = [
  "Source Code",
  "Source Code Description",
  "Target Concept Id",
  "Target Vocabulary Id",
  // "Valid Start Date",
  // "Valid End Date",
];

const ExportDialog: FC<ExportDialogProps> = ({ open, onClose, loading, setLoading, selectedDatasetId }) => {
  const conceptMappingState = useContext(ConceptMappingContext);
  const { getText } = useTranslation();

  const [formData, setFormData] = useState<FormData>(EMPTY_FORM_DATA);
  const [formError, setFormError] = useState<FormError>(EMPTY_FORM_ERROR);
  const [feedback, setFeedback] = useState<Feedback>({});
  const { sourceCode, description } = conceptMappingState.columnMapping;

  const isFormError = useCallback(() => {
    const { source_vocabulary_id } = formData;
    let formError: FormError | {} = {};

    if (!source_vocabulary_id) {
      formError = { ...formError, source_vocabulary_id: { required: true } };
    }

    if (Object.keys(formError).length > 0) {
      setFormError({ ...EMPTY_FORM_ERROR, ...(formError as FormError) });
      return true;
    }

    return false;
  }, [formData]);

  const tableData: conceptMap[] = conceptMappingState.csvData.data
    .filter((data) => data.status === "checked")
    .map((data) => {
      return {
        source_code: data[sourceCode],
        source_concept_id: 0,
        source_code_description: data[description],
        target_concept_id: data.conceptId,
        target_vocabulary_id: data.system,
        valid_start_date: data.validStartDate,
        valid_end_date: data.validEndDate,
        invalid_reason: data.validity,
      };
    });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPageData, setCurrentPageData] = useState([]);
  const tableDataCount: number = tableData.length;
  const handleChangePage = useCallback((event: React.MouseEvent<HTMLButtonElement> | null, page: number) => {
    setPage(page);
  }, []);
  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(Number(event.target.value) || 10);
    setPage(0);
  }, []);

  useEffect(() => {
    setCurrentPageData(
      tableData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage) as SetStateAction<Array<never>>
    );
  }, [page, rowsPerPage]);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      typeof onClose === "function" && onClose(type);
      setFeedback({});
      setFormData(EMPTY_FORM_DATA);
      setFormError(EMPTY_FORM_ERROR);
    },
    [onClose, setFeedback, setFormData, setFormError]
  );

  const handleSubmit = useCallback(async () => {
    if (isFormError()) {
      return;
    }

    setFormError(EMPTY_FORM_ERROR);

    if (!selectedDatasetId) {
      return;
    }

    const { source_vocabulary_id } = formData;
    try {
      setLoading(true);
      await api.ConceptMapping.saveConceptMappings(
        selectedDatasetId,
        source_vocabulary_id,
        StringToBinary(JSON.stringify(tableData))
      );
      handleClose("success");
    } catch (error: any) {
      setFeedback({
        type: "error",
        message: `${error.data?.message || error.data}`,
      });
      console.error("error", error.data);
    } finally {
      setLoading(false);
    }
  }, [setFormError, formData, selectedDatasetId, setLoading, tableData, isFormError, handleClose]);

  return (
    <Dialog
      className="export-dialog"
      fullWidth
      maxWidth="lg"
      title={getText(i18nKeys.EXPORT_MAPPING_DIALOG__TITLE)}
      open={open}
      closable
      onClose={() => handleClose("cancelled")}
      feedback={feedback}
    >
      <div className="export-dialog__content">
        <div className="export-dialog__table">
          <TableContainer
            component={Paper}
            sx={{ "& .MuiTableCell-root": { color: "#000080" }, maxHeight: 320, width: 1, border: "1px solid #dad7d7" }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {columns.map((name: string, index: React.Key) => (
                    <TableCell key={index}>{name}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              {tableData.length === 0 ? (
                <TableCell colSpan={4} align="center">
                  {getText(i18nKeys.EXPORT_MAPPING_DIALOG__NO_DATA)}
                </TableCell>
              ) : (
                <TableBody>
                  {currentPageData.map((dataRow: conceptMap, index: React.Key) => (
                    <TableRow
                      key={index}
                      sx={{
                        "&:nth-of-type(even)": {
                          backgroundColor: "#f8f8f8",
                        },
                      }}
                    >
                      <TableCell>{dataRow.source_code}</TableCell>
                      <TableCell>{dataRow.source_code_description}</TableCell>
                      <TableCell>{dataRow.target_concept_id}</TableCell>
                      <TableCell>{dataRow.target_vocabulary_id}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              )}
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={tableDataCount}
            page={page}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            onPageChange={handleChangePage}
            ActionsComponent={TablePaginationActions}
            sx={{
              overflow: "visible",
              height: "52px",
              "& .MuiButtonBase-root:not(.Mui-disabled)": { color: "#000080" },
            }}
          />
        </div>
        <div className="export-dialog__form">
          <Box mt={4} fontWeight="bold">
            {getText(i18nKeys.EXPORT_MAPPING_DIALOG__FORM_TITLE)}
          </Box>
          <Box mb={4}>
            <TextField
              fullWidth
              variant="standard"
              label={getText(i18nKeys.EXPORT_MAPPING_DIALOG__SOURCE_VOCABULARY_ID)}
              value={formData.source_vocabulary_id}
              onChange={(event) =>
                setFormData((formData) => ({ ...formData, source_vocabulary_id: event.target.value }))
              }
              helperText={getText(i18nKeys.EXPORT_MAPPING_DIALOG__HELPER_TEXT)}
              error={formError.source_vocabulary_id.required}
            />
            {formError.source_vocabulary_id.required && (
              <FormHelperText error={true}>{getText(i18nKeys.EXPORT_MAPPING_DIALOG__REQUIRED)}</FormHelperText>
            )}
          </Box>
        </div>
      </div>
      <Divider />
      <div className="button-group-actions">
        <Button text={"cancel"} onClick={() => handleClose("cancelled")} variant="outlined" block disabled={loading} />
        <Button
          text={"save"}
          onClick={handleSubmit}
          block
          loading={loading}
          disabled={tableData.length === 0 || loading}
        />
      </div>
    </Dialog>
  );
};

export default ExportDialog;
