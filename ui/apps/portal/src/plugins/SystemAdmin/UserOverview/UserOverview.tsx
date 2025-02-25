import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import { PageProps, SystemAdminPageMetadata } from "@portal/plugin";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableHead from "@mui/material/TableHead";
import TableContainer from "@mui/material/TableContainer";
import Chip from "@mui/material/Chip";
import { Button, EditIcon, IconButton, Loader, TableCell, TableRow, TrashIcon } from "@portal/components";
import { UserWithRolesInfoExt, CloseDialogType } from "../../../types";
import {
  Roles,
  ALP_ROLES,
  ALP_SYSTEM_ADMIN,
  ALP_SQLEDITOR_ADMIN,
  ALP_USER_ADMIN,
  DATA_ADMIN_ROLES,
  TENANT_ROLES,
  ALP_DASHBOARD_VIEWER,
} from "../../../config";
import { useTenants, useGroupCleanUp, useDialogHelper } from "../../../hooks";
import { useFeedback, useTranslation, useUser } from "../../../contexts";
import { api } from "../../../axios/api";
import DeleteUserDialog from "./DeleteUserDialog/DeleteUserDialog";
import EditTenantRoleDialog from "./EditTenantRoleDialog/EditTenantRoleDialog";
import AddUserDialog from "./AddUserDialog/AddUserDialog";
import { ChangeUserPasswordDialog } from "./ChangeUserPasswordDialog/ChangeUserPasswordDialog";
import { MoreActionButton } from "./MoreActionButton";
import env from "../../../env";
import "./UserOverview.scss";

const idpRelyingParty = env.REACT_APP_IDP_RELYING_PARTY;
const isManagedUser = idpRelyingParty === "azure";

interface UserOverviewProps extends PageProps<SystemAdminPageMetadata> {}

