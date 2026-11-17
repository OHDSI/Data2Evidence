import { FC, useEffect, useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DoNotDisturbAltOutlinedIcon from "@mui/icons-material/DoNotDisturbAltOutlined";
import AddTaskOutlinedIcon from "@mui/icons-material/AddTaskOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import {
  Dialog,
  Button,
  IconButton,
  Alert,
  Tooltip,
  TextField,
  Select,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "ui-react";
import { DatasetAttributeConfig, Feedback } from "../../../../types";
import { useTranslation } from "../../../../contexts";
import { api } from "../../../../axios/api";
import "./ManageMetadataDialog.scss";

export interface ImportEntry {
  id: string;
  name?: string;
  value: string;
}

interface ImportRow {
  rowId: string;
  attributeId: string;
  fileName: string;
  value: string;
  excluded: boolean;
}

const NEW_ATTR_CATEGORY = "DATASET";
const NEW_ATTR_DATATYPE = "STRING";

interface CreateAttributeDialogProps {
  open: boolean;
  initialName: string;
  attributeId: string;
  busy?: boolean;
  errorMessage?: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

const CreateAttributeDialog: FC<CreateAttributeDialogProps> = ({
  open,
  initialName,
  attributeId,
  busy,
  errorMessage,
  onClose,
  onSubmit,
}) => {
  const { getText, i18nKeys } = useTranslation();
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (open) setName(initialName);
  }, [open, initialName]);

  const canSubmit = !!name.trim();

  return (
    <Dialog
      title={getText(i18nKeys.MANAGE_METADATA_DIALOG__CREATE_ATTR_TITLE)}
      size="s"
      open={open}
      busy={busy}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {getText(i18nKeys.MANAGE_METADATA_DIALOG__CANCEL)}
          </Button>
          <Button
            variant="primary"
            onClick={() => onSubmit(name.trim())}
            loading={busy}
            disabled={!canSubmit || busy}
          >
            {getText(i18nKeys.MANAGE_METADATA_DIALOG__CREATE_ATTR_CREATE)}
          </Button>
        </>
      }
    >
      <div className="manage-metadata__form">
        {errorMessage && (
          <Alert severity="error" variant="banner">
            {errorMessage}
          </Alert>
        )}
        <TextField
          label={getText(i18nKeys.MANAGE_METADATA_DIALOG__CREATE_ATTR_NAME)}
          value={name}
          onChange={setName}
          required
        />
        <TextField
          label={getText(i18nKeys.MANAGE_METADATA_DIALOG__CREATE_ATTR_ID)}
          value={attributeId}
          required
          disabled
        />
      </div>
    </Dialog>
  );
};

interface EditImportRowDialogProps {
  open: boolean;
  initial: { name: string; attributeId: string; value: string };
  attributeConfigs: DatasetAttributeConfig[];
  onClose: () => void;
  onSubmit: (name: string, attributeId: string, value: string) => void;
}

