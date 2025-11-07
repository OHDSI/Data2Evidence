<template>
  <bs-alert show dismissible :variant="messageType" @dismissed="ok"> {{ header }}: {{ message }} </bs-alert>
</template>
<script lang="ts">
import { mapGetters } from 'vuex'
import BsAlert from '@/lib/ui/bs-alert.vue'

export default {
  name: 'notification',
  components: {
    BsAlert,
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
