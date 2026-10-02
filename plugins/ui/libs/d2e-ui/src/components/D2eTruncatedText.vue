<template>
  <component :is="tag" ref="root"
    >{{ text }}<D2eTooltip v-if="truncated" activator="parent" :text="text"
  /></component>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, onUpdated, ref } from "vue";
import D2eTooltip from "./D2eTooltip.vue";
import { isTruncated } from "./truncation";

interface Props {
  text: string;
  tag?: string;
}

withDefaults(defineProps<Props>(), {
  tag: "span",
});

const root = ref<HTMLElement | null>(null);
const truncated = ref(false);
let observer: ResizeObserver | undefined;

function measure() {
  truncated.value = root.value ? isTruncated(root.value) : false;
}

onMounted(() => {
  measure();
  if (typeof ResizeObserver !== "undefined" && root.value) {
    observer = new ResizeObserver(measure);
    observer.observe(root.value);
  }
});

onUpdated(measure);

onBeforeUnmount(() => observer?.disconnect());
</script>
