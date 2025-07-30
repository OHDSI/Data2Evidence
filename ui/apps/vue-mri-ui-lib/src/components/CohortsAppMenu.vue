<template>
  <div class="cohorts-app-menu-container" style="display: inline">
    <!-- <button
      class="toolbarButton"
      :title="getText('MRI_PA_BUTTON_ADD_TO_COLLECTION')"
      @click="handleMenuClick('add')"
    >
      <span class="icon" style="font-family:app-icons"></span>
    </button> -->

    <bs-dropdown variant="link" size="sm" no-caret>
      <template v-slot:button-content>
        <button class="toolbarButton" :title="getText('MRI_PA_BUTTON_ADD_TO_COLLECTION')">
          <span class="icon" style="font-family: app-icons"> </span>
        </button>
      </template>
      <template v-for="item in menuList" :key="item.value">
        <bs-dropdown-item @click="handleMenuClick(item.value)">{{ item.text }}</bs-dropdown-item>
      </template>
    </bs-dropdown>
    <addCohort></addCohort>
    <cohortsApp :load="loadViewCohorts"></cohortsApp>
  </div>
</template>
<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import cohortsApp from './CohortsApp.vue'
import addCohort from './AddCohort.vue'
import bsDropdown from '../lib/ui/bs-dropdown.vue'
import bsDropdownItem from '../lib/ui/bs-dropdown-item.vue'

export default {
  compatConfig: {
    MODE: 3,
  },
  name: 'cohortsAppMenu',
  data() {
    return {
      menuList: [],
      loadViewCohorts: false,
    }
  },
  mounted() {
    const menuData = [
      {
        text: this.getText('MRI_PA_BUTTON_ADD_TO_COLLECTION'),
        value: 'add',
      },
      // Maybe remove in future if all cohort operations will be in different UI.
      // {
      //   text: this.getText('MRI_PA_BUTTON_VIEW_COHORT'),
      //   value: 'view'
      // },
      // {
      //   text: this.getText('MRI_PA_BUTTON_IMPORT_COHORT'),
      //   value: 'import'
      // }
    ]

    this.menuList = menuData
  },
  computed: {
    ...mapGetters(['getText']),
  },
  methods: {
    ...mapActions(['toggleAddCohortDialog']),
    handleMenuClick(arg) {
      if (arg) {
        switch (arg) {
          case 'add':
            this.toggleAddCohortDialog()
            break
          case 'import':
            break
          case 'view':
            this.loadViewCohorts = !this.loadViewCohorts
            break
        }
      }
    },
  },
  components: {
    addCohort,
    cohortsApp,
    bsDropdown,
    bsDropdownItem,
  },
}
</script>
