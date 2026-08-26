import { computed, createApp, h, inject, ref } from 'vue';
import singleSpaVue from 'single-spa-vue';
import DataSourceDetailPage from './data-sources/DataSourceDetailPage.vue';
import DataSourceListPage from './data-sources/DataSourceListPage.vue';
import { useDataSources } from './data-sources/use-data-sources';
import './data-sources/data-sources.css';
import type { PluginProps } from './types';

const DataSourcesApp = {
  setup() {
    const pluginProps = inject<PluginProps>('pluginProps');
    const getToken = pluginProps?.getToken ?? (async () => pluginProps?.authContext?.token ?? '');
    const isAuthenticated = computed(() => Boolean(pluginProps?.getToken || pluginProps?.authContext?.isAuthenticated));
    const sources = useDataSources(getToken);
    const selectedId = ref<string | null>(null);

    function select(id: string) {
      selectedId.value = id;
      window.history.pushState({ dataSourceId: id }, '', `#data-sources/${encodeURIComponent(id)}`);
    }

    function back() {
      selectedId.value = null;
      window.history.pushState({}, '', '#data-sources');
    }

    function syncRoute() {
      const match = window.location.hash.match(/^#data-sources\/([^/?#]+)/);
      selectedId.value = match ? decodeURIComponent(match[1]) : null;
    }

    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    syncRoute();

    return () => selectedId.value
      ? h(DataSourceDetailPage, { sourceId: selectedId.value, sources, onBack: back })
      : h(DataSourceListPage, { sources, isAuthenticated: isAuthenticated.value, onSelect: select });
  },
};

const vueLifecycles = singleSpaVue({
  createApp,
  appOptions: { render: () => h(DataSourcesApp) },
  handleInstance(app, props: PluginProps) {
    app.provide('pluginProps', props);
  },
});

export const bootstrap = (props: PluginProps) => vueLifecycles.bootstrap(props);
export const mount = (props: PluginProps) => vueLifecycles.mount(props);
export const unmount = (props: PluginProps) => vueLifecycles.unmount(props);
