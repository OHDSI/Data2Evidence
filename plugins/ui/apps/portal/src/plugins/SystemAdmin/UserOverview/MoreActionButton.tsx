import React, { FC, useCallback, useState } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import { UserWithRolesInfoExt } from "../../../types";
import { EllipsisVerticalIcon, IconButton, Menu, MenuItem } from "@portal/components";
import { useTranslation } from "../../../contexts";

interface MoreActionButtonProps {
  user: UserWithRolesInfoExt;
  onActivateClick: () => Promise<void> | void;
  onChangePasswordClick: () => void;
}

export const MoreActionButton: FC<MoreActionButtonProps> = ({ user, onActivateClick, onChangePasswordClick }) => {
  const { getText, i18nKeys } = useTranslation();
  const [actionEl, setActionEl] = useState<null | HTMLElement>(null);
  const [activating, setActivating] = useState(false);

  const handleOpenAction = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setActionEl(event.currentTarget);
  }, []);

  const handleCloseAction = useCallback(() => {
    setActionEl(null);
  }, []);

  const handleActivate = useCallback(async () => {
    setActionEl(null);
    try {
      setActivating(true);
      await onActivateClick();
    } finally {
      setActivating(false);
    }
  }, [onActivateClick]);

  const handleChangePassword = useCallback(() => {
    setActionEl(null);
    onChangePasswordClick();
  }, [onChangePasswordClick]);

  return (
    <>
      <IconButton
        startIcon={activating ? <CircularProgress size={16} /> : <EllipsisVerticalIcon />}
        onClick={handleOpenAction}
        disabled={activating}
      />
      <Menu anchorEl={actionEl} open={Boolean(actionEl)} onClose={handleCloseAction}>
        <MenuItem onClick={handleActivate}>{user.active ? "Deactivate" : "Activate"}</MenuItem>
        <MenuItem onClick={handleChangePassword}>{getText(i18nKeys.MORE_ACTION_BUTTON__CHANGE_PASSWORD)}</MenuItem>
      </Menu>
    </>
  );
};
