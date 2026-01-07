<template>
  <div>
    <span>{{ display() }}</span>
  </div>
</template>
<script lang="ts">
import { mapGetters } from 'vuex'

function hasProp(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop)
}
export default {
  name: 'patientListData',
  props: ['item', 'meta'],
  data() {
    return {
      psNodeElement: null,
      psui5element: null,
    }
  },
  computed: {
    ...mapGetters(['getText']),
  },
  methods: {
    display() {
      if (hasProp(this.item, this.meta.path)) {
        return this.item[this.meta.path]
      }
      return null
    },
  },
}
</script>
