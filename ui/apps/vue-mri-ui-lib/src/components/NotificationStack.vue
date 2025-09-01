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

<script lang="ts">
import { mapGetters, mapMutations } from 'vuex'
import notification from './Notification.vue'
import { MESSAGE_ALERT_SHOW_TOGGLE, MESSAGE_FATAL_SHOW_TOGGLE } from '../store/mutation-types'

export default {
  name: 'NotificationStack',
  components: {
    fatal: notification,
    alert: notification,
  },
  computed: {
    ...mapGetters(['getFatalNotification', 'getAlertNotification', 'getText']),
  },
  methods: {
    ...mapMutations([MESSAGE_FATAL_SHOW_TOGGLE, MESSAGE_ALERT_SHOW_TOGGLE]),
    okFatal() {
      this[MESSAGE_FATAL_SHOW_TOGGLE]()
    },
    okAlert() {
      this[MESSAGE_ALERT_SHOW_TOGGLE]()
    },
  },
}
</script>

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

