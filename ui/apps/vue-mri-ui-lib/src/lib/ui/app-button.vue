<template>
  <button @click="click" class="appButton" v-bind:class="{ disabled: disabled }" :title="tooltip" :disabled="disabled">
    <div class="buttonInner">
      <icon v-if="icon !== ''" :icon="icon" />
      <span class="buttonContent" v-bind:style="getTextStyle">
        {{ text }}
      </span>
    </div>
  </button>
</template>

<script lang="ts">
import icon from './app-icon.vue'

export default {
  name: 'app-button',
  props: {
    tooltip: {
      type: String,
      default: '',
    },
    text: {
      type: String,
      default: '',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    click: {
      type: Function,
      default: function click() {
        return () => {
          // just a comment
        }
      },
    },
    icon: {
      type: String,
      default: '',
    },
  },
  computed: {
    getTextStyle() {
      if (this.icon !== '') {
        return {
          'padding-left': '5px',
        }
      }
      return {}
    },
  },
  components: {
    icon,
  },
}
</script>
