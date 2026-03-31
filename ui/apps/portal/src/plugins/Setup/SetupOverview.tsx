import React, { FC, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ErrorBoundary, Title } from "@portal/components";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import classNames from "classnames";
import { SetupMenuItem } from "./SetupMenuItem/SetupMenuItem";
import { loadPlugins } from "../../utils";
import { IPluginItem, LocationState } from "../../types";
import { SetupPluginRenderer } from "../core/SetupPluginRenderer";
import { useTranslation } from "../../contexts";
import { SetupBreadcrumbProvider, useSetupBreadcrumb } from "./SetupBreadcrumbContext";
import "./SetupOverview.scss";

const plugins = loadPlugins();

export const SetupOverview: FC = () => {
  const { getText, i18nKeys } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState;
  const enabledPlugins = useMemo(
    () => plugins.setup?.filter((plugin: IPluginItem) => plugin.visible ?? plugin.enabled) || [],
    []
  );
  const state = useMemo(() => locationState || { state: { tab: "setup", subTab: null } }, [locationState]);

  const handleOpenPlugin = useCallback(
    (plugin: IPluginItem) => {
      navigate(location.pathname, {
        state: {
          tab: "setup",
          subTab: plugin.route,
        },
      });
    },
    [navigate, location]
  );

  const handleBack = useCallback(() => {
    navigate(location.pathname, {
      state: {
        tab: "setup",
        subTab: "",
      },
    });
  }, [navigate, location]);

  const activePluginName = useMemo(() => {
    if (!state.subTab) return null;
    const plugin = enabledPlugins.find((p: IPluginItem) => p.route === state.subTab);
    if (!plugin) return null;
    return (plugin.nameI18nKey ? getText(plugin.nameI18nKey) : null) || plugin.name;
  }, [state.subTab, enabledPlugins, getText]);

  return (
    <SetupBreadcrumbProvider>
      <div className="setup-overview">
        {state.subTab && (
          <SetupBreadcrumbBar
            setupLabel={getText(i18nKeys.SETUP_OVERVIEW__SETUP)}
            pluginName={activePluginName}
            onSetupClick={handleBack}
          />
        )}
        <div className={classNames("setup-overview__wrapper", { "setup-overview__plugin": Boolean(state.subTab) })}>
          {!state.subTab && (
            <>
              <div className="setup-overview__header">
                <Title>{getText(i18nKeys.SETUP_OVERVIEW__SETUP)}</Title>
              </div>
              <div className="setup-overview__list">
                {enabledPlugins.map((plugin: IPluginItem) => {
                  const name = (plugin.nameI18nKey ? getText(plugin.nameI18nKey) : null) || plugin.name;
                  const description =
                    (plugin.descriptionI18nKey ? getText(plugin.descriptionI18nKey) : null) || plugin.description;
                  const notes = (plugin.notesI18nKey ? getText(plugin.notesI18nKey) : null) || plugin.notes;

                  return (
                    <SetupMenuItem
                      key={plugin.route}
                      name={name}
                      description={description}
                      notes={notes}
                      onClick={() => handleOpenPlugin(plugin)}
                    />
                  );
                })}
              </div>
            </>
          )}
          {state.subTab && (
            <div className="setup-overview__plugin-content">
              {enabledPlugins.map(
                (plugin: IPluginItem) =>
                  state.subTab === plugin.route && (
                    <ErrorBoundary name={plugin.name} key={plugin.route}>
                      <SetupPluginRenderer path={plugin.pluginPath} data={plugin.data} />
                    </ErrorBoundary>
                  )
              )}
            </div>
          )}
        </div>
      </div>
    </SetupBreadcrumbProvider>
  );
};

interface SetupBreadcrumbBarProps {
  setupLabel: string;
  pluginName: string | null;
  onSetupClick: () => void;
}

const SetupBreadcrumbBar: FC<SetupBreadcrumbBarProps> = ({ setupLabel, pluginName, onSetupClick }) => {
  const { subPages, onPluginNameClick } = useSetupBreadcrumb();
  const hasSubPages = subPages.length > 0;

  return (
    <div className="setup-overview__breadcrumb">
      <Breadcrumbs separator="›">
        <Link component="button" underline="always" onClick={onSetupClick}>
          {setupLabel}
        </Link>
        {hasSubPages && onPluginNameClick ? (
          <Link component="button" underline="always" onClick={onPluginNameClick}>
            {pluginName}
          </Link>
        ) : (
          <Typography color={hasSubPages ? undefined : "text.primary"}>{pluginName}</Typography>
        )}
        {subPages.map((item, index) => {
          const isLast = index === subPages.length - 1;
          return isLast ? (
            <Typography color="text.primary" key={index}>
              {item.label}
            </Typography>
          ) : (
            <Link component="button" underline="always" key={index} onClick={item.onClick}>
              {item.label}
            </Link>
          );
        })}
      </Breadcrumbs>
    </div>
  );
};
