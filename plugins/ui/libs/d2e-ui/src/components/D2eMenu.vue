<template>
  <div class="d2e-menu" role="menu">
    <button
      v-for="item in items"
      :key="item.value"
      type="button"
      class="d2e-menu__item"
      :class="{
        'd2e-menu__item--selected': item.selected,
        'd2e-menu__item--disabled': item.disabled,
      }"
      role="menuitem"
      :disabled="item.disabled"
      @click="onSelect(item)"
    >
      <v-icon
        v-if="item.icon"
        :icon="item.icon"
        size="20"
        class="d2e-menu__item-icon"
      />
      <span class="d2e-menu__item-label">{{ item.label }}</span>
      <v-icon
        v-if="item.selected"
        icon="mdi-check"
        size="20"
        class="d2e-menu__item-check"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
export interface D2eMenuItem {
  label: string;
  value: string;
  icon?: string;
  selected?: boolean;
  disabled?: boolean;
}

interface Props {
  items: D2eMenuItem[];
}

const props = defineProps<Props>();

const emit = defineEmits<{ select: [value: string] }>();

function onSelect(item: D2eMenuItem) {
  if (item.disabled) return;
  emit("select", item.value);
}
</script>

<style scoped lang="scss">
// Values from design-system/menu-dropdown.md: container 330 (showcase width),
// radius 8, padding 16/12, elevation/8; rows 40 px, Body 1/Subtitle 1.
.d2e-menu {
  display: flex;
  flex-direction: column;
  width: 330px;
  padding: 12px 16px;
  background: var(--d2e-color-white);
  border-radius: 8px;
  box-shadow: var(--d2e-elevation-e8);
  font-family: var(--d2e-font-family);

  &__item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 40px;
    padding: 0 8px;
    color: var(--d2e-color-neutral-black);
    background: transparent;
    border: 0;
    border-radius: 4px;
    font-size: var(--d2e-font-body1-size);
    font-weight: var(--d2e-font-body1-weight);
    line-height: var(--d2e-font-body1-line-height);
    text-align: left;
    cursor: pointer;

    &:hover {
      background: var(--d2e-color-primary-xtra-lightest);
    }

    &--selected {
      font-weight: var(--d2e-font-subtitle1-weight);
      color: var(--d2e-color-primary);
      background: var(--d2e-color-neutral-xtra-lightest);
    }

    &--disabled {
      color: var(--d2e-color-neutral-light);
      cursor: not-allowed;
    }
  }

  &__item-icon {
    color: var(--d2e-color-neutral-light);
  }

  &__item-check {
    margin-left: auto;
    color: var(--d2e-color-primary);
  }

  &__item-label {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
