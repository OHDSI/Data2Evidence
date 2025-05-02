import React, { useCallback, useState } from "react";
import { EdgeChange, MarkerType } from "reactflow";
import MenuIcon from "@mui/icons-material/Menu";
import CircularProgress from "@mui/material/CircularProgress";
import { IconButton, Menu, MenuItem } from "@mui/material";
import { api } from "../../axios/api";
import { useApp, useDialog, useField, useScannedSchema, useTable } from "../../contexts";
import { FIELD_SOURCE_MENU, FIELD_TARGET_MENU, TABLE_SOURCE_MENU, TABLE_TARGET_MENU } from "../../constants";
import { SelectVocabDatasetDialog } from "../SelectVocabDatasetDialog/SelectVocabDatasetDialog";
import { TerminologyProps } from "../../types/vocabSearchDialog";
import "./MenuButton.scss";

const SUGGEST_MAPPING_MENU_LABEL = "Suggest Mapping";

const MENU_ITEMS = [
  "New Mapping",
  "Open Mapping",
  "Save Mapping",
  "Open Vocabulary Search",
  "Change Vocabulary Dataset",
  SUGGEST_MAPPING_MENU_LABEL,
  "Delete All Mappings",
];

export const MenuButton = () => {
  const { reset, clearHandles, state } = useApp();
  const { scannedSchema } = useScannedSchema();
  const { setTableEdges } = useTable();
  const { setFieldEdges } = useField();
  const { openLoadMappingDialog, openSaveMappingDialog } = useDialog();
  const [isSelectDatasetDialogOpen, setIsDatasetSelectionDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const handleSuggestMapping = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.DataMapping.getSuggestedMapping(scannedSchema);

      const tableChanges: EdgeChange[] = [];
      const fieldChanges: EdgeChange[] = [];

      response.data.forEach((table) => {
        const sourceTable = table.source_table;
        const targetTable = table.OMOP_table;

        tableChanges.push({
          type: "reset",
          item: {
            source: TABLE_SOURCE_MENU,
            sourceHandle: sourceTable,
            target: TABLE_TARGET_MENU,
            targetHandle: targetTable,
            style: {
              strokeWidth: 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
            },
            id: `reactflow__edge-${TABLE_SOURCE_MENU}${sourceTable}-${TABLE_TARGET_MENU}${targetTable}`,
          },
        });

        Object.keys(table.columns_mapping).forEach((column) => {
          if (typeof table.columns_mapping[column] === "string") {
            const sourceColumn = column;
            const targetColumn = table.columns_mapping[column];

            fieldChanges.push({
              type: "reset",
              item: {
                source: FIELD_SOURCE_MENU,
                sourceHandle: `${sourceTable}-${sourceColumn}`,
                target: FIELD_TARGET_MENU,
                targetHandle: `${targetTable}-${targetColumn}`,
                style: {
                  strokeWidth: 2,
                },
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 20,
                  height: 20,
                },
                id: `reactflow__edge-${FIELD_SOURCE_MENU}${sourceTable}-${sourceColumn}-${FIELD_TARGET_MENU}${targetTable}-${targetColumn}`,
              },
            });
          }
        });
      });

      setTableEdges(tableChanges);
      setFieldEdges(fieldChanges);
    } catch (error) {
      console.log(`Error while getting suggested mapping`);
    } finally {
      setLoading(false);
    }
  }, [scannedSchema]);

  const handleMenuClick = useCallback(
    async (menuName: string) => {
      if (menuName === "New Mapping") {
        reset();
      } else if (menuName === "Delete All Mappings") {
        clearHandles();
      } else if (menuName === "Save Mapping") {
        openSaveMappingDialog(true);
      } else if (menuName === "Open Mapping") {
        openLoadMappingDialog(true);
      } else if (menuName === SUGGEST_MAPPING_MENU_LABEL) {
        await handleSuggestMapping();
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
    [
      reset,
      clearHandles,
      openSaveMappingDialog,
      openLoadMappingDialog,
      handleSuggestMapping,
      handleClose,
      state.saved,
      state.datasetSelected,
    ]
  );

  return (
    <div className="menu-button">
      <div className="menu">
        <IconButton onClick={handleClick}>{loading ? <CircularProgress size={24} /> : <MenuIcon />}</IconButton>
        <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
          {MENU_ITEMS.map(
            (item) =>
              (item !== SUGGEST_MAPPING_MENU_LABEL || state.mappingSuggestion) && (
                <MenuItem key={item} onClick={() => handleMenuClick(item)}>
                  {item}
                </MenuItem>
              )
          )}
        </Menu>
      </div>
      <SelectVocabDatasetDialog open={isSelectDatasetDialogOpen} onClose={handleCloseDatasetSelectionDialog} />
    </div>
  );
};
