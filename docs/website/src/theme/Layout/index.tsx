import React, {useEffect, type ReactNode} from 'react';
import Layout from '@theme-original/Layout';
import type LayoutType from '@theme/Layout';
import type {WrapperProps} from '@docusaurus/types';

import "vanilla-cookieconsent/dist/cookieconsent.css";
import * as CookieConsent from "vanilla-cookieconsent";

type Props = WrapperProps<typeof LayoutType>;

export default function LayoutWrapper(props: Props): ReactNode {
  useEffect(() => {
    setTimeout(() => {
      CookieConsent.run({
        mode: 'opt-out',
        autoShow: true,
        lazyHtmlGeneration: true,
        disablePageInteraction: true,
        guiOptions: {
          consentModal: {
            layout: 'bar',
            equalWeightButtons: true,
          },
          preferencesModal: {
            layout: 'box',
            position: 'right',
            equalWeightButtons: true,
            flipButtons: false
          },
        },
        categories: {
          necessary: {
            enabled: true,
            readOnly: true,
          },
          analytics: {
            enabled: false,
            readOnly: false,
          },
        },
        language: {
          default: 'en',
          autoDetect: "browser",
          translations: {
            en: {
              consentModal: {
                description: `To offer a better browsing experience and for analyzing purposes, we use cookies.<br />
Consent for optional cookies, bug reports & usage analysis not set.
<br /><a href="/privacy-policy/" class="privacy">Privacy Policy</a>`,
                acceptAllBtn: 'Consent',
                acceptNecessaryBtn: 'Deny consent',
              },
              preferencesModal: {
                title: 'Manage Cookie Preferences',
                acceptAllBtn: 'Accept all',
                acceptNecessaryBtn: 'Reject',
                savePreferencesBtn: 'Save settings',
                closeIconLabel: 'Close modal',
                sections: [
                  {
                    title: 'Necessary Cookies',
                    description: 'These cookies are required for the website to function properly.',
                    linkedCategory: 'necessary',
                  },
                  {
                    title: 'Analytics Cookies',
                    description: 'These cookies help us analyze site usage to improve the experience.',
                    linkedCategory: 'analytics',
                  },
                ],
              },
            },
          },
        },
        onConsent: () => {
          if (CookieConsent.acceptedCategory('analytics')){
            enableGoogleAnalytics();
          } else {
            disableGoogleAnalytics();
          }
        },
      });
    }, 1000);

    function enableGoogleAnalytics() {
      if (typeof gtag === 'function') {
        console.log('Enable Google analytics')
        gtag('consent', 'update', {
          'ad_storage': 'granted',
          'analytics_storage': 'granted',
        });
      }
    }

    function disableGoogleAnalytics() {
      if (typeof gtag === 'function') {
        console.log('Disable Google analytics')
        gtag('consent', 'update', {
          'ad_storage': 'denied',
          'analytics_storage': 'denied',
        });
      }
    }
  }, []);

  return (
    <Layout {...props} />
  );
}
