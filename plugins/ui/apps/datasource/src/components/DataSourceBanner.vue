<template>
  <div
    class="ds-banner"
    :class="{ 'ds-banner--pending': !ready }"
    data-testid="ds-banner"
  >
    <div class="ds-banner__logo">
      <img
        v-if="logoUrl"
        :key="logoUrl"
        :src="logoUrl"
        alt=""
        data-testid="ds-banner-logo"
        @load="onLogoDone"
        @error="onLogoDone"
      >
    </div>
    <div class="ds-banner__text">
      <h1 class="ds-banner__title">
        {{ title }}
      </h1>
      <p class="ds-banner__desc">
        {{ description }}
      </p>
    </div>
  </div>
</template>

<script lang="ts">
const settledLogos = new Set<string>()
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{ title?: string; description?: string; logoUrl?: string }>()

const logoSettled = ref(!props.logoUrl || settledLogos.has(props.logoUrl))
watch(() => props.logoUrl, url => { logoSettled.value = !url || settledLogos.has(url) })

const ready = computed(() => !!props.title && logoSettled.value)

function onLogoDone(): void {
  if (props.logoUrl) settledLogos.add(props.logoUrl)
  logoSettled.value = true
}
</script>

<style scoped>
.ds-banner {
  display: flex;
  align-items: center;
  gap: 40px;
  min-height: 240px;
  padding: 40px 100px;
  box-sizing: border-box;
}
.ds-banner--pending > * {
  visibility: hidden;
}
.ds-banner__logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 320px;
  height: 160px;
  flex: none;
}
.ds-banner__logo img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.ds-banner__text {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.ds-banner__title {
  margin: 0;
  font-family: var(--ds-font-heading, 'GT America', 'GT-America', 'IBM Plex Sans', sans-serif);
  font-weight: 500;
  font-size: 44px;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--ds-primary, #000080);
}
.ds-banner__desc {
  margin: 0;
  max-width: 920px;
  font-family: var(--ds-font-heading, 'GT America', 'GT-America', 'IBM Plex Sans', sans-serif);
  font-weight: 400;
  font-size: 18px;
  line-height: 1.5;
  color: var(--ds-text, #595757);
}
@media (max-width: 1100px) {
  .ds-banner { min-height: 176px; padding: 32px 40px; gap: 28px; }
  .ds-banner__logo { width: 224px; height: 112px; }
  .ds-banner__title { font-size: 32px; }
  .ds-banner__desc { font-size: 16px; }
}
@media (max-width: 640px) {
  .ds-banner { flex-direction: column; align-items: flex-start; min-height: 0; padding: 24px; gap: 20px; }
  .ds-banner__logo { width: 160px; height: 80px; justify-content: flex-start; }
  .ds-banner__title { font-size: 26px; }
}
</style>
