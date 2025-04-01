<template>
  <b-alert show dismissible :class=messageTypeClass @dismissed=ok >
    {{ header }}: {{ message }}
  </b-alert>

</template>
<script lang="ts">
import { mapGetters } from 'vuex'

export default {
  name: 'notification',
  props: {
    messageType: {
      type: String,
      default: 'error',
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
    messageTypeClass() {
      return `alert-${this.messageType}`
    },
  },
  methods: {
    ok() {
      this.$emit('ok')
    },
  },
}
</script>
