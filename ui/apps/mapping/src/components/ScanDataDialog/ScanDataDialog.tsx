import React, { FC, useEffect, useCallback, useMemo, useRef, useState } from "react";
import { Button, Dialog, InputLabel, DialogTitle, TextField, FormGroup, FormControlLabel } from "@mui/material";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Checkbox from "@mui/material/Checkbox";
import { api } from "../../axios/api";
import { ScanDataDBConnectionForm } from "../../types/scanDataDialog";
import { ConnectionErrorDialog } from "../ConnectionErrorDialog/ConnectionErrorDialog";

import "./ScanDataDialog.scss";

export type CloseDialogType = "success" | "cancelled";
interface ScanDataDialogProps {
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
  setScanId: (id: number) => void;
}

const DEFAULT_PORTS = {
  postgresql: 5432,
  mysql: 3306,
  sqlserver: 1433,
  azure: 1433,
  oracle: 1521,
  msaccess: 1521,
  redshift: 5439,
};

const EMPTY_DBCONNECTION_FORM_DATA = {
  dbType: "",
  server: "",
  port: 0,
  database: "",
  user: "",
  password: "",
  schema: "",
};

export const ScanDataDialog: FC<ScanDataDialogProps> = ({ open, onClose, setScanId }) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [dataType, setDataType] = useState("");
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [delimiter, setDelimiter] = useState(",");
  const [dbConnectionForm, setDbConnectionForm] = useState<ScanDataDBConnectionForm>(EMPTY_DBCONNECTION_FORM_DATA);
  const [canConnect, setCanConnect] = useState(false);
  const [connectionErrorDialogVisible, setConnectionErrorDialogVisible] = useState(false);
  const [connectionErrorMessage, setConnectionErrorMesssage] = useState<string>("");
  const hiddenFileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (dataType) {
      setDbConnectionForm((prevForm) => ({
        ...prevForm,
        port: DEFAULT_PORTS[dataType as keyof typeof DEFAULT_PORTS] || 0,
      }));
    }
  }, [dataType]);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  const handleApply = useCallback(async () => {
    try {
      setLoading(true);
      if (dataType === "csv") {
        scanData();
      } else {
        scanDBData();
      }
      handleClose("success");
    } catch (err: any) {
      console.error("err", err);
    } finally {
      setLoading(false);
    }
  }, [selectedTables, dataType]);

  const handleDataTypeChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      handleClear();
      setDataType(event.target.value);
      setDbConnectionForm({ ...dbConnectionForm, dbType: event.target.value });
    },
    [dataType]
  );

  const handleSelectFile = useCallback((_event: any) => {
    hiddenFileInput.current && hiddenFileInput.current.click();
  }, []);

  const handleFileUpload = useCallback((event: any) => {
    const files = Array.from(event.target.files).map((file: any) => file);
    setUploadedFiles(files);
  }, []);

  const handleDelimiterChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setDelimiter(event.target.value as string);
  }, []);

  const handlePostgresFormChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setDbConnectionForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));
  }, []);

  const handleTestConnection = useCallback(async () => {
    try {
      setTestingConnection(true);

      if (dataType === "csv") {
        setAvailableTables(uploadedFiles.map((file) => file.name));
      } else {
        try {
          const res = await api.whiteRabbit.testDBConnection(dbConnectionForm);
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
      setDataType("");
      setSelectedTables([]);
      setAvailableTables([]);
      setUploadedFiles([]);
      setDelimiter(",");
    } else {
      setDbConnectionForm(EMPTY_DBCONNECTION_FORM_DATA);
    }
  }, [dataType]);

  const handleSelectedFile = useCallback((event: React.ChangeEvent<HTMLInputElement>, file: string) => {
    if (event.target.checked) {
      setSelectedTables((prev) => [...prev, file]);
    } else {
      setSelectedTables((prev) => prev.filter((f) => f !== file));
    }
  }, []);

  const handleSelectedFileAll = useCallback(
    (select: boolean) => {
      if (select) {
        const tables = dataType === "csv" ? uploadedFiles.map((file) => file.name) : availableTables;
        setSelectedTables(tables);
      } else {
        setSelectedTables([]);
      }
    },
    [dataType, uploadedFiles, availableTables]
  );

  const checkSelectedFile = useCallback(
    (file: string): boolean | undefined => selectedTables.some((selectedFile) => selectedFile === file),
    [selectedTables]
  );

  const scanData = useCallback(async () => {
    try {
      setLoading(true);
      if (uploadedFiles) {
        const response = await api.whiteRabbit.createScanReport(uploadedFiles, delimiter);
        setScanId(response.id);
      } else {
        console.error("No file was uploaded");
      }
    } catch {
      console.error("Failed to create scan report from CSV");
      setLoading(false);
    }
  }, [uploadedFiles, delimiter]);

  const scanDBData = useCallback(async () => {
    try {
      setLoading(true);
      if (canConnect) {
        const response = await api.whiteRabbit.createDBScanReport(dbConnectionForm, selectedTables);
        setScanId(response.id);
      } else {
        console.error("No connection to the database was established");
      }
    } catch (error) {
      console.error("Failed to create scan report from DB", error);
      setLoading(false);
    }
  }, [dbConnectionForm, selectedTables]);

  const fileNames = useMemo(() => uploadedFiles.map((file) => file.name).join(", "), [uploadedFiles]);

  const isFormValid = (formData: ScanDataDBConnectionForm) => {
    const optionalSchemaDbType = ["mysql", "ms access"];
    return Object.entries(formData)
      .filter(([key]) => key !== "httppath") // Exclude 'httppath'
      .every(([key, value]) => {
        // If dbType is 'mysql', allow 'schema' to be empty
        if (optionalSchemaDbType.includes(formData.dbType) && key === "schema") {
          return true;
        }
        return value !== "" && value !== null && value !== undefined;
      });
  };

  return (
    <Dialog
      className="scan-data-dialog"
      title="Scan Data"
      open={open}
      onClose={() => handleClose("cancelled")}
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
              <FormControl fullWidth variant="standard" className="scan-data-dialog__form-control">
                <InputLabel>Data type</InputLabel>
                <Select value={dataType} label="Data type" onChange={handleDataTypeChange}>
                  <MenuItem value="csv">CSV files</MenuItem>
                  <MenuItem disabled>Fully supported</MenuItem>
                  <MenuItem value="postgresql">PostgreSQL</MenuItem>
                  <MenuItem value="sql server">SQL Server</MenuItem>
                  <MenuItem value="azure">Azure</MenuItem>
                  <MenuItem value="mysql">{"MySQL (CTE not supported prior to v8)"}</MenuItem>
                  {/* Below menuItems are supported with limitation */}
                  <MenuItem disabled>Supported with limitations</MenuItem>
                  <MenuItem value="oracle">Oracle</MenuItem>
                  <MenuItem value="redshift">Redshift</MenuItem>
                  <MenuItem value="ms access">MS Access</MenuItem>
                  <MenuItem value="teradata">Teradata</MenuItem>
                  <MenuItem value="bigquery">BigQuery</MenuItem>
                </Select>
              </FormControl>
              {dataType === "csv" && (
                <>
                  <FormControl fullWidth className="scan-data-dialog__form-control">
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

                  <FormControl fullWidth variant="standard" className="scan-data-dialog__form-control">
                    <TextField
                      label="Delimiter"
                      value={delimiter}
                      onChange={handleDelimiterChange}
                      variant="standard"
                    />
                  </FormControl>
                  <Button onClick={handleClear}>Clear all</Button>
                </>
              )}
              {dataType !== "csv" && (
                <>
                  <FormControl fullWidth variant="standard" className="scan-data-dialog__form-control">
                    <TextField
                      name="server"
                      label="Server Location"
                      value={dbConnectionForm.server}
                      onChange={handlePostgresFormChange}
                      variant="standard"
                    />
                  </FormControl>
                  <FormControl fullWidth variant="standard" className="scan-data-dialog__form-control">
                    <TextField
                      name="port"
                      label="Port"
                      value={dbConnectionForm.port}
                      onChange={handlePostgresFormChange}
                      variant="standard"
                      type="number"
                    />
                  </FormControl>
                  <FormControl fullWidth variant="standard" className="scan-data-dialog__form-control">
                    <TextField
                      name="user"
                      label="User Name"
                      value={dbConnectionForm.user}
                      onChange={handlePostgresFormChange}
                      variant="standard"
                    />
                  </FormControl>
                  <FormControl fullWidth variant="standard" className="scan-data-dialog__form-control">
                    <TextField
                      name="password"
                      label="Password"
                      value={dbConnectionForm.password}
                      onChange={handlePostgresFormChange}
                      variant="standard"
                      type="password"
                    />
                  </FormControl>
                  <FormControl fullWidth variant="standard" className="scan-data-dialog__form-control">
                    <TextField
                      name="database"
                      label="Database Name"
                      value={dbConnectionForm.database}
                      onChange={handlePostgresFormChange}
                      variant="standard"
                    />
                  </FormControl>
                  {dataType !== "mysql" && dataType !== "ms access" && (
                    <FormControl fullWidth variant="standard" className="scan-data-dialog__form-control">
                      <TextField
                        name="schema"
                        label="Schema Name"
                        value={dbConnectionForm.schema}
                        onChange={handlePostgresFormChange}
                        variant="standard"
                      />
                    </FormControl>
                  )}
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
                  disabled={testingConnection || (uploadedFiles.length === 0 && !isFormValid(dbConnectionForm))}
                >
                  {testingConnection ? "Scanning..." : "Scan tables"}
                </Button>
              </div>
            </div>
            {availableTables.length ? (
              <>
                <div className="button-container">
                  <Button onClick={() => handleSelectedFileAll(true)}>Select all</Button>
                  <Button onClick={() => handleSelectedFileAll(false)}>Deselect all</Button>
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
        <Button onClick={() => handleClose("cancelled")} variant="outlined" disabled={loading}>
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
