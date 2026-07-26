import React from "react";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CompareArrowsOutlinedIcon from "@mui/icons-material/CompareArrowsOutlined";
import { i18nKeys } from "../../contexts/app-context/states/translation-state";

export interface Suggestion {
  id: string;
  labelKey: keyof typeof i18nKeys;
  icon: React.ReactNode;
}

const iconProps = { sx: { fontSize: 16, color: "#000080" } } as const;

// The welcome-state suggestion pills (Figma node 1475:128990).
export const SUGGESTIONS: Suggestion[] = [
  {
    id: "what-can-do",
    labelKey: i18nKeys.AI_ASSISTANT__SUGGESTION_WHAT_CAN_DO,
    icon: <InfoOutlinedIcon {...iconProps} />,
  },
  {
    id: "build-cohort",
    labelKey: i18nKeys.AI_ASSISTANT__SUGGESTION_BUILD_COHORT,
    icon: <GroupOutlinedIcon {...iconProps} />,
  },
  {
    id: "update-cohort",
    labelKey: i18nKeys.AI_ASSISTANT__SUGGESTION_UPDATE_COHORT,
    icon: <EditOutlinedIcon {...iconProps} />,
  },
  {
    id: "extract-paper",
    labelKey: i18nKeys.AI_ASSISTANT__SUGGESTION_EXTRACT_PAPER,
    icon: <DescriptionOutlinedIcon {...iconProps} />,
  },
  {
    id: "compare-cohorts",
    labelKey: i18nKeys.AI_ASSISTANT__SUGGESTION_COMPARE_COHORTS,
    icon: <CompareArrowsOutlinedIcon {...iconProps} />,
  },
];
