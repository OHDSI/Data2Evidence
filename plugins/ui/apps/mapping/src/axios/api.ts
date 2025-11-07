import { Backend } from "./backend";
import { WhiteRabbit } from "./white-rabbit";
import { SystemPortal } from "./system-portal";
import { DataMapping } from "./data-mapping";
import { Dataflow } from "./dataflow";

export const api = {
  backend: new Backend(),
  whiteRabbit: new WhiteRabbit(),
  SystemPortal: new SystemPortal(),
  DataMapping: new DataMapping(),
  Dataflow: new Dataflow(),
};
