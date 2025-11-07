<template>
  <loading-animation v-if="busy" />
  <div v-else class="searchWrapper" ref="searchWrapper">
    <template v-if="selectedNote">
      <div @click="selectNote(null, 0)" class="backButton">
        <d4l-icon-arrow-back />
        {{ getText('MRI_SEARCH_BACK_BTN') }}
      </div>
      <noteView :patientNotes="selectedNote" :initialIndex="selectedNoteIndex" />
    </template>
    <template v-else>
      <d4l-search
        :label="getText('MRI_SEARCH_BAR_PLACEHOLDER')"
        :handleSearch.prop="handleSearch"
        :handleInput.prop="handleInput"
        class="searchBar"
      />
      <template v-if="searched">
        <resultsPage @selectNote="selectNote" :pageSize="resultsPageSize" />
      </template>
      <template v-else>
        <div class="resultPlaceholder">
          <microscopeSvg class="placeholderImage" />
          {{ getText('MRI_SEARCH_RESULT_PLACEHOLDER') }}
        </div>
      </template>
    </template>
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
import MicroscopeSvg from './MicroscopeSvg.vue'
import NoteView from './NoteView.vue'
import ResultsPage from './ResultsPage.vue'
import LoadingAnimation from '../LoadingAnimation.vue'
import appIcon from '../..//lib/ui/app-icon.vue'
export default {
  name: 'search',
  data() {
    return {
      busy: false,
      query: '',
      resultsPageSize: 5,
      selectedNote: null,
      selectedNoteIndex: 0,
    }
  },
  computed: {
    ...mapGetters(['getIFR', 'getPLRequest', 'getText', 'searchQuery']),
    searched() {
      return this.searchQuery !== ''
    },
  },
  watch: {
    getIFR() {
      // React to filter changes
      this.handleSearch({
        query: this.query,
      })
    },
  },
  methods: {
    ...mapActions(['fireSearchNotesQuery']),
    handleInput({ query }) {
      this.query = query
    },
    handleSearch({ query }) {
      if (query[0]) {
        // Only submit non-empty queries
        this.busy = true
        this.fireSearchNotesQuery({
          query: query[0],
          highlight: true,
          snippet: true,
          groupByPatient: true,
          mriquery: this.getPLRequest(),
        }).then(() => (this.busy = false))
      }
    },
    selectNote(patientNotes, index) {
      this.selectedNote = patientNotes
      this.selectedNoteIndex = index
    },
  },
  components: {
    MicroscopeSvg,
    NoteView,
    ResultsPage,
    LoadingAnimation,
    appIcon,
  },
}
</script>
