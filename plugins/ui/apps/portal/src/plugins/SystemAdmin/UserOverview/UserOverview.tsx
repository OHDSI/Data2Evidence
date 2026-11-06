import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import { PageProps, SystemAdminPageMetadata } from "@portal/plugin";
import { ThemeProvider } from "@mui/material/styles";
import InputAdornment from "@mui/material/InputAdornment";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PersonPinOutlinedIcon from "@mui/icons-material/PersonPinOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import {
  buildMuiTheme,
  Button,
  Chip,
  EmptyState,
  FilterPanel,
  PageHeader,
  Pagination,
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
import { UserWithRolesInfoExt, CloseDialogType } from "../../../types";
import {
  Roles,
  ALP_ROLES,
  ALP_SYSTEM_ADMIN,
  ALP_USER_ADMIN,
  DATA_ADMIN_ROLES,
  STUDY_WRITE_DQD_RESEARCHER,
  TENANT_ROLES,
  ALP_DASHBOARD_VIEWER,
  STUDY_RESULTS_READ_RESEARCHER,
  ETL_MAPPING_CONTRIBUTOR,
} from "../../../config";
import { useTenants, useGroupCleanUp, useDialogHelper } from "../../../hooks";
import { useFeedback, useTranslation, useUser } from "../../../contexts";
import { api } from "../../../axios/api";
import DeleteUserDialog from "./DeleteUserDialog/DeleteUserDialog";
import EditTenantRoleDialog from "./EditTenantRoleDialog/EditTenantRoleDialog";
import AddUserDialog from "./AddUserDialog/AddUserDialog";
import { ChangeUserPasswordDialog } from "./ChangeUserPasswordDialog/ChangeUserPasswordDialog";
import { MoreActionButton } from "./MoreActionButton";
import { DataSourcePermissionDialog } from "./DataSourcePermissionDialog/DataSourcePermissionDialog";
import env from "../../../env";
import "./UserOverview.scss";

const idpRelyingParty = env.REACT_APP_IDP_RELYING_PARTY;
const isManagedUser = idpRelyingParty === "azure";
const theme = buildMuiTheme();
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

interface UserOverviewProps extends PageProps<SystemAdminPageMetadata> {}

