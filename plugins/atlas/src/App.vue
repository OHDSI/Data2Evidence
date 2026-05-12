<template>
  <div class="cohorts-plugin">
    <VueMriLoader />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import VueMriLoader from './components/VueMriLoader.vue';

onMounted(() => {
  // Force parent containers to take full height
  // This is needed for D2E's layout which doesn't properly size plugin containers
  const fixParentHeights = () => {
    const container = document.getElementById('single-spa-application:cohorts-plugin');
    if (container) {
      console.log('[Cohorts Plugin] Fixing parent heights...');

      // Walk up the DOM tree and ensure all parents have height: 100%
      let parent = container.parentElement;
      let depth = 0;
      while (parent && parent !== document.body && depth < 10) {
        const currentHeight = window.getComputedStyle(parent).height;
        console.log(`[Cohorts Plugin] Parent ${depth} current height:`, currentHeight);

        parent.style.height = '100%';
        parent.style.minHeight = '100%';
        parent.style.display = 'flex';
        parent.style.flexDirection = 'column';

        parent = parent.parentElement;
        depth++;
      }

      console.log('[Cohorts Plugin] Fixed', depth, 'parent elements');
    }
  };

  // Try immediately and also after a delay
  fixParentHeights();
  setTimeout(fixParentHeights, 100);
  setTimeout(fixParentHeights, 500);
});
</script>

<style>
/* Ensure the single-spa container takes full height */
#single-spa-application\\:cohorts-plugin {
  width: 100% !important;
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
}
</style>

<style scoped>
.cohorts-plugin {
  width: 100%;
  height: 100%;
  background: #fafafa;
  display: flex;
  flex-direction: column;
}
</style>
