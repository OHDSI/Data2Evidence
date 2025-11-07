<template>
  <label :title="title" v-bind:class="['app-label', 'col-form-label', 'col-form-label-sm', cssClass]">
    {{ text }}
  </label>
</template>
<script lang="ts">
export default {
  name: 'app-label',
  props: ['text', 'cssClass', 'title'],
}
</script>
