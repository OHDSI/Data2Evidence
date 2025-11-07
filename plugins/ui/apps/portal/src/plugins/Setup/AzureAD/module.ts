import { SetupPagePlugin } from "@portal/plugin";
import { AzureAD } from "./AzureAD";

export const plugin = new SetupPagePlugin(AzureAD);
