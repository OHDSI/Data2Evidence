import { FC, useCallback, useEffect, useRef, useState } from "react";
import { CloseDialogType, SaveMappingDialog } from "./SaveMappingDialog/SaveMappingDialog";
import { useApp, useDialog } from "../contexts/hooks";
import { useNavigate } from "react-router-dom";

export const MappingFileDialogController: FC = () => {
  const { load, state } = useApp();
  const { saveMappingDialogVisible, loadMappingDialogVisible, openSaveMappingDialog, openLoadMappingDialog } =
    useDialog();
  const [nextAction, setNextAction] = useState<string | undefined>();
  const hiddenFileInput = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleOpenSaveDialog = useCallback(
    (nextAction?: string) => {
      setNextAction(nextAction);
      openSaveMappingDialog(true);
    },
    [openSaveMappingDialog]
  );

  const handleSelectFile = useCallback(() => {
    openLoadMappingDialog(false);
    hiddenFileInput.current && hiddenFileInput.current.click();
  }, []);

  // Handler for open file (with checking of unsaved changes)
  useEffect(() => {
    if (loadMappingDialogVisible) {
      if (!state.saved) {
        handleOpenSaveDialog("open-mapping");
      } else {
        handleSelectFile();
      }
    }
  }, [loadMappingDialogVisible, state.saved, handleOpenSaveDialog, handleSelectFile]);

  const handleFileUpload = useCallback(
    (event: any) => {
      const files = Array.from(event.target.files).map((file: any) => file);
      if (files.length >= 1) {
        const file = files[0];
        const reader = new FileReader();
        reader.onload = () => {
          const jsonData = reader.result as string;

          try {
            const json = JSON.parse(jsonData);
            console.debug("JSON content:", json);
            load(json);
            navigate("");
            window.location.reload();
          } catch (err) {
            console.error("Error parsing JSON:", err);
          }
        };
        reader.readAsText(file);
      }
    },
    [openLoadMappingDialog, load, navigate]
  );

  const handleCloseSaveDialog = useCallback(
    (type: CloseDialogType, nextAction?: string) => {
      openSaveMappingDialog(false);

      // Handle next-action after saved
      if (nextAction === "open-mapping") {
        if (type === "success") {
          handleSelectFile();
        } else if (type === "cancelled") {
          openLoadMappingDialog(false);
          setNextAction(undefined);
        }
      }
    },
    [handleSelectFile, openSaveMappingDialog, openLoadMappingDialog]
  );

  return (
    <>
      <SaveMappingDialog open={saveMappingDialogVisible} nextAction={nextAction} onClose={handleCloseSaveDialog} />
      <input
        ref={hiddenFileInput}
        type="file"
        accept=".json"
        onChange={handleFileUpload}
        onClick={(event) => {
          (event.target as any).value = null;
        }}
        style={{ display: "none" }}
        id="open-mapping-json"
      />
    </>
  );
};