export const UserOverview: FC<UserOverviewProps> = () => {
  const { getText, i18nKeys } = useTranslation();
  const { user: ctxUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | false>(false);

  const [tenants] = useTenants();
  const [activeUser, setActiveUser] = useState<UserWithRolesInfoExt | undefined>();
  const [userOverview, setUserOverview] = useState<UserWithRolesInfoExt[]>([]);
  const [alpUsers, setAlpUsers] = useState<UserWithRolesInfoExt[]>([]);
  const [alpDataAdmins, setAlpDataAdmins] = useState<UserWithRolesInfoExt[]>([]);
  const { setFeedback, setGenericErrorFeedback, setSuccessFeedback } = useFeedback();

  const [showEditRole, openEditRoleDialog, closeEditRoleDialog] = useDialogHelper(false);
  const [showDeleteUser, openDeleteUserDialog, closeDeleteUserDialog] = useDialogHelper(false);
  const [showAddUser, openAddUserDialog, closeAddUserDialog] = useDialogHelper(false);
  const [showPwd, openPwdDialog, closePwdDialog] = useDialogHelper(false);
  const [showDsPermission, openDsPermissionDialog, closeDsPermissionDialog] = useDialogHelper(false);

  // Trigger clean up groups when found deleted tenant in user's tenant
  const userTenants = useMemo(() => [...new Set(userOverview?.map((u) => u.tenantId) || [])], [userOverview]);
  const tenantIds = useMemo(() => tenants.map((t) => t.id) || [], [tenants]);
  useGroupCleanUp(userTenants, tenantIds);

  const fetchUserOverview = useCallback(
    async (withLoading = false) => {
      try {
        if (withLoading) setLoading(true);
        const users = await api.userMgmt.getUsersWithRoles();

        const overview = users.map((u) => {
          const tenant = tenants.find((t) => t.id === u.tenantId);
          return {
            ...u,
            tenantName: tenant?.name,
            system: tenant?.system,
          } as UserWithRolesInfoExt;
        });

        setUserOverview(overview);
        setAlpDataAdmins(overview.filter((u) => u.roles.some((r) => Object.keys(DATA_ADMIN_ROLES).includes(r))));
        setAlpUsers(overview.filter((u) => u.roles.some((r) => Object.keys(ALP_ROLES).includes(r))));
        return true;
      } catch (err: any) {
        if (err.data?.message) {
          setFeedback({ type: "error", message: err.data?.message });
        } else {
          setGenericErrorFeedback();
        }
        console.error("err", err);
        return false;
      } finally {
        if (withLoading) setLoading(false);
      }
    },
    [tenants, setFeedback, setGenericErrorFeedback]
  );

  useEffect(() => {
    fetchUserOverview(true);
  }, [fetchUserOverview]);

  const handleEditRole = useCallback(
    (user: UserWithRolesInfoExt) => {
      openEditRoleDialog();
      setActiveUser(user);
    },
    [openEditRoleDialog]
  );

  const handleActivateUser = useCallback(
    async (user: UserWithRolesInfoExt, active: boolean) => {
      try {
        await api.userMgmt.activateUser(user.userId, active);
      } catch (err) {
        console.error("Error when updating user active state", err);
        setFeedback({
          variant: "alert",
          type: "error",
          message: getText(active ? i18nKeys.USER_OVERVIEW__ACTIVATE_ERROR : i18nKeys.USER_OVERVIEW__DEACTIVATE_ERROR),
          autoClose: 5000,
        });
        return;
      }

      // fetchUserOverview handles its own errors (and shows its own error feedback),
      // so only show the success toast when the refresh also succeeded.
      const refreshed = await fetchUserOverview();
      if (refreshed) {
        setSuccessFeedback(
          getText(active ? i18nKeys.USER_OVERVIEW__ACTIVATE_SUCCESS : i18nKeys.USER_OVERVIEW__DEACTIVATE_SUCCESS)
        );
      }
    },
    [fetchUserOverview, setSuccessFeedback, setFeedback, getText, i18nKeys]
  );

  const closeEditRole = useCallback(
    async (type: CloseDialogType) => {
      const username = activeUser?.username;
      closeEditRoleDialog();
      setActiveUser(undefined);

      if (type === "success") {
        setSuccessFeedback(getText(i18nKeys.USER_OVERVIEW__EDIT_ROLE_SUCCESS, [username ?? ""]));
        await fetchUserOverview(true);
      }
    },
    [activeUser, fetchUserOverview, closeEditRoleDialog, setSuccessFeedback, getText, i18nKeys]
  );

  const handleDelete = useCallback(
    (user: UserWithRolesInfoExt) => {
      openDeleteUserDialog();
      setActiveUser(user);
    },
    [openDeleteUserDialog]
  );

  const closeDeleteUser = useCallback(
    async (type: CloseDialogType) => {
      closeDeleteUserDialog();
      setActiveUser(undefined);

      if (type === "success") {
        setSuccessFeedback(getText(i18nKeys.DELETE_USER_DIALOG__SUCCESS));
        await fetchUserOverview(true);
      }
    },
    [fetchUserOverview, closeDeleteUserDialog, setSuccessFeedback, getText, i18nKeys]
  );

  const getRole = useCallback((roles: string[]) => {
    const roleList: string[] = [];
    if (roles == null || roles.length === 0) {
      return [];
    }

    if (roles.includes(Roles.TENANT_VIEWER)) {
      roleList.push(TENANT_ROLES[Roles.TENANT_VIEWER]);
    }

    if (roles.includes(ALP_SYSTEM_ADMIN)) {
      roleList.push(DATA_ADMIN_ROLES[ALP_SYSTEM_ADMIN]);
    }

    if (roles.includes(ALP_USER_ADMIN)) {
      roleList.push(ALP_ROLES[ALP_USER_ADMIN]);
    }

    if (roles.includes(ALP_DASHBOARD_VIEWER)) {
      roleList.push(ALP_ROLES[ALP_DASHBOARD_VIEWER]);
    }

    if (roles.includes(STUDY_WRITE_DQD_RESEARCHER)) {
      roleList.push(ALP_ROLES[STUDY_WRITE_DQD_RESEARCHER]);
    }

    if (roles.includes(STUDY_RESULTS_READ_RESEARCHER)) {
      roleList.push(ALP_ROLES[STUDY_RESULTS_READ_RESEARCHER]);
    }

    if (roles.includes(ETL_MAPPING_CONTRIBUTOR)) {
      roleList.push(ALP_ROLES[ETL_MAPPING_CONTRIBUTOR]);
    }

    return roleList;
  }, []);

  const dataAdminRoles = useMemo(
    () => alpDataAdmins?.find((u) => u.userId === activeUser?.userId && u.system === activeUser?.system)?.roles || [],
    [activeUser, alpDataAdmins]
  );

  const alpRoles = useMemo(
    () => alpUsers?.find((u) => u.userId === activeUser?.userId)?.roles || [],
    [activeUser, alpUsers]
  );

  const closeAddUser = useCallback(
    async (type: CloseDialogType) => {
      closeAddUserDialog();

      if (type === "success") {
        setSuccessFeedback(getText(i18nKeys.ADD_USER_DIALOG__SUCCESS));
        await fetchUserOverview(true);
      }
    },
    [fetchUserOverview, closeAddUserDialog, setSuccessFeedback, getText, i18nKeys]
  );

  const handleOpenPasswordDialog = useCallback(
    (user: UserWithRolesInfoExt) => {
      setActiveUser(user);
      openPwdDialog();
    },
    [openPwdDialog]
  );

  const handleOpenDsPermission = useCallback(
    (user: UserWithRolesInfoExt) => {
      setActiveUser(user);
      openDsPermissionDialog();
    },
    [openDsPermissionDialog]
  );

  const handleCloseDsPermission = useCallback(() => {
    setActiveUser(undefined);
    closeDsPermissionDialog();
  }, [closeDsPermissionDialog]);

  const handleClosePasswordDialog = useCallback(() => {
    setActiveUser(undefined);
    closePwdDialog();
  }, [closePwdDialog]);

  const filterDefs: FilterDef[] = useMemo(
    () => [
      {
        id: "roles",
        label: getText(i18nKeys.USER_OVERVIEW__FILTER_ROLES),
        icon: <PersonPinOutlinedIcon />,
        control: { kind: "multiSelect" },
      },
      {
        id: "status",
        label: getText(i18nKeys.USER_OVERVIEW__FILTER_STATUS),
        icon: <CheckCircleOutlineIcon />,
        control: { kind: "singleSelect" },
      },
    ],
    [getText, i18nKeys]
  );

  const filterOptions = useMemo(() => {
    const roles = [...new Set(userOverview.filter((u) => u.active).flatMap((u) => getRole(u.roles)))].sort();
    return {
      roles: roles.map((r) => ({ value: r, label: r })),
      status: [
        { value: "active", label: getText(i18nKeys.USER_OVERVIEW__ACTIVE) },
        { value: "inactive", label: getText(i18nKeys.USER_OVERVIEW__INACTIVE) },
      ],
    };
  }, [userOverview, getRole, getText, i18nKeys]);

  const filters = useFilters({ defs: filterDefs, options: filterOptions, filtersLocally: false });

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    const roleFilter = filters.state.roles?.op === "in" ? filters.state.roles.values : [];
    const statusFilter = filters.state.status?.op === "in" ? filters.state.status.values : [];
    const list = userOverview.filter(
      (u) =>
        (!term || u.username.toLowerCase().includes(term)) &&
        (roleFilter.length === 0 || (u.active && getRole(u.roles).some((r) => roleFilter.includes(r)))) &&
        (statusFilter.length === 0 || statusFilter.includes(u.active ? "active" : "inactive"))
    );
    if (!sortDir) return list;
    const sorted = [...list].sort((a, b) => a.username.localeCompare(b.username, undefined, { numeric: true }));
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [userOverview, search, sortDir, filters.state, getRole]);

  const pageUsers = useMemo(() => {
    const lastPage = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
    const currentPage = Math.min(Math.max(1, page), lastPage);
    return filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredUsers, page, pageSize]);

  const toggleSort = useCallback(() => {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    setPage(1);
  }, []);

  const isUserAdmin = ctxUser.isUserAdmin;

  const content = () => {
    if (loading) {
      return (
        <div className="d2e-users__content d2e-users__content--center">
          <Spinner center />
        </div>
      );
    }
    if (filteredUsers.length === 0) {
      return (
        <div className="d2e-users__content d2e-users__content--center">
          <EmptyState title={getText(i18nKeys.USER_OVERVIEW__NO_DATA)} description="" />
        </div>
      );
    }
    return (
      <div className="d2e-users__content">
        <div className="d2e-users__tablewrap">
          <Table className={isUserAdmin ? undefined : "d2e-users__table--readonly"}>
            <TableHead>
              <TableRow>
                <TableCell header sortable sortDirection={sortDir} onSort={toggleSort}>
                  {getText(i18nKeys.USER_OVERVIEW__USERNAME)}
                </TableCell>
                <TableCell header>{getText(i18nKeys.USER_OVERVIEW__ROLE)}</TableCell>
                <TableCell header>{getText(i18nKeys.USER_OVERVIEW__STATUS)}</TableCell>
                {isUserAdmin && <TableCell header />}
              </TableRow>
            </TableHead>
            <TableBody>
              {pageUsers.map((user) => (
                <TableRow hover key={`${user.tenantId}-${user.username}`}>
                  <TableCell className="d2e-users__name">{user.username}</TableCell>
                  <TableCell>
                    <div className="d2e-users__roles">
                      {user.active && getRole(user.roles).map((r) => <Chip key={r} variant="multiselect" label={r} />)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Chip
                      variant={user.active ? "positive" : "neutral"}
                      label={getText(user.active ? i18nKeys.USER_OVERVIEW__ACTIVE : i18nKeys.USER_OVERVIEW__INACTIVE)}
                    />
                  </TableCell>
                  {isUserAdmin && (
                    <TableCell align="right">
                      <div className="d2e-users__actions">
                        {!isManagedUser && (
                          <Button
                            variant="ghost"
                            className="d2e-users__edit"
                            prependIcon={<EditOutlinedIcon />}
                            onClick={() => handleEditRole(user)}
                          >
                            {getText(i18nKeys.USER_OVERVIEW__EDIT)}
                          </Button>
                        )}
                        <MoreActionButton
                          user={user}
                          canDelete={!isManagedUser}
                          onActivateClick={() => handleActivateUser(user, !user.active)}
                          onChangePasswordClick={() => handleOpenPasswordDialog(user)}
                          onDeleteClick={() => handleDelete(user)}
                          onDataSourcePermissionClick={() => handleOpenDsPermission(user)}
                        />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Pagination
          page={page}
          pageSize={pageSize}
          totalCount={filteredUsers.length}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <div className="d2e-users">
        <div className="d2e-users__card">
          <PageHeader
            overline={getText(i18nKeys.USER_OVERVIEW__ADMIN)}
            title={getText(i18nKeys.USER_OVERVIEW__USERS)}
            actions={
              isUserAdmin &&
              !isManagedUser && (
                <Button variant="primary" prependIcon={<AddIcon />} onClick={openAddUserDialog}>
                  {getText(i18nKeys.USER_OVERVIEW__ADD_USER)}
                </Button>
              )
            }
          />

          <div className="d2e-users__toolbar">
            <TextField
              className="d2e-users__search"
              placeholder={getText(i18nKeys.USER_OVERVIEW__SEARCH)}
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <FilterPanel
              defs={filterDefs}
              state={filters.state}
              options={filters.options}
              onChange={(next) => {
                filters.setState(next);
                setPage(1);
              }}
              filtersLabel={getText(i18nKeys.USER_OVERVIEW__FILTERS)}
              clearLabel={getText(i18nKeys.USER_OVERVIEW__CLEAR_FILTERS)}
            />
          </div>

          {content()}
        </div>

        <AddUserDialog open={showAddUser} onClose={closeAddUser} />
        <EditTenantRoleDialog
          user={activeUser}
          dataAdminUserRoles={dataAdminRoles}
          alpUserRoles={alpRoles}
          open={showEditRole}
          onClose={closeEditRole}
        />
        <DataSourcePermissionDialog user={activeUser} open={showDsPermission} onClose={handleCloseDsPermission} />
        <DeleteUserDialog user={activeUser} open={showDeleteUser} onClose={closeDeleteUser} />
        {activeUser && (
          <ChangeUserPasswordDialog
            userId={activeUser.userId}
            userName={activeUser.username}
            open={showPwd}
            onClose={handleClosePasswordDialog}
          />
        )}
      </div>
    </ThemeProvider>
  );
};
