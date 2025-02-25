import React, { ChangeEvent, FC, useCallback, useMemo } from "react";
import { saveAs } from "file-saver";
import { Button, EditIcon, IconButton, Checkbox, DownloadIcon, Tooltip } from "@portal/components";
import { useDialogHelper } from "../../../../hooks";
import { useFeedback, useTranslation, useUser } from "../../../../contexts";
import {
  convertStarboardToJupyter,
  convertJupyterToStarboard,
  notebookContentToText,
  textToNotebookContent,
} from "../../utils/jupystar";
import { StarboardNotebook } from "../../utils/notebook";
import { api } from "../../../../axios/api";
import DeleteNotebookDialog from "../DeleteNotebookDialog/DeleteNotebookDialog";
import { EditTitleDialog } from "../EditTitleDialog/EditTitleDialog";
import NotebookSelect from "../NotebookSelect/NotebookSelect";
import "./NotebookHeader.scss";

interface HeaderProps {
  metadata: any;
  notebooks: StarboardNotebook[] | undefined;
  activeNotebook: StarboardNotebook | undefined;
  updateActiveNotebook: (notebook?: StarboardNotebook) => void;
  currentContent: () => any;
  createNotebook: () => void;
  fetchNotebooks: (runInBackground?: boolean) => Promise<void>;
  zipUrl: string;
  isShared: boolean | undefined;
  setIsShared: React.Dispatch<React.SetStateAction<boolean | undefined>>;
  activeDatasetId: string;
}

