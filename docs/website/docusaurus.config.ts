import { themes as prismThemes } from 'prism-react-renderer';
import { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import "./src/clientModules/navbar"
// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const IS_GA_ENABLED = process.env.NODE_ENV === 'production'
const GA_TRACKING_ID = 'G-MM9ME9XMWW'
const GA_CLIENT_MODULES = [require.resolve('./src/clientModules/gtag')]
const GA_HEAD_TAGS = [
  {
    tagName: 'link',
    attributes: {
      rel: 'preconnect',
      href: 'https://www.google-analytics.com',
    },
  },
  {
    tagName: 'link',
    attributes: {
      rel: 'preconnect',
      href: 'https://www.googletagmanager.com',
    },
  },
  {
    tagName: 'script',
    attributes: {
      async: 'true',
      src: `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`,
    },
  },
  {
    tagName: 'script',
    attributes: {},
    innerHTML: `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}

      gtag('consent', 'default', {
        'analytics_storage': 'denied',
        'ad_storage': 'denied',
        'ad_user_data': 'denied',
        'ad_personalization': 'denied',
      });

      gtag('js', new Date());
      gtag('config', '${GA_TRACKING_ID}', { 'anonymize_ip': true });
    `,
  }
]

const config: Config = {
  plugins: [
    'docusaurus-plugin-sass',
    function yamlLoaderPlugin() {
      return {
        name: 'yaml-loader-plugin',
        configureWebpack() {
          return {
            module: {
              rules: [
                {
                  test: /\.ya?ml$/,
                  use: 'yaml-loader',
                },
              ],
            },
          };
        },
      };
    },
    function fileLoaderPlugin() {
      return {
        name: 'file-loader-plugin',
        configureWebpack() {
          return {
            module: {
              rules: [
                {
                  test: /\.(ics)$/i,
                  use: 'file-loader',
                },
              ],
            },
          };
        },
      };
    },
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [
          {
            to: "/about-us/",
            from: "/company/"
          },
          {
            to: "/docs/getting_started/",
            from: "/docs/"
          }
        ]
      },
    ],
  ],
  title: 'Data2Evidence',
  tagline: 'Unlock the potential of global health data.',
  favicon: 'img/favicon.ico',
  trailingSlash: true,
  clientModules: [
    require.resolve('./src/clientModules/navbar'),
    ...(IS_GA_ENABLED ? GA_CLIENT_MODULES : [])
  ],


  // Set the production url of your site here
  url: 'https://data2evidence.org',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'Data2Evidence', // Usually your GitHub org/user name.
  projectName: 'd2e', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
        },/*
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          // Useful options to enforce blogging best practices
          onInlineTags: 'throw',
          onInlineAuthors: 'throw',
          onUntruncatedBlogPosts: 'warn',
          blogSidebarCount: 10,
          path: 'knowledge',
          routeBasePath: 'knowledge'
        },*/
        sitemap: {
          lastmod: 'date',
          priority: null,
          filename: 'sitemap.xml',
          createSitemapItems: async (params) => {
            const { defaultCreateSitemapItems, ...rest } = params;
            const items = await defaultCreateSitemapItems(rest);
            return items.filter((item) => !item.url.includes('/page/'));
          },
        },
        theme: {
          customCss: ['./src/css/custom.css', './src/css/cookie-consent.scss'],
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/2025_SocialCard.png',
    metadata: [
      { name: 'robots', content: 'index, follow' },
    ],
    colorMode: {
      defaultMode: 'light',
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },

    navbar: {
      title: '',
      logo: {
        alt: 'Data2Evidence',
        src: 'img/d2e2.svg',
      },
      items: [
        { to: '/about-us', label: 'About us', position: 'left' },

        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },

        {
          href: 'https://github.com/OHDSI/Data2Evidence',
          label: 'GitHub',
          className: 'icon',
          position: 'right',
        },
        {
          href: 'https://join.slack.com/t/data2evidence/shared_invite/zt-3vabnh2qr-vMev2VfLI2Sl1YA27gGVig',
          label: 'Slack',
          className: 'icon',
          position: 'right',
        },
        {
          href: 'https://www.data4life.care/en/contact/',
          label: 'Contact us',
          position: 'right',
          className: 'button-contact',
        },

      ],
    },
    footer: {
      style: 'light',
      copyright: `© ${new Date().getFullYear()} Data4Life Asia Limited 
      <a class="footer-link" href="/imprint/">Imprint</a> 
      <a class="footer-link" href="/privacy-policy/">Privacy Policy</a>`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
  headTags: [
    {
      tagName: 'script',
      attributes: {
        type: 'application/ld+json',
      },
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Data4Life Asia",
        "url": "https://data2evidence.org/",
        "logo": "https://data2evidence.org/img/d2e.svg",
        "contactPoint": {
          "@type": "ContactPoint",
          "email": "we@data4life-asia.care"
        },
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "68 Circular Road #02-01",
          "addressLocality": "Singapore",
          "postalCode": "049422",
          "addressCountry": "SG"
        }
      }),
    },
    ...(IS_GA_ENABLED ? GA_HEAD_TAGS : [])
  ],
};
export default config;