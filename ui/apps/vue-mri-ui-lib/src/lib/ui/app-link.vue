<template>
  <a :href="href" class="app-link" :target="target" :title="title">
    {{ text }}
  </a>
</template>
<script lang="ts">
export default {
  name: 'app-link',
  props: ['text', 'href', 'target', 'title'],
}
</script>
