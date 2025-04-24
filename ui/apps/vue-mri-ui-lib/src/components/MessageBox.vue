<template>
  <transition name="modal">
    <div class="message-box">
      <div class="modal-wrapper modal-mask-dim" v-on:keyup="keymonitor" tabindex="0">
        <div v-bind:class="['modal-container', messageTypeClass]" v-bind:style="dialogStyle">
          <loadingAnimation class="dialog-loading-body" v-if="busy"></loadingAnimation>
          <header class="modal-header">
            <div class="modal-header-container">
              <span class="modal-header-icon" v-html="icon"></span>
              <span>
                <slot name="header"></slot>
              </span>
            </div>
          </header>
          <div class="modal-body">
            <slot name="body"></slot>
          </div>
          <footer class="modal-footer">
            <slot name="footer"></slot>
          </footer>
        </div>
      </div>
    </div>
  </transition>
</template>

<script lang="ts">
import LoadingAnimation from './LoadingAnimation.vue'

const messageTypes = {
  information: {
    icon: '&#xe090;',
  },
  warning: {
    icon: '&#xe201;',
  },
  error: {
    icon: '&#xe0b1;',
  },
  custom: {
    icon: '',
  },
}

export default {
  name: 'message-box',
  props: {
    close: Number,
    messageType: {
      type: String,
      default: 'information', // error, warning, success, information, confirmation, custom
    },
    busy: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    icon() {
      return messageTypes[this.messageType].icon
    },
    messageTypeClass() {
      return `message-box-${this.messageType}`
    },
    dialogStyle() {
      const style = {
        width: 'auto',
      }
      return style
    },
  },
  methods: {
    keymonitor(event) {
      const key = event.key
      if (key === 'Escape' || key === 'Esc') {
        this.$emit('close')
      }
    },
  },
  components: {
    LoadingAnimation,
  },
}
</script>
