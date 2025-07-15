<template>
  <bs-dropdown :text="text" class="container">
    <template v-for="node in nodes" :key="node">
      <bs-dropdown-item @click="onClick">
        <app-menu v-if="node.hasSubMenu" :text="node.text" :nodes="node.subMenu"> </app-menu>
        <span v-if="!node.hasSubMenu">
          {{ node.text }}
        </span>
      </bs-dropdown-item>
    </template>
  </bs-dropdown>
</template>
<script lang="ts">
import bsDropdown from './bs-dropdown.vue'
import bsDropdownItem from './bs-dropdown-item.vue'

// TODO: IMPLEMENT MENU IN BOOTSTRAP
export default {
  compatConfig: {
    MODE: 3,
  },
  name: 'app-menu',
  props: ['nodes', 'text'],
  methods: {
    onClick(item) {
      if (item) {
        item.clicked = true
      }
    },
    onClose(event) {
      if (event) {
        event.preventDefault()
      }
    },
  },
  components: {
    bsDropdown,
    bsDropdownItem,
  },
}
</script>
<style></style>
