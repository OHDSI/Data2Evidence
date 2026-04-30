import { SetupPagePlugin } from "@portal/plugin";
import { Db } from "./Db";

export const plugin = new SetupPagePlugin(Db);
