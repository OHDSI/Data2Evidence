<template>
  <div class="noteView">
    <div class="patientCard">
      <div class="patientCardHeader">
        {{ getText('MRI_SEARCH_PATIENT_CARD_HEADER', patientNotes.patientId) }}
      </div>
      <div class="patientNote notesContainer">
        <div class="noteHeader">
          {{ currentNote.noteTitle }}
        </div>
        <div v-html="currentNote.noteText" class="noteText" />
      </div>
    </div>
    <footer>
      <pager :currentPage="currentIndex" :rowCount="patientNotes.notes.length" :pageSize="1" @goPage="goPage" v2 />
    </footer>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import Pager from '../Pager.vue'
export default {
  name: 'noteView',
  props: ['patientNotes', 'initialIndex'],
  data() {
    return {
      currentIndex: this.initialIndex + 1,
    }
  },
  computed: {
    ...mapGetters(['getText']),
    currentNote() {
      return this.patientNotes.notes[this.currentIndex - 1]
    },
  },
  methods: {
    goPage(pageNo) {
      this.currentIndex = pageNo
    },
  },
  components: {
    Pager,
  },
}
</script>
