import React, { FC } from "react";
import { default as MatTabs, TabsProps } from "@mui/material/Tabs";

export const Tabs: FC<TabsProps> = (props) => <MatTabs {...props} data-testid="tabs" />;
