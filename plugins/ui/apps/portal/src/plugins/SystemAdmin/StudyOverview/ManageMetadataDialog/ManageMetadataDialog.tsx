import { CSSProperties, FC, useEffect, useMemo, useRef, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import InputAdornment from "@mui/material/InputAdornment";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Dialog,
  Button,
  SplitButton,
  TextField,
  IconButton,
  Menu,
  Alert,
  AlertToast,
  EmptyState,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
} from "ui-react";
import { Study, NewStudyMetadataInput, CloseDialogType, UpdateStudyMetadataInput, Feedback } from "../../../../types";
import { useDatasetAttributeConfigs } from "../../../../hooks";
import { api } from "../../../../axios/api";
import { useTranslation } from "../../../../contexts";
import MetadataEntryDialog, { MetadataEntryMode } from "./MetadataEntryDialog";
import ImportMetadataDialog, { ImportEntry } from "./ImportMetadataDialog";
import "./ManageMetadataDialog.scss";

const PROTECTED_ATTRIBUTE_IDS = new Set<string>(["source_dataset_id"]);

interface SortableMetadataRowProps {
  id: string;
  name: string;
  value: string;
  disabled: boolean;
  dragLabel: string;
  disabledHint: string;
  editLabel: string;
  deleteLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}

const SortableMetadataRow: FC<SortableMetadataRowProps> = ({
  id,
  name,
  value,
  disabled,
  dragLabel,
  disabledHint,
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    position: isDragging ? "relative" : undefined,
    zIndex: isDragging ? 1 : undefined,
  };
  return (
    <TableRow ref={setNodeRef} style={style} hover>
      <TableCell
        className="manage-metadata__drag manage-metadata__drag-col"
        aria-label={disabled ? undefined : dragLabel}
        {...(disabled ? {} : attributes)}
        {...(disabled ? {} : listeners)}
        aria-disabled={disabled || undefined}
      >
        {disabled ? (
          <Tooltip title={disabledHint}>
            <span className="manage-metadata__drag-icon">
              <DragIndicatorIcon fontSize="small" />
            </span>
          </Tooltip>
        ) : (
          <DragIndicatorIcon fontSize="small" />
        )}
      </TableCell>
      <TableCell>{name}</TableCell>
      <TableCell>{id}</TableCell>
      <TableCell>{value}</TableCell>
      <TableCell align="right">
        <div className="manage-metadata__actions">
          <IconButton category="no-stroke" icon={<EditOutlinedIcon />} ariaLabel={editLabel} onClick={onEdit} />
          <IconButton
            className="manage-metadata__delete"
            category="no-stroke"
            icon={<DeleteOutlineIcon />}
            ariaLabel={deleteLabel}
            onClick={onDelete}
          />
        </div>
      </TableCell>
    </TableRow>
  );
};

interface ManageMetadataDialogProps {
  dataset?: Study;
  open: boolean;
  onClose: (type: CloseDialogType) => void;
}

