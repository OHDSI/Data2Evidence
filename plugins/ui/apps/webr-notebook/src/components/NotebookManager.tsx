import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Notebook,
  type NotebookData,
  type NotebookHandle,
  type NotebookTheme,
  WebRKernel,
  buildKernelAssetUrls,
  createEmptyNotebook,
  serializeIpynb,
} from "react-notebook/src/index";
import * as notebookApi from "../api/notebook-api";
import { PyqeReadyPyodideKernel } from "../kernels/pyqeReadyPyodideKernel";
import type { NotebookRecord } from "../types";
import { parseNotebookContent } from "../utils/starboard";
import { CodingAssistant } from "./CodingAssistant";
import { CreateNotebookDialog } from "./CreateNotebookDialog";
import { DeleteDialog } from "./DeleteDialog";
import { EmptyState } from "./EmptyState";
import { NotebookHeader } from "./NotebookHeader";
import "./NotebookManager.scss";
import { RenameDialog } from "./RenameDialog";
import { Snackbar } from "./Snackbar";

// __PYODIDE_VERSION__ and __KERNEL_ASSET_BASE__ are injected by Vite at build
// time (see vite.config.ts). In a production build all kernel runtimes load
// from the app's own origin (air-gapped); in dev they fall back to CDNs.
declare const __PYODIDE_VERSION__: string;
declare const __KERNEL_ASSET_BASE__: string;
const kernelAssetUrls = buildKernelAssetUrls(
  typeof __KERNEL_ASSET_BASE__ !== "undefined" ? __KERNEL_ASSET_BASE__ : "",
  typeof __PYODIDE_VERSION__ !== "undefined" ? __PYODIDE_VERSION__ : "0.29.0",
);

const portalTheme: NotebookTheme = {
  primary: "#000080",
  primaryForeground: "#ffffff",
  background: "#ffffff",
  foreground: "#1a1a2e",
  secondary: "#000080",
  secondaryForeground: "#ffffff",
  accent: "#edf2f7",
  accentForeground: "#000080",
  ring: "#000080",
  border: "#dde3ed",
  input: "#dde3ed",
  muted: "#6b7280",
  mutedForeground: "#555555",
  card: "#ffffff",
  cardForeground: "#1a1a2e",
};

interface NotebookManagerProps {
  datasetId: string;
  userId: string;
  getToken?: () => Promise<string>;
}

function generateUniqueName(baseName: string, existingNames: string[]): string {
  const taken = new Set(existingNames.map((n) => n.toLowerCase()));
  if (!taken.has(baseName.toLowerCase())) return baseName;
  let i = 1;
  while (taken.has(`${baseName} ${i}`.toLowerCase())) {
    i++;
  }
  return `${baseName} ${i}`;
}

