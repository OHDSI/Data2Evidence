import React, { FC } from "react";
import { Button } from "@portal/components";
import "./SetupMenuItem.scss";
import { useTranslation } from "../../../contexts";

interface SetupMenuItemProps {
  name: string;
  description?: string | React.ReactElement;
  notes?: string;
  onClick: () => void;
}

export const SetupMenuItem: FC<SetupMenuItemProps> = ({ name, description, notes, onClick }) => {
  const { getText, i18nKeys } = useTranslation();
  return (
    <div className="setup-menu-item">
      <div className="setup-menu-item__info">
        <div className="setup-menu-item__title">{name}</div>
        {description && <div className="setup-menu-item__description">{description}</div>}
        {notes && <div className="setup-menu-item__notes">{notes}</div>}
      </div>
      <div className="setup-menu-item__action">
        <Button text={getText(i18nKeys.SETUP_MENU_ITEM__CONFIGURE)} onClick={onClick} />
      </div>
    </div>
  );
};
