import React, { FC, useState } from "react";
import { IconButton, Menu, MenuItem } from "@mui/material";
import LastPageIcon from "@mui/icons-material/LastPage";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useTranslation } from "../../contexts";
import { AskAiIcon } from "../Header/AskAiButton/AskAiIcon";

interface DrawerHeaderProps {
  expanded: boolean;
  onClose: () => void;
  onToggleExpand: () => void;
  onNewConversation: () => void;
  onDownloadHistory: () => void;
  // False while the conversation is empty: there is nothing to download yet.
  canDownloadHistory: boolean;
}

// Gradient title bar for the AI assistant drawer (Figma node 1475:128238).
export const DrawerHeader: FC<DrawerHeaderProps> = ({
  expanded,
  onClose,
  onToggleExpand,
  onNewConversation,
  onDownloadHistory,
  canDownloadHistory,
}) => {
  const { getText, i18nKeys } = useTranslation();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const closeMenu = () => setMenuAnchor(null);

  const handleNewConversation = () => {
    closeMenu();
    onNewConversation();
  };

  const handleDownloadHistory = () => {
    closeMenu();
    // A disabled MenuItem is only inert through `pointer-events: none`, so the guard is
    // here too rather than trusting the styling to hold.
    if (!canDownloadHistory) return;
    onDownloadHistory();
  };

  return (
    <div className="ai-assistant__header">
      <IconButton
        className="ai-assistant__header-icon"
        size="small"
        onClick={onClose}
        aria-label={getText(i18nKeys.AI_ASSISTANT__CLOSE)}
        title={getText(i18nKeys.AI_ASSISTANT__CLOSE)}
        data-testid="ai-assistant-close"
      >
        <LastPageIcon fontSize="small" />
      </IconButton>

      <div className="ai-assistant__header-title">
        <AskAiIcon width={20} height={20} className="ai-assistant__header-sparkle" />
        <span>{getText(i18nKeys.AI_ASSISTANT__TITLE)}</span>
      </div>

      <IconButton
        className="ai-assistant__header-icon"
        size="small"
        onClick={onToggleExpand}
        aria-label={getText(expanded ? i18nKeys.AI_ASSISTANT__COLLAPSE : i18nKeys.AI_ASSISTANT__EXPAND)}
        title={getText(expanded ? i18nKeys.AI_ASSISTANT__COLLAPSE : i18nKeys.AI_ASSISTANT__EXPAND)}
        data-testid="ai-assistant-expand"
      >
        {expanded ? <CloseFullscreenIcon fontSize="small" /> : <OpenInFullIcon fontSize="small" />}
      </IconButton>

      <IconButton
        className="ai-assistant__header-icon"
        size="small"
        onClick={(e) => setMenuAnchor(e.currentTarget)}
        aria-label={getText(i18nKeys.AI_ASSISTANT__MORE_OPTIONS)}
        title={getText(i18nKeys.AI_ASSISTANT__MORE_OPTIONS)}
        data-testid="ai-assistant-more"
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem onClick={handleNewConversation} data-testid="ai-assistant-new-conversation">
          {getText(i18nKeys.AI_ASSISTANT__NEW_CONVERSATION)}
        </MenuItem>
        <MenuItem
          onClick={handleDownloadHistory}
          disabled={!canDownloadHistory}
          data-testid="ai-assistant-download-history"
        >
          {getText(i18nKeys.AI_ASSISTANT__DOWNLOAD_HISTORY)}
        </MenuItem>
      </Menu>
    </div>
  );
};
