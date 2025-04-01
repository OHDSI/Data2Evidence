<template>
  <div class="searchFilters">
    <div class="panel-header">
      {{ getText('MRI_SEARCH_FILTER_HEADER') }}
    </div>
    <div ref="filtercardScrollContainer" class="filters-content">
      <boolcontainer :id="query.model.result" @toggle="toggleExclusion" />
    </div>
    <div class="panel-footer">
      <b-dropdown variant="link" class="createFilterDropdown" dropup>
        <template v-slot:button-content>
          <div class="createFilterButton">
            <d4l-button :text="getText('MRI_SEARCH_FILTER_CREATE_BTN')" classes="button--block" />
          </div>
        </template>
        <div class="dropdown-scroll">
          <template v-for="item in getFilterCardMenu" :key="item">
            <b-dropdown-item-button :data-key="item.key" @click="addNewFilterCard(item.key, showExclusion)">{{
              item.text
            }}</b-dropdown-item-button>
          </template>
        </div>
      </b-dropdown>
    </div>
  </div>
</template>

<script lang="ts">
import { mapActions, mapGetters, mapState } from 'vuex'
import boolcontainer from '../BoolContainer.vue'
import filterCard from '../FilterCard.vue'

export default {
  name: 'searchFilters',
  data() {
    return {
      showExclusion: false,
    }
  },
  computed: {
    ...mapState({
      query: (state: any) => state.query,
    }),
    ...mapGetters(['getFilterCardMenu', 'getText', 'getChartableFilterCards']),
  },
  watch: {
    getChartableFilterCards(newVal, oldVal) {
      if (newVal && oldVal.length < newVal.length) {
        this.$nextTick(() => {
          this.$refs.filtercardScrollContainer.scrollTop = this.$refs.filtercardScrollContainer.scrollHeight
        })
      }
    },
  },
  methods: {
    ...mapActions(['addNewFilterCard']),
    toggleExclusion(isToggled) {
      this.showExclusion = isToggled
    },
  },
  components: {
    boolcontainer,
    filterCard,
  },
}
</script>
