import React, { FC, useEffect, useMemo, useState } from "react";
import { importPluginModule } from "./pluginLoader";
import { getAuthToken } from "../../containers/auth";
import { useUser } from "../../contexts";

interface SystemAdminPluginRendererProps<T = any> {
  path: string;
  system: string;
  data: T;
}

export const SystemAdminPluginRenderer: FC<SystemAdminPluginRendererProps> = ({ path, system, data }) => {
  const { userId } = useUser();
  const [component, setComponent] = useState<any>();

  useEffect(() => {
    if (!component) {
      const fetchPlugin = async () => {
        const plugin = await importPluginModule(path);
        setComponent(plugin);
      };
      fetchPlugin();
    }
  }, [component, path]);

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

  const PageComponent = component?.page;
  if (!PageComponent) return null;

  return <PageComponent metadata={metadata} />;
};
