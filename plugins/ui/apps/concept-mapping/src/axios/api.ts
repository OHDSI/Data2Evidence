import { ConceptMapping } from "./concept-mapping";
import { SystemPortal } from "./system-portal";
import { Terminology } from "./terminology";
import { Translation } from "./translation";

export const api = {
  conceptMapping: new ConceptMapping(),
  terminology: new Terminology(),
  systemPortal: new SystemPortal(),
  translation: new Translation(),
};
