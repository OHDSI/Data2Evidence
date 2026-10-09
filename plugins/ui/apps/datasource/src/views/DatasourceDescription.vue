<template>
  <div>
    <!-- No padding/background/max-width here: Atlas3's DataSourcesView.vue already
         mounts this component inside <AtlasCard padding="md">, matching every
         native report (Dashboard, Person, etc.) — duplicating that here double-pads
         and centers content that should fill the card width. -->
    <div v-if="loading">Loading…</div>
    <div v-else-if="!dataset">Unable to load this dataset.</div>
    <template v-else>
      <div class="ds-header">
        <h1 class="text-h6 ds-title">{{ dataset.studyDetail?.name ?? 'Untitled' }}</h1>

        <div
          v-if="accessState !== 'approved'"
          class="ds-actions"
        >
          <AccessChip
            :access="accessState"
            test-id="access-badge"
          />

          <template v-if="accessState === 'no-access'">
            <AtlasTooltip
              v-if="accessLookupFailed"
              :text="ACCESS_LOOKUP_FAILED_TOOLTIP"
              location="bottom end"
              max-width="220"
            >
              <template #activator="{ props: tooltipProps }">
                <span v-bind="tooltipProps">
                  <AtlasButton
                    data-testid="request-access-button"
                    variant="primary"
                    disabled
                  >
                    Request access
                  </AtlasButton>
                </span>
              </template>
            </AtlasTooltip>
            <AtlasButton
              v-else
              data-testid="request-access-button"
              variant="primary"
              :loading="requestingAccess"
              @click="requestAccess"
            >
              Request access
            </AtlasButton>
          </template>

          <AtlasTooltip
            v-else-if="accessState === 'restricted'"
            :text="RESTRICTED_TOOLTIP"
            location="bottom end"
            max-width="220"
          >
            <template #activator="{ props: tooltipProps }">
              <AtlasIcon
                v-bind="tooltipProps"
                data-testid="restricted-info-icon"
                icon="mdi-information-outline"
                size="small"
                class="text-medium-emphasis"
              />
            </template>
          </AtlasTooltip>
        </div>
      </div>

      <div class="ds-section ds-section--first">
        <h2 class="text-subtitle-1 ds-section__title">
          Description
        </h2>
        <div class="ds-rule" />
      </div>
      <!-- Body text: Atlas Body 2 (text-body-2). -->
      <div
        class="markdown-body text-body-2"
        v-html="descriptionHtml"
      />

      <div class="ds-section">
        <h2 class="text-subtitle-1 ds-section__title">
          Metadata
        </h2>
        <div class="ds-rule" />
      </div>
      <table class="info-table">
        <colgroup>
          <col class="ds-col-label">
          <col>
        </colgroup>
        <thead>
          <tr>
            <th class="text-subtitle-2">Resource type</th>
            <th class="text-subtitle-2">Dataset</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="text-body-2">Dataset ID</td>
            <td class="text-body-2">{{ dataset.id }}</td>
          </tr>
          <tr
            v-for="attribute in dataset.attributes"
            :key="attribute.attributeId"
          >
            <td class="text-body-2">{{ attribute.attributeConfig.name }}</td>
            <td class="text-body-2">{{ formatNumber(attribute.value) }}</td>
          </tr>
        </tbody>
      </table>

      <template v-if="resources.length > 0">
        <div class="ds-section">
          <h2 class="text-subtitle-1 ds-section__title">
            Files
          </h2>
          <div class="ds-rule" />
        </div>
        <table class="info-table">
          <colgroup>
            <col class="ds-col-label">
            <col>
            <col class="ds-col-actions">
          </colgroup>
          <thead>
            <tr>
              <th class="text-subtitle-2">Filename</th>
              <th class="text-subtitle-2">Size</th>
              <th class="info-table__actions text-subtitle-2">Download file</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="resource in resources"
              :key="resource.name"
            >
              <td class="text-body-2">{{ resource.name }}</td>
              <td class="text-body-2">{{ resource.size }}</td>
              <td class="info-table__actions">
                <div class="info-table__action-wrap">
                  <AtlasButton
                    :data-testid="`resource-download-${resource.name}`"
                    variant="ghost"
                    :loading="downloadingName === resource.name"
                    @click="download(resource)"
                  >
                    Download
                  </AtlasButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import { AtlasButton, AtlasTooltip, AtlasIcon } from '@ohdsi/atlas-ui'
import AccessChip from '../components/AccessChip.vue'
import { useDatasourceAccess } from '../composables/useDatasourceAccess'
import { useDatasourceResources } from '../composables/useDatasourceResources'
import { formatNumber } from '../utils/formatNumber'

const ACCESS_LOOKUP_FAILED_TOOLTIP = 'Unable to check your access right now. Try again shortly.'
const RESTRICTED_TOOLTIP = 'Access to this dataset is restricted. Contact your administrator to gain access.'

const props = defineProps<{ sourceKey: string; token: string | null }>()

const { dataset, accessState, accessLookupFailed, loading, requestingAccess, requestAccess } = useDatasourceAccess(
  () => props.sourceKey,
  () => props.token,
)
const { resources, downloadingName, download } = useDatasourceResources(
  () => props.sourceKey,
  () => props.token,
)

const md = new MarkdownIt({ html: false })
const descriptionHtml = computed(() => md.render(dataset.value?.studyDetail?.description ?? ''))
</script>

<style scoped>
.ds-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}
.ds-title { margin: 0; color: var(--ds-primary); }
.ds-actions { display: flex; align-items: center; gap: 8px; }
.ds-section {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 24px 0 16px;
}
.ds-section--first { margin: 0 0 16px; }
.ds-section__title { margin: 0; color: var(--ds-primary); white-space: nowrap; }
.ds-rule { flex: 1; height: 1px; background: rgba(var(--v-theme-on-surface), 0.12); }
.ds-col-label { width: 40%; }
.ds-col-actions { width: 200px; }

/*
 * Shared by the Metadata and Files tables so they line up consistently.
 * Row heights (60px header / 40px body) and the #DEDCDA divider color come
 * from the D2E Design System's "basic table" reference (Figma node 2445:8197).
 */
.info-table {
  width: 100%;
  max-width: 960px;
  border-collapse: collapse;
}
.info-table th {
  padding: 20px 12px;
  text-align: left;
  color: #595757;
  border-bottom: 1px solid #DEDCDA;
}
.info-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #DEDCDA;
}
.info-table th:first-child,
.info-table td:first-child {
  padding-left: 0;
}
.info-table th.info-table__actions,
.info-table td.info-table__actions {
  text-align: right;
}
.info-table__action-wrap {
  display: flex;
  justify-content: flex-end;
}

/*
 * Atlas3's global Vuetify reset (MD3-driven) strips list styling — ul { list-style:
 * none; padding-left:0; display:flex } — which turns markdown-it's <ul><li> output
 * into an unbulleted flex row that visually collapses into a run-on sentence.
 * v-html content bypasses normal scoped-CSS matching, so these need :deep().
 */
.markdown-body :deep(p) {
  margin: 0 0 1em;
}
.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  display: block;
  padding-left: 1.5em;
  margin: 0 0 1em;
}
.markdown-body :deep(ul) {
  list-style: disc;
}
.markdown-body :deep(ol) {
  list-style: decimal;
}
.markdown-body :deep(li) {
  display: list-item;
  margin-bottom: 0.25em;
}
</style>
