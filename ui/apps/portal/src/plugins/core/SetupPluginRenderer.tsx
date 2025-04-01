import React, { FC, useEffect, useMemo, useState } from "react";
import { importPluginModule } from "./pluginLoader";
import { getAuthToken } from "../../containers/auth";
import { useUser } from "../../contexts";

interface SetupPluginRendererProps<T = any> {
  path: string;
  data: T;
}

export const SetupPluginRenderer: FC<SetupPluginRendererProps> = ({ path, data }) => {
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
      getToken: async () => {
        return await getAuthToken();
      },
      data,
    }),
    [userId, data]
  );

  const PageComponent = component?.page;
  if (!PageComponent) return null;

  return <PageComponent metadata={metadata} />;
};
