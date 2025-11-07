<template>
  <div :class="['apptextInput', this.stateClass]">
    <input class="form-control" tabindex="0" />
    <div role="messagetab" v-if="this.controlState !== ''">{{ message }}</div>
  </div>
</template>
<script lang="ts">
export default {
  name: 'app-text-input',
  props: {
    // renders the control in error, warning, etc state
    controlState: {
      type: String,
      default: '',
    },

    // text to render in the message tab
    message: {
      type: String,
      default: '',
    },
  },
  computed: {
    stateClass() {
      return `control-${this.controlState}-state`
    },
  },
}
</script>
