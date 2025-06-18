import React, { FC, useEffect, useMemo, useState } from "react";
import { Loader } from "@portal/components";
import { importPluginModule } from "./pluginLoader";

interface PluginRendererProps<T = any> {
  path: string;
  userId: string;
  getToken: () => Promise<string>;
  data: T;
}

export const PluginRenderer: FC<PluginRendererProps> = ({
  path,
  userId,
  getToken,
  data,
}) => {
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
      getToken,
      data,
    }),
    [userId, getToken, data]
  );

  const PageComponent = component?.page;
  if (!PageComponent) return <Loader />;

  return <PageComponent metadata={metadata} />;
};
