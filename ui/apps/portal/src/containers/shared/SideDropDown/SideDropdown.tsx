import React, { FC, useState, useCallback, useEffect } from "react";
import { SxProps } from "@mui/system";
import Collapse from "@mui/material/Collapse";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Tooltip from "@mui/material/Tooltip";
import {
  SettingsGearIcon as DefaultIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  IconButton,
  ExternalLinkIcon,
} from "@portal/components";
import { Plugins, IPluginItem, LocationState } from "../../../types";
import env from "../../../env";
import { PluginDropdownItem } from "@portal/plugin";
import { useLocation, useNavigate } from "react-router-dom";
import classNames from "classnames";
import { Divider } from "@mui/material";
import { useTranslation } from "../../../contexts";

interface SideDropdownProps {
  activeTab: string;
  onClick: (value: string) => void;
  plugin: Plugins;
  open: boolean;
  submenus?: PluginDropdownItem[];
}

const listItemTextStyles: SxProps = {
  ".MuiTypography-root": {
    fontSize: 14,
  },
};

const SideDropdown: FC<SideDropdownProps> = ({ activeTab, onClick, plugin, open, submenus }) => {
  const { getText, i18nKeys } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;

  useEffect(() => {
    if (!open) {
      setExpanded(false);
    }
  }, [open]);

  const handleExpand = useCallback(() => {
    plugin.subMenus && onClick(plugin.route);
    open ? setExpanded(!expanded) : setExpanded(false);
  }, [expanded, open, plugin, onClick]);

  const pushState = useCallback(
    (configTab: string, tab: string) => {
      navigate(location.pathname, {
        state: {
          ...state,
          tab,
          configTab,
        },
      });
    },
    [navigate, location, state]
  );

  const openNewTab = useCallback((envVar?: string) => {
    if (envVar) {
      window.open(env[envVar], "_blank", "noreferrer");
    }
  }, []);

  if (plugin.children) {
    return (
      <>
        <Divider />
        <ListItem
          button
          onClick={handleExpand}
          selected={plugin.children.some((s: IPluginItem) => s.route === activeTab) && !expanded}
          key={plugin.name}
        >
          <ListItemIcon>
            {plugin.iconUrl ? (
              <img
                src={
                  plugin.iconUrl.startsWith("http://") || plugin.iconUrl.startsWith("https://")
                    ? plugin.iconUrl
                    : `${env.PUBLIC_URL.endsWith("/") ? env.PUBLIC_URL : `${env.PUBLIC_URL}/`}${plugin.iconUrl}`
                }
                alt={plugin.name}
                width={plugin.iconSize}
                height={plugin.iconSize}
              />
            ) : (
              <DefaultIcon />
            )}
          </ListItemIcon>
          <ListItemText primary={plugin.name} />
          {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </ListItem>
        <Collapse in={expanded} unmountOnExit>
          <List>
            <div className="config_list">
              {plugin.children.map((item: any) => (
                <Tooltip title={open ? "" : item.name} placement="right" arrow key={item.name}>
                  {/* Fragment added between Tooltip to resolve "Failed prop type" error */}
                  <>
                    <ListItem
                      button
                      key={item.route}
                      style={{ width: "14.5em" }}
                      onClick={() => onClick(item.route)}
                      selected={activeTab === item.route}
                      className="config_list_item"
                    >
                      {activeTab === item.route ? <span className="config_list_span">•</span> : <span>&nbsp;</span>}
                      <ListItemText primary={item.name} sx={listItemTextStyles} />
                      {env[item.iframeUrlEnv] && (
                        <div
                          className={classNames("config_list_external", {
                            "config_list_external__is-active": activeTab === item.route,
                          })}
                        >
                          <Tooltip title={getText(i18nKeys.SIDE_DROPDOWN__OPEN_IN_NEW_TAB)} placement="right-start">
                            <>
                              <IconButton
                                startIcon={<ExternalLinkIcon />}
                                onClick={() => openNewTab(item.iframeUrlEnv)}
                              />
                            </>
                          </Tooltip>
                        </div>
                      )}
                    </ListItem>
                  </>
                </Tooltip>
              ))}
            </div>
          </List>
        </Collapse>
      </>
    );
  } else if (submenus || plugin.subMenus) {
    return (
      <>
        <Divider />
        <ListItem
          button
          onClick={handleExpand}
          selected={activeTab === plugin.route || (submenus?.some((s: any) => s.tab === activeTab) && !expanded)}
        >
          <ListItemIcon>
            {plugin.iconUrl ? (
              <img
                src={
                  plugin.iconUrl.startsWith("http://") || plugin.iconUrl.startsWith("https://")
                    ? plugin.iconUrl
                    : `${env.PUBLIC_URL.endsWith("/") ? env.PUBLIC_URL : `${env.PUBLIC_URL}/`}${plugin.iconUrl}`
                }
                alt={plugin.name}
                width={plugin.iconSize}
                height={plugin.iconSize}
              />
            ) : (
              <DefaultIcon />
            )}
          </ListItemIcon>
          <ListItemText primary={plugin.name} />
          {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </ListItem>
        <Collapse in={expanded} unmountOnExit>
          <List>
            <div className="config_list">
              {submenus?.map((item: PluginDropdownItem) => (
                <Tooltip title={open ? "" : item.title} placement="right" arrow key={item.title}>
                  <>
                    <ListItem
                      button
                      key={item.tab}
                      style={{ width: "14.5em" }}
                      onClick={() => pushState(item.tab, plugin.route)}
                      selected={state?.configTab === item.tab && activeTab === plugin.route}
                      className="config_list_item"
                    >
                      {state?.configTab === item.tab && activeTab === plugin.route ? (
                        <span className="config_list_span">•</span>
                      ) : (
                        <span>&nbsp;</span>
                      )}
                      <ListItemText primary={item.title} sx={listItemTextStyles} />
                    </ListItem>
                  </>
                </Tooltip>
              ))}
            </div>
          </List>
        </Collapse>
      </>
    );
  } else
    return (
      <>
        <Divider />
        <Tooltip title={open ? "" : plugin.name} placement="right" arrow key={plugin.name}>
          <>
            <div className="config_title">
              <ListItem
                button
                key={plugin.route}
                onClick={() => onClick(plugin.route)}
                selected={activeTab === plugin.route}
              >
                <ListItemIcon>
                  {plugin.iconUrl ? (
                    <img
                      src={
                        plugin.iconUrl.startsWith("http://") || plugin.iconUrl.startsWith("https://")
                          ? plugin.iconUrl
                          : `${env.PUBLIC_URL.endsWith("/") ? env.PUBLIC_URL : `${env.PUBLIC_URL}/`}${plugin.iconUrl}`
                      }
                      alt={plugin.name}
                      width={plugin.iconSize}
                      height={plugin.iconSize}
                    />
                  ) : (
                    <DefaultIcon />
                  )}
                </ListItemIcon>
                <ListItemText primary={plugin.name} />
                {plugin.iframeUrlEnv && env[plugin.iframeUrlEnv] && (
                  <div
                    className={classNames("config_list_external", {
                      "config_list_external__is-active": activeTab === plugin.route,
                    })}
                  >
                    <Tooltip title={getText(i18nKeys.SIDE_DROPDOWN__OPEN_IN_NEW_TAB)} placement="right-start">
                      <>
                        <IconButton startIcon={<ExternalLinkIcon />} onClick={() => openNewTab(plugin.iframeUrlEnv)} />
                      </>
                    </Tooltip>
                  </div>
                )}
              </ListItem>
            </div>
          </>
        </Tooltip>
      </>
    );
};

export default SideDropdown;
