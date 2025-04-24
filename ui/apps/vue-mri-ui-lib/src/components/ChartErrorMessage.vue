<template>
  <div v-if="errorMessage !== ''" class="chart-error-placeholder">
    <div class="error-wrapper">
      <label class="error-message">
        <span class="icon" style="font-family: app-icons"></span>
        {{ getText(errorMessage) }}
      </label>
    </div>
  </div>
</template>

<script lang="ts">
import { mapGetters } from 'vuex'

export default {
  name: 'chartErrorMessage',
  props: ['errorMessage'],
  data() {
    return {}
  },
  computed: {
    ...mapGetters(['getText']),
  },
  methods: {
    clicked() {
      this.$emit('clickEv')
    },
  },
}
</script>
