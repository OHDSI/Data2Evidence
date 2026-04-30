<script lang="ts">
import { mapGetters } from 'vuex'
import notification from './Notification.vue'
import { useNotificationStore } from '../stores/notifications'

export default {
  name: 'NotificationStack',
  components: {
    fatal: notification,
    alert: notification,
  },
  setup() {
    return {
      notificationStore: useNotificationStore(),
    }
  },
  computed: {
    ...mapGetters(['getText']),
    getFatalNotification() {
      return this.notificationStore.getFatalNotification
    },
    getAlertNotification() {
      return this.notificationStore.getAlertNotification
    },
  },
  methods: {
    okFatal() {
      this.notificationStore.closeFatalNotification()
    },
    okAlert() {
      this.notificationStore.closeAlertNotification()
    },
  },
}
</script>

<template>
  <div class="notification-stack">
    <fatal
      v-if="getFatalNotification.show"
      :message="getFatalNotification.message"
      :header="getText('MRI_PA_CONFIG_ADMIN_ERROR')"
      @ok="okFatal"
    />
    <alert
      v-if="getAlertNotification.show"
      :message="getAlertNotification.message"
      :header="getAlertNotification.title"
      :messageType="getAlertNotification.messageType"
      @ok="okAlert"
    />
  </div>
</template>

<style scoped>
.notification-stack {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 9999;
  width: 100%;
}
</style>
