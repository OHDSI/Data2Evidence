<template>
  <div class="boolfiltercontainer" v-bind:class="{ exclusion: showExclusion, hidden: !nonBasicCards.length }">
    <div class v-if="showBooleanCondition">
      <button class="btn btn-sm btn-boolean-toggle" @click="toggleBooleanCondition">
        {{ getText(boolConditionText) }}
        <appIcon icon="synchronize"></appIcon>
      </button>
    </div>
    <div class="boolfiltercontainer-content" :class="{ tinted: showBackground }">
      <VueDraggable v-model="nonBasicCards" v-bind="dragOptions" @remove="onFilterCardRemoved">
        <div v-for="(id, index) in nonBasicCards" :key="id" class="draggable-filtercard">
          <filtercard
            :id="id"
            :parentId="boolFilterContainerModel.id"
            :showBooleanCondition="index > 0"
            @renameModalShown="renameModalShown"
          />
        </div>
      </VueDraggable>
    </div>
  </div>
</template>
<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import appIcon from '../lib/ui/app-icon.vue'
import appLabel from '../lib/ui/app-label.vue'
import FilterCard from './FilterCard.vue'
import { VueDraggable } from 'vue-draggable-plus'

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
    nonBasicCards: {
      get() {
        const cards = this.boolFilterContainerModel.props.filterCards.filter(f => f !== 'patient')
        return this.showExclusion
          ? cards.filter(c => this.getFilterCard(c).props?.excludeFilter)
          : cards.filter(c => !this.getFilterCard(c).props?.excludeFilter)
      },
      set(newOrder) {
        this.reorderFilterCards({
          boolFilterContainerId: this.id,
          newOrder,
        })
        this.resetAllFilterCardEntryExit({ key: null })
      },
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
        animation: 150,
        dragClass: 'ghost',
        disabled: !this.isDraggable,
      }
    },
  },
  methods: {
    ...mapActions([
      'addFilterCard',
      'toggleFilterContainerBooleanCondition',
      'removeBoolFilterContainer',
      'resetAllFilterCardEntryExit',
      'reorderFilterCards',
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
    onFilterCardRemoved() {
      this.$nextTick(() => {
        // After v-model update, check if container is now empty
        if (this.nonBasicCards.length === 0) {
          this.removeBoolFilterContainer({ boolFilterContainerId: this.id })
        }
      })
    },
    renameModalShown(value) {
      this.isDraggable = !value
    },
  },
  components: {
    appLabel,
    appIcon,
    filtercard: FilterCard,
    VueDraggable,
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
