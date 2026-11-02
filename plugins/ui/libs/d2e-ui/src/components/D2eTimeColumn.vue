<template>
  <div class="d2e-time-column">
    <ul
      ref="list"
      class="d2e-time-column__list"
      role="listbox"
      :aria-label="label"
      @keydown="onKeydown"
    >
      <li
        v-for="(option, index) in options"
        :key="option"
        role="option"
        class="d2e-time-column__item"
        :class="{ 'd2e-time-column__item--selected': option === selected }"
        :aria-selected="option === selected"
        :tabindex="index === focusIndex ? 0 : -1"
        @click="emit('select', option)"
        @keydown.enter.prevent="emit('select', option)"
        @keydown.space.prevent="emit('select', option)"
      >
        {{ padTimePart(option) }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { padTimePart } from "./timePicker";

const ITEM_PITCH = 40;

interface Props {
  options: readonly number[];
  selected: number | null;
  open: boolean;
  label: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  select: [value: number];
}>();

const list = ref<HTMLUListElement | null>(null);

const selectedIndex = computed(() =>
  props.selected === null ? -1 : props.options.indexOf(props.selected)
);
const focusIndex = computed(() => Math.max(0, selectedIndex.value));

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    await nextTick();
    if (list.value) {
      list.value.scrollTop = Math.max(0, selectedIndex.value) * ITEM_PITCH;
    }
  },
  { immediate: true }
);

function focusItem(index: number) {
  const items = list.value?.querySelectorAll<HTMLElement>("[role='option']");
  if (!items?.length) return;
  const next = Math.min(Math.max(index, 0), items.length - 1);
  items[next].focus();
}

function onKeydown(event: KeyboardEvent) {
  const items = Array.from(
    list.value?.querySelectorAll<HTMLElement>("[role='option']") ?? []
  );
  const current = items.indexOf(document.activeElement as HTMLElement);
  if (current === -1) return;
  const moves: Record<string, number> = {
    ArrowDown: current + 1,
    ArrowUp: current - 1,
    Home: 0,
    End: items.length - 1,
  };
  if (!(event.key in moves)) return;
  event.preventDefault();
  focusItem(moves[event.key]);
}
</script>

<style scoped lang="scss">
.d2e-time-column {
  position: relative;
  flex: 0 0 auto;
  width: calc(56px + 2 * var(--d2e-spacing-xs) + 1px);
  border-left: 1px solid rgba(0, 0, 0, 0.12);
}

.d2e-time-column__list {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--d2e-spacing-xxs);
  margin: 0;
  padding: var(--d2e-spacing-xs);
  list-style: none;
  overflow-y: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.d2e-time-column__item {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 36px;
  border-radius: 18px;
  color: rgba(0, 0, 0, 0.87);
  font-family: var(--d2e-font-family);
  font-size: var(--d2e-font-body2-size);
  font-weight: var(--d2e-font-body2-weight);
  line-height: var(--d2e-font-body2-line-height);
  cursor: pointer;
  user-select: none;

  &:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }

  &:focus-visible {
    outline: 2px solid var(--d2e-color-primary);
    outline-offset: -2px;
  }
}

.d2e-time-column__item--selected,
.d2e-time-column__item--selected:hover {
  background-color: var(--d2e-color-primary);
  color: var(--d2e-color-white);
  font-weight: 500;
}
</style>
