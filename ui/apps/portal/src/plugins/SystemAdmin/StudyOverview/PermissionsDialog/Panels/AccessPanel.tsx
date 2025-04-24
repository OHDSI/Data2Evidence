import React, { FC, useCallback, useState, useEffect } from "react";
import { SelectChangeEvent } from "@mui/material/Select";
import { UserWithRoles } from "../../../../../types";
import { Button, Feedback, TableCell, TableRow, RejectIcon, IconButton } from "@portal/components";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useMenuAnchor } from "../../../../../hooks";
import { api } from "../../../../../axios/api";
import { Roles, STUDY_ROLES } from "../../../../../config";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableHead from "@mui/material/TableHead";
import TableContainer from "@mui/material/TableContainer";
import { useTranslation, useUser } from "../../../../../contexts";
import RolesSelect from "./RolesSelect";
import { RoleEdit, StudyAccessRequest } from "../PermissionsDialog";
import "./PanelTables.scss";

interface AcessPanelProps {
  studyId: string;
  tenantId: string;
  selectedAction: string;
  users: UserWithRoles[];
  handleActionChange: (event: SelectChangeEvent<string>, request: StudyAccessRequest) => void;
  grantRolesList: RoleEdit[];
  withdrawRolesList: RoleEdit[];
  setGrantRolesList: React.Dispatch<React.SetStateAction<RoleEdit[]>>;
  setWithdrawRolesList: React.Dispatch<React.SetStateAction<RoleEdit[]>>;
  setFeedback: React.Dispatch<React.SetStateAction<Feedback>>;
  fetchStudyUsers: () => Promise<void>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const AcessPanel: FC<AcessPanelProps> = ({
  studyId,
  tenantId,
  users,
  grantRolesList,
  withdrawRolesList,
  setGrantRolesList,
  setWithdrawRolesList,
  setFeedback,
  fetchStudyUsers,
  setLoading,
}) => {
  const { getText, i18nKeys } = useTranslation();
  // menu helpers
  const [anchorEl, openMenu, closeMenu] = useMenuAnchor();
  const [allowedUsers, setAllowedUsers] = useState<UserWithRoles[]>([]);
  const [tenantUsers, setTenantUsers] = useState<UserWithRoles[]>([]);

  const { setUserGroup, user: ctxUser } = useUser();

  const fetchUserOverview = useCallback(
    async (tenantId: string) => {
      try {
        const users = await api.userMgmt.getUsersWithRoles(tenantId);
        setTenantUsers(users);
      } catch (err: any) {
        if (err.data?.message) {
          setFeedback({ type: "error", message: err.data?.message });
        } else {
          setFeedback({
            type: "error",
            message: getText(i18nKeys.ACCESS_PANEL__ERROR),
            description: getText(i18nKeys.ACCESS_PANEL__ERROR_DESCRIPTION),
          });
        }
        console.error("err", err);
      }
    },
    [setFeedback]
  );

  useEffect(() => {
    if (tenantId) {
      fetchUserOverview(tenantId);
    }
  }, [fetchUserOverview, tenantId]);

  useEffect(() => {
    if (tenantUsers) {
      const tenantStudyNewUsers = tenantUsers.filter((u) => !users.map((u) => u.username).includes(u.username));
      setAllowedUsers(tenantStudyNewUsers);
    }
  }, [tenantUsers, users]);

  const handleAdd = useCallback(
    async (user: UserWithRoles) => {
      const addedUsers = allowedUsers
        .filter((tenantUser: UserWithRoles) => tenantUser.username === user.username)
        .map((tenantUser: UserWithRoles) => {
          return { userId: tenantUser.userId, username: tenantUser.username };
        });

      try {
        setLoading(true);

        // Do a check first
        addedUsers.forEach((u) => {
          if (u.userId == null) {
            throw new Error(getText(i18nKeys.ACCESS_PANEL__ERROR_2, [u.username]));
          }
        });

        // Assign result
        const userIds = addedUsers.map((u) => u.userId as string);
        await api.userMgmt.registerStudyRoles(userIds, tenantId, studyId, [Roles.STUDY_RESEARCHER]);

        closeMenu();
        setFeedback({
          type: "success",
          message: getText(i18nKeys.ACCESS_PANEL__SUCCESS, [user.username]),
        });
        fetchStudyUsers();
      } catch (err: any) {
        setFeedback({ type: "error", message: err.message });
        console.error("err", err);
      } finally {
        setLoading(false);
      }
    },
    [allowedUsers, setLoading, tenantId, studyId, closeMenu, setFeedback, fetchStudyUsers, getText]
  );

  // Revoke role
  const handleRevoke = useCallback(
    async (user: UserWithRoles) => {
      if (!user || !user.userId) return;

      try {
        setLoading(true);

        await api.userMgmt.withdrawStudyRoles(user.userId, tenantId, studyId, user.roles);

        if (user.userId === ctxUser.userId && ctxUser.idpUserId) {
          const userGroups = await api.userMgmt.getUserGroupList(ctxUser.idpUserId);
          setUserGroup(ctxUser.idpUserId, userGroups);
        }

        setFeedback({
          type: "success",
          message: getText(i18nKeys.ACCESS_PANEL__SUCCESS_REVOKE, [user.username]),
        });
        fetchStudyUsers();
      } catch (err: any) {
        setFeedback({ type: "error", message: err.message });
        console.error("err", err);
      } finally {
        setLoading(false);
      }
    },
    [fetchStudyUsers, ctxUser, setFeedback, setLoading, setUserGroup, studyId, tenantId, getText]
  );

  return (
    <div className="access-panel">
      <div className="access-panel__container">
        <div className="access-panel__header">
          <div className="access-panel__title">{getText(i18nKeys.ACCESS_PANEL__ACCESS)}</div>
          <Button text={getText(i18nKeys.ACCESS_PANEL__ADD_EXISTING)} onClick={openMenu} />
          <Menu
            className="access-panel__menu"
            onClose={closeMenu}
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            PaperProps={{
              style: {
                maxHeight: 48 * 4.5,
              },
            }}
          >
            <div className="access-panel__menu-content">
              {allowedUsers.map((u) => (
                <MenuItem key={u.userId} onClick={() => handleAdd(u)}>
                  {u.username}
                </MenuItem>
              ))}
            </div>
          </Menu>
        </div>
        <TableContainer className="study-users">
          <Table>
            <colgroup>
              <col style={{ width: "45%" }} />
              <col style={{ width: "25%" }} />
              <col style={{ width: "30%" }} />
            </colgroup>
            <TableHead>
              <TableRow>
                <TableCell>{getText(i18nKeys.ACCESS_PANEL__EMAIL)}</TableCell>
                <TableCell>{getText(i18nKeys.ACCESS_PANEL__ROLE)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(!users || users.length === 0) && (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    {getText(i18nKeys.ACCESS_PANEL__NO_DATA)}
                  </TableCell>
                </TableRow>
              )}
              {users?.map((user, index) => (
                <TableRow key={user.username}>
                  <TableCell style={{ wordBreak: "break-all", color: "#000e7e" }}>{user.username}</TableCell>
                  <TableCell style={{ color: "#000e7e" }}>
                    {user.roles
                      .sort((a, b) => a.localeCompare(b))
                      .map((role) => (
                        <div key={role}>{STUDY_ROLES[role]}</div>
                      ))}
                  </TableCell>
                  <TableCell className="col-action">
                    <RolesSelect
                      user={user}
                      tenantId={tenantId}
                      studyId={studyId}
                      grantRolesList={grantRolesList}
                      withdrawRolesList={withdrawRolesList}
                      setGrantRolesList={setGrantRolesList}
                      setWithdrawRolesList={setWithdrawRolesList}
                    />
                    <div className="button-group">
                      <IconButton
                        startIcon={<RejectIcon />}
                        title={getText(i18nKeys.ACCESS_PANEL__REVOKE)}
                        onClick={() => handleRevoke(user)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  );
};

export default AcessPanel;
