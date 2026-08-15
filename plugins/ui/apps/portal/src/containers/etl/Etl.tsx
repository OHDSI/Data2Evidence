import React, { FC, useEffect, useMemo } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { ErrorBoundary } from "@portal/components";
import { Header } from "../../components";
import { IPluginItem } from "../../types";
import { loadPlugins, getPluginChildPathPattern } from "../../utils";
import { SystemAdminSingleSpaPluginRenderer } from "../../plugins/core/SystemAdminSingleSpaPluginRenderer";
import { SystemAdminPluginRenderer } from "../../plugins/core/SystemAdminPluginRenderer";
import { initializeImportMap } from "../../singleSpa";
import { Account } from "../shared/Account/Account";
import { FeedbackToast } from "../shared/FeedbackToast/FeedbackToast";
import env from "../../env";
import "./Etl.scss";

const plugins = loadPlugins();
const CURRENT_SYSTEM = env.REACT_APP_CURRENT_SYSTEM;

const ROUTES = {
  account: "account",
  logout: "/logout",
};

export const Etl: FC = () => {
  const location = useLocation();

  const etlPluginsFlat = useMemo(() => {
    const flat: IPluginItem[] = [];
    plugins.etl.forEach((plugin) => {
      flat.push(plugin);
      plugin.children?.forEach((child) => flat.push(child));
    });
    return flat;
  }, []);

  const defaultRoute = useMemo(() => {
    const firstPlugin = etlPluginsFlat.at(0);
    return firstPlugin?.route || "";
  }, [etlPluginsFlat]);

  const singleSpaApps = useMemo(() => etlPluginsFlat.filter((plugin) => plugin.type === "app"), [etlPluginsFlat]);

  const legacyPlugins = useMemo(() => etlPluginsFlat.filter((plugin) => plugin.type !== "app"), [etlPluginsFlat]);

  useEffect(() => {
    initializeImportMap(singleSpaApps);
  }, [singleSpaApps]);

  return (
    <div className="etl__container">
      <Header portalType="etl" etlPlugins={etlPluginsFlat} />
      <main>
        <FeedbackToast />
        {singleSpaApps.map((item: IPluginItem) => {
          const isActiveRoute = location.pathname.includes(`/etl/${item.route}`);
          return (
            <div
              key={item.route}
              style={{
                display: isActiveRoute ? "block" : "none",
                width: "100%",
                height: "100%",
              }}
            >
              <ErrorBoundary name={item.name}>
                <SystemAdminSingleSpaPluginRenderer
                  path={item.pluginPath}
                  route={item.route}
                  type={item.type}
                  system={CURRENT_SYSTEM}
                  data={item?.data}
                  basePath="etl"
                  autoMount={item.autoMount}
                />
              </ErrorBoundary>
            </div>
          );
        })}
        <Routes>
          <Route path="/">
            <Route index element={<Navigate to={defaultRoute} />} />
            <Route path={ROUTES.account} element={<Account portalType="etl" />} />
            {legacyPlugins.map((item: IPluginItem) => (
              <Route
                key={item.name}
                path={getPluginChildPathPattern(item)}
                element={
                  <ErrorBoundary name={item.name}>
                    <SystemAdminPluginRenderer path={item.pluginPath} system={CURRENT_SYSTEM} data={item?.data} />
                  </ErrorBoundary>
                }
              />
            ))}
          </Route>
        </Routes>
      </main>
    </div>
  );
};

export default Etl;