const ManageMetadataDialog: FC<ManageMetadataDialogProps> = ({ dataset, open, onClose }) => {
  const { getText, i18nKeys } = useTranslation();
  const [configRefetch, setConfigRefetch] = useState(0);
  const [attributeConfigs] = useDatasetAttributeConfigs(configRefetch);
  const [attributes, setAttributes] = useState<NewStudyMetadataInput[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [changed, setChanged] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({});
  const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: "" });
  const [entry, setEntry] = useState<{
    mode: MetadataEntryMode;
    initial?: { attributeId: string; value: string };
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NewStudyMetadataInput | null>(null);
  const [importState, setImportState] = useState<{ fileName: string; entries: ImportEntry[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setAttributes(
        (dataset?.attributes ?? [])
          .filter((a) => a.attributeId)
          .map((a) => ({ attributeId: a.attributeId, value: a.value }))
      );
      setSearch("");
      setFeedback({});
      setChanged(false);
    }
  }, [open, dataset]);

  const configNameById = useMemo(() => {
    const map = new Map<string, string>();
    attributeConfigs.forEach((c) => map.set(c.id, c.name));
    (dataset?.attributes ?? []).forEach((a) => {
      if (a.attributeConfig?.name && !map.has(a.attributeId)) map.set(a.attributeId, a.attributeConfig.name);
    });
    return map;
  }, [attributeConfigs, dataset]);

  const nameOf = (attributeId: string) => configNameById.get(attributeId) ?? attributeId;

  const categoryById = useMemo(() => {
    const map = new Map<string, string>();
    attributeConfigs.forEach((c) => c.category && map.set(c.id, c.category));
    return map;
  }, [attributeConfigs]);

  const catalogOf = (attributeId: string) => categoryById.get(attributeId) ?? "";

  const visibleCount = useMemo(
    () => attributes.filter((a) => !PROTECTED_ATTRIBUTE_IDS.has(a.attributeId)).length,
    [attributes]
  );
  const addableConfigs = useMemo(
    () => attributeConfigs.filter((c) => !PROTECTED_ATTRIBUTE_IDS.has(c.id)),
    [attributeConfigs]
  );

  const isSearching = search.trim().length > 0;

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = attributes
      .filter((a) => !PROTECTED_ATTRIBUTE_IDS.has(a.attributeId))
      .map((a) => ({ ...a, name: nameOf(a.attributeId), catalog: catalogOf(a.attributeId) }));
    if (term) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(term) ||
          r.catalog.toLowerCase().includes(term) ||
          r.attributeId.toLowerCase().includes(term) ||
          (r.value ?? "").toLowerCase().includes(term)
      );
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attributes, search, configNameById, categoryById]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const buildPayload = (next: NewStudyMetadataInput[]): UpdateStudyMetadataInput => ({
    id: dataset!.id,
    detail: {
      name: dataset?.studyDetail?.name || "",
      summary: dataset?.studyDetail?.summary || "",
      description: dataset?.studyDetail?.description || "",
      showRequestAccess: dataset?.studyDetail?.showRequestAccess || false,
    },
    type: dataset!.type,
    tokenDatasetCode: dataset!.tokenStudyCode,
    vocabSchemaName: dataset?.vocabSchemaName,
    resultsSchemaName: dataset?.resultsSchemaName,
    paConfigId: dataset!.paConfigId,
    visibilityStatus: dataset!.visibilityStatus,
    attributes: next,
    tags: dataset?.tags?.map((t) => t.name) ?? [],
    dashboards: [],
  });

  const commit = async (next: NewStudyMetadataInput[], message: string, done?: () => void) => {
    if (!dataset) return;
    setBusy(true);
    setFeedback({});
    try {
      await api.systemPortal.updateDataset(buildPayload(next));
      setAttributes(next);
      setChanged(true);
      setToast({ open: true, message });
      done?.();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.data?.message || err?.data || err?.message });
    } finally {
      setBusy(false);
    }
  };

  const handleEntrySubmit = (attributeId: string, value: string) => {
    if (!entry) return;
    if (entry.mode === "add") {
      commit([...attributes, { attributeId, value }], getText(i18nKeys.MANAGE_METADATA_DIALOG__ADDED), () =>
        setEntry(null)
      );
    } else {
      const original = entry.initial!.attributeId;
      const next = attributes.map((a) => (a.attributeId === original ? { attributeId, value } : a));
      commit(next, getText(i18nKeys.MANAGE_METADATA_DIALOG__UPDATED), () => setEntry(null));
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const next = attributes.filter((a) => a.attributeId !== deleteTarget.attributeId);
    commit(next, getText(i18nKeys.MANAGE_METADATA_DIALOG__DELETED), () => setDeleteTarget(null));
  };

  const handleExport = () => {
    const data = attributes
      .filter((a) => !PROTECTED_ATTRIBUTE_IDS.has(a.attributeId))
      .map((a) => ({
        name: nameOf(a.attributeId),
        id: a.attributeId,
        catalog: catalogOf(a.attributeId),
        value: a.value,
      }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const base = (dataset?.studyDetail?.name || "data-source").replace(/[^a-z0-9_-]+/gi, "_");
    const filename = `${base}-metadata.json`;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    setToast({ open: true, message: getText(i18nKeys.MANAGE_METADATA_DIALOG__EXPORTED, [filename]) });
  };

  const triggerImport = () => {
    setFeedback({});
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      setFeedback({ type: "error", message: getText(i18nKeys.MANAGE_METADATA_DIALOG__IMPORT_INVALID) });
      return;
    }
    if (!Array.isArray(parsed)) {
      setFeedback({ type: "error", message: getText(i18nKeys.MANAGE_METADATA_DIALOG__IMPORT_INVALID) });
      return;
    }
    const entries: ImportEntry[] = parsed
      .filter(
        (e): e is { id: string; name?: unknown; value?: unknown } =>
          !!e && typeof e === "object" && typeof (e as { id?: unknown }).id === "string"
      )
      .map((e) => ({
        id: e.id,
        name: typeof e.name === "string" ? e.name : undefined,
        value: String(e.value ?? ""),
      }));
    if (entries.length === 0) {
      setFeedback({ type: "error", message: getText(i18nKeys.MANAGE_METADATA_DIALOG__IMPORT_EMPTY) });
      return;
    }
    setImportState({ fileName: file.name, entries });
  };

  const handleImportApply = (imported: NewStudyMetadataInput[]) => {
    const byId = new Map(attributes.map((a) => [a.attributeId, a]));
    imported.forEach((e) => byId.set(e.attributeId, e));
    commit(
      Array.from(byId.values()),
      getText(i18nKeys.MANAGE_METADATA_DIALOG__IMPORT_RESULT, [String(imported.length)]),
      () => setImportState(null)
    );
  };

  const handleClose = () => onClose(changed ? "success" : "cancelled");

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !dataset) return;
    const visible = attributes.filter((a) => !PROTECTED_ATTRIBUTE_IDS.has(a.attributeId));
    const reserved = attributes.filter((a) => PROTECTED_ATTRIBUTE_IDS.has(a.attributeId));
    const oldIndex = visible.findIndex((a) => a.attributeId === active.id);
    const newIndex = visible.findIndex((a) => a.attributeId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const prev = attributes;
    const next = [...arrayMove(visible, oldIndex, newIndex), ...reserved];
    setAttributes(next);
    setBusy(true);
    setFeedback({});
    try {
      await api.systemPortal.updateDataset(buildPayload(next));
      setChanged(true);
      setToast({ open: true, message: getText(i18nKeys.MANAGE_METADATA_DIALOG__REORDERED) });
    } catch (err: any) {
      setAttributes(prev);
      setFeedback({ type: "error", message: err?.data?.message || err?.data || err?.message });
    } finally {
      setBusy(false);
    }
  };

  const content = () => {
    if (visibleCount === 0) {
      return (
        <div className="manage-metadata__empty">
          <EmptyState
            title={getText(i18nKeys.MANAGE_METADATA_DIALOG__NO_DATA)}
            description={getText(i18nKeys.MANAGE_METADATA_DIALOG__NO_DATA_DESCRIPTION)}
          />
        </div>
      );
    }
    if (rows.length === 0) {
      return (
        <div className="manage-metadata__empty">
          <EmptyState title={getText(i18nKeys.MANAGE_METADATA_DIALOG__NO_RESULTS)} description="" />
        </div>
      );
    }
    return (
      <div className="manage-metadata__tablewrap">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell header className="manage-metadata__drag-col" />
              <TableCell header>{getText(i18nKeys.MANAGE_METADATA_DIALOG__NAME)}</TableCell>
              <TableCell header>{getText(i18nKeys.MANAGE_METADATA_DIALOG__ID)}</TableCell>
              <TableCell header>{getText(i18nKeys.MANAGE_METADATA_DIALOG__VALUE)}</TableCell>
              <TableCell header />
            </TableRow>
          </TableHead>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={rows.map((r) => r.attributeId)} strategy={verticalListSortingStrategy}>
              <TableBody>
                {rows.map((r) => (
                  <SortableMetadataRow
                    key={r.attributeId}
                    id={r.attributeId}
                    name={r.name}
                    value={r.value}
                    disabled={isSearching}
                    dragLabel={getText(i18nKeys.MANAGE_METADATA_DIALOG__REORDER)}
                    disabledHint={getText(i18nKeys.MANAGE_METADATA_DIALOG__REORDER_DISABLED)}
                    editLabel={getText(i18nKeys.MANAGE_METADATA_DIALOG__EDIT)}
                    deleteLabel={getText(i18nKeys.MANAGE_METADATA_DIALOG__DELETE)}
                    onEdit={() => {
                      setFeedback({});
                      setEntry({ mode: "update", initial: { attributeId: r.attributeId, value: r.value } });
                    }}
                    onDelete={() => {
                      setFeedback({});
                      setDeleteTarget({ attributeId: r.attributeId, value: r.value });
                    }}
                  />
                ))}
              </TableBody>
            </SortableContext>
          </DndContext>
        </Table>
      </div>
    );
  };

  return (
    <>
      <Dialog
        title={getText(i18nKeys.MANAGE_METADATA_DIALOG__TITLE)}
        size="l"
        open={open}
        busy={busy}
        closeOnBackdrop
        onClose={handleClose}
      >
        <div className="manage-metadata">
          {feedback?.message && (
            <Alert severity={feedback.type ?? "error"} variant="banner">
              {feedback.message}
            </Alert>
          )}
          <div className="manage-metadata__toolbar">
            <TextField
              className="manage-metadata__search"
              placeholder={getText(i18nKeys.MANAGE_METADATA_DIALOG__SEARCH)}
              value={search}
              onChange={setSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <div className="manage-metadata__toolbar-end">
              <Button
                variant="secondary"
                prependIcon={<FileDownloadOutlinedIcon />}
                onClick={handleExport}
                disabled={visibleCount === 0}
              >
                {getText(i18nKeys.MANAGE_METADATA_DIALOG__EXPORT_JSON)}
              </Button>
              <Menu
                placement="bottom-end"
                width="auto"
                items={[{ label: getText(i18nKeys.MANAGE_METADATA_DIALOG__IMPORT_JSON), value: "import-json" }]}
                onSelect={(action) => {
                  if (action === "import-json") triggerImport();
                }}
                activator={({ open, isOpen }) => (
                  <SplitButton
                    variant="primary"
                    prependIcon={<AddIcon />}
                    open={isOpen}
                    onClick={() => {
                      setFeedback({});
                      setEntry({ mode: "add" });
                    }}
                    onToggle={open}
                    disabled={addableConfigs.length === 0}
                    menuLabel={getText(i18nKeys.MANAGE_METADATA_DIALOG__IMPORT_JSON)}
                  >
                    {getText(i18nKeys.MANAGE_METADATA_DIALOG__ADD_METADATA)}
                  </SplitButton>
                )}
              />
            </div>
          </div>
          {addableConfigs.length === 0 && (
            <Alert severity="info" variant="banner">
              {getText(i18nKeys.MANAGE_METADATA_DIALOG__NO_ATTRIBUTES)}
            </Alert>
          )}
          {content()}
        </div>
      </Dialog>

      {entry && (
        <MetadataEntryDialog
          open={!!entry}
          mode={entry.mode}
          attributeConfigs={addableConfigs}
          usedAttributeIds={attributes.map((a) => a.attributeId)}
          initial={entry.initial}
          busy={busy}
          errorMessage={feedback?.type === "error" ? feedback.message : undefined}
          onClose={() => {
            setFeedback({});
            setEntry(null);
          }}
          onSubmit={handleEntrySubmit}
        />
      )}

      <Dialog
        title={getText(i18nKeys.MANAGE_METADATA_DIALOG__DELETE_TITLE)}
        size="s"
        open={!!deleteTarget}
        busy={busy}
        onClose={() => {
          setFeedback({});
          setDeleteTarget(null);
        }}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setFeedback({});
                setDeleteTarget(null);
              }}
              disabled={busy}
            >
              {getText(i18nKeys.MANAGE_METADATA_DIALOG__CANCEL)}
            </Button>
            <Button
              variant="primary"
              className="manage-metadata__delete-confirm"
              onClick={handleDelete}
              loading={busy}
            >
              {getText(i18nKeys.MANAGE_METADATA_DIALOG__DELETE_CONFIRM)}
            </Button>
          </>
        }
      >
        <div className="manage-metadata__form">
          {feedback?.type === "error" && feedback.message && (
            <Alert severity="error" variant="banner">
              {feedback.message}
            </Alert>
          )}
          {deleteTarget && (
            <div>{getText(i18nKeys.MANAGE_METADATA_DIALOG__DELETE_BODY, [nameOf(deleteTarget.attributeId)])}</div>
          )}
        </div>
      </Dialog>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        style={{ display: "none" }}
        onChange={handleImportFile}
      />

      {importState && (
        <ImportMetadataDialog
          open={!!importState}
          fileName={importState.fileName}
          entries={importState.entries}
          attributeConfigs={addableConfigs}
          onAttributeCreated={() => setConfigRefetch((n) => n + 1)}
          onClose={() => setImportState(null)}
          onImport={handleImportApply}
        />
      )}

      <AlertToast
        open={toast.open}
        severity="success"
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      >
        {toast.message}
      </AlertToast>
    </>
  );
};

export default ManageMetadataDialog;
