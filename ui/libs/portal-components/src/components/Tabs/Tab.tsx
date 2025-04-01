import React, { FC } from "react";
import MatTab, { TabProps } from "@mui/material/Tab";

export const Tab: FC<TabProps> = (props) => <MatTab {...props} data-testid="tab" />;
