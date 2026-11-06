import React, { FC, useCallback, useMemo, useState } from "react";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { IconButton, Menu, Spinner, type MenuItem } from "ui-react";
import { UserWithRolesInfoExt } from "../../../types";
import { useTranslation } from "../../../contexts";

interface MoreActionButtonProps {
  user: UserWithRolesInfoExt;
  canDelete: boolean;
  canManageDataSources: boolean;
  onActivateClick: () => Promise<void> | void;
  onChangePasswordClick: () => void;
  onDeleteClick: () => void;
  onDataSourcePermissionClick: () => void;
}

export const MoreActionButton: FC<MoreActionButtonProps> = ({
  user,
  canDelete,
  canManageDataSources,
  onActivateClick,
  onChangePasswordClick,
  onDeleteClick,
  onDataSourcePermissionClick,
}) => {
  const { getText, i18nKeys } = useTranslation();
  const [activating, setActivating] = useState(false);

  const items: MenuItem[] = useMemo(() => {
    const list: MenuItem[] = [];
    if (canManageDataSources) {
      list.push({ value: "permission", label: getText(i18nKeys.USER_OVERVIEW__DATA_SOURCE_PERMISSION) });
    }
    list.push(
      { value: "password", label: getText(i18nKeys.MORE_ACTION_BUTTON__CHANGE_PASSWORD) },
      {
        value: "activate",
        label: getText(user.active ? i18nKeys.USER_OVERVIEW__DEACTIVATE : i18nKeys.USER_OVERVIEW__ACTIVATE),
      }
    );
    if (canDelete) {
      list.push({ value: "delete", label: getText(i18nKeys.USER_OVERVIEW__DELETE), danger: true });
    }
    return list;
  }, [user.active, canDelete, canManageDataSources, getText, i18nKeys]);

  const handleSelect = useCallback(
    async (value: string) => {
      if (value === "permission") return onDataSourcePermissionClick();
      if (value === "password") return onChangePasswordClick();
      if (value === "delete") return onDeleteClick();
      if (value === "activate") {
        try {
          setActivating(true);
          await onActivateClick();
        } finally {
          setActivating(false);
        }
      }
    },
    [onActivateClick, onChangePasswordClick, onDeleteClick, onDataSourcePermissionClick]
  );

  return (
    <Menu
      items={items}
      width={276}
      onSelect={handleSelect}
      activator={({ open }) => (
        <IconButton
          category="no-stroke"
          icon={activating ? <Spinner size={16} /> : <MoreVertIcon />}
          ariaLabel={getText(i18nKeys.USER_OVERVIEW__ACTIONS)}
          disabled={activating}
          onClick={open}
        />
      )}
    />
  );
};
