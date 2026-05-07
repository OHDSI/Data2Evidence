import {
  Button,
  Dialog,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  InputLabel,
  TextField,
} from "@mui/material";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ScanDataDBConnectionForm } from "~/features/flow/types";
import { ConnectionErrorDialog } from "../ErrorConnectionDialog";
import {
  useTestDBConnectionMutation,
  useUploadNodeCsvFileMutation,
  useCreateScanReportMutation,
  useCreateDBScanReportMutation,
  useGetDatabasesQuery,
} from "~/features/flow/slices";
import "./ScanDataDialog.scss";

export type CloseDialogType = "success" | "cancelled";

export interface ScanMetadata {
  dataType: string;
  databaseCode?: string;
  schemaName?: string;
  fileName?: string;
  delimiter?: string;
}

interface ScanDataDialogProps {
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
  nodeId: string;
  setScanId: (id: string) => void;
  setScanMetadata: (metadata: ScanMetadata) => void;
}

const EMPTY_DBCONNECTION_FORM_DATA = {
  databaseCode: "",
  schema: "",
};

const DELIMITERS = [
  {
    name: ",",
    value: ",",
  },
  {
    name: ";",
    value: ";",
  },
  {
    name: "|",
    value: "|",
  },
  {
    name: "Tab",
    value: "tab",
  },
  {
    name: "Space",
    value: " ",
  },
];