export const Header: FC<HeaderProps> = ({
  metadata,
  notebooks,
  activeNotebook,
  updateActiveNotebook,
  currentContent,
  createNotebook,
  fetchNotebooks,
  zipUrl,
  isShared,
  setIsShared,
  activeDatasetId,
}) => {
  const { getText, i18nKeys } = useTranslation();
  const { user } = useUser();
  const isNotUserNotebook = useMemo(() => user.idpUserId !== activeNotebook?.userId, [activeNotebook]);
  const { setFeedback } = useFeedback();
  const [showEditTitleDialog, openEditTitleDialog, closeEditTitleDialog] = useDialogHelper(false);
  const [showDeleteNotebookDialog, openDeleteNotebookDialog, closeDeleteNotebookDialog] = useDialogHelper(false);

  const deleteNotebook = useCallback(async () => {
    try {
      if (activeNotebook) {
        await api.studyNotebook.deleteNotebook(activeNotebook.id, activeDatasetId);
        setFeedback({
          type: "success",
          message: getText(i18nKeys.HEADER__FILE_DELETED),
        });
      }
      fetchNotebooks();
    } catch (err) {
      console.error(err);
      setFeedback({
        type: "error",
        message: getText(i18nKeys.HEADER__ERROR_DELETE),
      });
    }
  }, [activeNotebook, fetchNotebooks, setFeedback, getText]);

  // Save to database
  const saveNotebook = useCallback(async () => {
    try {
      const currNotebookSource = currentContent();
      // Push the currNotebookSource to backend
      if (activeNotebook) {
        const newNotebook = await api.studyNotebook.saveNotebook(
          activeNotebook?.id,
          activeNotebook?.name,
          currNotebookSource,
          !!isShared,
          activeDatasetId
        );
        fetchNotebooks(true);
        updateActiveNotebook(newNotebook);
        setFeedback({
          type: "success",
          message: getText(i18nKeys.HEADER__SAVED),
        });
      }
    } catch (err) {
      console.error(err);
      setFeedback({
        type: "error",
        message: getText(i18nKeys.HEADER__ERROR_SAVED),
      });
    }
  }, [currentContent, activeNotebook, fetchNotebooks, updateActiveNotebook, setFeedback, isShared, getText]);

  // Rename activeNotebook Name
  const renameNotebookName = useCallback(
    async (name: string) => {
      try {
        if (activeNotebook) {
          const newNotebook = await api.studyNotebook.saveNotebook(
            activeNotebook?.id,
            name,
            activeNotebook?.notebookContent,
            !!isShared,
            activeDatasetId
          );
          fetchNotebooks(true);
          updateActiveNotebook(newNotebook);
          setFeedback({
            type: "success",
            message: getText(i18nKeys.HEADER__RENAME_SUCCESS),
          });
        }
      } catch (err) {
        console.error(err);
        setFeedback({
          type: "error",
          message: getText(i18nKeys.HEADER__RENAME_ERROR),
        });
      }
    },
    [activeNotebook, fetchNotebooks, updateActiveNotebook, setFeedback, isShared, getText]
  );

  const setNotebookShared = useCallback(
    (isShared: boolean) => {
      setIsShared(isShared);
    },
    [isShared, setIsShared]
  );

  // Create a reference to the hidden file input element
  const hiddenFileInput = React.useRef<HTMLInputElement>(null);

  const handleJupyterInput = () => {
    if (hiddenFileInput.current !== null) {
      hiddenFileInput.current.click();
    }
  };

  // Check Jupyter Notebook Name if it exist in the database
  const checkNotebookName = async (name: string) => {
    let isFound = true;
    let nameCount = 0;
    let notebookName = name;

    // Loop continues when the name + number is found
    while (isFound) {
      const exist = notebooks && notebooks.some((note) => note.name === notebookName);
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

  const importJupyterFile = async (event: any) => {
    const myFile = event.target.files[0];
    const text = await myFile.text();
    try {
      let notebookName = myFile.name.replace(".ipynb", "");
      notebookName = await checkNotebookName(notebookName);
      const notebook_json = await JSON.parse(text);
      const jupyterFile = notebook_json;
      const starboardNotebook = convertJupyterToStarboard(jupyterFile, {});

      const jupyterSbSource = notebookContentToText(starboardNotebook);
      const newNotebook = await api.studyNotebook.createNotebook(activeDatasetId, notebookName, jupyterSbSource);
      fetchNotebooks(true);
      updateActiveNotebook(newNotebook);
      setIsShared(newNotebook.isShared);
    } catch (err) {
      setFeedback({
        type: "error",
        message: getText(i18nKeys.HEADER__IMPORT_ERROR),
      });
    }
  };

  // Convert Starboard Notebook Source to Jupyter Notebook v4
  // Exporting the .ipynb file
  const exportJupyterNb = async () => {
    const nbString = currentContent();
    const notebookContent = textToNotebookContent(nbString);
    const jupyter = convertStarboardToJupyter(notebookContent, {});
    const jupyterString = JSON.stringify(jupyter);
    const jupyterFile = new Blob([jupyterString], { type: "application/x-ipynb+json" });
    const fileName = activeNotebook?.name + ".ipynb";
    saveAs(jupyterFile, fileName || "notebook.ipynb");
  };

  const handleEditTitle = useCallback(() => {
    openEditTitleDialog();
  }, [openEditTitleDialog]);

  const handleDeleteNotebook = useCallback(() => {
    openDeleteNotebookDialog();
  }, [openDeleteNotebookDialog]);

  return (
    <div className="notebook-header">
      <div className="notebook-header__content">
        <div className="notebook-header__content_title">
          <NotebookSelect
            notebooks={notebooks}
            activeNotebook={activeNotebook}
            updateActiveNotebook={updateActiveNotebook}
            setIsShared={setIsShared}
          />
          <IconButton startIcon={<EditIcon />} onClick={handleEditTitle} disabled={isNotUserNotebook} />
        </div>
        <div className="title-edit-button">
          <Checkbox
            checked={isShared}
            label={getText(i18nKeys.HEADER__SHARE)}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setNotebookShared(event.target.checked);
            }}
            disabled={isNotUserNotebook}
          />
          <Button variant="text" text={getText(i18nKeys.HEADER__EXPORT)} onClick={exportJupyterNb} />
          <Button variant="text" text={getText(i18nKeys.HEADER__IMPORT)} onClick={handleJupyterInput} />
          <input
            type="file"
            name="jupyterFile"
            ref={hiddenFileInput}
            onChange={importJupyterFile}
            style={{ display: "none" }}
          />
          <Button variant="text" text={getText(i18nKeys.HEADER__NEW)} onClick={createNotebook} />
          <Button variant="text" text={getText(i18nKeys.HEADER__SAVE)} onClick={saveNotebook} />
          <Button
            variant="text"
            text={getText(i18nKeys.HEADER__DELETE)}
            onClick={handleDeleteNotebook}
            disabled={isNotUserNotebook}
          />
          <Tooltip title={getText(i18nKeys.HEADER__DOWNLOAD)}>
            <div>
              <IconButton startIcon={<DownloadIcon />} onClick={() => window.open(zipUrl, "_blank")} />
            </div>
          </Tooltip>
        </div>
      </div>
      {showEditTitleDialog && (
        <EditTitleDialog
          title={activeNotebook?.name}
          open={showEditTitleDialog}
          onClose={closeEditTitleDialog}
          renameNotebook={renameNotebookName}
          notebooks={notebooks}
        />
      )}
      {showDeleteNotebookDialog && (
        <DeleteNotebookDialog
          open={showDeleteNotebookDialog}
          onClose={closeDeleteNotebookDialog}
          onDelete={deleteNotebook}
          notebook={activeNotebook}
        />
      )}
    </div>
  );
};
