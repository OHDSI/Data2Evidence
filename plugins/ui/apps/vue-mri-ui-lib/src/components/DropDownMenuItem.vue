<template>
  <li
    class="dropdownmenuitem-container"
    v-on:mouseover="onItemHover"
    v-on:click="onItemClick"
    v-bind:class="getClass()"
  >
    <div class="leftMargin"></div>
    <div class="content">
      <icon v-if="icon !== ''" :icon="icon" />
      {{ text }}
    </div>
    <div class="subMenu" v-html="subMenuText"></div>
    <div class="rightMargin"></div>
  </li>
</template>

<script lang="ts">
import icon from '../lib/ui/app-icon.vue'

export default {
  name: 'dropDownMenuItem',
  props: ['text', 'hasSubMenu', 'selected', 'disabled', 'clickEv', 'hoverEv', 'isTitle', 'icon'],
  computed: {
    subMenuText() {
      if (this.hasSubMenu) {
        return '&#xe1ed;'
      }
      return ' '
    },
  },
  methods: {
    onItemHover() {
      this.$emit('hoverEv')
    },
    onItemClick() {
      if (!this.disabled) {
        this.$emit('clickEv')
      }
    },
    getClass() {
      return {
        selected: this.selected,
        hasNoSubMenu: !this.hasSubMenu,
        disabled: this.disabled,
        menuTitle: this.isTitle,
        noHover: this.disabled || (this.isTitle && !this.hasSubMenu),
      }
    },
  },
  components: {
    icon,
  },
}
</script>
