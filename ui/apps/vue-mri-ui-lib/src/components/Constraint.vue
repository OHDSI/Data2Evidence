<template>
  <div v-if="isVisible" class="form-group constraint" @mouseenter="onInputHover()" @mouseleave="isHelpVisible = false">
    <div style="display: inline-flex">
      <app-label :text="model.props.name" :title="model.props.name"></app-label>
      <helpPopover :isHelpVisible="isHelpVisible" :helpType="helpType"></helpPopover>
    </div>
    <app-tag-input
      :model="model"
      v-if="model.props.type === 'text' || model.props.type === 'conceptSet'"
      :title="attributeTitle"
      :isCatalogAttribute="attributeConfig.isCatalogAttribute()"
    ></app-tag-input>
    <app-range
      :model="model"
      v-if="model.props.type === 'num' && !isVariantConstraint(id)"
      :title="attributeTitle"
      :isCatalogAttribute="attributeConfig.isCatalogAttribute()"
    ></app-range>
    <app-variant-range
      :model="model"
      v-if="model.props.type === 'num' && isVariantConstraint(id)"
      :title="attributeTitle"
      :isCatalogAttribute="attributeConfig.isCatalogAttribute()"
      v-on:enable-filtercard="$emit('enable-filtercard')"
      v-on:disable-filtercard="$emit('disable-filtercard')"
    ></app-variant-range>
    <app-date-range
      :model="model"
      v-if="model.props.type === 'time'"
      :title="attributeTitle"
      :isCatalogAttribute="attributeConfig.isCatalogAttribute()"
    ></app-date-range>
    <app-datetime-range
      :model="model"
      v-if="model.props.type === 'datetime'"
      :title="attributeTitle"
      :isCatalogAttribute="attributeConfig.isCatalogAttribute()"
    ></app-datetime-range>
    <app-single-select
      :model="model"
      :options="getSource(model.props.dataSource)"
      v-if="model.props.type === 'parentInteraction'"
      :title="attributeTitle"
    ></app-single-select>
  </div>
</template>
<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import helpPopover from './HelpPopover.vue'
import appLabel from '../lib/ui/app-label.vue'
import appIcon from '../lib/ui/app-icon.vue'

export default {
  name: 'constraint',
  props: ['id', 'parentName'],
  data() {
    return {
      isHelpVisible: false,
      helpType: '',
    }
  },
  mounted() {
    if (this.model.props.type === 'num') {
      if (!this.isVariantConstraint(this.id)) {
        this.helpType = 'num'
      } else {
        this.helpType = 'variantNum'
      }
    }
  },
  computed: {
    ...mapGetters([
      'isVariantConstraint',
      'getText',
      'getMriFrontendConfig',
      'getConstraint',
      'getFilterCardsByBoolFilterContainerId',
      'getBoolFilterContainers',
    ]),
    model() {
      return this.getConstraint(this.id)
    },
    attributeConfig() {
      return this.getMriFrontendConfig.getAttributeByPath(this.id)
    },
    isVisible() {
      return this.attributeConfig ? this.attributeConfig.isVisibleInFilterCard() : true
    },
    attributeTitle() {
      return `${this.parentName} - ${this.model.props.name}`
    },
  },
  methods: {
    onInputHover() {
      this.isHelpVisible = this.model.props.type === 'num'
    },
    getSource(dataSource) {
      let options = []
      const boolFilterContainers = this.getBoolFilterContainers()
      const filterCardId = this.model.parentId
      const parentContainerId = Object.keys(boolFilterContainers).find(containerId => {
        return boolFilterContainers[containerId].props.filterCards.indexOf(filterCardId) >= 0
      })
      const filteredBoolFilterContainers = Object.keys(boolFilterContainers).filter(
        containerId => containerId !== parentContainerId
      )
      filteredBoolFilterContainers.forEach(containerId => {
        const filterCardList = this.getFilterCardsByBoolFilterContainerId({
          dataSource,
          boolFilterContainerId: containerId,
        })
        options = options.concat(
          filterCardList
            .filter(filterCard => {
              // checking if the filterCard is a valid parent
              return this.model.props.parents.find(parentId => {
                return filterCard.key.indexOf(parentId) > -1
              })
            })
            .map(f => {
              return {
                value: f.key,
                text: f.text,
              }
            })
        )
      })

      options.unshift({
        value: null,
        text: 'None',
      })
      return options
    },
  },
  components: {
    appLabel,
    appIcon,
    helpPopover,
  },
}
</script>
