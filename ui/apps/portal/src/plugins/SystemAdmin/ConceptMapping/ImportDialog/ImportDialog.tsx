import React, { FC, useCallback, useContext, useState, useEffect, ChangeEvent, SetStateAction } from "react";
import { Button, Dialog, TablePaginationActions, Checkbox } from "@portal/components";
import {
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Paper,
  Divider,
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from "@mui/material";

import { CloseDialogType } from "../../../../types";
import { ConceptMappingContext, ConceptMappingDispatchContext } from "../Context/ConceptMappingContext";
import { DispatchType, ACTION_TYPES } from "../Context/reducers/reducer";
import "./ImportDialog.scss";
import { useTranslation } from "../../../../contexts";
import { api } from "../axios/api";

interface ImportDialogProps {
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  selectedDatasetId: string;
}

interface ColumnMappingState {
  sourceCode: string;
  sourceName: string;
  sourceFrequency: string;
  description: string;
  domainId?: string;
}

const ImportDialog: FC<ImportDialogProps> = ({ open, onClose, selectedDatasetId, loading, setLoading }) => {
  const { getText, i18nKeys } = useTranslation();
  const conceptMappingState = useContext(ConceptMappingContext);
  const dispatch: React.Dispatch<DispatchType> = useContext(ConceptMappingDispatchContext);
  const [columnMappingState, setColumnMappingState] = useState<ColumnMappingState>({
    sourceCode: "",
    sourceName: "",
    sourceFrequency: "",
    description: "",
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPageData, setCurrentPageData] = useState([]);
  const [showDomainMapping, setShowDomainMapping] = useState(false);
  const [domainFilterOptions, setDomainFilterOptions] = useState<string[]>([]);
  const importDataCount: number = conceptMappingState.importData.data.length;

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  const handleCancel = useCallback(
    (type: CloseDialogType) => {
      typeof onClose === "function" && onClose(type);
      dispatch({ type: ACTION_TYPES.CLEAR_IMPORT_DATA });
    },
    [onClose, dispatch]
  );

  const handleColumnMappingChange = useCallback(
    (event: SelectChangeEvent<any>, type: string) => {
      setColumnMappingState({ ...columnMappingState, [type]: event.target.value });
    },
    [columnMappingState]
  );

  const handleChangePage = useCallback((event: React.MouseEvent<HTMLButtonElement> | null, page: number) => {
    setPage(page);
  }, []);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(Number(event.target.value) || 10);
    setPage(0);
  }, []);

  const handleToggleDomainMapping = useCallback(
    (checked: boolean) => {
      setShowDomainMapping(checked);
      if (checked) {
        setColumnMappingState({ ...columnMappingState, domainId: "" });
      } else {
        const { domainId, ...newColumnMappingState } = columnMappingState;
        setColumnMappingState(newColumnMappingState);
      }
    },
    [columnMappingState]
  );

  const handleImport = useCallback(() => {
    dispatch({ type: ACTION_TYPES.SET_COLUMN_MAPPING, payload: columnMappingState });
    dispatch({ type: ACTION_TYPES.SET_INITAL_DATA, payload: conceptMappingState.importData });
    dispatch({ type: ACTION_TYPES.CLEAR_IMPORT_DATA });
    typeof onClose === "function" && onClose("success");
  }, [columnMappingState, dispatch, onClose, conceptMappingState.importData]);

  const titleString = `Import file - ${conceptMappingState.importData.name}`;

  useEffect(() => {
    const initalColumn: string = conceptMappingState?.importData?.columns?.[0] ?? "";
    setColumnMappingState({
      sourceCode: initalColumn,
      sourceName: initalColumn,
      sourceFrequency: initalColumn,
      description: initalColumn,
    });
  }, [conceptMappingState.importData.columns]);

  useEffect(() => {
    setCurrentPageData(
      conceptMappingState.importData.data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage) as SetStateAction<
        Array<never>
      >
    );
  }, [page, rowsPerPage, conceptMappingState.importData.data]);

  const getDomainFilterOptions = useCallback(async () => {
    try {
      const filterOptions = await api.Terminology.getAllFilterOptions(selectedDatasetId);
      const domainFilterOptions = Object.keys(filterOptions.filterOptions.domainId);
      setDomainFilterOptions(domainFilterOptions);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    if (showDomainMapping) {
      getDomainFilterOptions();
    }
  }, [showDomainMapping, getDomainFilterOptions]);

  return (
    <Dialog fullWidth maxWidth="lg" title={titleString} open={open} closable onClose={() => handleClose("cancelled")}>
      <Divider></Divider>
      <div className="import-dialog__container">
        <div className="import-dialog__table">
          <TableContainer
            component={Paper}
            sx={{ "& .MuiTableCell-root": { color: "#000080" }, maxHeight: 320, width: 1, border: "1px solid #dad7d7" }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {conceptMappingState.importData?.columns?.map((data: any, index: React.Key) => (
                    <TableCell key={index}>{data}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {currentPageData.map((dataRow: any, index: React.Key) => (
                  <TableRow
                    key={index}
                    sx={{
                      "&:nth-of-type(even)": {
                        backgroundColor: "#f8f8f8",
                      },
                    }}
                  >
                    {Object.values(dataRow).map((data: any) => (
                      <TableCell key={data}>{data}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={importDataCount}
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
        <Divider />

        <div className="import-dialog-selection__container">
          <div className="import-dialog-selection__columns">
            <div className="import-dialog-selection__header">
              <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                {getText(i18nKeys.IMPORT_DIALOG__COLUMN_MAPPING)}
              </Typography>
            </div>
            <div className="import-dialog-selection__checkbox">
              <Checkbox
                checked={showDomainMapping}
                label={getText(i18nKeys.IMPORT_DIALOG__SHOW_SOURCE_DOMAIN_COLUMN)}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  handleToggleDomainMapping(event.target.checked);
                }}
              />
            </div>
            <FormControl component="fieldset" className="import-dialog__selector">
              <Typography minWidth={200}>{getText(i18nKeys.IMPORT_DIALOG__SOURCE_CODE_COLUMN)}</Typography>
              <Select
                value={columnMappingState.sourceCode}
                onChange={(e) => handleColumnMappingChange(e, "sourceCode")}
                fullWidth
              >
                {conceptMappingState.importData?.columns?.map((d: any) => (
                  <MenuItem value={d} key={d}>
                    {d}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl component="fieldset" className="import-dialog__selector">
              <Typography minWidth={200}>{getText(i18nKeys.IMPORT_DIALOG__SOURCE_CODE_NAME)}</Typography>
              <Select
                value={columnMappingState.sourceName}
                onChange={(e) => handleColumnMappingChange(e, "sourceName")}
                fullWidth
              >
                {conceptMappingState.importData?.columns?.map((d: any) => (
                  <MenuItem value={d} key={d}>
                    {d}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl component="fieldset" className="import-dialog__selector">
              <Typography minWidth={200}>{getText(i18nKeys.IMPORT_DIALOG__SOURCE_FREQUENCY_COLUMN)}</Typography>
              <Select
                value={columnMappingState.sourceFrequency}
                onChange={(e) => handleColumnMappingChange(e, "sourceFrequency")}
                fullWidth
              >
                {conceptMappingState.importData?.columns?.map((d: any) => (
                  <MenuItem value={d} key={d}>
                    {d}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl component="fieldset" className="import-dialog__selector">
              <Typography minWidth={200}>{getText(i18nKeys.IMPORT_DIALOG__ADDITIONAL_INFO_COLUMN)}</Typography>
              <Select
                value={columnMappingState.description}
                onChange={(e) => handleColumnMappingChange(e, "description")}
                fullWidth
              >
                {conceptMappingState.importData?.columns?.map((d: any) => (
                  <MenuItem value={d} key={d}>
                    {d}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {showDomainMapping && (
              <FormControl component="fieldset" className="import-dialog__selector">
                <Typography minWidth={200}>{getText(i18nKeys.IMPORT_DIALOG__SOURCE_DOMAIN_COLUMN)}</Typography>
                <Select
                  value={columnMappingState.domainId}
                  onChange={(e) => handleColumnMappingChange(e, "domainId")}
                  fullWidth
                >
                  {domainFilterOptions.map((option: string) => (
                    <MenuItem value={option} key={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </div>

          {/* <div className="import-dialog-selection__filters">
            <div className="import-dialog-selection__header">
              <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                Filters
              </Typography>
            </div>
          </div> */}
        </div>
      </div>
      <Divider />
      <div className="import-dialog-selection__buttons">
        <Button
          text={getText(i18nKeys.IMPORT_DIALOG__CANCEL)}
          onClick={() => handleCancel("cancelled")}
          variant="outlined"
        />
        <Button text={getText(i18nKeys.IMPORT_DIALOG__IMPORT)} onClick={handleImport} />
      </div>
    </Dialog>
  );
};

export default ImportDialog;
