<template>
  <div>
    <span
      class="mri-link-text"
      @click="openPatientSummary"
      v-if="this.meta.isLink"
      :title="getText('MRI_PA_PATIENT_LIST_OPEN_PV')"
    >{{display()}}</span>
    <span v-else>{{display()}}</span>
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
    openPatientSummary(evt) {
      if (!hasProp(this.item, "patient.attributes.pid")) {
        return;
      }
      this.$emit("openps", {
        patientId: this.item["patient.attributes.pid"]
      });
    }
  },
}
</script>