export const ScanDataDialog: FC<ScanDataDialogProps> = ({
  open,
  onClose,
  nodeId,
  setScanId,
  setScanMetadata,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [dataType, setInternalDataType] = useState("");
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [delimiter, setDelimiter] = useState(DELIMITERS[0].value);
  const [dbConnectionForm, setDbConnectionForm] =
    useState<ScanDataDBConnectionForm>(EMPTY_DBCONNECTION_FORM_DATA);
  const [canConnect, setCanConnect] = useState(false);
  const [connectionErrorDialogVisible, setConnectionErrorDialogVisible] =
    useState(false);
  const [connectionErrorMessage, setConnectionErrorMesssage] =
    useState<string>("");
  const hiddenFileInput = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<number | null>(null);

  const [testDBConnection] = useTestDBConnectionMutation();
  const [uploadNodeCsvFile] = useUploadNodeCsvFileMutation();
  const [createDBScanReport] = useCreateDBScanReportMutation();
  const [createScanReport] = useCreateScanReportMutation();

  const { data: databases = [], isLoading: isLoadingDatabases } =
    useGetDatabasesQuery();

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      typeof onClose === "function" && onClose(type);
    },
    [onClose],
  );

  const handleApply = useCallback(async () => {
    try {
      setLoading(true);
      if (dataType === "csv") {
        await Promise.all(
          uploadedFiles.map((file) => uploadNodeCsvFile({ file, nodeId })),
        );
        await scanData();
        setScanMetadata({
          dataType: "csv",
          fileName: uploadedFiles.map((f) => f.name).join(", "),
          delimiter,
        });
      } else {
        await scanDBData();
        setScanMetadata({
          dataType: "postgresql",
          databaseCode: dbConnectionForm.databaseCode,
          schemaName: dbConnectionForm.schema,
        });
      }
      handleClose("success");
    } catch (err: any) {
      console.error("err", err);
    } finally {
      setLoading(false);
    }
  }, [
    selectedTables,
    dataType,
    uploadedFiles,
    nodeId,
    delimiter,
    dbConnectionForm,
    setScanMetadata,
  ]);

  const handleDataTypeChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      handleClear();
      setInternalDataType(event.target.value);
    },
    [dataType],
  );

  const handleSelectFile = useCallback((_event: any) => {
    hiddenFileInput.current && hiddenFileInput.current.click();
  }, []);

  const handleFileUpload = useCallback((event: any) => {
    const files = Array.from(event.target.files).map((file: any) => file);
    setUploadedFiles(files);
  }, []);

  const handleDelimiterChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      setDelimiter(event.target.value as string);
    },
    [],
  );

  const handleTestConnection = useCallback(async () => {
    try {
      setTestingConnection(true);

      if (dataType === "csv") {
        setAvailableTables(uploadedFiles.map((file) => file.name));
      } else {
        try {
          const res = await testDBConnection({
            connectionDetail: dbConnectionForm,
          }).unwrap();
          if (res.canConnect) {
            setCanConnect(true);
            setAvailableTables(res.tableNames);
          } else {
            setCanConnect(false);
            setConnectionErrorMesssage(res.message);
            setConnectionErrorDialogVisible(true);
            setAvailableTables([]);
          }
        } catch (error: any) {
          console.log("error", error);
          setCanConnect(false);
          setConnectionErrorMesssage(`[${error.status}] ${error.data}`);
          setConnectionErrorDialogVisible(true);
          setAvailableTables([]);
        }
      }
    } finally {
      setTestingConnection(false);
    }
  }, [dbConnectionForm, uploadedFiles, dataType]);

  const handleClear = useCallback(() => {
    if (dataType === "csv") {
      setInternalDataType("");
      setSelectedTables([]);
      setAvailableTables([]);
      setUploadedFiles([]);
      setDelimiter(DELIMITERS[0].value);
    } else {
      setDbConnectionForm(EMPTY_DBCONNECTION_FORM_DATA);
    }
  }, [dataType]);

  const handleSelectedFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>, file: string) => {
      if (event.target.checked) {
        setSelectedTables((prev) => [...prev, file]);
      } else {
        setSelectedTables((prev) => prev.filter((f) => f !== file));
      }
    },
    [],
  );

  const handleSelectedFileAll = useCallback(
    (select: boolean) => {
      if (select) {
        const tables =
          dataType === "csv"
            ? uploadedFiles.map((file) => file.name)
            : availableTables;
        setSelectedTables(tables);
      } else {
        setSelectedTables([]);
      }
    },
    [dataType, uploadedFiles, availableTables],
  );

  const checkSelectedFile = useCallback(
    (file: string): boolean | undefined =>
      selectedTables.some((selectedFile) => selectedFile === file),
    [selectedTables],
  );

  const scanData = useCallback(async () => {
    try {
      setLoading(true);
      if (selectedTables.length > 0) {
        const response = await createScanReport({
          nodeId,
          fileNames: selectedTables,
          delimiter,
        }).unwrap();
        const flowRunId = response.flowRunId;
        setScanId(flowRunId);
      } else {
        console.error("No tables selected");
      }
    } catch (error) {
      console.error("Failed to create scan report from CSV", error);
      setLoading(false);
    }
  }, [selectedTables, delimiter, nodeId]);

  const scanDBData = useCallback(async () => {
    try {
      setLoading(true);
      if (canConnect) {
        const response = await createDBScanReport({
          nodeId,
          postgresqlForm: dbConnectionForm,
          tablesToScan: selectedTables,
        }).unwrap();
        const flowRunId = response.flowRunId;
        setScanId(flowRunId);
      } else {
        console.error("No connection to the database was established");
      }
    } catch (error) {
      console.error("Failed to create scan report from DB", error);
      setLoading(false);
    }
  }, [dbConnectionForm, selectedTables, canConnect]);

  const fileNames = useMemo(
    () => uploadedFiles.map((file) => file.name).join(", "),
    [uploadedFiles],
  );

  const isFormValid = (formData: ScanDataDBConnectionForm) => {
    return formData.databaseCode !== "" && formData.schema !== "";
  };

  return (
    <Dialog
      className="scan-data-dialog"
      title="Scan Data"
      open={open}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Scan Data</DialogTitle>
      <Divider />
      <div className="scan-data-dialog__content">
        <div className="scan-data-dialog__container">
          <div className="container-header">Select Data Location</div>
          <div className="container-content-data">
            <div className="form-container">
              <FormControl
                fullWidth
                variant="standard"
                className="scan-data-dialog__form-control"
              >
                <InputLabel>Data type</InputLabel>
                <Select
                  value={dataType}
                  label="Data type"
                  onChange={handleDataTypeChange}
                >
                  <MenuItem value="csv">CSV files</MenuItem>
                  <MenuItem value="postgresql">PostgreSQL</MenuItem>
                </Select>
              </FormControl>
              {dataType === "csv" && (
                <>
                  <FormControl
                    fullWidth
                    className="scan-data-dialog__form-control"
                  >
                    <TextField
                      fullWidth
                      variant="standard"
                      InputProps={{
                        readOnly: true,
                      }}
                      onClick={handleSelectFile}
                      value={fileNames}
                      label="Upload file"
                    />
                    <input
                      ref={hiddenFileInput}
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      style={{ display: "none" }}
                      id="upload-csv"
                      multiple
                    />
                  </FormControl>

                  <FormControl
                    fullWidth
                    variant="standard"
                    className="scan-data-dialog__form-control"
                  >
                    <InputLabel>Delimiter</InputLabel>
                    <Select
                      value={delimiter}
                      label="Delimiter"
                      onChange={handleDelimiterChange}
                    >
                      {DELIMITERS.map((delimiter) => (
                        <MenuItem key={delimiter.value} value={delimiter.value}>
                          {delimiter.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button onClick={handleClear}>Clear all</Button>
                </>
              )}
              {dataType !== "csv" && dataType !== "" && (
                <>
                  <FormControl
                    fullWidth
                    variant="standard"
                    className="scan-data-dialog__form-control"
                  >
                    <InputLabel>Database</InputLabel>
                    <Select
                      value={dbConnectionForm.databaseCode}
                      onChange={(e: SelectChangeEvent<string>) =>
                        setDbConnectionForm((prev) => ({
                          ...prev,
                          databaseCode: e.target.value,
                        }))
                      }
                      disabled={isLoadingDatabases}
                    >
                      {databases.map((db) => (
                        <MenuItem key={db.code} value={db.code}>
                          {db.code} - {db.dialect}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl
                    fullWidth
                    variant="standard"
                    className="scan-data-dialog__form-control"
                  >
                    <TextField
                      name="schema"
                      label="Schema Name"
                      value={dbConnectionForm.schema}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setDbConnectionForm((prev) => ({
                          ...prev,
                          schema: e.target.value,
                        }))
                      }
                      variant="standard"
                    />
                  </FormControl>
                  <Button onClick={handleClear}>Clear all</Button>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="scan-data-dialog__container">
          <div className="container-header">Table to Scan</div>
          <div className="container-content-scan">
            <div className="button-group-container">
              <div className="button-container">
                <Button
                  onClick={handleTestConnection}
                  variant="outlined"
                  disabled={
                    testingConnection ||
                    (uploadedFiles.length === 0 &&
                      !isFormValid(dbConnectionForm))
                  }
                >
                  {testingConnection ? "Scanning..." : "Scan tables"}
                </Button>
              </div>
            </div>
            {availableTables.length ? (
              <>
                <div className="button-container">
                  <Button onClick={() => handleSelectedFileAll(true)}>
                    Select all
                  </Button>
                  <Button onClick={() => handleSelectedFileAll(false)}>
                    Deselect all
                  </Button>
                </div>
                <FormGroup>
                  {availableTables.map((file) => (
                    <FormControlLabel
                      key={file}
                      control={
                        <Checkbox
                          checked={checkSelectedFile(file)}
                          onChange={(event) => handleSelectedFile(event, file)}
                        />
                      }
                      label={file}
                    />
                  ))}
                </FormGroup>
              </>
            ) : (
              <>No files to scan</>
            )}
          </div>
        </div>
      </div>
      <Divider />
      <div className="button-group-actions">
        <Button
          onClick={() => handleClose("cancelled")}
          variant="outlined"
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleApply}
          variant="contained"
          disabled={selectedTables.length === 0}
          style={{ marginLeft: "20px" }}
        >
          {loading ? "Loading..." : "Apply"}
        </Button>
      </div>
      {connectionErrorDialogVisible && (
        <ConnectionErrorDialog
          open={connectionErrorDialogVisible}
          onClose={() => setConnectionErrorDialogVisible(false)}
          errorMessage={connectionErrorMessage}
        />
      )}
    </Dialog>
  );
};
