<template>
  <div class="boolfiltercontainer" v-bind:class="{ exclusion: showExclusion, hidden: !nonBasicCards.length }">
    <div class v-if="showBooleanCondition">
      <button class="btn btn-sm btn-boolean-toggle" @click="toggleBooleanCondition">
        {{ getText(boolConditionText) }}
        <appIcon icon="synchronize"></appIcon>
      </button>
    </div>
    <div class="boolfiltercontainer-content" :class="{ tinted: showBackground }">
      <draggable :list="nonBasicCards" @change="rearrangeFilterCard" :v-bind="dragOptions">
        <transition-group>
          <template v-for="id in nonBasicCards" :key="id">
            <filtercard
              :id="id"
              :parentId="boolFilterContainerModel.id"
              :showBooleanCondition="!isFirstFilterCard(id)"
              @renameModalShown="renameModalShown"
            ></filtercard>
          </template>
        </transition-group>
      </draggable>
    </div>
  </div>
</template>
<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import appIcon from '../lib/ui/app-icon.vue'
import appLabel from '../lib/ui/app-label.vue'
import FilterCard from './FilterCard.vue'
import draggable from 'vuedraggable'

export default {
  name: 'boolfiltercontainer',
  props: ['id', 'parentId', 'showExclusion', 'showBooleanCondition'],
  data() {
    return {
      isDraggable: true,
    }
  },
  computed: {
    ...mapGetters(['getBoolFilterContainer', 'getMriFrontendConfig', 'getText', 'getFilterCard']),
    boolConditionText() {
      let text
      switch (this.boolFilterContainerModel.props.op) {
        case 'AND':
          text = 'MRI_PA_AND'
          break
        case 'OR':
          text = 'MRI_PA_OR'
          break
      }
      return text
    },
    boolFilterContainerModel() {
      return this.getBoolFilterContainer(this.id)
    },
    nonBasicCards() {
      const cards = this.boolFilterContainerModel.props.filterCards.filter(f => f !== 'patient')
      return this.showExclusion
        ? cards.filter(c => this.getFilterCard(c).props.excludeFilter)
        : cards.filter(c => !this.getFilterCard(c).props.excludeFilter)
    },
    showBackground() {
      return this.nonBasicCards.length > 1
    },
    basicCard() {
      return this.boolFilterContainerModel.props.filterCards.filter(f => f === 'patient')
    },
    filterCardMenu() {
      const aMenuItems = []
      this.getMriFrontendConfig.getFilterCards().forEach(oFilterCardConfig => {
        if (!oFilterCardConfig.isBasicData()) {
          aMenuItems.push({
            key: oFilterCardConfig.getConfigPath(),
            text: oFilterCardConfig.getName(),
          })
        }
      })

      return aMenuItems
    },
    dragOptions() {
      return {
        group: 'boolfiltercontainer',
        dragClass: 'ghost',
        disabled: !this.isDraggable,
      }
    },
  },
  methods: {
    ...mapActions([
      'addFilterCard',
      'toggleFilterContainerBooleanCondition',
      'updateBoolFilterContainer',
      'resetAllFilterCardEntryExit',
    ]),
    onAddFilterCardMenuItemSelected(configPath) {
      this.addFilterCard({
        configPath,
        boolFilterContainerId: this.id,
      })
    },
    isFirstFilterCard(id) {
      return this.nonBasicCards.indexOf(id) === 0
    },
    toggleBooleanCondition() {
      this.toggleFilterContainerBooleanCondition({
        filterContainerId: this.id,
        parentId: this.parentId,
      })
      this.resetAllFilterCardEntryExit({ key: null })
    },
    rearrangeFilterCard(e) {
      if (e.added) {
        this.updateBoolFilterContainer({
          boolFilterContainerId: this.id,
          filterCardId: e.added.element,
          type: 'add',
        })
      }
      if (e.removed) {
        this.updateBoolFilterContainer({
          boolFilterContainerId: this.id,
          filterCardId: e.removed.element,
          type: 'remove',
        })
      }
    },
    renameModalShown(value) {
      this.isDraggable = !value
    },
  },
  components: {
    appLabel,
    appIcon,
    draggable,
    filtercard: FilterCard,
  },
}
</script>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.largeButton {
  width: 100%;
}

.largeButton button .btn {
  width: inherit;
  font-weight: bold !important;
}
</style>
