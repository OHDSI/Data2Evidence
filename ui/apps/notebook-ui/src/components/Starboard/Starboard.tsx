import React, { FC, useCallback, useEffect, useState } from "react";
import { Card, Loader } from "@portal/components";
import { StarboardEmbed } from "@data2evidence/d2e-starboard-wrap";

import { useConversationHistory, useFeedback, useTranslation, i18nKeys } from "../../contexts";
import { useDialogHelper } from "../../hooks";
import { api } from "../../api";

import { EmptyNotebook } from "./components/EmptyNotebook";
import { Header } from "./components/NotebookHeader/NotebookHeader";
import { NotebookTemplateDialog } from "./components/NotebookTemplateDialog/NotebookTemplateDialog";
import { convertJupyterToStarboard, notebookContentToText } from "./utils/jupystar";
import { StarboardNotebook } from "../../types/notebook";

import Chat from "../Chat/Chat";
import ChatIcon from "@mui/icons-material/Chat";
import Fab from "@mui/material/Fab";
import { ChatItem } from "@nlux/react";
import "./Starboard.scss";

interface StarboardProps {
  datasetId?: string;
  userId?: string;
  getToken?: () => Promise<string>;
  uiFilesUrl?: string;
}

export const Starboard: FC<StarboardProps> = ({ datasetId, userId, getToken, uiFilesUrl }) => {
  const { getText } = useTranslation();
  const { setFeedback } = useFeedback();
  const [loading, setLoading] = useState(true);
  const [jwtToken, setJWTToken] = useState("");
  const [unsaved, setUnsaved] = useState(false);

  const [runtime, setRuntime] = useState<StarboardEmbed>();
  const [notebooks, setNotebooks] = useState<StarboardNotebook[]>();
  const [activeNotebook, setActiveNotebook] = useState<StarboardNotebook | undefined>();
  const [isShared, setIsShared] = useState<boolean | undefined>();

  const [open, setOpen] = useState(false);
  const { setConversationHistory } = useConversationHistory();

  const [showTemplateDialog, openTemplateDialog, closeTemplateDialog] = useDialogHelper(false);

  const activeDatasetId = datasetId!;

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

  const loadNotebookContent = useCallback(
    async (notebookContent: string) => {
      if (jwtToken === "") {
        const findJwtToken = (await getToken?.()) || "";
        setJWTToken(findJwtToken);
      }
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
        userId: userId,
        datasetId: activeDatasetId,
        onUnsavedChangesStatusChange: () => setUnsaved(true),
      });

      mount?.appendChild(embedEl);
      setRuntime(embedEl);
      setUnsaved(false);
    },
    [jwtToken, getToken, userId, activeDatasetId]
  );

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
    [fetchNotebooks, updateActiveNotebook, setFeedback, getText, activeDatasetId]
  );

  const handleCreateNotebook = useCallback(() => {
    openTemplateDialog();
  }, [openTemplateDialog]);

  // Check Jupyter Notebook Name if it exist in the database
  const checkNotebookName = useCallback(
    async (name: string) => {
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
    },
    [activeDatasetId]
  );

  // Import Jupyter Notebook and create the notebook.
  const importJupyterNb = useCallback(
    async (event: any) => {
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
    },
    [activeDatasetId, fetchNotebooks, updateActiveNotebook, setFeedback, getText, checkNotebookName]
  );

  const handleChatClose = useCallback(
    (chatHistory: ChatItem[]) => {
      setConversationHistory(chatHistory);
      setOpen(false);
    },
    [setConversationHistory]
  );

  const handleChatOpen = useCallback(() => {
    setOpen((prev) => !prev);
    setTimeout(() => {
      const chatSegmentsContainer = document.querySelector(".nlux-chatSegments-container");
      if (chatSegmentsContainer && chatSegmentsContainer.lastElementChild) {
        (chatSegmentsContainer.lastElementChild as HTMLElement).scrollIntoView({ behavior: "auto", block: "end" });
      }
      const chatInputContainer = document.querySelector(".nlux-comp-composer textarea") as HTMLTextAreaElement;
      if (chatInputContainer) {
        chatInputContainer.focus();
      }
    }, 0);
  }, []);

  useEffect(() => {
    fetchNotebooks();
  }, [fetchNotebooks]);

  useEffect(() => {
    if (notebooks?.length !== 0 && activeNotebook) {
      const notebookContent = activeNotebook?.notebookContent || "";
      loadNotebookContent(notebookContent);
    }
  }, [activeNotebook, loadNotebookContent, notebooks]);

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
            notebooks={notebooks}
          />
        )}
      </>
    );
  }

  return (
    <div className="starboard">
      <Header
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
        <div className="starboard-content">
          <div id="starboard-root" />
          <Chat open={open} onClose={handleChatClose} datasetId={activeDatasetId} currentContent={handleReadContent} />
          <div className="starboard-button-container">
            <Fab color="primary" aria-label="assistant" onClick={handleChatOpen}>
              <ChatIcon />
            </Fab>
          </div>
        </div>
      </Card>
      {showTemplateDialog && (
        <NotebookTemplateDialog
          open={showTemplateDialog}
          onClose={closeTemplateDialog}
          onCreateBlank={(name: string) => createNotebook(name)}
          onCreateFromTemplate={createNotebookFromTemplate}
          activeDatasetId={activeDatasetId}
          notebooks={notebooks}
        />
      )}
    </div>
  );
};
