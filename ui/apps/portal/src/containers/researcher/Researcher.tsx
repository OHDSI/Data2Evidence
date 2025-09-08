import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import classNames from "classnames";
import { Snackbar, ErrorBoundary } from "@portal/components";
import { PluginDropdownItem, SubFeatureFlags } from "@portal/plugin";
import { Header } from "../../components";
import { useActiveDataset, useFeedback } from "../../contexts";
import { IPluginItem, PluginDropdown } from "../../types";
import { getPluginChildPathPattern, loadPlugins, sortPluginsByType } from "../../utils";
import { ResearcherStudyPluginRenderer } from "../../plugins/core/ResearcherStudyPluginRenderer";
import { useEnabledFeatures, useDataset } from "../../hooks";
import { Overview } from "./Overview/Overview";
import { Information } from "./Information/Information";
import { Account } from "../shared/Account/Account";
import "./Researcher.scss";

const plugins = loadPlugins();

const ROUTES = {
  overview: "overview",
  account: "account",
  info: "information",
  legal: "legal",
  logout: "/logout",
};

interface StateProps {
  studyId: string;
  tab: string;
  tenantId: string;
}

// TODO: mapping should be from the server
const mapping: Record<string, string[]> = {
  source: [],
  fhir: [],
  non_omop: ["Cohort", "Notebooks", "Concepts"],
  omop: ["Cohort", "Notebooks", "Analysis", "Concepts"],
  study: ["Cohort", "Notebooks", "Results"],
  hana_omop: ["Cohort", "Concepts"],
  hana_non_omop: ["Cohort", "Concepts"],
};

const restricted = ["Cohort", "Notebooks", "Analysis", "Concepts", "Results"];

export const Researcher: FC = () => {
  const { clearFeedback, getFeedback } = useFeedback();
  const feedback = getFeedback();

  const location = useLocation();
  const state = location.state as StateProps;
  const isHome = location.pathname === "/researcher" || location.pathname === "/researcher/overview";
  const classes = classNames("researcher__container", { "researcher__container--home": isHome });

  const { activeDataset } = useActiveDataset();
  const activeDatasetId = activeDataset.id;
  const activeReleaseId = activeDataset.releaseId;

  const [dataset] = useDataset(activeDatasetId);

  const [pluginDropdown, setPluginDropdown] = useState<PluginDropdown>({});
  const [activeTenantId, setActiveTenantId] = useState<string>(state?.tenantId || "");
  const featureFlags = useEnabledFeatures();

  useEffect(() => {
    if ((feedback?.autoClose || 0) > 0) setTimeout(() => clearFeedback(), feedback?.autoClose);
  }, [feedback, clearFeedback]);

  useEffect(() => {
    if (state) {
      setActiveTenantId(state.tenantId);
    }
  }, [state]);
  console.log(dataset?.type);
  const featureFlagsDict = useMemo(() => {
    // Convert to dictionary of { [featureFlag]: { [subFeatureFlag]: enabledBoolean } }
    const result: { [featureFlag: string]: SubFeatureFlags } = {};
    const featureFlagProcessor = (plugin: IPluginItem) => {
      if (plugin.featureFlag && plugin.subFeatureFlags && plugin.subFeatureFlags.length > 0) {
        const subFeatureFlags = plugin.subFeatureFlags.map((f: string) => ({
          featureFlag: f,
          enabled: featureFlags.includes(f),
        }));

        result[plugin.featureFlag] = Object.fromEntries(subFeatureFlags.map((f) => [f.featureFlag, f.enabled]));
      }
      plugin.children?.forEach(featureFlagProcessor);
    };
    plugins.researcher?.forEach(featureFlagProcessor);
    return result;
  }, [featureFlags]);

  const researcherPluginsFlat = useMemo(() => {
    const flatPlugins: IPluginItem[] = [];
    const allowed = new Set(mapping[dataset?.type ?? ""] ?? []);
    plugins.researcher.forEach((plugin) => {
      if (restricted.includes(plugin.name)) {
        if (dataset != null && allowed.has(plugin.name)) {
          flatPlugins.push(plugin);
        }
      } else {
        flatPlugins.push(plugin);
        plugin.children?.forEach((childPlugin) => {
          flatPlugins.push(childPlugin);
        });
      }
    });
    return flatPlugins;
  }, [plugins, dataset]);

  const onFetchMenus = useCallback((route: string, menus: PluginDropdownItem[]) => {
    setPluginDropdown((current: any) => ({ ...current, [route]: menus }));
  }, []);

  const sortedResearcherPlugins = useMemo(() => {
    const allowed = new Set(mapping[dataset?.type ?? ""] ?? []);
    return sortPluginsByType(plugins.researcher).filter((plugin) => {
      if (restricted.includes(plugin.name)) {
        return dataset != null && allowed.has(plugin.name);
      }
      return true;
    });
  }, [plugins.researcher, dataset?.type]);

  const sortedPlugins = JSON.parse(JSON.stringify(plugins));
  sortedPlugins.researcher = sortedResearcherPlugins;

  return (
    <div className={classes}>
      {!isHome && <Header portalType="researcher" plugins={sortedPlugins} />}
      <main>
        <Snackbar
          type={feedback?.type}
          handleClose={clearFeedback}
          message={feedback?.message}
          description={feedback?.description}
          visible={feedback?.message != null}
        />
        <Routes>
          <Route path="/">
            <Route index element={<Overview />} />
            <Route path={ROUTES.overview} element={<Overview />} />
            <Route path={ROUTES.info} element={<Information />} />
            <Route path={ROUTES.account} element={<Account portalType="researcher" />} />
            {researcherPluginsFlat.map((item: IPluginItem) => {
              const subFeatureFlags = item.featureFlag ? featureFlagsDict[item.featureFlag] : {};
              return (
                <Route
                  key={item.name}
                  path={getPluginChildPathPattern(item)}
                  element={
                    <ErrorBoundary name={item.name} key={item.route}>
                      <ResearcherStudyPluginRenderer
                        key={item.route}
                        path={item.pluginPath}
                        tenantId={activeTenantId}
                        studyId={activeDatasetId}
                        releaseId={activeReleaseId}
                        data={item?.data}
                        fetchMenu={onFetchMenus}
                        subFeatureFlags={subFeatureFlags}
                      />
                    </ErrorBoundary>
                  }
                />
              );
            })}
          </Route>
        </Routes>
      </main>
    </div>
  );
};
