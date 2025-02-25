import React, { ChangeEvent, FC, useCallback, useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableContainer, TableHead, TablePagination } from "@mui/material";
import {
  Box,
  Button,
  IconButton,
  Loader,
  TableCell,
  TablePaginationActions,
  TableRow,
  Title,
  TrashIcon,
} from "@portal/components";
import { useFeedback, useTranslation } from "../../../contexts";
import { api } from "../../../axios/api";
import { CloseDialogType, TrexPlugin } from "../../../types";
import { i18nKeys } from "../../../contexts/app-context/states";
import { useDialogHelper } from "../../../hooks";
import { ChipEllipsis } from "./ChipEllipsis";
import TrexPluginInstallDialog from "./TrexPluginInstallDialog/TrexPluginInstallDialog";
import TrexPluginUninstallDialog from "./TrexPluginUninstallDialog/TrexPluginUninstallDialog";
import "./TrexPlugins.scss";

export const TrexPlugins: FC = () => {
  const { getText } = useTranslation();
  const [data, setData] = useState<TrexPlugin[]>([]);
  const [loading, setLoading] = useState(false);
  const [refetch, setRefetch] = useState(0);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const pageData = useMemo(() => data.slice(rowsPerPage * page, rowsPerPage * (page + 1)), [data, rowsPerPage, page]);

  const { setFeedback } = useFeedback();
  const [installing, setInstalling] = useState<string>("");
  const [showInstallDialog, openInstallDialog, closeInstallDialog] = useDialogHelper(false);

  const [activePlugin, setActivePlugin] = useState<TrexPlugin | undefined>();
  const [showUninstallDialog, openUninstallDialog, closeUninstallDialog] = useDialogHelper(false);

  const fetchTrexPlugins = useCallback(async () => {
    try {
      setLoading(refetch ? false : true);
      const trexPlugins = await api.trex.getPlugins();
      setData(trexPlugins);
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [refetch]);

  useEffect(() => {
    fetchTrexPlugins();
  }, [fetchTrexPlugins]);

  const handleRowsPerPageChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(Number(event.target.value) || 25);
    setPage(0);
  }, []);

  const handlePageChange = useCallback((event: React.MouseEvent<HTMLButtonElement> | null, page: number) => {
    setPage(page);
  }, []);

  const handleUpdate = useCallback(async (name: string) => {
    try {
      setInstalling(name);
      await api.trex.updatePlugin(name);

      setFeedback({
        type: "success",
        message: getText(i18nKeys.TREX_PLUGINS__UPDATE_SUCCESS),
        autoClose: 6000,
      });

      setRefetch((r) => r + 1);
    } catch (error: any) {
      console.error(error);
      setFeedback({
        type: "error",
        message: getText(i18nKeys.TREX_PLUGINS__UPDATE_FAILED_ERROR_MESSAGE),
        description: getText(i18nKeys.TREX_PLUGINS__UPDATE_FAILED_ERROR_DESCRIPTION),
      });
    } finally {
      setInstalling("");
    }
  }, []);

  const handleInstall = useCallback(async (name: string) => {
    try {
      setInstalling(name);
      await api.trex.installPlugin(name);

      setFeedback({
        type: "success",
        message: getText(i18nKeys.TREX_PLUGINS__INSTALL_SUCCESS),
        autoClose: 6000,
      });

      setRefetch((r) => r + 1);
    } catch (error: any) {
      console.error(error);
      setFeedback({
        type: "error",
        message: getText(i18nKeys.TREX_PLUGINS__INSTALL_FAILED_ERROR_MESSAGE),
        description: getText(i18nKeys.TREX_PLUGINS__INSTALL_FAILED_ERROR_DESCRIPTION),
      });
    } finally {
      setInstalling("");
    }
  }, []);

  const handleCloseInstallDialog = useCallback(
    (type: CloseDialogType) => {
      closeInstallDialog();
      if (type === "success") {
        setRefetch((refetch) => refetch + 1);
      }
    },
    [closeInstallDialog]
  );

  const handleUninstall = useCallback((plugin: TrexPlugin) => {
    openUninstallDialog();
    setActivePlugin(plugin);
  }, []);

  const handleCloseDeleteDialog = useCallback(
    (type: CloseDialogType) => {
      closeUninstallDialog();
      if (type === "success") {
        setRefetch((refetch) => refetch + 1);
      }
    },
    [closeInstallDialog]
  );

  if (loading) return <Loader />;

  return (
    <div className="trex-plugins">
      <Box display="flex" alignItems="baseline" paddingLeft="50px" paddingRight="50px" paddingBottom="10px">
        <Box flex="1">
          <Title>{getText(i18nKeys.TREX_PLUGINS__TITLE)}</Title>
        </Box>
        <Button text={getText(i18nKeys.TREX_PLUGINS__INSTALL_NEW_PLUGIN)} onClick={openInstallDialog} />
      </Box>
      <TableContainer className="trex-plugins__table">
        <Table>
          <colgroup>
            <col style={{ width: 400 }} />
            <col style={{ width: 200 }} />
            <col style={{ width: 200 }} />
            <col style={{ width: 200 }} />
            <col />
            <col />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableCell>{getText(i18nKeys.TREX_PLUGINS__NAME)}</TableCell>
              <TableCell>{getText(i18nKeys.TREX_PLUGINS__VERSION)}</TableCell>
              <TableCell>{getText(i18nKeys.TREX_PLUGINS__LATEST_VERSION)}</TableCell>
              <TableCell>{getText(i18nKeys.TREX_PLUGINS__URL)}</TableCell>
              <TableCell>{getText(i18nKeys.TREX_PLUGINS__STATUS)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(!data || data.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  {getText(i18nKeys.TREX_PLUGINS__NO_DATA)}
                </TableCell>
              </TableRow>
            )}
            {pageData.map((row) => (
              <TableRow key={row.name}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.version && <ChipEllipsis label={row.version} />}</TableCell>
                <TableCell>{row.registry_version && <ChipEllipsis label={row.registry_version} />}</TableCell>
                <TableCell>{row.url}</TableCell>
                <TableCell>
                  {installing === row.name ? (
                    <Loader type="horizontal" text={getText(i18nKeys.TREX_PLUGINS__INSTALLING)} />
                  ) : row.installed ? (
                    row.version === row.registry_version ? (
                      "Latest"
                    ) : (
                      <Button variant="outlined" text="Update" onClick={() => handleUpdate(row.name)} />
                    )
                  ) : (
                    <Button variant="outlined" text="Install" onClick={() => handleInstall(row.name)} />
                  )}
                </TableCell>
                <TableCell>
                  {row.installed && (
                    <IconButton
                      startIcon={<TrashIcon />}
                      title={getText(i18nKeys.TREX_PLUGINS__UNINSTALL)}
                      onClick={() => handleUninstall(row)}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {data.length > 0 && (
        <TablePagination
          component="div"
          count={data.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          onPageChange={handlePageChange}
          ActionsComponent={TablePaginationActions}
          sx={{
            overflow: "visible",
            height: "52px",
            "& .MuiButtonBase-root:not(.Mui-disabled)": { color: "#000080" },
            marginRight: "35px",
          }}
        />
      )}
      <TrexPluginInstallDialog open={showInstallDialog} onClose={handleCloseInstallDialog} />
      <TrexPluginUninstallDialog plugin={activePlugin} open={showUninstallDialog} onClose={handleCloseDeleteDialog} />
    </div>
  );
};
