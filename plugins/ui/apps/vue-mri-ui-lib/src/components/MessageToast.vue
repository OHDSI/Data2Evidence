<template>
  <transition name="fade">
    <div class="app-mri-toast" v-if="toastMessage !== ''">
      <span class="app-mri-toast-body">{{ toastMessage }}</span>
    </div>
  </transition>
</template>
<script lang="ts">
import { useNotificationStore } from '../stores/notifications'

export default {
  name: 'messageToast',
  setup() {
    return {
      notificationStore: useNotificationStore(),
    }
  },
  data() {
    return {
      timerToken: null,
    }
  },
  computed: {
    toastMessage() {
      return this.notificationStore.toast.message
    },
  },
  watch: {
    toastMessage(newMessage: string) {
      if (!newMessage) {
        clearTimeout(this.timerToken)
        this.timerToken = null
        return
      }
      this.start()
    },
  },
  beforeUnmount() {
    clearTimeout(this.timerToken)
    this.timerToken = null
  },
  methods: {
    start() {
      clearTimeout(this.timerToken)
      this.timerToken = setTimeout(() => {
        this.notificationStore.setToastMessage({ text: '' })
      }, 2000)
    },
  },
}
</script>
<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>
