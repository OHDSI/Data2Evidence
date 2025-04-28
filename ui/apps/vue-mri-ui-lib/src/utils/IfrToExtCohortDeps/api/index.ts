import { PortalServer } from './portalServer'
import { Terminology } from './terminology'

export const api = {
  terminology: new Terminology(),
  portalServer: new PortalServer(),
}
