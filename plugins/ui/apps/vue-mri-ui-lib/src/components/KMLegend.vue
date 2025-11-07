<template>
  <div class="km-legend-container">
    <span class="km-legend-title">{{ getTitle }}</span>
    <ul class="km-legend-entries">
      <li v-for="item in getList" :key="item.text" class="km-legend-entry">
        <span class="km-legend-entry-box" v-bind:style="{ 'background-color': item.bg }"></span>
        <span class="km-legend-entry-text">{{ item.text }}</span>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
export default {
  name: 'km-legend',
  props: {
    series: {
      type: Array,
      default: () => [],
    },
    categories: {
      type: Array,
      default: () => [],
    },
  },
  computed: {
    getList() {
      return this.series.map(item => ({
        text: item.name,
        bg: item.mColor,
      }))
    },
    getTitle() {
      return this.categories.map(category => category.name).join(', ')
    },
  },
}
</script>
