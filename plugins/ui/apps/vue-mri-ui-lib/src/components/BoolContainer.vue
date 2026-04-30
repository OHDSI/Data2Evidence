<template>
  <div>
    <filterCard id="patient" parentId="matchall" cssClass="appBasicFilterCard"></filterCard>
    <ul id="optional-nav" class="nav nav-bool nav-fill justify-content-center">
      <li class="nav-item" @click="toggleExclusion(false)">
        <a class="nav-link" :class="{ active: !showExclusion }" href="javascript:void(0)">{{ inclusionTitle }}</a>
      </li>
      <li class="nav-item" @click="toggleExclusion(true)">
        <a class="nav-link" :class="{ active: showExclusion }" href="javascript:void(0)">{{ exclusionTitle }}</a>
      </li>
    </ul>
    <div class="boolContainer">
      <template v-for="item in boolfiltercontainers" :key="item">
        <boolfiltercontainer
          :id="item"
          :parentId="id"
          :showExclusion="showExclusion"
          :showBooleanCondition="!isFirstFilterContainer(item)"
        ></boolfiltercontainer>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { mapGetters } from 'vuex'
import boolfiltercontainer from './BoolFilterContainer.vue'
import filterCard from './FilterCard.vue'
import filterCardCount from './FilterCardCount.vue'

export default {
  name: 'boolcontainer',
  props: ['id'],
  data() {
    return {
      showExclusion: false,
    }
  },
  computed: {
    ...mapGetters(['getFilterCardCount', 'getText', 'getBoolContainer', 'getBoolFilterContainer', 'getFilterCard']),
    boolfiltercontainers() {
      const boolContainer = this.getBoolContainer(this.id)
      const boolFilterContainers = boolContainer.props.boolfiltercontainers.reduce((filterContainers, c) => {
        const container = this.getBoolFilterContainer(c)
        if (container.props.filterCards.filter(f => f === 'patient').length > 0) {
          return filterContainers
        }
        filterContainers.push(c)
        return filterContainers
      }, [])
      return boolFilterContainers
    },
    filterCountOptions() {
      return {
        matchType: 'matchall',
        excludedOnly: this.showExclusion,
        excludeBasicCard: true,
      }
    },
    inclusionTitle() {
      const filterCount = this.getFilterCardCount({
        excludeBasicCard: true,
        excludedOnly: false,
      })
      return this.getText('MRI_PA_FILTERCARD_TITLE_INCLUSION') + ' (' + filterCount + ')'
    },
    exclusionTitle() {
      const filterCount = this.getFilterCardCount({
        excludeBasicCard: true,
        excludedOnly: true,
      })
      return this.getText('MRI_PA_FILTERCARD_TITLE_EXCLUSION') + ' (' + filterCount + ')'
    },
  },
  methods: {
    isFirstFilterContainer(boolFilterContainer) {
      // Find the first container that has visible (non-empty) cards
      const firstNonEmptyContainer = this.boolfiltercontainers.find(containerId => {
        const container = this.getBoolFilterContainer(containerId)
        const cards = container.props.filterCards.filter(f => f !== 'patient')
        const visibleCards = this.showExclusion
          ? cards.filter(c => this.getFilterCard(c).props?.excludeFilter)
          : cards.filter(c => !this.getFilterCard(c).props?.excludeFilter)
        return visibleCards.length > 0
      })
      return boolFilterContainer === firstNonEmptyContainer
    },
    toggleExclusion(isToggled) {
      this.showExclusion = isToggled
      this.$emit('toggle', isToggled)
    },
  },
  components: {
    boolfiltercontainer,
    filterCard,
    filterCardCount,
  },
}
</script>
