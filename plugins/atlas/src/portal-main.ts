/**
 * Portal Plugin Entry Point
 *
 * This is the single-spa lifecycle for embedding Atlas3 in the researcher portal.
 * It wraps Atlas3 in an iframe and bridges auth from the portal.
 */
import { h, createApp } from 'vue';
import singleSpaVue from 'single-spa-vue';
import AtlasPortalWrapper from './components/AtlasPortalWrapper.vue';
import type { PluginProps } from './types';

const vueLifecycles = singleSpaVue({
  createApp,
  appOptions: {
    render() {
      return h(AtlasPortalWrapper, {
        name: (this as any).name,
      });
    },
  },
  handleInstance(app, props: PluginProps) {
    // Provide plugin props to all components
    app.provide('pluginProps', props);
  },
});

export const bootstrap = (props: PluginProps) => {
  console.log('[AtlasPortalPlugin] bootstrap', props);
  return vueLifecycles.bootstrap(props);
};

export const mount = (props: PluginProps) => {
  console.log('[AtlasPortalPlugin] mount', props);
  return vueLifecycles.mount(props);
};

export const unmount = (props: PluginProps) => {
  console.log('[AtlasPortalPlugin] unmount');
  return vueLifecycles.unmount(props);
};
