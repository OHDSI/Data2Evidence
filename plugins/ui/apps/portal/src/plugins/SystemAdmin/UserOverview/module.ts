import { SystemAdminPagePlugin } from "@portal/plugin";
import { UserOverview } from "./UserOverview";

export const plugin = new SystemAdminPagePlugin(UserOverview);
