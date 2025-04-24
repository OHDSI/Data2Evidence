import React, { FC, useCallback, useState } from "react";
import { SelectChangeEvent, SxProps } from "@mui/material";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableHead from "@mui/material/TableHead";
import TableContainer from "@mui/material/TableContainer";
import Alert from "@mui/material/Alert";
import Select from "@mui/material/Select";
import {
  Button,
  FormControl,
  IconButton,
  Loader,
  MenuItem,
  TableCell,
  TableRow,
  Title,
  TrashIcon,
} from "@portal/components";
import { useDatabases, useDialogHelper } from "../../../hooks";
import { CloseDialogType, IDatabase } from "../../../types";
import { SaveDbDialog } from "./SaveDbDialog/SaveDbDialog";
import { EditDbCredentialsDialog } from "./EditDbCredentialsDialog/EditDbCredentialsDialog";
import { DeleteDbDialog } from "./DeleteDbDialog/DeleteDbDialog";
import { EditDbDetailsDialog } from "./EditDbDetailsDialog/EditDbDetailsDialog";
import "./Db.scss";
import { useTranslation } from "../../../contexts";

const styles: SxProps = {
  color: "#000080",
  ".MuiInputLabel-root": {
    color: "#000080",
    "&.MuiInputLabel-shrink, &.Mui-focused": {
      color: "var(--color-neutral)",
    },
  },
  ".MuiInput-input:focus": {
    backgroundColor: "transparent",
    color: "#000080",
  },
  ".MuiInput-root": {
    "&::after, &:hover:not(.Mui-disabled)::before": {
      borderBottom: "2px solid #000080",
    },
  },
  "&.MuiMenuItem-root:hover": {
    backgroundColor: "#ebf2fa",
  },
};

interface Action {
  name: string;
  value: string;
}

const actionsList: Action[] = [
  { name: "Details", value: "details" },
  { name: "Credentials", value: "credentials" },
];

export const Db: FC = () => {
  const { getText, i18nKeys } = useTranslation();
  const [refetch, setRefetch] = useState(0);
  const [databases, loading, error] = useDatabases(refetch);
  const [selectedDb, setSelectedDb] = useState<IDatabase>();
  const [showSaveDialog, openSaveDialog, closeSaveDialog] = useDialogHelper(false);
  const [showEditCredentialsDialog, openEditCredentialsDialog, closeEditCredentialsDialog] = useDialogHelper(false);
  const [showEditDetailsDialog, openEditDetailsDialog, closeEditDetailsDialog] = useDialogHelper(false);
  const [showDeleteDialog, openDeleteDialog, closeDeleteDialog] = useDialogHelper(false);

  const handleAdd = useCallback(() => {
    setSelectedDb(undefined);
    openSaveDialog();
  }, [openSaveDialog]);

  const handleCloseSaveDialog = useCallback(
    (type: CloseDialogType) => {
      if (type === "success") {
        setRefetch((refetch) => refetch + 1);
      }
      closeSaveDialog();
    },
    [closeSaveDialog]
  );

  const handleEditCredentials = useCallback(
    (db: IDatabase) => {
      setSelectedDb(db);
      openEditCredentialsDialog();
    },
    [openEditCredentialsDialog]
  );

  const handleEditDetails = useCallback(
    (db: IDatabase) => {
      setSelectedDb(db);
      openEditDetailsDialog();
    },
    [openEditDetailsDialog]
  );

  const handleDelete = useCallback(
    (db: IDatabase) => {
      setSelectedDb(db);
      openDeleteDialog();
    },
    [openDeleteDialog]
  );

  const handleCloseEditCredentialsDialog = useCallback(
    (type: CloseDialogType) => {
      if (type === "success") {
        setRefetch((refetch) => refetch + 1);
      }
      closeEditCredentialsDialog();
    },
    [closeEditCredentialsDialog]
  );

  const handleCloseEditDetailsDialog = useCallback(
    (type: CloseDialogType) => {
      if (type === "success") {
        setRefetch((refetch) => refetch + 1);
      }
      closeEditDetailsDialog();
    },
    [closeEditDetailsDialog]
  );

  const handleCloseDeleteDialog = useCallback(
    (type: CloseDialogType) => {
      if (type === "success") {
        setRefetch((refetch) => refetch + 1);
      }
      closeDeleteDialog();
    },
    [closeDeleteDialog]
  );

  const handleActionChange = useCallback(
    (event: SelectChangeEvent<string>, db: IDatabase) => {
      switch (event.target.value) {
        case "details":
          handleEditDetails(db);
          break;
        case "credentials":
          handleEditCredentials(db);
          break;
        default:
          break;
      }
    },
    [handleEditDetails, handleEditCredentials]
  );

  if (error) {
    return (
      <Alert severity="error" className="alert">
        {error.message}
      </Alert>
    );
  }

  if (loading) {
    return <Loader text={getText(i18nKeys.DB__LOADER)} />;
  }

  return (
    <div className="db">
      <div className="db__header">
        <Title>{getText(i18nKeys.DB__DATABASES)}</Title>
        <div className="db__add-button">
          <Button text={getText(i18nKeys.DB__ADD_DATABASE)} onClick={handleAdd} />
        </div>
      </div>
      <TableContainer className="db__list">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{getText(i18nKeys.DB__CODE)}</TableCell>
              <TableCell>{getText(i18nKeys.DB__NAME)}</TableCell>
              <TableCell>{getText(i18nKeys.DB__HOST)}</TableCell>
              <TableCell>{getText(i18nKeys.DB__PORT)}</TableCell>
              <TableCell>{getText(i18nKeys.DB__DIALECT)}</TableCell>
              <TableCell style={{ width: "280px" }}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {databases?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  {getText(i18nKeys.DB__NO_DATA)}
                </TableCell>
              </TableRow>
            )}
            {databases?.map((db) => (
              <TableRow key={db.id}>
                <TableCell>{db.code}</TableCell>
                <TableCell>{db.name}</TableCell>
                <TableCell>{db.host}</TableCell>
                <TableCell>{db.port}</TableCell>
                <TableCell>{db.dialect}</TableCell>
                <TableCell>
                  <div className="db__button-group">
                    <FormControl sx={styles}>
                      <Select
                        value=""
                        onChange={(event) => handleActionChange(event, db)}
                        displayEmpty
                        sx={styles}
                        renderValue={(value) => (value ? value : getText(i18nKeys.DB__EDIT))}
                      >
                        {actionsList.map((action: Action) => (
                          <MenuItem value={action.value} key={action.name} sx={styles} disableRipple>
                            {action.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <IconButton
                      startIcon={<TrashIcon />}
                      title={getText(i18nKeys.DB__DELETE)}
                      onClick={() => handleDelete(db)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <SaveDbDialog open={showSaveDialog} onClose={handleCloseSaveDialog} />
      {selectedDb && (
        <EditDbCredentialsDialog
          open={showEditCredentialsDialog}
          onClose={handleCloseEditCredentialsDialog}
          db={selectedDb}
        />
      )}
      {selectedDb && (
        <EditDbDetailsDialog open={showEditDetailsDialog} onClose={handleCloseEditDetailsDialog} db={selectedDb} />
      )}
      {selectedDb && <DeleteDbDialog open={showDeleteDialog} onClose={handleCloseDeleteDialog} db={selectedDb} />}
    </div>
  );
};
