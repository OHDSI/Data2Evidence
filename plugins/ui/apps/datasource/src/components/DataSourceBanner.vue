<template>
  <div class="ds-banner">
    <img
      v-if="logoUrl"
      :src="logoUrl"
      alt=""
      class="ds-banner__logo"
      data-testid="ds-banner-logo"
    >
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

<script setup lang="ts">
defineProps<{ title: string; description: string; logoUrl?: string }>()
</script>

<style scoped>
.ds-banner {
  display: flex;
  align-items: center;
  gap: 40px;
  padding: 40px 100px;
  background: var(--ds-hero-bg, #fafafd);
}
.ds-banner__logo {
  height: 160px;
  width: auto;
  flex: none;
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
  color: var(--ds-navy, #000080);
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
  .ds-banner { padding: 32px 40px; gap: 28px; }
  .ds-banner__logo { height: 112px; }
  .ds-banner__title { font-size: 32px; }
  .ds-banner__desc { font-size: 16px; }
}
@media (max-width: 640px) {
  .ds-banner { flex-direction: column; align-items: flex-start; padding: 24px; gap: 20px; }
  .ds-banner__logo { height: 80px; }
  .ds-banner__title { font-size: 26px; }
}
</style>
