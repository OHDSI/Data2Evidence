import { PaConfigSvc } from './paConfigSvc'
import { Terminology } from './terminology'

export const api = {
  terminology: new Terminology(),
  paConfigSvc: new PaConfigSvc(),
}
