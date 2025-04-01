import React, { FC, useState, useCallback } from "react";
import { Box } from "@portal/components";
import { useDatasetTagConfigs, useDialogHelper } from "../../../../hooks";
import { TableContainer, Table, TableHead, TableBody, Alert } from "@mui/material";
import { Button, IconButton, Loader, TableCell, TableRow, TrashIcon } from "@portal/components";
import { AddTagDialog } from "./AddTagDialog/AddTagDialog";
import { DeleteTagDialog } from "./DeleteTagDialog/DeleteTagDialog";
import "./TagTable.scss";
import { useTranslation } from "../../../../contexts";

const TagTable: FC = () => {
  const { getText, i18nKeys } = useTranslation();
  const [refetch, setRefetch] = useState(0);
  const [selectedTagName, setSelectedTagName] = useState("");
  const [tagConfigs, loading, error] = useDatasetTagConfigs(refetch);
  const [showAddTagDialog, openAddTagDialog, closeAddTagDialog] = useDialogHelper(false);
  const [showDeleteTagDialog, openDeleteTagDialog, closeDeleteTagDialog] = useDialogHelper(false);

  const handleAdd = useCallback(() => {
    openAddTagDialog();
  }, [openAddTagDialog]);

  const handleDelete = useCallback(
    (tagName: string) => {
      setSelectedTagName(tagName);
      openDeleteTagDialog();
    },
    [openDeleteTagDialog]
  );

  if (error) {
    return (
      <Alert severity="error" className="alert">
        {error.message}
      </Alert>
    );
  }

  if (loading) {
    return <Loader text={getText(i18nKeys.TAG_TABLE__LOADER)} />;
  }

  return (
    <>
      <Box>
        <div className="metadata-tag-table__add-button">
          <Button text={getText(i18nKeys.TAG_TABLE__ADD_TAG)} onClick={handleAdd} />
        </div>
        <TableContainer className="metadata-tag-table__table">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{getText(i18nKeys.TAG_TABLE__TAG)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tagConfigs.map((metadataTagName: string) => {
                return (
                  <TableRow key={metadataTagName}>
                    <TableCell>{metadataTagName}</TableCell>
                    <TableCell>
                      <IconButton
                        startIcon={<TrashIcon />}
                        title={getText(i18nKeys.TAG_TABLE__DELETE)}
                        onClick={() => handleDelete(metadataTagName)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      <AddTagDialog open={showAddTagDialog} onClose={closeAddTagDialog} setRefetch={setRefetch} />
      <DeleteTagDialog
        open={showDeleteTagDialog}
        onClose={closeDeleteTagDialog}
        name={selectedTagName}
        setRefetch={setRefetch}
      />
    </>
  );
};

export default TagTable;
