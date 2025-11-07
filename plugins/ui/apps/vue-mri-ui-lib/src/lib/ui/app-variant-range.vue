<template>
  <div tabindex="0" class="app-variant-range form-control form-control-sm" ref="container" @click="openInput">
    <div class="input-wrapper" :id="inputId">
      <template v-for="item in tokens" :key="item">
        <div
          :ref="`item-${item.id}`"
          tabindex="0"
          :class="getClass(item)"
          @keyup.delete="tagKeyUpHandler(item)"
          @click.stop.prevent="tagClickHandler(item)"
        >
          <span class="tokenText">{{ item.text }}</span>
          <span class="tokenIcon" @click="removeTag(item)">
            <appIcon icon="decline"></appIcon>
          </span>
        </div>
      </template>
      <input
        v-model="selection"
        v-if="inputVisible"
        type="text"
        v-on:keyup.delete="focusTag"
        v-on:keyup.enter="addTagEvent"
        ref="textControl"
        @keydown.down="down"
        @keydown.up="up"
        @input="change"
      />
    </div>
    <popper ref="popperRef" :target="target" :triggers="''" :auto-size="false" placement="bottom-start">
      <div class="MPopoverScroll" v-bind:style="inputWidth">
        <ul class="MListUl" @mousedown.prevent>
          <li
            v-for="(suggestion, index) in matches"
            :key="index"
            class="MLIB MLIBCursor"
            v-bind:class="{ active: isActive(index) }"
            @click="suggestionClick(index)"
          >
            <div v-html="suggestion"></div>
          </li>
        </ul>
      </div>
    </popper>
  </div>
</template>
<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import InputParser from '../utils/InputParser'
import VariantConstraintPatternDefinition from '../utils/VariantConstraintPatternDefinition'
import VariantConstraintTokenDefinition from '../utils/VariantConstraintTokenDefinition'
import appIcon from './app-icon.vue'
import popper from '../../components/Popper.vue'

declare var sap
const parser = new InputParser(
  VariantConstraintTokenDefinition.tokenDefinitions,
  VariantConstraintPatternDefinition.acceptedPatterns
)

