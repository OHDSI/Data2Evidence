import { FC, useEffect, useMemo, useState } from "react";
import { loadPlugin } from "./pluginLoader";
import { SingleSpaAppContainer, registerSingleSpaApp, startSingleSpa } from "../../singleSpa";
import { getAuthToken } from "../../containers/auth";
import { useUser } from "../../contexts";
import { useToken } from "../../contexts/app-context/hooks/use-token";
import { useTranslation } from "../../contexts/app-context/hooks/use-translation";
import { PluginDropdownItem, SubFeatureFlags } from "@portal/plugin";
import { PluginType } from "../../types";
import env from "../../env";

const nameProp = env.REACT_APP_IDP_NAME_PROP;

interface ResearcherStudyPluginRendererProps {
  path: string;
  tenantId: string;
  studyId: string;
  releaseId: string;
  data: any;
  fetchMenu: (route: string, menus: PluginDropdownItem[]) => void;
  subFeatureFlags: SubFeatureFlags;
  route?: string;
  type?: string; // Plugin type: "app" for single-spa, undefined for legacy
}

export const ResearcherStudyPluginRenderer: FC<ResearcherStudyPluginRendererProps> = ({
  path,
  tenantId,
  studyId,
  releaseId,
  data,
  fetchMenu,
  subFeatureFlags,
  route,
  type: configType,
}) => {
  const { userId } = useUser();
  const { idTokenClaims } = useToken();
  const { locale } = useTranslation();
  const username = idTokenClaims?.[nameProp] as string | undefined;

  const [component, setComponent] = useState<any>();
  const [pluginType, setPluginType] = useState<PluginType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (configType === "app" && !isRegistered) {
      const registerApp = async () => {
        try {
          const appId = `researcher-plugin-${path.replace(/[^a-zA-Z0-9]/g, "-")}`;
          const basePath = `${env.PUBLIC_URL}/researcher/${route}`;

          console.debug(`[ResearcherStudyPluginRenderer] Registering single-spa app: ${appId}`);
          await registerSingleSpaApp({
            id: appId,
            name: path,
            basePath,
            url: path,
            customProps: {
              getToken: async () => await getAuthToken(),
              username,
              datasetId: studyId,
              locale,
              ...data,
            },
          });

          setPluginType("app");
          setIsRegistered(true);

          setTimeout(() => {
            try {
              startSingleSpa({ urlRerouteOnly: true });
            } catch (e) {
              console.debug("[ResearcherStudyPluginRenderer] single-spa already started");
            }
          }, 100);
        } catch (error) {
          console.error(`[ResearcherStudyPluginRenderer] Failed to register single-spa app:`, error);
        }
      };
      registerApp();
    }
  }, [path, studyId, locale, username, data, route, configType, isRegistered]);

  // Load legacy plugins only when needed
  useEffect(() => {
    if (configType !== "app" && !component && !isLoading) {
      const loadLegacyPlugin = async () => {
        setIsLoading(true);
        try {
          const { module, type } = await loadPlugin(path, "legacy");
          setPluginType(type);
          setComponent(module);
          setIsLoading(false);
        } catch (error) {
          console.error(`[ResearcherStudyPluginRenderer] Failed to load legacy plugin:`, error);
          setIsLoading(false);
        }
      };
      loadLegacyPlugin();
    }
  }, [path, configType, component, isLoading]);

  const metadata = useMemo(
    () => ({
      userId,
      getToken: async () => {
        return await getAuthToken();
      },
      tenantId,
      studyId,
      releaseId,
      data,
      fetchMenu,
      subFeatureFlags,
    }),
    [tenantId, studyId, releaseId, data, fetchMenu, userId, subFeatureFlags]
  );

  if (isLoading) {
    return <div style={{ padding: "20px" }}>Loading plugin...</div>;
  }

  if (pluginType === "app") {
    const appId = `researcher-plugin-${path.replace(/[^a-zA-Z0-9]/g, "-")}`;
    return <SingleSpaAppContainer appName={appId} />;
  }

  const PageComponent = component?.page;
  if (!PageComponent) return null;

  return <PageComponent metadata={metadata} />;
};
