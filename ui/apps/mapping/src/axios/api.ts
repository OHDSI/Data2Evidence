import { Backend } from "./backend";
import { WhiteRabbit } from "./white-rabbit";
import { SystemPortal } from "./system-portal";

export const api = {
  backend: new Backend(),
  whiteRabbit: new WhiteRabbit(),
  SystemPortal: new SystemPortal(),
};
