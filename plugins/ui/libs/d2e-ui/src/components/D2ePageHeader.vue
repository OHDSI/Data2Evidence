<template>
  <header class="d2e-page-header">
    <div class="d2e-page-header__text">
      <p v-if="eyebrow" class="d2e-page-header__eyebrow">
        <span>{{ eyebrow }}</span>
        <span class="d2e-page-header__eyebrow-rule" />
      </p>
      <h1 class="d2e-page-header__title">{{ title }}</h1>
      <p v-if="subtitle" class="d2e-page-header__subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="d2e-page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
interface Props {
  title: string;
  eyebrow?: string;
  subtitle?: string;
}

withDefaults(defineProps<Props>(), {
  eyebrow: undefined,
  subtitle: undefined,
});
</script>

<style scoped lang="scss">
.d2e-page-header {
  display: flex;
  align-items: flex-start;
  gap: var(--d2e-spacing-xl);
  font-family: var(--d2e-font-family);

  &__text {
    flex: 1 1 auto;
    min-width: 0;
  }

  &__eyebrow {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 var(--d2e-spacing-xs);
    font-size: 11px;
    font-weight: 700;
    line-height: 1.5;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--d2e-color-primary);
  }

  &__eyebrow-rule {
    width: 24px;
    height: 2px;
    border-radius: 2px;
    background: var(--d2e-color-secondary);
  }

  &__title {
    margin: 0;
    font-size: 26px;
    font-weight: 300;
    line-height: 1.2;
    letter-spacing: 0.01em;
    color: var(--d2e-color-primary);
  }

  &__subtitle {
    margin: var(--d2e-spacing-xxs) 0 0;
    font-size: 13px;
    line-height: 1.5;
    color: var(--d2e-color-text-secondary);
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: var(--d2e-spacing-xs);
    flex-shrink: 0;
  }
}
</style>
