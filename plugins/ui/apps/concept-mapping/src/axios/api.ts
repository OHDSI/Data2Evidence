import { ConceptMapping } from "./concept-mapping";
import { ConceptMappingSuggestions } from "./concept-mapping-suggestions";
import { SystemPortal } from "./system-portal";
import { Terminology } from "./terminology";
import { Translation } from "./translation";

export const api = {
  conceptMapping: new ConceptMapping(),
  conceptMappingSuggestions: new ConceptMappingSuggestions(),
  terminology: new Terminology(),
  systemPortal: new SystemPortal(),
  translation: new Translation(),
};
