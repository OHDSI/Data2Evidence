<template>
  <transition name="fade">
    <div class="app-mri-toast" v-if="getToastNotification.message !== ''">
      <span class="app-mri-toast-body">{{ getToastNotification.message }}</span>
    </div>
  </transition>
</template>
<script lang="ts">
import { mapActions, mapGetters } from 'vuex'

export default {
  name: 'messageToast',
  data() {
    return {
      timerToken: null,
    }
  },
  computed: {
    ...mapGetters(['getToastNotification']),
  },
  watch: {
    'getToastNotification.message': function watcher() {
      this.start()
    },
  },
  methods: {
    ...mapActions(['setToastMessage']),
    start() {
      clearTimeout(this.timerToken)
      this.timerToken = setTimeout(() => {
        this.setToastMessage({ text: '' })
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