const EditImportRowDialog: FC<EditImportRowDialogProps> = ({
  open,
  initial,
  attributeConfigs,
  onClose,
  onSubmit,
}) => {
  const { getText, i18nKeys } = useTranslation();
  const [name, setName] = useState(initial.name);
  const [attributeId, setAttributeId] = useState(initial.attributeId);
  const [value, setValue] = useState(initial.value);

  useEffect(() => {
    if (open) {
      setName(initial.name);
      setAttributeId(initial.attributeId);
      setValue(initial.value);
    }
  }, [open, initial]);

  const options = useMemo(
    () =>
      attributeConfigs
        .map((c) => ({ label: c.name, value: c.id }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" })),
    [attributeConfigs]
  );
  const matched = useMemo(
    () => attributeConfigs.find((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase()),
    [attributeConfigs, name]
  );
  const locked = !!matched;
  const effectiveId = matched ? matched.id : attributeId;

  const requiredFilled = !!name.trim() && !!effectiveId.trim() && !!value.trim();
  const isDirty =
    name !== initial.name || effectiveId !== initial.attributeId || value !== initial.value;
  const canSubmit = requiredFilled && isDirty;

  return (
    <Dialog
      title={getText(i18nKeys.MANAGE_METADATA_DIALOG__IMPORT_EDIT_ROW_TITLE)}
      size="s"
      open={open}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {getText(i18nKeys.MANAGE_METADATA_DIALOG__CANCEL)}
          </Button>
          <Button
            variant="primary"
            onClick={() => onSubmit(name.trim(), effectiveId.trim(), value.trim())}
            disabled={!canSubmit}
          >
            {getText(i18nKeys.MANAGE_METADATA_DIALOG__IMPORT_EDIT_ROW_SAVE)}
          </Button>
        </>
      }
    >
      <div className="manage-metadata__form">
        <Select
          label={getText(i18nKeys.MANAGE_METADATA_DIALOG__METADATA_NAME)}
          value={name}
          items={options}
          searchable
          freeSolo
          required
          onChange={(v) => setName((v as string) ?? "")}
        />
        <TextField
          label={getText(i18nKeys.MANAGE_METADATA_DIALOG__METADATA_ID)}
          value={effectiveId}
          onChange={setAttributeId}
          required
          disabled={locked}
        />
        <TextField
          label={getText(i18nKeys.MANAGE_METADATA_DIALOG__METADATA_VALUE)}
          value={value}
          onChange={setValue}
          required
        />
      </div>
    </Dialog>
  );
};

interface ImportMetadataDialogProps {
  open: boolean;
  fileName: string;
  entries: ImportEntry[];
  attributeConfigs: DatasetAttributeConfig[];
  onAttributeCreated: () => void;
  onClose: () => void;
  onImport: (rows: { attributeId: string; value: string }[]) => void;
  errorMessage?: string;
}

const ImportMetadataDialog: FC<ImportMetadataDialogProps> = ({
  open,
  fileName,
  entries,
  attributeConfigs,
  onAttributeCreated,
  onClose,
  onImport,
  errorMessage,
}) => {
  const { getText, i18nKeys } = useTranslation();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [createdConfigs, setCreatedConfigs] = useState<DatasetAttributeConfig[]>([]);
  const [sortCol, setSortCol] = useState<"name" | "id" | "value" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [createRowId, setCreateRowId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({});
  const [createdBanner, setCreatedBanner] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setRows(
        entries.map((e, i) => ({
          rowId: `r${i}`,
          attributeId: e.id,
          fileName: e.name || e.id,
          value: e.value,
          excluded: false,
        }))
      );
      setCreatedConfigs([]);
      setCreatedBanner(undefined);
      setFeedback({});
      setSortCol(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entries]);

  const allConfigs = useMemo(() => [...attributeConfigs, ...createdConfigs], [attributeConfigs, createdConfigs]);
  const configNameById = useMemo(() => {
    const m = new Map<string, string>();
    allConfigs.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [allConfigs]);
  const knownIds = useMemo(() => new Set(allConfigs.map((c) => c.id)), [allConfigs]);

  const isKnown = (row: ImportRow) => knownIds.has(row.attributeId);
  const displayName = (row: ImportRow) => configNameById.get(row.attributeId) ?? row.fileName;

  const unknownCount = useMemo(
    () => rows.filter((r) => !knownIds.has(r.attributeId) && !r.excluded).length,
    [rows, knownIds]
  );
  const importableRows = useMemo(
    () => rows.filter((r) => knownIds.has(r.attributeId) && !r.excluded),
    [rows, knownIds]
  );

  const displayRows = useMemo(() => {
    if (!sortCol) return rows;
    const keyOf = (r: ImportRow) =>
      sortCol === "name" ? displayName(r) : sortCol === "id" ? r.attributeId : r.value;
    return [...rows].sort((a, b) => {
      const cmp = keyOf(a).localeCompare(keyOf(b), undefined, { sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sortCol, sortDir, configNameById]);

  const toggleSort = (col: "name" | "id" | "value") => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const toggleExclude = (rowId: string) =>
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, excluded: !r.excluded } : r)));

  const handleCreateSubmit = async (name: string) => {
    const row = rows.find((r) => r.rowId === createRowId);
    if (!row) return;
    const config: DatasetAttributeConfig = {
      id: row.attributeId,
      name,
      category: NEW_ATTR_CATEGORY,
      dataType: NEW_ATTR_DATATYPE,
      isDisplayed: true,
    };
    setBusy(true);
    setFeedback({});
    try {
      await api.systemPortal.addDatasetAttributeConfig(config);
      setCreatedConfigs((prev) => [...prev, config]);
      setRows((prev) => prev.map((r) => (r.rowId === createRowId ? { ...r, fileName: name } : r)));
      setCreatedBanner(getText(i18nKeys.MANAGE_METADATA_DIALOG__IMPORT_CREATED_BANNER, [name]));
      onAttributeCreated();
      setCreateRowId(null);
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.data?.message || err?.data || err?.message });
    } finally {
      setBusy(false);
    }
  };

  const handleEditSave = (name: string, attributeId: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.rowId === editRowId ? { ...r, fileName: name, attributeId, value } : r))
    );
    setEditRowId(null);
  };

  const handleImport = () => {
    onImport(importableRows.map((r) => ({ attributeId: r.attributeId, value: r.value })));
  };

  const importLabel =
    importableRows.length === rows.length
      ? getText(i18nKeys.MANAGE_METADATA_DIALOG__IMPORT_BUTTON)
      : getText(i18nKeys.MANAGE_METADATA_DIALOG__IMPORT_BUTTON_N, [String(importableRows.length)]);

  const editRow = editRowId ? rows.find((r) => r.rowId === editRowId) : undefined;
  const createRow = createRowId ? rows.find((r) => r.rowId === createRowId) : undefined;

  return (
    <>
      <Dialog
        title={getText(i18nKeys.MANAGE_METADATA_DIALOG__IMPORT_PREVIEW_TITLE)}
        size="l"
        open={open}
        closeOnBackdrop
        onClose={onClose}
        leadingActions={
          <Button variant="ghost" onClick={onClose}>
            {getText(i18nKeys.MANAGE_METADATA_DIALOG__CANCEL)}
          </Button>
        }
        actions={
          <Button variant="primary" onClick={handleImport} disabled={importableRows.length === 0}>
            {importLabel}
          </Button>
        }
      >
        <div className="manage-metadata import-metadata">
          <div className="import-metadata__filename">{fileName}</div>
          {errorMessage && (
            <Alert severity="error" variant="banner">
              {errorMessage}
            </Alert>
          )}
          {feedback?.message && (
            <Alert severity={feedback.type ?? "error"} variant="banner">
              {feedback.message}
            </Alert>
          )}
          {createdBanner ? (
            <Alert severity="success" variant="banner">
              {createdBanner}
            </Alert>
          ) : unknownCount > 0 ? (
            <Alert severity="warning" variant="banner">
              {unknownCount === 1
                ? getText(i18nKeys.MANAGE_METADATA_DIALOG__IMPORT_UNKNOWN_BANNER_ONE)
                : getText(i18nKeys.MANAGE_METADATA_DIALOG__IMPORT_UNKNOWN_BANNER, [String(unknownCount)])}
            </Alert>
          ) : null}
          <div className="manage-metadata__tablewrap">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell header sortable sortDirection={sortCol === "name" ? sortDir : false} onSort={() => toggleSort("name")}>
                    {getText(i18nKeys.MANAGE_METADATA_DIALOG__NAME)}
                  </TableCell>
                  <TableCell header sortable sortDirection={sortCol === "id" ? sortDir : false} onSort={() => toggleSort("id")}>
                    {getText(i18nKeys.MANAGE_METADATA_DIALOG__ID)}
                  </TableCell>
                  <TableCell header sortable sortDirection={sortCol === "value" ? sortDir : false} onSort={() => toggleSort("value")}>
                    {getText(i18nKeys.MANAGE_METADATA_DIALOG__VALUE)}
                  </TableCell>
                  <TableCell header />
                </TableRow>
              </TableHead>
              <TableBody>
                {displayRows.map((r) => {
                  const unknown = !isKnown(r);
                  const rowClass =
                    [r.excluded ? "import-metadata__row--excluded" : "", unknown ? "import-metadata__row--unknown" : ""]
                      .filter(Boolean)
                      .join(" ") || undefined;
                  return (
                    <TableRow key={r.rowId} className={rowClass}>
                      <TableCell>
                        {unknown ? (
                          <Tooltip
                            title={getText(i18nKeys.MANAGE_METADATA_DIALOG__IMPORT_UNKNOWN_TOOLTIP, [displayName(r)])}
                          >
                            <span className="import-metadata__unknown-name">
                              {displayName(r)}
                              <ErrorOutlineIcon fontSize="small" />
                            </span>
                          </Tooltip>
                        ) : (
                          displayName(r)
                        )}
                      </TableCell>
                      <TableCell>{r.attributeId}</TableCell>
                      <TableCell>{r.value}</TableCell>
                      <TableCell align="right">
                        <div className="manage-metadata__actions">
                          {unknown && (
                            <Tooltip title={getText(i18nKeys.MANAGE_METADATA_DIALOG__IMPORT_CREATE_ATTRIBUTE)}>
                              <IconButton
                                category="no-stroke"
                                icon={<AddIcon />}
                                ariaLabel={getText(i18nKeys.MANAGE_METADATA_DIALOG__IMPORT_CREATE_ATTRIBUTE)}
                                onClick={() => {
                                  setFeedback({});
                                  setCreateRowId(r.rowId);
                                }}
                              />
                            </Tooltip>
                          )}
                          <Tooltip title={getText(i18nKeys.MANAGE_METADATA_DIALOG__IMPORT_EDIT_ROW_TITLE)}>
                            <IconButton
                              category="no-stroke"
                              icon={<EditOutlinedIcon />}
                              ariaLabel={getText(i18nKeys.MANAGE_METADATA_DIALOG__IMPORT_EDIT_ROW_TITLE)}
                              onClick={() => {
                                setFeedback({});
                                setEditRowId(r.rowId);
                              }}
                            />
                          </Tooltip>
                          <Tooltip
                            title={getText(
                              r.excluded
                                ? i18nKeys.MANAGE_METADATA_DIALOG__IMPORT_INCLUDE
                                : i18nKeys.MANAGE_METADATA_DIALOG__IMPORT_EXCLUDE
                            )}
                          >
                            <IconButton
                              category="no-stroke"
                              icon={r.excluded ? <AddTaskOutlinedIcon /> : <DoNotDisturbAltOutlinedIcon />}
                              ariaLabel={getText(
                                r.excluded
                                  ? i18nKeys.MANAGE_METADATA_DIALOG__IMPORT_INCLUDE
                                  : i18nKeys.MANAGE_METADATA_DIALOG__IMPORT_EXCLUDE
                              )}
                              onClick={() => toggleExclude(r.rowId)}
                            />
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </Dialog>

      {editRow && (
        <EditImportRowDialog
          open={!!editRow}
          initial={{ name: displayName(editRow), attributeId: editRow.attributeId, value: editRow.value }}
          attributeConfigs={allConfigs}
          onClose={() => setEditRowId(null)}
          onSubmit={handleEditSave}
        />
      )}

      {createRow && (
        <CreateAttributeDialog
          open={!!createRow}
          initialName={displayName(createRow)}
          attributeId={createRow.attributeId}
          busy={busy}
          errorMessage={feedback?.type === "error" ? feedback.message : undefined}
          onClose={() => {
            setFeedback({});
            setCreateRowId(null);
          }}
          onSubmit={handleCreateSubmit}
        />
      )}
    </>
  );
};

export default ImportMetadataDialog;
