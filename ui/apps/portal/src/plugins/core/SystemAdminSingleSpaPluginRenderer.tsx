import { FC, useEffect, useMemo, useState } from "react";
import { loadPlugin } from "./pluginLoader";
import {
  SingleSpaAppContainer,
  registerSingleSpaApp,
  startSingleSpa,
  updateCustomProps,
  unloadSingleSpaApp,
} from "../../singleSpa";
import { getAuthToken } from "../../containers/auth";
import { useUser } from "../../contexts";
import { PluginType } from "../../types";
import env from "../../env";

function generateAppId(user: string = "system-admin-plugin", path: string): string {
  return `${user}-${path.replace(/[^a-zA-Z0-9]/g, "-")}`;
}

interface SystemAdminSingleSpaPluginRendererProps<T = any> {
  basePath: string;
  path: string;
  system: string;
  data: T;
  route?: string;
  type?: string;
}

export const SystemAdminSingleSpaPluginRenderer: FC<SystemAdminSingleSpaPluginRendererProps> = ({
  basePath = "systemadmin",
  path,
  system,
  data,
  route,
  type: configType,
}) => {
  const { userId } = useUser();

  const [component, setComponent] = useState<any>();
  const [pluginType, setPluginType] = useState<PluginType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const appId = useMemo(
    () => (basePath === "systemadmin" ? generateAppId("system-admin-plugin", path) : generateAppId("etl-plugin", path)),
    [basePath, path]
  );

  useEffect(() => {
    if (configType === "app" && !isRegistered) {
      const registerApp = async () => {
        try {
          const fullBasePath = `${env.PUBLIC_URL}/${basePath}/${route}`;

          console.debug(`[SystemAdminSingleSpaPluginRenderer] Registering single-spa app: ${appId}`);
          await registerSingleSpaApp({
            id: appId,
            name: path,
            basePath: fullBasePath,
            url: path,
            customProps: {
              appId,
              getToken: getAuthToken,
              userId,
              system,
              data,
            },
          });

          setPluginType("app");
          setIsRegistered(true);

          setTimeout(() => {
            try {
              startSingleSpa({ urlRerouteOnly: true });
            } catch (e) {
              console.debug("[SystemAdminSingleSpaPluginRenderer] single-spa already started");
            }
          }, 100);
        } catch (error) {
          console.error(`[SystemAdminSingleSpaPluginRenderer] Failed to register single-spa app:`, error);
        }
      };
      registerApp();

      return;
    }
  }, [appId, path, route, configType, isRegistered, userId, system, data]);

  useEffect(() => {
    if (configType === "app" && isRegistered) {
      updateCustomProps(appId, {
        getToken: getAuthToken,
        userId,
        system,
        ...data,
      });
    }
  }, [appId, userId, system, data, configType, isRegistered]);

  useEffect(() => {
    if (configType === "app") {
      return () => {
        console.log(`[SystemAdminSingleSpaPluginRenderer] Unmounting, unloading app: ${appId}`);
        unloadSingleSpaApp(appId);
      };
    }
  }, [appId, configType]);

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
          console.error(`[SystemAdminSingleSpaPluginRenderer] Failed to load legacy plugin:`, error);
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
      system,
      getToken: async () => {
        return await getAuthToken();
      },
      data,
    }),
    [userId, system, data]
  );

  if (isLoading) {
    return <div style={{ padding: "20px" }}>Loading plugin...</div>;
  }

  if (pluginType === "app") {
    return <SingleSpaAppContainer appName={appId} />;
  }

  const PageComponent = component?.page;
  if (!PageComponent) return null;

  return <PageComponent metadata={metadata} />;
};
