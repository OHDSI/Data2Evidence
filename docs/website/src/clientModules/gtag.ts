import type {ClientModule} from '@docusaurus/types';
import * as CookieConsent from "vanilla-cookieconsent";

const clientModule: ClientModule = {
  onRouteDidUpdate({location, previousLocation}) {
    if (!CookieConsent.acceptedCategory('analytics')) {
      return;
    }

    if (
      previousLocation &&
      (location.pathname !== previousLocation.pathname ||
        location.search !== previousLocation.search ||
        location.hash !== previousLocation.hash)
    ) {
      setTimeout(() => {
        const pagePath = location.pathname + location.search + location.hash;
        window.gtag('set', 'page_path', pagePath);
        window.gtag('event', 'page_view');
      });
    }
  },
};

export default clientModule;