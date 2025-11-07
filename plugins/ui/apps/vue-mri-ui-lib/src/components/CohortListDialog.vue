<template>
  <messageBox v-if="showCohortListDialog" dim="true" :busy="busy" messageType="custom" @close="closeMessageBox">
    <template v-slot:header>{{ getText('MRI_PA_COLL_LIST', this.bookmarkName) }}</template>
    <template v-slot:body>
      <div v-if="!cohortListDisplay || cohortListDisplay.length === 0">
        {{ getText('MRI_PA_COLL_NO_COHORTS_TEXT') }}
      </div>
      <template v-for="cohort in cohortListDisplay" :key="cohort.id">
        <cohortItem :cohort="cohort" />
      </template>
      <Pager
        :currentPage="currentPage"
        :rowCount="getCohortListCount"
        :pageSize="this.pageSize"
        @goPage="goPage"
      ></Pager>
    </template>
    <template v-slot:footer>
      <appButton :click="closeMessageBox" :text="getText('MRI_PA_CLOSE')"></appButton>
    </template>
  </messageBox>
</template>

<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import messageBox from './MessageBox.vue'
import appButton from '../lib/ui/app-button.vue'
import Pager from './Pager.vue'
import cohortItem from './CohortItem.vue'
import DateUtils from '../utils/DateUtils'

export default {
  name: 'cohortListDialog',
  props: ['bookmarkId', 'bookmarkName', 'openListDialog'],
  data() {
    return {
      showCohortListDialog: false,
      busy: true,
      pageSize: 5,
    }
  },
  watch: {
    openListDialog(val) {
      if (val) {
        this.openCohortListDialog()
        this.busy = true
        this.loadCohortList({
          bookmarkId: this.bookmarkId,
        }).then(() => {
          this.busy = false
        })
      }
    },
  },
  computed: {
    ...mapGetters(['getText', 'getCohortList', 'getCohortListPage', 'getCohortListCount']),
    currentPage: {
      get() {
        return this.getCohortListPage
      },
      set(pageNum) {
        this.setCohortListPage(pageNum)
      },
    },
    cohortListDisplay() {
      const startIndex = (this.currentPage - 1) * this.pageSize
      const endIndex = startIndex + this.pageSize

      const cohortListData = this.getCohortList.slice(startIndex, endIndex)

      const returnValue = []
      cohortListData.forEach(cohort => {
        const { datasetId } = JSON.parse(cohort.syntax)

        returnValue.push({
          id: cohort.id,
          name: cohort.name,
          datasetId: datasetId,
          description: cohort.description,
          created: DateUtils.displayBookmarkDateFormat(cohort.creationTimestamp),
          count: cohort.patientIds.length,
        })
      })
      return returnValue
    },
  },
  methods: {
    ...mapActions(['toggleCohortListDialog', 'loadCohortList', 'clearCohortList', 'setCohortListPage']),
    openCohortListDialog() {
      this.showCohortListDialog = true
    },
    closeMessageBox() {
      this.showCohortListDialog = false
      this.clearCohortList()
      this.$emit('closeEv')
    },
    goPage(pageNum) {
      this.currentPage = pageNum
    },
  },
  components: {
    messageBox,
    appButton,
    Pager,
    cohortItem,
  },
}
</script>
