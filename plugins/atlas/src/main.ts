import { h, createApp } from 'vue';
import singleSpaVue from 'single-spa-vue';
import App from './App.vue';
import type { PluginProps } from './types';

const vueLifecycles = singleSpaVue({
  createApp,
  appOptions: {
    render() {
      return h(App, {
        name: (this as any).name,
      });
    },
  },
  handleInstance(app, props: PluginProps) {
    // Provide plugin props to all components
    app.provide('pluginProps', props);
  },
});

export const bootstrap = (props: any) => {
  return vueLifecycles.bootstrap(props);
};

export const mount = (props: any) => {
  return vueLifecycles.mount(props);
};

export const unmount = (props: any) => {
  return vueLifecycles.unmount(props);
};
