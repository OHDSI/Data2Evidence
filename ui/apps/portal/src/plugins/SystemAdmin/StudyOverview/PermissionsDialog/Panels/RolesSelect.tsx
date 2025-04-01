import React, { FC, useCallback, useState, ChangeEvent, useEffect } from "react";
import { UserWithRoles } from "../../../../../types";
import { Checkbox } from "@portal/components";
import MenuItem from "@mui/material/MenuItem";
import { STUDY_ROLES } from "../../../../../config";
import { FormControl } from "@mui/material";
import Select from "@mui/material/Select";
import { getRoleChanges } from "../../../../../utils";
import { RoleEdit } from "../PermissionsDialog";
import { SxProps } from "@mui/system";
import { useTranslation } from "../../../../../contexts";

interface RolesSelectProps {
  user: UserWithRoles;
  tenantId: string;
  studyId: string;
  grantRolesList: RoleEdit[];
  withdrawRolesList: RoleEdit[];
  setGrantRolesList: React.Dispatch<React.SetStateAction<RoleEdit[]>>;
  setWithdrawRolesList: React.Dispatch<React.SetStateAction<RoleEdit[]>>;
}

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
};

const RolesSelect: FC<RolesSelectProps> = ({
  user,
  tenantId,
  studyId,
  grantRolesList,
  withdrawRolesList,
  setGrantRolesList,
  setWithdrawRolesList,
}) => {
  const { getText, i18nKeys } = useTranslation();
  const [newRoles, setNewRoles] = useState<string[]>(user?.roles || []);
  const userId = user.userId || "";

  useEffect(() => {
    setNewRoles(user.roles);
  }, [user]);

  const hasChanges = useCallback(
    (roleArr: string[]): boolean => {
      const changes = getRoleChanges(Object.keys(STUDY_ROLES), user?.roles || [], roleArr);
      return changes.grantRoles.length > 0 || changes.withdrawRoles.length > 0;
    },
    [user]
  );

  //To maintain changes when changing tabs
  useEffect(() => {
    const getCurrentChanges = () => {
      const userRoles = [...user.roles];
      const currGrantRoles = grantRolesList.find((g) => g.userId === userId);
      const currWithdrawRoles = withdrawRolesList.find((g) => g.userId === userId);

      if (currGrantRoles) {
        for (const role of currGrantRoles.changes) {
          userRoles.push(role);
        }
      }
      if (currWithdrawRoles) {
        for (const role of currWithdrawRoles.changes) {
          if (userRoles.indexOf(role) !== -1) {
            userRoles.splice(userRoles.indexOf(role), 1);
          }
        }
      }
      return userRoles;
    };
    const currentRoles = getCurrentChanges();
    if (hasChanges(currentRoles)) {
      setNewRoles(currentRoles);
    }
  }, [grantRolesList, hasChanges, user.roles, userId, withdrawRolesList]);

  const handleRoleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>, role: string) => {
      if (event.target.checked) {
        setNewRoles([...newRoles, role]);
      } else {
        setNewRoles(newRoles.filter((r) => r !== role));
      }
    },
    [newRoles]
  );

  const removeFromPendingArr = useCallback(
    (user: UserWithRoles) => {
      setGrantRolesList((prevState) => prevState.filter((r) => r.userId !== user.userId));
      setWithdrawRolesList((prevState) => prevState.filter((r) => r.userId !== user.userId));
    },
    [setGrantRolesList, setWithdrawRolesList]
  );

  const handleClose = useCallback(() => {
    removeFromPendingArr(user);
    if (hasChanges(newRoles)) {
      const { roles } = user;
      const changes = getRoleChanges(Object.keys(STUDY_ROLES), roles, newRoles);
      const newRequest = {
        userId,
        tenantId,
        studyId,
      };
      if (changes.grantRoles.length > 0) {
        const filteredList = grantRolesList.filter((r) => r.userId !== user.userId);
        setGrantRolesList([...filteredList, { ...newRequest, changes: changes.grantRoles }]);
      }

      if (changes.withdrawRoles.length > 0) {
        const filteredList = withdrawRolesList.filter((r) => r.userId !== user.userId);
        setWithdrawRolesList([...filteredList, { ...newRequest, changes: changes.withdrawRoles }]);
      }
    }
  }, [
    grantRolesList,
    hasChanges,
    newRoles,
    removeFromPendingArr,
    setGrantRolesList,
    setWithdrawRolesList,
    studyId,
    tenantId,
    user,
    userId,
    withdrawRolesList,
  ]);

  return (
    <>
      <FormControl sx={styles}>
        <Select value="" displayEmpty onClose={handleClose} sx={styles}>
          <MenuItem value="" disabled sx={styles}>
            {getText(i18nKeys.ROLES_SELECT__EDIT)}
          </MenuItem>
          {Object.keys(STUDY_ROLES).map((role, index) => (
            <MenuItem
              disableRipple
              key={index}
              sx={{
                "& .alp-checkbox__container": {
                  marginBottom: 0,
                },
                "&.MuiMenuItem-root:hover": {
                  backgroundColor: "#ebf2fa",
                },
              }}
            >
              <Checkbox
                key={role}
                checked={newRoles?.includes(role)}
                checkbox-id={STUDY_ROLES[role]}
                label={STUDY_ROLES[role]}
                onChange={(event: ChangeEvent<HTMLInputElement>) => handleRoleChange(event, role)}
                style={{ marginBottom: 0 }}
              />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </>
  );
};

export default RolesSelect;