export const UserOverview: FC<UserOverviewProps> = () => {
  const { getText, i18nKeys } = useTranslation();
  const { user: ctxUser } = useUser();
  const [loading, setLoading] = useState(false);

  const [tenants] = useTenants();
  const [activeUser, setActiveUser] = useState<UserWithRolesInfoExt | undefined>();
  const [userOverview, setUserOverview] = useState<UserWithRolesInfoExt[]>([]);
  const [alpUsers, setAlpUsers] = useState<UserWithRolesInfoExt[]>([]);
  const [alpDataAdmins, setAlpDataAdmins] = useState<UserWithRolesInfoExt[]>([]);
  const { setFeedback, setGenericErrorFeedback } = useFeedback();

  const [showEditRole, openEditRoleDialog, closeEditRoleDialog] = useDialogHelper(false);
  const [showDeleteUser, openDeleteUserDialog, closeDeleteUserDialog] = useDialogHelper(false);
  const [showAddUser, openAddUserDialog, closeAddUserDialog] = useDialogHelper(false);
  const [showPwd, openPwdDialog, closePwdDialog] = useDialogHelper(false);

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
      } catch (err: any) {
        if (err.data?.message) {
          setFeedback({ type: "error", message: err.data?.message });
        } else {
          setGenericErrorFeedback();
        }
        console.error("err", err);
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
      await api.userMgmt.activateUser(user.userId, active);
      fetchUserOverview();
    },
    [fetchUserOverview]
  );

  const closeEditRole = useCallback(
    async (type: CloseDialogType) => {
      closeEditRoleDialog();
      setActiveUser(undefined);

      if (type === "success") {
        await fetchUserOverview();
      }
    },
    [fetchUserOverview, closeEditRoleDialog]
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
        await fetchUserOverview();
      }
    },
    [fetchUserOverview, closeDeleteUserDialog]
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

    if (roles.includes(ALP_SQLEDITOR_ADMIN)) {
      roleList.push(DATA_ADMIN_ROLES[ALP_SQLEDITOR_ADMIN]);
    }

    if (roles.includes(ALP_USER_ADMIN)) {
      roleList.push(ALP_ROLES[ALP_USER_ADMIN]);
    }

    if (roles.includes(ALP_DASHBOARD_VIEWER)) {
      roleList.push(ALP_ROLES[ALP_DASHBOARD_VIEWER]);
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
        await fetchUserOverview();
      }
    },
    [fetchUserOverview, closeAddUserDialog]
  );

  const handleOpenPasswordDialog = useCallback(
    (user: UserWithRolesInfoExt) => {
      setActiveUser(user);
      openPwdDialog();
    },
    [openPwdDialog]
  );

  const handleClosePasswordDialog = useCallback(() => {
    setActiveUser(undefined);
    closePwdDialog();
  }, [closePwdDialog]);

  const buttonColWidth = ctxUser.isUserAdmin ? "36%" : "0%";
  const roleWidth = ctxUser.isUserAdmin ? "40%" : "50%";
  const emailWidth = ctxUser.isUserAdmin ? "27%" : "30%";

  if (loading) return <Loader />;

  return (
    <div className="users__container">
      <div className="users">
        <div className="users__actions">
          <h3 className="users__actions-title">{getText(i18nKeys.USER_OVERVIEW__USERS)}</h3>
          {ctxUser.isUserAdmin && !isManagedUser && (
            <>
              <Button text={getText(i18nKeys.USER_OVERVIEW__ADD_USER)} onClick={openAddUserDialog} />
              <AddUserDialog open={showAddUser} onClose={closeAddUser} />
            </>
          )}
        </div>
        <div className="users__content">
          <TableContainer className="users__list">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell style={{ width: emailWidth }}>{getText(i18nKeys.USER_OVERVIEW__USERNAME)}</TableCell>
                  <TableCell style={{ width: roleWidth }}>{getText(i18nKeys.USER_OVERVIEW__ROLE)}</TableCell>
                  <TableCell width={buttonColWidth}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {userOverview?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      {getText(i18nKeys.USER_OVERVIEW__NO_DATA)}
                    </TableCell>
                  </TableRow>
                )}
                {userOverview?.map((user) => (
                  <TableRow key={`${user.tenantId}-${user.username}`}>
                    <TableCell style={{ wordBreak: "break-all" }}>{user.username}</TableCell>
                    <TableCell>
                      <div className="roles">
                        {user.active && getRole(user.roles).map((r) => <Chip key={r} label={r} size="small" />)}
                        {!user.active && <Chip label="Inactive" size="small" />}
                      </div>
                    </TableCell>
                    <TableCell className="col-action">
                      <div className="table-button-container">
                        {ctxUser.isUserAdmin && (
                          <>
                            {!isManagedUser && (
                              <>
                                <IconButton
                                  startIcon={<EditIcon />}
                                  title={getText(i18nKeys.USER_OVERVIEW__EDIT)}
                                  onClick={() => handleEditRole(user)}
                                />
                                <IconButton
                                  startIcon={<TrashIcon />}
                                  title={getText(i18nKeys.USER_OVERVIEW__DELETE)}
                                  onClick={() => handleDelete(user)}
                                />
                              </>
                            )}
                            <MoreActionButton
                              user={user}
                              onActivateClick={() => handleActivateUser(user, !user.active)}
                              onChangePasswordClick={() => handleOpenPasswordDialog(user)}
                            />
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <EditTenantRoleDialog
            user={activeUser}
            dataAdminUserRoles={dataAdminRoles}
            alpUserRoles={alpRoles}
            open={showEditRole}
            onClose={closeEditRole}
          />
          <DeleteUserDialog user={activeUser} open={showDeleteUser} onClose={closeDeleteUser} />
          {activeUser && (
            <ChangeUserPasswordDialog userId={activeUser.userId} open={showPwd} onClose={handleClosePasswordDialog} />
          )}
        </div>
      </div>
    </div>
  );
};
