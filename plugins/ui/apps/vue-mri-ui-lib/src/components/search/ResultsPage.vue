<template>
  <div class="resultsPage">
    <div class="resultSummary">
      {{ getText('MRI_SEARCH_RESULT_SUMMARY', [notesCount, searchQuery]) }}
    </div>
    <div class="results">
      <div v-for="patientNotes of currentPageResults" :key="patientNotes.patientId" class="patientCard">
        <div class="patientCardHeader">
          {{ getText('MRI_SEARCH_PATIENT_CARD_HEADER', patientNotes.patientId) }}
        </div>
        <div class="patientNotes">
          <div v-for="(note, index) in patientNotes.notes" :key="note.noteId" class="patientNote">
            <div @click="handleNoteClick(patientNotes, index)" class="noteHeader link">
              {{ note.noteTitle }}
            </div>
            <div v-html="note.noteSnippet" class="noteText" />
          </div>
        </div>
      </div>
    </div>
    <footer>
      <Pager :currentPage="currentPage" :rowCount="patientCount" :pageSize="pageSize" @goPage="goPage" v2 />
    </footer>
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
import Pager from '../Pager.vue'
export default {
  name: 'resultsPage',
  props: ['pageSize'],
  computed: {
    ...mapGetters(['getText', 'notesCount', 'patientCount', 'searchQuery', 'searchResults', 'resultsPage']),
    currentPage: {
      get() {
        return this.resultsPage
      },
      set(pageNo) {
        this.setResultsPage(pageNo)
      },
    },
    currentPageResults() {
      const startIndex = (this.currentPage - 1) * this.pageSize
      const endIndex = startIndex + this.pageSize
      return this.searchResults.slice(startIndex, endIndex)
    },
  },
  methods: {
    ...mapActions(['setResultsPage']),
    goPage(pageNo) {
      this.currentPage = pageNo
    },
    handleNoteClick(note, index) {
      this.$emit('selectNote', note, index)
    },
  },
  components: {
    Pager,
  },
}
</script>
