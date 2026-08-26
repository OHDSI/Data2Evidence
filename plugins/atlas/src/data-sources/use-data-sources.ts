import { computed, reactive, ref } from 'vue';
import { createAccessRequest, getDataSource, getDataSources } from './data-source-api';
import type { DataSource, DataSourceAccessState, DataSourceSort } from './types';

const accessRank: Record<DataSourceAccessState, number> = {
  read: 0,
  write: 0,
  pending: 1,
  no_access: 2,
  restricted: 3,
};

export function useDataSources(token: () => Promise<string>) {
  const dataSources = ref<DataSource[]>([]);
  const selectedDataSource = ref<DataSource>();
  const query = ref('');
  const sort = ref<DataSourceSort>('access');
  const loading = ref(false);
  const error = ref('');
  const requestingIds = reactive(new Set<string>());

  const sortedDataSources = computed(() => {
    const normalizedQuery = query.value.trim().toLocaleLowerCase();
    const results = dataSources.value.filter((source) => {
      const name = source.datasetDetail.name.toLocaleLowerCase();
      const summary = (source.datasetDetail.summary ?? source.datasetDetail.description ?? '').toLocaleLowerCase();
      return !normalizedQuery || name.includes(normalizedQuery) || summary.includes(normalizedQuery);
    });

    return results.sort((left, right) => {
      const nameOrder = left.datasetDetail.name.localeCompare(right.datasetDetail.name, undefined, { sensitivity: 'base' });
      if (sort.value === 'name-asc') return nameOrder;
      if (sort.value === 'name-desc') return -nameOrder;
      return accessRank[left.accessState ?? 'no_access'] - accessRank[right.accessState ?? 'no_access'] || nameOrder;
    });
  });

  function patchAccessState(id: string, accessState: DataSourceAccessState) {
    dataSources.value = dataSources.value.map((source) => source.id === id ? { ...source, accessState } : source);
    if (selectedDataSource.value?.id === id) {
      selectedDataSource.value = { ...selectedDataSource.value, accessState };
    }
  }

  async function loadDataSources() {
    loading.value = true;
    error.value = '';
    try {
      dataSources.value = await getDataSources(await token());
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'Unable to load data sources.';
    } finally {
      loading.value = false;
    }
  }

  async function selectDataSource(id: string) {
    error.value = '';
    try {
      const source = await getDataSource(await token(), id);
      selectedDataSource.value = source;
      const index = dataSources.value.findIndex((item) => item.id === id);
      if (index >= 0) dataSources.value[index] = source;
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'Unable to load the data source.';
    }
  }

  async function requestAccess(source: DataSource) {
    if (source.accessState !== 'no_access' || requestingIds.has(source.id)) return;

    requestingIds.add(source.id);
    error.value = '';
    try {
      await createAccessRequest(await token(), source.id);
      patchAccessState(source.id, 'pending');
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'Unable to request access.';
    } finally {
      requestingIds.delete(source.id);
    }
  }

  return {
    dataSources,
    selectedDataSource,
    query,
    sort,
    loading,
    error,
    requestingIds,
    sortedDataSources,
    loadDataSources,
    selectDataSource,
    requestAccess,
  };
}
