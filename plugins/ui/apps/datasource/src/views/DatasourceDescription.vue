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
            <AtlasButton
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
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import { AtlasChip, AtlasButton, AtlasTooltip, AtlasIcon } from '@ohdsi/atlas-ui'
import { useDatasourceAccess } from '../composables/useDatasourceAccess'

const props = defineProps<{ sourceKey: string; token: string | null }>()

const { dataset, accessState, loading, requestingAccess, requestAccess } = useDatasourceAccess(
  () => props.sourceKey,
  () => props.token,
)

const md = new MarkdownIt({ html: false })
const descriptionHtml = computed(() => md.render(dataset.value?.studyDetail?.description ?? ''))
</script>

<style scoped>
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
