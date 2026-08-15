import { D2eWebapi } from './d2eWebapi'
import { PaConfigSvc } from './paConfigSvc'
import { Terminology } from './terminology'

export const api = {
  terminology: new Terminology(),
  paConfigSvc: new PaConfigSvc(),
  d2eWebapi: new D2eWebapi(),
}
