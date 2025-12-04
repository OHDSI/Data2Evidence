import { FC, useEffect, useMemo, useState } from "react";
import { loadPlugin } from "./pluginLoader";
import { SingleSpaAppContainer, registerSingleSpaApp, startSingleSpa, updateCustomProps } from "../../singleSpa";
import { getAuthToken } from "../../containers/auth";
import { useUser } from "../../contexts";
import { useToken } from "../../contexts/app-context/hooks/use-token";
import { useTranslation } from "../../contexts/app-context/hooks/use-translation";
import { PluginDropdownItem, SubFeatureFlags } from "@portal/plugin";
import { PluginType } from "../../types";
import env from "../../env";

const nameProp = env.REACT_APP_IDP_NAME_PROP;

function generateAppId(path: string): string {
  return `researcher-plugin-${path.replace(/[^a-zA-Z0-9]/g, "-")}`;
}

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
  autoMount?: boolean;
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
  autoMount,
}) => {
  const {
    userId,
    user: { idpUserId },
  } = useUser();
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
          const appId = generateAppId(path);
          const basePath = `${env.PUBLIC_URL}/researcher/${route}`;

          console.debug(`[ResearcherStudyPluginRenderer] Registering single-spa app: ${appId}`);
          await registerSingleSpaApp({
            id: appId,
            name: path,
            basePath,
            url: path,
            autoMount,
            customProps: {
              appId,
              getToken: getAuthToken,
              username,
              idpUserId,
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
  }, [path, studyId, locale, idpUserId, username, data, route, configType, isRegistered]);

  useEffect(() => {
    if (configType === "app" && isRegistered) {
      const appId = generateAppId(path);
      updateCustomProps(appId, {
        getToken: getAuthToken,
        idpUserId,
        username,
        datasetId: studyId,
        locale,
        ...data,
      });
    }
  }, [studyId, locale, idpUserId, username, data, path, configType, isRegistered]);

  // Load legacy plugins when path changes
  useEffect(() => {
    if (configType !== "app") {
      setComponent(null);
      setIsLoading(true);

      const loadLegacyPlugin = async () => {
        try {
          const { module, type } = await loadPlugin(path, "legacy");
          setPluginType(type);
          setComponent(module);
        } catch (error) {
          console.error(`[ResearcherStudyPluginRenderer] Failed to load legacy plugin:`, error);
        } finally {
          setIsLoading(false);
        }
      };

      loadLegacyPlugin();
    }
  }, [path, configType]);

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
    const appId = generateAppId(path);
    return <SingleSpaAppContainer appName={appId} />;
  }

  const PageComponent = component?.page;
  if (!PageComponent) return null;

  return <PageComponent metadata={metadata} />;
};
