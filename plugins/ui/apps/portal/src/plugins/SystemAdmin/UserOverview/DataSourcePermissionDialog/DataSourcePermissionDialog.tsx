import React, { FC, useLayoutEffect, useMemo, useState } from "react";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import ScheduleIcon from "@mui/icons-material/Schedule";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import {
  Button,
  Chip,
  Dialog,
  EmptyState,
  FilterPanel,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  useFilters,
  type FilterDef,
} from "ui-react";
import { UserWithRolesInfoExt } from "../../../../types";
import { useFeedback, useTranslation } from "../../../../contexts";
import { AddDataSourceMenu } from "./AddDataSourceMenu";
import { ConfirmPermissionDialog } from "./ConfirmPermissionDialog";
import { DataSourcePermissionRow, useUserDataSourcePermissions } from "./useUserDataSourcePermissions";
import "./DataSourcePermissionDialog.scss";

interface DataSourcePermissionDialogProps {
  user?: UserWithRolesInfoExt;
  open: boolean;
  onClose: () => void;
}

type PendingConfirm = { kind: "reject" | "revoke"; row: DataSourcePermissionRow };

export const DataSourcePermissionDialog: FC<DataSourcePermissionDialogProps> = ({ user, open, onClose }) => {
  const { getText, i18nKeys } = useTranslation();
  const { setFeedback } = useFeedback();
  const { rows, loading, error, assignableDatasets, approve, reject, revoke, add } = useUserDataSourcePermissions(
    open ? user : undefined
  );
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc" | false>(false);
  const [approving, setApproving] = useState<string>();
  const [confirm, setConfirm] = useState<PendingConfirm>();

  const username = user?.username ?? "";

  const statusLabels: Record<DataSourcePermissionRow["status"], string> = {
    pending: getText(i18nKeys.DATA_SOURCE_PERMISSION__PENDING),
    access: getText(i18nKeys.DATA_SOURCE_PERMISSION__HAVE_ACCESS),
  };

  const filterDefs: FilterDef<DataSourcePermissionRow>[] = useMemo(
    () => [
      {
        id: "status",
        label: getText(i18nKeys.DATA_SOURCE_PERMISSION__ACCESS_STATUS),
        control: { kind: "singleSelect" },
        icon: <CheckCircleOutlineIcon />,
        options: {
          source: "static",
          items: [
            { value: "pending", label: getText(i18nKeys.DATA_SOURCE_PERMISSION__PENDING) },
            { value: "access", label: getText(i18nKeys.DATA_SOURCE_PERMISSION__HAVE_ACCESS) },
          ],
        },
      },
    ],
    [getText, i18nKeys]
  );

  const searchedRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? rows.filter((r) => r.name.toLowerCase().includes(term)) : rows;
  }, [rows, search]);

  const filters = useFilters({ defs: filterDefs, rows: searchedRows });
  const { clear: clearFilters } = filters;

  useLayoutEffect(() => {
    if (!open) return;
    setSearch("");
    setSortDir(false);
    setConfirm(undefined);
    clearFilters();
  }, [open, user?.userId, clearFilters]);

  const visibleRows = useMemo(() => {
    const list = filters.result ?? searchedRows;
    if (!sortDir) return list;
    const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [filters.result, searchedRows, sortDir]);

  const notify = (type: "success" | "error", message: string, title?: string) =>
    setFeedback({ variant: "alert", type, title, message, autoClose: 5000 });

  const notifySuccess = (key: Parameters<typeof getText>[0], params: string[]) => {
    const parts = getText(key).split(/\{(\d+)\}/);
    const richMessage = parts.map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{params[Number(part)]}</strong> : <React.Fragment key={i}>{part}</React.Fragment>
    );
    setFeedback({ variant: "alert", type: "success", message: getText(key, params), richMessage, autoClose: 5000 });
  };

  const handleApprove = async (row: DataSourcePermissionRow) => {
    setApproving(row.key);
    try {
      await approve(row);
      notifySuccess(i18nKeys.DATA_SOURCE_PERMISSION__APPROVE_SUCCESS, [username]);
    } catch (err) {
      console.error("Error when approving access request", err);
      notify(
        "error",
        getText(i18nKeys.DATA_SOURCE_PERMISSION__APPROVE_ERROR),
        getText(i18nKeys.DATA_SOURCE_PERMISSION__APPROVE_ERROR_TITLE)
      );
    } finally {
      setApproving(undefined);
    }
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    const { kind, row } = confirm;
    try {
      if (kind === "reject") {
        await reject(row);
        notifySuccess(i18nKeys.DATA_SOURCE_PERMISSION__REJECT_SUCCESS, [username]);
      } else {
        await revoke(row);
        notifySuccess(i18nKeys.DATA_SOURCE_PERMISSION__REVOKE_SUCCESS, [username]);
      }
      setConfirm(undefined);
    } catch (err) {
      console.error(`Error when trying to ${kind} data source access`, err);
      if (kind === "reject") {
        notify(
          "error",
          getText(i18nKeys.DATA_SOURCE_PERMISSION__REJECT_ERROR),
          getText(i18nKeys.DATA_SOURCE_PERMISSION__REJECT_ERROR_TITLE)
        );
      } else {
        notify(
          "error",
          getText(i18nKeys.DATA_SOURCE_PERMISSION__REVOKE_ERROR),
          getText(i18nKeys.DATA_SOURCE_PERMISSION__REVOKE_ERROR_TITLE)
        );
      }
    }
  };

  const handleAdd = async (dataset: Parameters<typeof add>[0]) => {
    const name = dataset.studyDetail?.name || dataset.id;
    try {
      await add(dataset);
      notifySuccess(i18nKeys.DATA_SOURCE_PERMISSION__ADD_SUCCESS, [username, name]);
    } catch (err) {
      console.error("Error when adding data source access", err);
      notify(
        "error",
        getText(i18nKeys.DATA_SOURCE_PERMISSION__ADD_ERROR),
        getText(i18nKeys.DATA_SOURCE_PERMISSION__ADD_ERROR_TITLE)
      );
    }
  };

  const actions = (row: DataSourcePermissionRow) =>
    row.status === "pending" ? (
      <>
        <Button
          variant="positive"
          prependIcon={<CheckCircleOutlineIcon />}
          loading={approving === row.key}
          disabled={approving != null}
          onClick={() => handleApprove(row)}
        >
          {getText(i18nKeys.DATA_SOURCE_PERMISSION__APPROVE)}
        </Button>
        <Button
          variant="danger"
          prependIcon={<HighlightOffIcon />}
          disabled={approving != null}
          onClick={() => setConfirm({ kind: "reject", row })}
        >
          {getText(i18nKeys.DATA_SOURCE_PERMISSION__REJECT)}
        </Button>
      </>
    ) : (
      <Button
        variant="danger"
        prependIcon={<RemoveCircleOutlineIcon />}
        onClick={() => setConfirm({ kind: "revoke", row })}
      >
        {getText(i18nKeys.DATA_SOURCE_PERMISSION__REVOKE)}
      </Button>
    );

  const content = () => {
    if (loading) {
      return (
        <div className="d2e-dsp__state">
          <Spinner center />
        </div>
      );
    }
    if (error) {
      return (
        <div className="d2e-dsp__state">
          <EmptyState title={getText(i18nKeys.DATA_SOURCE_PERMISSION__LOAD_ERROR)} description="" />
        </div>
      );
    }
    if (rows.length === 0) {
      return (
        <div className="d2e-dsp__state d2e-dsp__state--empty">
          <EmptyState
            icon={<DescriptionOutlinedIcon className="d2e-dsp__empty-icon" />}
            title={getText(i18nKeys.DATA_SOURCE_PERMISSION__EMPTY_TITLE)}
            description={
              <>
                {getText(i18nKeys.DATA_SOURCE_PERMISSION__EMPTY_DESCRIPTION_1)}
                <strong>{getText(i18nKeys.DATA_SOURCE_PERMISSION__ADD_DATA_SOURCE)}</strong>
                {getText(i18nKeys.DATA_SOURCE_PERMISSION__EMPTY_DESCRIPTION_2)}
              </>
            }
          />
        </div>
      );
    }
    if (visibleRows.length === 0) {
      return (
        <div className="d2e-dsp__state">
          <EmptyState title={getText(i18nKeys.DATA_SOURCE_PERMISSION__NO_MATCH)} description="" />
        </div>
      );
    }
    return (
      <div className="d2e-dsp__tablewrap">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell
                header
                sortable
                sortDirection={sortDir}
                onSort={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              >
                {getText(i18nKeys.DATA_SOURCE_PERMISSION__DATA_SOURCE)}
              </TableCell>
              <TableCell header>{getText(i18nKeys.DATA_SOURCE_PERMISSION__ROLE)}</TableCell>
              <TableCell header>{getText(i18nKeys.DATA_SOURCE_PERMISSION__STATUS)}</TableCell>
              <TableCell header className="d2e-dsp__action-cell">
                {getText(i18nKeys.DATA_SOURCE_PERMISSION__ACTION)}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((row) => (
              <TableRow key={row.key}>
                <TableCell className="d2e-dsp__name">{row.name}</TableCell>
                <TableCell>{row.roleLabel}</TableCell>
                <TableCell>
                  {row.status === "pending" ? (
                    <Chip variant="pending-access" icon={<ScheduleIcon />} label={statusLabels.pending} />
                  ) : (
                    <Chip variant="have-access" icon={<CheckCircleOutlineIcon />} label={statusLabels.access} />
                  )}
                </TableCell>
                <TableCell className="d2e-dsp__action-cell">
                  <div className="d2e-dsp__actions">{actions(row)}</div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const confirmText = () => {
    if (!confirm) return null;
    const ds = <strong>{confirm.row.name}</strong>;
    const who = <strong>{`${username}'s`}</strong>;
    return confirm.kind === "reject" ? (
      <>
        {getText(i18nKeys.DATA_SOURCE_PERMISSION__REJECT_CONFIRM_1)}
        {who}
        {getText(i18nKeys.DATA_SOURCE_PERMISSION__REJECT_CONFIRM_2)}
        {ds}
        {getText(i18nKeys.DATA_SOURCE_PERMISSION__REJECT_CONFIRM_3)}
      </>
    ) : (
      <>
        {getText(i18nKeys.DATA_SOURCE_PERMISSION__REVOKE_CONFIRM_1)}
        {who}
        {getText(i18nKeys.DATA_SOURCE_PERMISSION__REVOKE_CONFIRM_2)}
        {ds}
        {getText(i18nKeys.DATA_SOURCE_PERMISSION__REVOKE_CONFIRM_3)}
      </>
    );
  };

  return (
    <>
      <Dialog
        open={open}
        size="l"
        className="d2e-dsp"
        title={getText(i18nKeys.DATA_SOURCE_PERMISSION__TITLE)}
        onClose={onClose}
      >
        <p className="d2e-dsp__user">{getText(i18nKeys.DATA_SOURCE_PERMISSION__USER, [username])}</p>
        <div className="d2e-dsp__toolbar">
          <div className="d2e-dsp__toolbar-start">
            <TextField
              className="d2e-dsp__search"
              hideDetails
              placeholder={getText(i18nKeys.DATA_SOURCE_PERMISSION__SEARCH)}
              value={search}
              onChange={setSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <FilterPanel
              defs={filterDefs as FilterDef[]}
              state={filters.state}
              options={filters.options}
              onChange={filters.setState}
              filtersLabel={getText(i18nKeys.DATA_SOURCE_PERMISSION__FILTERS)}
              clearLabel={getText(i18nKeys.DATA_SOURCE_PERMISSION__CLEAR_FILTERS)}
            />
          </div>
          <AddDataSourceMenu
            key={open ? user?.userId : undefined}
            datasets={assignableDatasets}
            disabled={loading || error}
            onAdd={handleAdd}
          />
        </div>
        {content()}
      </Dialog>

      <ConfirmPermissionDialog
        open={confirm != null}
        danger={confirm?.kind === "revoke"}
        title={getText(
          confirm?.kind === "revoke"
            ? i18nKeys.DATA_SOURCE_PERMISSION__REVOKE_TITLE
            : i18nKeys.DATA_SOURCE_PERMISSION__REJECT_TITLE
        )}
        confirmLabel={getText(
          confirm?.kind === "revoke"
            ? i18nKeys.DATA_SOURCE_PERMISSION__REVOKE_CONFIRM
            : i18nKeys.DATA_SOURCE_PERMISSION__CONFIRM
        )}
        onConfirm={handleConfirm}
        onClose={() => setConfirm(undefined)}
      >
        {confirmText()}
      </ConfirmPermissionDialog>
    </>
  );
};

export default DataSourcePermissionDialog;
