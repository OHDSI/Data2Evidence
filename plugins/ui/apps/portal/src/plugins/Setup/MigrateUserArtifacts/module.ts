import { SetupPagePlugin } from "@portal/plugin";
import { MigrateUserArtifacts } from "./MigrateUserArtifacts";

export const plugin = new SetupPagePlugin(MigrateUserArtifacts);
