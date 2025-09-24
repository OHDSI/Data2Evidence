import { Terminology } from "./terminology";
import { D2eWebapi } from "./d2e-webapi";
import { Translation } from "./translation";

export const api = {
  terminology: new Terminology(),
  d2eWebapi: new D2eWebapi(),
  translation: new Translation(),
};
