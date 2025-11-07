<template>
    <cohortEntryExitButton
      :text="Constants.CohortEntryExit.ENTRY"
    />
    <cohortEntryExitButton
      :text="Constants.CohortEntryExit.EXIT"
    />
  </template>
  
  <script lang="ts">
  import CohortEntryExitButton from './CohortEntryExitButton.vue'
  import Constants from '../utils/Constants';
  
  export default {
    components: {
        CohortEntryExitButton,
    },
    data() {
    return {
      Constants,
    };
  },
  }
  </script>
  