import React, { FC, useCallback, useState } from "react";
import { UserWithRolesInfoExt } from "../../../types";
import { EllipsisVerticalIcon, IconButton, Menu, MenuItem } from "@portal/components";
import { useTranslation } from "../../../contexts";

interface MoreActionButtonProps {
  user: UserWithRolesInfoExt;
  onActivateClick: () => void;
  onChangePasswordClick: () => void;
}

export const MoreActionButton: FC<MoreActionButtonProps> = ({ user, onActivateClick, onChangePasswordClick }) => {
  const { getText, i18nKeys } = useTranslation();
  const [actionEl, setActionEl] = useState<null | HTMLElement>(null);

  const handleOpenAction = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setActionEl(event.currentTarget);
  }, []);

  const handleCloseAction = useCallback(() => {
    setActionEl(null);
  }, []);

  const handleMenuClick = useCallback((fn: () => void) => {
    setActionEl(null);
    typeof fn === "function" && fn();
  }, []);

  return (
    <>
      <IconButton startIcon={<EllipsisVerticalIcon />} onClick={handleOpenAction} />
      <Menu anchorEl={actionEl} open={Boolean(actionEl)} onClose={handleCloseAction}>
        <MenuItem onClick={() => handleMenuClick(onActivateClick)}>{user.active ? "Deactivate" : "Activate"}</MenuItem>
        <MenuItem onClick={() => handleMenuClick(onChangePasswordClick)}>
          {getText(i18nKeys.MORE_ACTION_BUTTON__CHANGE_PASSWORD)}
        </MenuItem>
      </Menu>
    </>
  );
};
