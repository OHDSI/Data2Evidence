import { SystemAdminPagePlugin } from "@portal/plugin";
import NifiRegistry from "./NifiRegistry";

export const plugin = new SystemAdminPagePlugin(NifiRegistry);
