<template>
  <div class="app-checkbox">
    <div
      v-on:keyup="keymonitor"
      v-bind:class="['app-checkbox-container', { 'app-checkbox-checked': checked, 'app-checkbox-disabled': disabled }]"
      @click="toggleCheckbox"
      tabindex="0"
    >
      <input type="checkbox" :checked="checked" />
    </div>
    <appLabel :text="text" :cssClass="labelClass"></appLabel>
  </div>
</template>
<script lang="ts">
import appLabel from './app-label.vue'

export default {
  name: 'app-checkbox',
  data() {
    return {
      checked: '',
    }
  },
  props: ['tooltip', 'text', 'click', 'value', 'checkEv', 'labelClass', 'disabled'],
  watch: {
    value(val) {
      if (val !== this.checked) {
        this.checked = val
      }
    },
  },
  created() {
    this.checked = this.value
  },
  methods: {
    toggleCheckbox() {
      this.checked = !this.checked
      this.$emit('input', this.checked)
      this.$emit('checkEv')
    },
    keymonitor(event) {
      const key = event.key
      if (key === ' ' || key === 'Spacebar') {
        this.toggleCheckbox()
      }
    },
  },
  components: {
    appLabel,
  },
}
</script>
