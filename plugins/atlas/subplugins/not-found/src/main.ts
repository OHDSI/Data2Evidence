/**
 * Single-spa entry for the Atlas3 shell, served as
 * /atlas/plugins/not-found/index.system.js and registered in
 * plugins/atlas/plugins.standalone.json with no menu items, so it has a route
 * (#/plugins/not-found/) but no navigation entry. The portal sends routes it
 * does not have here (issue #2261).
 *
 * Modelled on subplugins/data-quality/src/main.ts, minus everything that
 * plugin needs for data: this page reads no host context and calls no API.
 */
import '@d2e/ui/tokens.css';
import { h, createApp } from 'vue';
import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi';
import singleSpaVue from 'single-spa-vue';
import NotFoundApp from './NotFoundApp.vue';

/** The subset of Atlas3's routed-plugin props this plugin reads. */
export interface PluginProps {
  name: string;
  /** The plugin's public directory, e.g. "./plugins/not-found/". */
  uiFilesUrl?: string;
}

const CSS_LINK_ID = 'not-found-plugin-styles';

/**
 * Atlas3's PluginLoader does not load a routed plugin's CSS, so link the
 * bundled style.css (vite.config.mjs sets cssCodeSplit: false) before the first
 * paint. Resolves on error too, so a missing file can't hang the mount.
 */
export function injectPluginCss(uiFilesUrl: string): Promise<void> {
  if (document.getElementById(CSS_LINK_ID)) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const link = document.createElement('link');
    link.id = CSS_LINK_ID;
    link.rel = 'stylesheet';
    link.href = `${uiFilesUrl.replace(/\/$/, '')}/style.css`;
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener('error', () => resolve(), { once: true });
    document.head.appendChild(link);
  });
}

const vuetify = createVuetify({
  theme: false as never, // the host's :root tokens already provide the theme
  icons: { defaultSet: 'mdi', aliases, sets: { mdi } },
});

const vueLifecycles = singleSpaVue({
  createApp,
  appOptions: {
    render() {
      return h(NotFoundApp);
    },
  },
  handleInstance(app) {
    app.use(vuetify);
  },
});

export const bootstrap = async (props: PluginProps) => {
  if (props.uiFilesUrl) await injectPluginCss(props.uiFilesUrl);
  return vueLifecycles.bootstrap(props);
};

export const mount = vueLifecycles.mount;
export const unmount = vueLifecycles.unmount;
