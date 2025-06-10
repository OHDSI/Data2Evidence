import { StarboardEmbed } from "@data2evidence/d2e-starboard-wrap";
import AssistantIcon from "@mui/icons-material/Assistant";
import Fab from "@mui/material/Fab";
import { ChatItem } from "@nlux/react";
import { Card, Loader } from "@portal/components";
import { PageProps, ResearcherStudyMetadata } from "@portal/plugin";
import React, { FC, useCallback, useEffect, useState } from "react";
import { api } from "../../axios/api";
import Chat from "../../components/Chat/Chat";
import { useConversationHistory, useFeedback, useTranslation } from "../../contexts";
import { i18nKeys } from "../../contexts/app-context/states";
import env from "../../env";
import { useDialogHelper } from "../../hooks";
import { EmptyNotebook } from "./components/EmptyNotebook";
import { Header } from "./components/NotebookHeader/NotebookHeader";
import { NotebookTemplateDialog } from "./components/NotebookTemplateDialog/NotebookTemplateDialog";
import "./Starboard.scss";
import { convertJupyterToStarboard, notebookContentToText } from "./utils/jupystar";
import { StarboardNotebook } from "./utils/notebook";

const MRI_ROOT_URL = "analytics-svc";
const uiFilesUrl = env.REACT_APP_DN_BASE_URL;
interface StarboardProps extends PageProps<ResearcherStudyMetadata> {}

