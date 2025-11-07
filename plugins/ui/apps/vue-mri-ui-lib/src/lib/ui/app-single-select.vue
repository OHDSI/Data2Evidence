<template>
  <div class="app-single-select">
    <multiselect
      v-model="selected"
      :placeholder="getText('MRI_PA_FILTERCARD_SELECTION_NONE')"
      :searchable="false"
      :options="options"
      track-by="value"
      label="text"
      @input="updateValue"
      selectLabel=""
      selectedLabel=""
      deselectLabel=""
    />
  </div>
</template>
<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
export default {
  name: 'app-singleselect',
  props: ['model', 'options'],
  computed: {
    ...mapGetters(['getConstraint', 'getText']),
    selected() {
      let constraint = this.getConstraint(this.model.id).props.value
      if (constraint && constraint.value) {
        this.options.forEach(item => {
          if (constraint.value === item.value) {
            constraint.text = item.text
          }
        })
      } else {
        constraint = {
          text: 'None',
          value: '',
        }
      }
      return constraint
    },
  },
  methods: {
    ...mapActions(['updateConstraintValue']),
    updateValue(value) {
      const payload = {
        value,
        constraintId: this.model.id,
      }
      this.updateConstraintValue(payload)
    },
  },
}
</script>
