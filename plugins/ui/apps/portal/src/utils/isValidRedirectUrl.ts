import { config } from "../config";

const REDIRECTABLE_ROUTE_PREFIXES = [config.ROUTES.systemadmin, config.ROUTES.researcher, config.ROUTES.etl];

export const isValidRedirectUrl = (url: string): boolean =>
  REDIRECTABLE_ROUTE_PREFIXES.some((prefix) => url === prefix || url.startsWith(`${prefix}/`));