export function NotebookManager({ datasetId, userId, getToken }: NotebookManagerProps) {
  // Fresh kernel instances per component mount. The submodule's useKernel hook
  // skips connect()+status-subscribe for any kernel whose status is not
  // 'disconnected' (see useKernel.ts:184), so module-level singletons leave the
  // remounted NotebookManager with an empty kernelStatuses map and a stale
  // 'disconnected' UI even though the previous worker is alive. Tying the
  // kernels to component lifecycle forces useKernel down its full connect path
  // on every mount; the cleanup terminates the old worker so reconnect actually
  // produces fresh state.
  const [pyodideKernel] = useState(() => new PyqeReadyPyodideKernel());
  const [webRKernel] = useState(() => new WebRKernel());
  const kernels = useMemo(
    () => [pyodideKernel, webRKernel],
    [pyodideKernel, webRKernel],
  );

  useEffect(() => {
    return () => {
      pyodideKernel
        .disconnect()
        .catch((err) => console.warn("Pyodide kernel cleanup failed:", err));
      webRKernel
        .disconnect()
        .catch((err) => console.warn("WebR kernel cleanup failed:", err));
    };
  }, [pyodideKernel, webRKernel]);

  const [notebooks, setNotebooks] = useState<NotebookRecord[]>([]);
  const [activeNotebook, setActiveNotebook] = useState<NotebookRecord | null>(
    null,
  );
  const [notebookData, setNotebookData] = useState<NotebookData>(
    createEmptyNotebook(),
  );
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<NotebookRecord | null>(null);
  const [renameTarget, setRenameTarget] = useState<NotebookRecord | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showFeedback = useCallback(
    (type: "success" | "error", message: string) => {
      setFeedback({ type, message });
    },
    [],
  );

  // Fetch auth token for pyqe environment
  useEffect(() => {
    if (getToken) {
      getToken().then(setToken).catch(console.error);
    }
  }, [getToken]);

  // Build kernel configs — both kernels connect automatically, cells route by language
  const kernelConfigs = useMemo(() => {
    const envVars: Record<string, string> = {
      PYQE_URL: "analytics-svc/",
      PYQE_TLS_CLIENT_CA_CERT_PATH: "",
    };
    if (token) {
      envVars.TOKEN = token;
    }
    const webREnvVars: Record<string, string> = {
      TREX__ENDPOINT_URL: window.location.origin,
      TREX__DATASET_ID: datasetId,
    };
    if (token) {
      webREnvVars.TREX__AUTHORIZATION_TOKEN = token;
    }
    return [
      {
        type: "pyodide" as const,
        envVars,
        indexUrl: kernelAssetUrls.pyodideIndexUrl,
      },
      {
        type: "webr" as const,
        envVars: webREnvVars,
        baseUrl: kernelAssetUrls.webrBaseUrl,
        repoUrl: kernelAssetUrls.webrRepoUrl,
      },
    ];
  }, [token, datasetId]);

  const notebookRef = useRef<NotebookHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchNotebooks = useCallback(async () => {
    if (!datasetId) return;
    try {
      setLoading(true);
      const list = await notebookApi.getNotebookList(datasetId);
      setNotebooks(list);
    } catch (err) {
      console.error("Failed to fetch notebooks:", err);
      showFeedback("error", "Failed to load notebooks.");
    } finally {
      setLoading(false);
    }
  }, [datasetId, showFeedback]);

  useEffect(() => {
    fetchNotebooks();
  }, [fetchNotebooks]);

  useEffect(() => {
    if (!activeNotebook) {
      const empty = createEmptyNotebook();
      setNotebookData(empty);
      notebookRef.current?.setNotebookData(empty);
      return;
    }
    try {
      let parsed: NotebookData;
      if (activeNotebook.notebookContent) {
        parsed = parseNotebookContent(activeNotebook.notebookContent);
      } else {
        parsed = createEmptyNotebook();
      }
      setNotebookData(parsed);
      notebookRef.current?.setNotebookData(parsed);
    } catch {
      console.error(
        "Failed to parse notebook content, starting with empty notebook",
      );
      const empty = createEmptyNotebook();
      setNotebookData(empty);
      notebookRef.current?.setNotebookData(empty);
    }
  }, [activeNotebook]);

  const handleSelect = useCallback(
    (id: string) => {
      const nb = notebooks.find((n) => n.id === id) ?? null;
      setActiveNotebook(nb);
    },
    [notebooks],
  );

  const handleCreate = useCallback(() => {
    setCreateDialogOpen(true);
  }, []);

  const handleCreateConfirm = useCallback(
    async (name: string, templateId: string | null) => {
      setCreateDialogOpen(false);
      if (!datasetId) return;
      try {
        const created = templateId
          ? await notebookApi.createNotebookFromTemplate(
              templateId,
              name,
              datasetId,
            )
          : await notebookApi.createNotebook(
              datasetId,
              name,
              serializeIpynb(createEmptyNotebook()),
            );
        setNotebooks((prev) => [...prev, created]);
        setActiveNotebook(created);
        showFeedback("success", `Notebook "${name}" created.`);
      } catch (err) {
        console.error("Failed to create notebook:", err);
        showFeedback("error", "Failed to create notebook.");
      }
    },
    [datasetId, showFeedback],
  );

  const handleSave = useCallback(async () => {
    if (!activeNotebook || !datasetId) return;
    try {
      const content = serializeIpynb(notebookData);
      const updated = await notebookApi.saveNotebook(
        activeNotebook.id,
        activeNotebook.name,
        content,
        activeNotebook.isShared,
        datasetId,
      );
      setActiveNotebook(updated);
      setNotebooks((prev) =>
        prev.map((n) => (n.id === updated.id ? updated : n)),
      );
      showFeedback("success", "Notebook saved.");
    } catch (err) {
      console.error("Failed to save notebook:", err);
      showFeedback("error", "Failed to save notebook.");
    }
  }, [activeNotebook, notebookData, datasetId, showFeedback]);

  const handleSyncSuccess = useCallback(async () => {
    if (!datasetId || !activeNotebook) return;
    try {
      const list = await notebookApi.getNotebookList(datasetId);
      setNotebooks(list);
      const refreshed = list.find((n) => n.id === activeNotebook.id);
      if (refreshed) {
        setActiveNotebook(refreshed);
      }
    } catch (err) {
      console.error("Failed to refresh notebooks after sync:", err);
      showFeedback("error", "Sync succeeded, but failed to refresh.");
    }
  }, [datasetId, activeNotebook, showFeedback]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget || !datasetId) return;
    try {
      await notebookApi.deleteNotebook(deleteTarget.id, datasetId);
      const name = deleteTarget.name;
      setNotebooks((prev) => prev.filter((n) => n.id !== deleteTarget.id));
      if (activeNotebook?.id === deleteTarget.id) {
        setActiveNotebook(null);
      }
      setDeleteTarget(null);
      showFeedback("success", `Notebook "${name}" deleted.`);
    } catch (err) {
      console.error("Failed to delete notebook:", err);
      showFeedback("error", "Failed to delete notebook.");
    }
  }, [deleteTarget, activeNotebook, datasetId, showFeedback]);

  const handleRenameConfirm = useCallback(
    async (newName: string) => {
      if (!renameTarget || !datasetId) return;
      try {
        const updated = await notebookApi.saveNotebook(
          renameTarget.id,
          newName,
          renameTarget.notebookContent,
          renameTarget.isShared,
          datasetId,
        );
        setNotebooks((prev) =>
          prev.map((n) => (n.id === updated.id ? updated : n)),
        );
        if (activeNotebook?.id === updated.id) {
          setActiveNotebook(updated);
        }
        setRenameTarget(null);
        showFeedback("success", "Notebook renamed.");
      } catch (err) {
        console.error("Failed to rename notebook:", err);
        showFeedback("error", "Failed to rename notebook.");
      }
    },
    [renameTarget, activeNotebook, datasetId, showFeedback],
  );

  const handleToggleShare = useCallback(async () => {
    if (!activeNotebook || !datasetId) return;
    try {
      const updated = await notebookApi.saveNotebook(
        activeNotebook.id,
        activeNotebook.name,
        activeNotebook.notebookContent,
        !activeNotebook.isShared,
        datasetId,
      );
      setActiveNotebook(updated);
      setNotebooks((prev) =>
        prev.map((n) => (n.id === updated.id ? updated : n)),
      );
    } catch (err) {
      console.error("Failed to toggle sharing:", err);
      showFeedback("error", "Failed to update sharing.");
    }
  }, [activeNotebook, datasetId, showFeedback]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !datasetId) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          parseNotebookContent(content); // validate

          const baseName = file.name.replace(/\.(ipynb|sb|sbnb)$/, "");
          const name = generateUniqueName(
            baseName,
            notebooks.map((n) => n.name),
          );
          const created = await notebookApi.createNotebook(
            datasetId,
            name,
            content,
          );
          setNotebooks((prev) => [...prev, created]);
          setActiveNotebook(created);
          showFeedback("success", `Notebook "${name}" imported.`);
        } catch (err) {
          console.error("Failed to import notebook:", err);
          showFeedback(
            "error",
            "Failed to import notebook. Check that it is a valid .ipynb or starboard file.",
          );
        }
      };
      reader.readAsText(file);
      event.target.value = "";
    },
    [datasetId, notebooks, showFeedback],
  );

  const getNotebookContent = useCallback(() => {
    return serializeIpynb(notebookData);
  }, [notebookData]);

  const handleExport = useCallback(() => {
    if (!activeNotebook) return;
    const content = serializeIpynb(notebookData);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeNotebook.name}.ipynb`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [activeNotebook, notebookData]);

  const notebookNames = useMemo(
    () => notebooks.map((n) => n.name),
    [notebooks],
  );

  // Owner-only actions on shared notebooks. If either id is unknown we keep
  // current behavior (treat as owner) so we don't disable buttons for the
  // actual owner when identity data is missing.
  const isOwner =
    !activeNotebook ||
    !userId ||
    !activeNotebook.userId ||
    activeNotebook.userId === userId;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Loading notebooks...
      </div>
    );
  }

  return (
    <div className="notebook-manager">
      <NotebookHeader
        notebooks={notebooks}
        activeNotebook={activeNotebook}
        onSelect={handleSelect}
        onCreate={handleCreate}
        onSave={handleSave}
        onDelete={
          activeNotebook && isOwner
            ? () => setDeleteTarget(activeNotebook)
            : undefined
        }
        onRename={
          activeNotebook && isOwner
            ? () => setRenameTarget(activeNotebook)
            : undefined
        }
        onImport={handleImport}
        onExport={activeNotebook ? handleExport : undefined}
        onToggleShare={activeNotebook && isOwner ? handleToggleShare : undefined}
        isShared={activeNotebook?.isShared ?? false}
        canSave={isOwner}
        datasetId={datasetId}
        onSyncSuccess={handleSyncSuccess}
        onFeedback={showFeedback}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".ipynb,.sb,.sbnb"
        className="hidden"
        onChange={handleFileChange}
      />

      {!activeNotebook ? (
        <div className="notebook-manager__empty">
          <EmptyState
            hasNotebooks={notebooks.length > 0}
            onCreate={handleCreate}
            onImport={handleImport}
          />
        </div>
      ) : (
        <div className="notebook-manager__card">
          <div className="notebook-manager__content">
            <div className="notebook-manager__root">
              <div className="notebook-card">
                <Notebook
                  ref={notebookRef}
                  data={notebookData}
                  onChange={setNotebookData}
                  kernels={kernels}
                  kernelConfigs={kernelConfigs}
                  showToolbar={true}
                  showLineNumbers={true}
                  showKernelSelector={false}
                  theme={portalTheme}
                />
              </div>
            </div>

            <CodingAssistant
              open={chatOpen}
              onClose={() => setChatOpen(false)}
              datasetId={datasetId}
              getNotebookContent={getNotebookContent}
              getToken={getToken}
            />

            <div className="notebook-manager__fab">
              <button
                className="notebook-fab"
                onClick={() => setChatOpen((prev) => !prev)}
                title="Coding Assistant"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="24"
                  height="24"
                >
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
                  <path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {createDialogOpen && (
        <CreateNotebookDialog
          datasetId={datasetId}
          onConfirm={handleCreateConfirm}
          onCancel={() => setCreateDialogOpen(false)}
          existingNames={notebookNames}
        />
      )}

      {deleteTarget && (
        <DeleteDialog
          notebookName={deleteTarget.name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {renameTarget && (
        <RenameDialog
          currentName={renameTarget.name}
          existingNames={notebookNames}
          onConfirm={handleRenameConfirm}
          onCancel={() => setRenameTarget(null)}
        />
      )}

      {feedback && (
        <Snackbar
          type={feedback.type}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}
    </div>
  );
}
