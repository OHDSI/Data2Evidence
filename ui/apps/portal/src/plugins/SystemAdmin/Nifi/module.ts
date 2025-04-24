import { SystemAdminPagePlugin } from "@portal/plugin";
import { Nifi } from "./Nifi";

export const plugin = new SystemAdminPagePlugin(Nifi);
