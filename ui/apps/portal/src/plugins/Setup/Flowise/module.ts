import { SetupPagePlugin } from "@portal/plugin";
import { FlowiseSetup } from "./FlowiseSetup";

export const plugin = new SetupPagePlugin(FlowiseSetup);
