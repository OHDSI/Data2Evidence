<template>
  <div>
    <!-- No padding/background/max-width here: Atlas3's DataSourcesView.vue already
         mounts this component inside <AtlasCard padding="md">, matching every
         native report (Dashboard, Person, etc.) — duplicating that here double-pads
         and centers content that should fill the card width. -->
    <div v-if="loading">Loading…</div>
    <div v-else-if="!dataset">Unable to load this dataset.</div>
    <template v-else>
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:24px;">
        <!-- Exact Figma spec (Heading 5): IBM Plex Sans 600 18px/120%, color
             #000080. Not rgb(var(--v-theme-primary)) — this plugin bundles
             its own independent Vuetify theme (Atlas3's generic #1f425a),
             which doesn't pick up d2e's branded primaryColor override. -->
        <h1 style="margin:0; color:#000080; font-family:'IBM Plex Sans', sans-serif; font-weight:600; font-size:18px; line-height:120%;">{{ dataset.studyDetail?.name ?? 'Untitled' }}</h1>

        <!-- Approved: no badge at all, matching the Figma "With access" state -->

        <div
          v-if="accessState === 'pending' || accessState === 'no-access'"
          style="display:flex; align-items:center; gap:8px;"
        >
          <!-- Bespoke color pairs (not Vuetify's generic warning/error theme
               tones) — from the actual design assets. tone is intentionally
               omitted so AtlasChip's TONE_COLOR mapping doesn't override
               these with Vuetify's generic colors. -->
          <AtlasChip
            v-if="accessState === 'pending'"
            data-testid="access-badge"
            prepend-icon="mdi-clock-outline"
            style="background-color: #FFF8E2; color: #CD6000;"
          >
            Pending access
          </AtlasChip>
          <template v-else>
            <AtlasChip
              data-testid="access-badge"
              prepend-icon="mdi-lock-outline"
              style="background-color: #FDEDED; color: #D53939;"
            >
              No access
            </AtlasChip>
            <!-- Figma's button (node 1773:348519) is 146x40px. AtlasButton's
                 discrete sizes map to Vuetify heights xs=20/sm=28/md=36/lg=44 —
                 default (md, 36px) is the closest match, off by only 4px. -->
            <AtlasTooltip
              v-if="accessLookupFailed"
              text="Unable to check your access right now. Try again shortly."
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
        </div>

        <div
          v-else-if="accessState === 'restricted'"
          style="display:flex; align-items:center; gap:8px;"
        >
          <AtlasChip
            data-testid="access-badge"
            prepend-icon="mdi-alert-octagon-outline"
            style="background-color: #FDEDED; color: #D53939;"
          >
            Restricted
          </AtlasChip>
          <AtlasTooltip
            text="Access to this dataset is restricted. Contact your administrator to gain access."
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

      <div style="display:flex; align-items:center; gap:8px; margin-bottom:16px;">
        <!-- Exact Figma spec (Heading 5): IBM Plex Sans 600 18px/120%, color #000080. -->
        <h2 style="margin:0; color:#000080; font-family:'IBM Plex Sans', sans-serif; font-weight:600; font-size:18px; line-height:120%; white-space:nowrap;">
          Description
        </h2>
        <div style="flex:1; height:1px; background: rgba(var(--v-theme-on-surface), 0.12);" />
      </div>
      <div
        class="markdown-body"
        v-html="descriptionHtml"
      />

      <div style="display:flex; align-items:center; gap:8px; margin:24px 0 16px;">
        <h2 style="margin:0; color:#000080; font-family:'IBM Plex Sans', sans-serif; font-weight:600; font-size:18px; line-height:120%; white-space:nowrap;">
          Metadata
        </h2>
        <div style="flex:1; height:1px; background: rgba(var(--v-theme-on-surface), 0.12);" />
      </div>
      <table class="info-table">
        <colgroup>
          <col style="width:40%;">
          <col>
        </colgroup>
        <thead>
          <tr>
            <th>Resource type</th>
            <th>Dataset</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Dataset ID</td>
            <td>{{ dataset.id }}</td>
          </tr>
          <tr
            v-for="attribute in dataset.attributes"
            :key="attribute.attributeId"
          >
            <td>{{ attribute.attributeConfig.name }}</td>
            <td>{{ formatNumber(attribute.value) }}</td>
          </tr>
        </tbody>
      </table>

      <template v-if="resources.length > 0">
        <div style="display:flex; align-items:center; gap:8px; margin:24px 0 16px;">
          <h2 style="margin:0; color:#000080; font-family:'IBM Plex Sans', sans-serif; font-weight:600; font-size:18px; line-height:120%; white-space:nowrap;">
            Files
          </h2>
          <div style="flex:1; height:1px; background: rgba(var(--v-theme-on-surface), 0.12);" />
        </div>
        <table class="info-table">
          <colgroup>
            <col style="width:40%;">
            <col>
            <col style="width:200px;">
          </colgroup>
          <thead>
            <tr>
              <th>Filename</th>
              <th>Size</th>
              <th class="info-table__actions">Download file</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="resource in resources"
              :key="resource.name"
            >
              <td>{{ resource.name }}</td>
              <td>{{ resource.size }}</td>
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
import { AtlasChip, AtlasButton, AtlasTooltip, AtlasIcon } from '@ohdsi/atlas-ui'
import { useDatasourceAccess } from '../composables/useDatasourceAccess'
import { useDatasourceResources } from '../composables/useDatasourceResources'
import { formatNumber } from '../utils/formatNumber'

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
  font-weight: 600;
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
