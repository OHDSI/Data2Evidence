<template>
  <label>
    {{ getText('MRI_PA_FILTERCARD_FILTER_CARD_LABEL') }}
    <span>{{ count }}</span>
  </label>
</template>

<script lang="ts">
import { mapGetters } from 'vuex'

export default {
  name: 'filterCardCount',
  props: ['options'],
  computed: {
    ...mapGetters(['getFilterCardCount', 'getText']),
    count() {
      return this.getFilterCardCount(this.options)
    },
  },
}
</script>