export default {
  name: 'app-variant-range',
  data() {
    return {
      tagId: 0,
      inputVisible: false,
      tokens: [], // contains valid and invalid
      filters: [], // contains valid
      current: 0,
      selection: this.model.props.value[0] || '',
      previousSelection: '',
      open: false,
      popperRef: null,
      target: null,
      inputWidth: {
        width: '200px',
      },
    }
  },
  props: {
    suggestions: {
      type: Array,
      required: true,
      default: [],
    },
    model: {
      type: Object,
      required: true,
    },
  },
  mounted() {
    // TODO: rebuildFromAndFilter is not implemented yet
    // initialize filters
    this.model.props.value.forEach(element => {
      if (element.and) {
        return this.addTag(this.rebuildFromAndFilter(element).text)
      }
      this.addTag(this.rebuildFromSimpleFilter(element).text)
    })
    this.setFilterCardStatus()

    this.$nextTick(() => {
      window.addEventListener('click', this.closeInput)
      window.addEventListener('click', this.closeSuggestion)
    })
    this.target = this.$refs.container
    this.popperRef = this.$refs.popperRef
  },
  beforeDestroy() {
    window.removeEventListener('click', this.closeInput)
    window.addEventListener('click', this.closeSuggestion)
  },
  watch: {
    // tslint:disable-next-line
    'model.props.value': function (newVal, oldVal) {
      // reset the filters/tokens when newVal is empty
      // NOTE: do not update filters/tokens based on newVal
      // as they are updated (in addTag method) before triggering action
      if (!newVal.length) {
        this.filters = []
        // Bug - don't need to reset this.tokens (to empty array) as the component
        // is already taking care of this.tokens in removeTags
        this.tokens = []
      }
      // handling store level changes
      if (this.filters.length !== newVal.length) {
        this.filters = newVal.slice()
        newVal.forEach(filter => {
          this.tagId += 1
          this.tokens.push({
            oFilter: filter,
            id: this.tagId,
            valid: true,
            text: JSON.parse(filter.value).text,
          })
        })
      }
      this.setFilterCardStatus()
    },
  },
  methods: {
    ...mapActions(['updateConstraintValue', 'setFilterCardInactive']),
    ...mapGetters(['getMriConfig']),
    change() {
      if (this.open === false) {
        this.open = true
        this.current = 0
      }
    },
    isActive(index) {
      return index === this.current
    },
    suggestionClick(index) {
      const suggestion = this.suggestions[index] // NOTE: suggestions list is more complete than matches list
      if (suggestion) {
        this.selection = suggestion.key
      }
      this.open = false
      this.addTag(this.selection)
      this.selection = ''
    },
    addFilter(text, oFilter) {
      this.validateLocation(text)
    },
    addFailFilter(text) {
      this.validateLocation(text)
    },
    async openInput() {
      this.inputVisible = true
      await this.$nextTick()
      this.$refs.textControl.focus()
    },
    getClass(item) {
      return ['MriPaToken', item.valid ? 'MriPaValidToken' : 'MriPaFailToken']
    },
    closeInput(event) {
      if (this.inputVisible && !this.$refs.container.contains(event.target)) {
        this.selection = ''
        this.inputVisible = false
      }
    },
    focusTag(event) {
      if (!event.target.value.length && this.tokens.length) {
        // focus the last tag
        const token = this.tokens[this.tokens.length - 1]
        const tag = this.$refs[`item-${token.id}`]
        if (tag && tag.length) {
          tag[0].focus()
        }
      }
    },
    addTagEvent(event) {
      const sUnvalidatedFilterString = event.target.value
      this.addTag(sUnvalidatedFilterString)
      // event.target.value = "";
      this.selection = ''
    },
    addTag(sUnvalidatedFilterString: string) {
      this.tagId = this.tagId + 1
      parser.parseInput(sUnvalidatedFilterString, this.addFilter.bind(this), this.addFailFilter.bind(this))
    },
    removeTag(item) {
      if (item.valid) {
        this.filters.splice(this.filters.indexOf(item.oFilter), 1)
      }
      this.tokens.splice(this.tokens.indexOf(item), 1)
      const payload = {
        constraintId: this.model.id,
        value: [...this.filters],
      }
      this.updateConstraintValue(payload)
    },
    tagClickHandler(item, e) {
      this.$refs.textControl.blur()
    },
    tagKeyUpHandler(item, e) {
      const prevItemIndex =
        this.tokens.findIndex(t => {
          return t.id === item.id
        }) - 1
      this.removeTag(item)
      if (prevItemIndex >= 0) {
        const prevRefId = `item-${this.tokens[prevItemIndex].id}`
        this.$refs[prevRefId][0].focus()
      }
    },
    rebuildFromAndFilter(oFilter: IRangeItemAnd) {
      let text = ''
      switch (oFilter.and[0].op) {
        case '>':
          text = `${text}]`
          break
        case '>=':
          text = `${text}[`
          break
        default:
          break
      }

      text = `${text}${oFilter.and[0].value}-${oFilter.and[1].value}`

      switch (oFilter.and[1].op) {
        case '<':
          text = `${text}[`
          break
        case '<=':
          text = `${text}]`
          break
        default:
          break
      }

      return {
        text,
        oFilter,
      }
    },
    rebuildFromSimpleFilter(oFilter: IRangeItem) {
      let text = ''

      if (oFilter.op !== '=') {
        text = `${text}${oFilter.op}`
      }

      try {
        text = typeof JSON.parse(oFilter.value) === 'object' ? JSON.parse(oFilter.value).text : oFilter.value
      } catch (e) {
        text = oFilter.value
      }
      return {
        text,
        oFilter,
      }
    },
    validateLocation(text) {
      sap.ui.require(['/hc/mri/pa/ui/lib/VariantValidator'], VariantValidator => {
        VariantValidator.validate(text).done(mData => {
          if (mData.status === 'Valid') {
            const oFilter = {
              op: '=',
              value: JSON.stringify({
                text,
                ...mData,
              }),
            }
            const addThis = {
              text,
              oFilter,
              id: this.tagId,
              valid: true,
            }
            this.tokens.push(addThis)
            this.filters.push(oFilter)
            this.updateConstraintValue({
              constraintId: this.model.id,
              value: [...this.filters],
            })
          } else {
            const tag = {
              text,
              id: this.tagId,
              valid: false,
            }
            this.tokens.push(tag)
          }
        })
      })
    },
    up() {
      if (this.current > 0) {
        const tmp = this.current
        this.current = this.current - 1
        return tmp
      }
      return null
    },
    down() {
      if (this.current < this.matches.length - 1) {
        const tmp = this.current
        this.current = this.current + 1
        return tmp
      }
      return null
    },
    closeSuggestion() {
      this.open = false
    },
    setFilterCardStatus() {
      for (const t in this.tokens) {
        if (this.tokens[t].valid) {
          this.setFilterCardInactive({
            filterCardId: this.model.parentId,
            inactive: false,
          })
          return this.$emit('enable-filtercard')
        }
      }
      this.setFilterCardInactive({
        filterCardId: this.model.parentId,
        inactive: true,
      })
      this.$emit('disable-filtercard')
    },
  },
  computed: {
    openSuggestion() {
      return this.selection !== '' && this.matches.length !== 0 && this.open === true
    },
    matches() {
      if (this.selection !== this.previousSelection) {
        const params = {
          configData: {
            configId: this.getMriConfig().meta.configId,
            configVersion: this.getMriConfig().meta.configVersion,
          },
          sProcess: 'suggest',
          sSearchValue: this.selection,
        }
        const url = '/analytics-svc/pa/services/analytics.xsjs?action=genomics_values_service'
        const method = 'post'

        this.$store
          .dispatch('ajaxAuth', {
            method,
            url,
            params,
          })
          .then(response => {
            this.suggestions = response.data.data.map(oOneVal => ({
              key: oOneVal.value,
              text: oOneVal.text,
            }))

            if (this.popperRef) {
              const show = this.selection !== '' && this.matches.length !== 0 && this.open === true

              this.inputWidth = { width: this.target.getBoundingClientRect().width + 'px' }
              show ? this.popperRef.show() : this.popperRef.hide()
            }
          })
          .catch(err => {
            if (err) {
              throw err
            }
          })
        this.previousSelection = this.selection
      }
      return this.suggestions.map(s => s.text)
    },
  },
  components: {
    appIcon,
    popper,
  },
}
</script>
