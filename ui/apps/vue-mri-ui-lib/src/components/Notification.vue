<template>
  <app-alert show dismissible :variant="messageType" @dismissed="ok"> {{ header }}: {{ message }} </app-alert>
</template>
<script lang="ts">
import { mapGetters } from 'vuex'
import AppAlert from '@/lib/ui/app-alert.vue'

export default {
  name: 'notification',
  components: {
    AppAlert,
  },
  props: {
    messageType: {
      type: String,
      default: 'error', // Maps to 'danger' variant internally
    },
    message: {
      type: String,
      default: '',
    },
    header: {
      type: String,
      default: '',
    },
  },
  computed: {
    ...mapGetters(['getText']),
  },
  methods: {
    ok() {
      this.$emit('ok')
    },
  },
}
</script>
