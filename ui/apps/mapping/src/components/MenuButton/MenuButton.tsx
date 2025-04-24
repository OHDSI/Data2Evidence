import React, { useCallback, useState } from "react";
import MenuIcon from "@mui/icons-material/Menu";
import { IconButton, Menu, MenuItem } from "@mui/material";
import { useApp, useDialog } from "../../contexts";
import { SelectVocabDatasetDialog } from "../SelectVocabDatasetDialog/SelectVocabDatasetDialog";
import { TerminologyProps } from "../../types/vocabSearchDialog";
import "./MenuButton.scss";

const MENU_ITEMS = [
  "New Mapping",
  "Open Mapping",
  "Save Mapping",
  "Open Vocabulary Search",
  "Change Vocabulary Dataset",
  "Delete All Mappings",
];

export const MenuButton = () => {
  const { reset, clearHandles, state } = useApp();
  const { openLoadMappingDialog, openSaveMappingDialog } = useDialog();
  const [isSelectDatasetDialogOpen, setIsDatasetSelectionDialogOpen] = useState(false);

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleOpenDatasetSelectDialog = useCallback(() => {
    setIsDatasetSelectionDialogOpen(true);
  }, []);

  const handleCloseDatasetSelectionDialog = useCallback(() => {
    setIsDatasetSelectionDialogOpen(false);
  }, []);

  const handleOpenVocabularySearch = useCallback(() => {
    const event = new CustomEvent<{ props: TerminologyProps }>("alp-terminology-open", {
      detail: {
        props: {
          mode: "CONCEPT_SEARCH",
          selectedDatasetId: state.datasetSelected,
          onClose: (onCloseValues) => {
            // No action to do if no concept set is being created
            if (!onCloseValues?.currentConceptSet) {
              return;
            }
          },
        },
      },
    });
    window.dispatchEvent(event);
  }, [state.datasetSelected]);

  const handleMenuClick = useCallback(
    (menuName: string) => {
      if (menuName === "New Mapping") {
        reset();
      } else if (menuName === "Delete All Mappings") {
        clearHandles();
      } else if (menuName === "Save Mapping") {
        openSaveMappingDialog(true);
      } else if (menuName === "Open Mapping") {
        openLoadMappingDialog(true);
      } else if (menuName === "Change Vocabulary Dataset") {
        handleOpenDatasetSelectDialog();
      } else if (menuName === "Open Vocabulary Search") {
        if (!state.datasetSelected) {
          handleOpenDatasetSelectDialog();
        } else {
          handleOpenVocabularySearch();
        }
      }

      handleClose();
    },
    [reset, clearHandles, openSaveMappingDialog, openLoadMappingDialog, handleClose, state.saved, state.datasetSelected]
  );

  return (
    <div className="menu-button">
      <div className="menu">
        <IconButton onClick={handleClick}>
          <MenuIcon />
        </IconButton>
        <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
          {MENU_ITEMS.map((item) => (
            <MenuItem key={item} onClick={() => handleMenuClick(item)}>
              {item}
            </MenuItem>
          ))}
        </Menu>
      </div>
      <SelectVocabDatasetDialog open={isSelectDatasetDialogOpen} onClose={handleCloseDatasetSelectionDialog} />
    </div>
  );
};
