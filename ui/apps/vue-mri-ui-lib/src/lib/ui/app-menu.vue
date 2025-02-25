<template>
  <b-dropdown :text="text" class="container">
    <template v-for="node in nodes" :key="node">
      <b-dropdown-item :click="onClick">
        <app-menu v-if="node.hasSubMenu" :text="node.text" :nodes="node.subMenu"> </app-menu>
        <span v-if="!node.hasSubMenu">
          {{ node.text }}
        </span>
      </b-dropdown-item>
    </template>
  </b-dropdown>
</template>
<script lang="ts">
// TODO: IMPLEMENT MENU IN BOOTSTRAP
export default {
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
}
</script>
<style></style>
