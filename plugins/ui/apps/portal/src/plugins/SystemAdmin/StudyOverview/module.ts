import { SystemAdminPagePlugin } from "@portal/plugin";
import { DataSourcesPage } from "./DataSourcesPage/DataSourcesPage";

export const plugin = new SystemAdminPagePlugin(DataSourcesPage);
