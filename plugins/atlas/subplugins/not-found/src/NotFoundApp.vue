<template>
  <!-- Atlas3 draws the header around this, and the host's page background
       shows through, so the plugin paints only the centred empty state. -->
  <main class="nf-root" data-testid="d2e-not-found">
    <v-icon class="nf-icon" icon="mdi-search-web" aria-hidden="true" />
    <h1 class="nf-title">{{ COPY.title }}</h1>
    <p class="nf-subtitle">{{ COPY.subtitle }}</p>
    <D2eButton variant="secondary" data-testid="d2e-not-found-home" @click="goHome">
      {{ COPY.homeButton }}
    </D2eButton>
  </main>
</template>

<script setup lang="ts">
import { D2eButton } from '@d2e/ui';
import { COPY } from './copy';
import { homepageHash } from './homepage';

function goHome(): void {
  window.location.hash = homepageHash();
}
</script>

<style scoped>
/* Sizes and colours measured from the design attached to issue #2261. */
.nf-root {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  /* Fill the area under the Atlas3 header so the empty state sits in its centre. */
  min-height: calc(100vh - 64px);
  padding: 24px 16px;
  box-sizing: border-box;
  text-align: center;
  font-family: var(--d2e-font-family);
  color: var(--d2e-color-neutral);
}

.nf-icon {
  font-size: 120px;
  width: 120px;
  height: 120px;
  color: var(--d2e-color-neutral-lighter);
}

.nf-title {
  margin: 24px 0 4px;
  font-size: var(--d2e-font-subtitle1-size);
  font-weight: var(--d2e-font-subtitle1-weight);
  line-height: var(--d2e-font-subtitle1-line-height);
  color: inherit;
}

.nf-subtitle {
  margin: 0 0 16px;
  max-width: 560px;
  font-size: var(--d2e-font-body1-size);
  font-weight: var(--d2e-font-body1-weight);
  line-height: var(--d2e-font-body1-line-height);
}
</style>
