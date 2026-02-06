<template>
  <div>
    <a v-if="isPatientLink" href="#" @click.prevent="openPatient">{{ value }}</a>
    <span v-else>{{ value }}</span>
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
    isPatientLink() {
      return this.meta.path === 'patient.attributes.pid'
    },
    value() {
      if (hasProp(this.item, this.meta.path)) {
        return this.item[this.meta.path]
      }
      return null
    },
  },
  methods: {
    openPatient() {
      // TODO: Implement navigation to patient detail
      console.log('Open patient:', this.value)
    },
  },
}
</script>