export const Starboard: FC<StarboardProps> = ({ metadata }) => {
  const [open, setOpen] = useState(false);
  const { getText } = useTranslation();
  const { setFeedback } = useFeedback();
  const [loading, setLoading] = useState(true);
  const activeDatasetId = metadata?.studyId!;
  // JWT Token and Jupyter Kernel Extraction
  const [jwtToken, setJWTToken] = useState("");

  const setupPYQE = `\n#%% [python]
import os
import micropip
await micropip.install('ssl')
await micropip.install('pyjwt==2.9.0')
await micropip.install('${uiFilesUrl}starboard-notebook-base/pyodidepyqe-0.0.2-py3-none-any.whl', keep_going=True)
os.environ['PYQE_URL'] = '${MRI_ROOT_URL}/'
os.environ['TOKEN'] = '${jwtToken}'
os.environ['PYQE_TLS_CLIENT_CA_CERT_PATH'] = ''`;

  const [runtime, setRuntime] = useState<StarboardEmbed>();
  const [unsaved, setUnsaved] = useState(false);

  const [notebooks, setNotebooks] = useState<StarboardNotebook[]>();
  const [activeNotebook, setActiveNotebook] = useState<StarboardNotebook | undefined>();
  const [isShared, setIsShared] = useState<boolean | undefined>();
  const { setConversationHistory } = useConversationHistory();

  const updateActiveNotebook = useCallback((notebook?: StarboardNotebook) => {
    setActiveNotebook(notebook);
    setIsShared(notebook?.isShared ?? false);
  }, []);

  const fetchNotebooks = useCallback(
    async (runInBackground?: boolean) => {
      try {
        if (!runInBackground) setLoading(true);
        const notebooks = await api.studyNotebook.getNotebookList(activeDatasetId);
        if (notebooks.length === 0) updateActiveNotebook(undefined);
        if (!runInBackground) updateActiveNotebook(notebooks[0]);
        setNotebooks(notebooks);
      } catch (err) {
        console.error(err);
        setFeedback({
          type: "error",
          message: getText(i18nKeys.STARBOARD__ERROR_FETCH),
        });
      } finally {
        setLoading(false);
      }
    },
    [setFeedback, getText, updateActiveNotebook, activeDatasetId]
  );

  useEffect(() => {
    fetchNotebooks();
  }, [fetchNotebooks]);

  const loadNotebookContent = useCallback(
    async (notebookContent: string) => {
      if (jwtToken === "") {
        const findJwtToken = (await metadata?.getToken()) || "";
        setJWTToken(findJwtToken);
      }
      notebookContent += setupPYQE;
      const mount = document.querySelector("#starboard-root");
      while (mount?.firstChild) {
        mount.removeChild(mount.firstChild);
      }

      const embedEl = new StarboardEmbed({
        notebookContent: notebookContent || "",
        src: `${uiFilesUrl}starboard-notebook-base/index.html`,
        preventNavigationWithUnsavedChanges: true,
        serverUrl: uiFilesUrl,
        token: jwtToken,
        userId: metadata?.userId,
        datasetId: activeDatasetId,
        onUnsavedChangesStatusChange: () => setUnsaved(true),
      });

      mount?.appendChild(embedEl);
      setRuntime(embedEl);
      setUnsaved(false);
    },
    [jwtToken, metadata, activeDatasetId, setupPYQE]
  );

  useEffect(() => {
    if (notebooks?.length !== 0 && activeNotebook && activeNotebook !== undefined) {
      const notebookContent = activeNotebook?.notebookContent || "";
      loadNotebookContent(notebookContent);
    }
  }, [activeNotebook, loadNotebookContent, notebooks]);

  const handleReadContent = useCallback(() => {
    return runtime?.notebookContent || "";
  }, [runtime]);

  const createNotebook = useCallback(
    async (name?: string) => {
      try {
        const notebookName = name || "Untitled";
        const newNotebook: StarboardNotebook = await api.studyNotebook.createNotebook(
          activeDatasetId,
          notebookName,
          ""
        );
        fetchNotebooks(true);
        updateActiveNotebook(newNotebook);
        setFeedback({
          type: "success",
          message: getText(i18nKeys.STARBOARD__SUCCESS_CREATE_NOTEBOOK, [notebookName]),
        });
      } catch (err) {
        console.error(err);
        setFeedback({
          type: "error",
          message: getText(i18nKeys.STARBOARD__ERROR_CREATE),
        });
      }
    },
    [fetchNotebooks, updateActiveNotebook, setFeedback, getText, activeDatasetId]
  );

  const createNotebookFromTemplate = useCallback(
    async (templateId: string, name: string) => {
      try {
        const newNotebook: StarboardNotebook = await api.studyNotebook.createNotebookFromTemplate(
          templateId,
          name,
          activeDatasetId
        );
        fetchNotebooks(true);
        updateActiveNotebook(newNotebook);
        setFeedback({
          type: "success",
          message: getText(i18nKeys.STARBOARD__SUCCESS_CREATE_FROM_TEMPLATE, [name]),
        });
      } catch (err) {
        console.error(err);
        setFeedback({
          type: "error",
          message: getText(i18nKeys.STARBOARD__ERROR_CREATE_FROM_TEMPLATE),
        });
      }
    },
    [fetchNotebooks, updateActiveNotebook, setFeedback, activeDatasetId]
  );

  const [showTemplateDialog, openTemplateDialog, closeTemplateDialog] = useDialogHelper(false);

  const handleCreateNotebook = useCallback(() => {
    openTemplateDialog();
  }, [openTemplateDialog]);

  // Check Jupyter Notebook Name if it exist in the database
  const checkNotebookName = async (name: string) => {
    const allNotebooks: any[] = await api.studyNotebook.getNotebookList(activeDatasetId);
    let isFound = true;
    let nameCount = 0;
    let notebookName = name;

    // Loop continues when the name + number is found
    while (isFound) {
      const exist = allNotebooks.some((note) => note.name === notebookName);
      if (exist) {
        // Found a notebook with matching name
        nameCount++;
        notebookName = name + ` ${nameCount}`;
      } else {
        isFound = false;
      }
    }

    return notebookName;
  };

  // Import Jupyter Notebook and create the notebook.
  const importJupyterNb = async (event: any) => {
    const myFile = event.target.files[0];
    const text = await myFile.text();
    try {
      let notebookName = myFile.name.replace(".ipynb", "");
      notebookName = await checkNotebookName(notebookName);
      const notebook_json = await JSON.parse(text);
      const jupyterFile = notebook_json;
      // Starboard Notebook in NotebookContent typeof data
      const starboardNotebook = convertJupyterToStarboard(jupyterFile, {});
      // Converting NotebookContent to Starboard String
      const notebookContent = notebookContentToText(starboardNotebook);
      const newNotebook: StarboardNotebook = await api.studyNotebook.createNotebook(
        activeDatasetId,
        notebookName,
        notebookContent
      );
      fetchNotebooks(true);
      updateActiveNotebook(newNotebook);
    } catch (err) {
      console.error(err);
      setFeedback({
        type: "error",
        message: getText(i18nKeys.STARBOARD__ERROR_IMPORT),
      });
    }
  };

  const handleChatClose = useCallback(
    (chatHistory: ChatItem[]) => {
      setConversationHistory(chatHistory);
      setOpen(false);
    },
    [setConversationHistory]
  );

  if (loading) {
    return <Loader />;
  }

  if (notebooks?.length === 0) {
    return (
      <>
        <EmptyNotebook createNotebook={handleCreateNotebook} importJupyterNb={importJupyterNb} />
        {showTemplateDialog && (
          <NotebookTemplateDialog
            open={showTemplateDialog}
            onClose={closeTemplateDialog}
            onCreateBlank={(name: string) => createNotebook(name)}
            onCreateFromTemplate={createNotebookFromTemplate}
            activeDatasetId={activeDatasetId}
          />
        )}
      </>
    );
  }

  return (
    <div className="starboard">
      <Header
        metadata={metadata}
        notebooks={notebooks}
        activeNotebook={activeNotebook}
        updateActiveNotebook={updateActiveNotebook}
        currentContent={handleReadContent}
        createNotebook={handleCreateNotebook}
        fetchNotebooks={fetchNotebooks}
        isShared={isShared}
        setIsShared={setIsShared}
        activeDatasetId={activeDatasetId}
      />
      <Card>
        <Fab
          color="primary"
          aria-label="assistant"
          onClick={() => {
            setOpen(true);
          }}
          className="chat-button"
        >
          <AssistantIcon />
        </Fab>
        <div id="starboard-root" />
      </Card>
      <Chat open={open} onClose={handleChatClose} datasetId={activeDatasetId} currentContent={handleReadContent} />
      {showTemplateDialog && (
        <NotebookTemplateDialog
          open={showTemplateDialog}
          onClose={closeTemplateDialog}
          onCreateBlank={(name: string) => createNotebook(name)}
          onCreateFromTemplate={createNotebookFromTemplate}
          activeDatasetId={activeDatasetId}
        />
      )}
    </div>
  );
};
