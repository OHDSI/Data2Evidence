<template>
  <button
    @click="clicked"
    v-bind:class="{ active: active, disabled: disabled }"
    v-bind:title="title"
    class="chartButton"
    tabindex="0"
    :disabled="disabled"
  >
    <span class="icon" v-bind:style="'font-family:' + iconGroup">{{ icon }}</span>
  </button>
</template>

<script lang="ts">
export default {
  name: 'chartButton',
  props: ['clickEv', 'icon', 'name', 'title', 'iconGroup', 'activeChart', 'disabled'],
  data() {
    return {
      selected: false,
    }
  },
  computed: {
    active() {
      return this.activeChart === this.name
    },
  },
  methods: {
    clicked() {
      this.$emit('clickEv')
    },
  },
}
</script>
