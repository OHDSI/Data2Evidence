import React, { FC, useEffect, useMemo, useState } from "react";
import { importPluginModule } from "./pluginLoader";
import { getAuthToken } from "../../containers/auth";
import { useUser } from "../../contexts";
import { PluginDropdownItem } from "@portal/plugin";

interface AdminPluginRendererProps {
  path: string;
  tenantId: string;
  studyId: string;
  fetchMenu: (route: string, menus: PluginDropdownItem[]) => void;
}

export const AdminPluginRenderer: FC<AdminPluginRendererProps> = ({ path, tenantId, studyId, fetchMenu }) => {
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
      tenantId,
      studyId,
      fetchMenu,
    }),
    [userId, tenantId, studyId, fetchMenu]
  );

  const PageComponent = component?.page;
  if (!PageComponent) return null;

  return <PageComponent metadata={metadata} />;
};
