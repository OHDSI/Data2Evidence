<template>
  <div v-bind:class="['appMessageStrip', messageTypeClass]">
    <span class="appMessageStripIcon" v-html="icon"></span>
    <span class="appMessageStripMessage">
      {{ text }}
    </span>
    <button @click="closeMessageStrip" class="app-message-strip-button"></button>
  </div>
</template>
<script lang="ts">
const messageTypes = {
  information: {
    icon: '&#xe090;',
  },
  warning: {
    icon: '',
  },
  success: {
    icon: '',
  },
  error: {
    icon: '&#xe0b1;',
  },
  custom: {
    icon: '',
  },
}

export default {
  name: 'appMessageStrip',
  props: {
    close: Number,
    messageType: {
      type: String,
      default: 'information', // error, warning, success, information, custom
    },
    text: {
      type: String,
      default: 'Success',
    },
  },
  computed: {
    icon() {
      return messageTypes[this.messageType].icon
    },
    messageTypeClass() {
      return `message-strip-${this.messageType}`
    },
  },
  methods: {
    closeMessageStrip() {
      this.$emit('closeEv')
    },
  },
}
</script>
