<template>
  <div
    tabindex="0"
    :class="['app-range', 'form-control', 'form-control-sm', isActive ? 'MriHilite' : '']"
    ref="container"
    @click="openInput"
    @focus="openInput"
  >
    <template v-for="item in tokens" :key="item">
      <div
        :ref="`item-${item.id}`"
        tabindex="0"
        :class="getClass(item)"
        @keyup.right="rangeNavHandler(item, $event)"
        @keyup.left="rangeNavHandler(item, $event)"
        @keydown.stop.prevent.delete="tagKeyUpHandler(item)"
        @click.stop.prevent="tagClickHandler(item)"
      >
        <span class="tokenText">{{ item.text }}</span>
        <span class="tokenIcon" @click="removeTag(item)">
          <appIcon icon="decline"></appIcon>
        </span>
      </div>
    </template>
    <input
      v-if="inputVisible"
      type="text"
      v-on:keyup.delete="focusTag"
      v-on:keyup.enter="addTagEvent"
      ref="textControl"
      @blur="isActive = false"
      @focus="isActive = true"
    />
  </div>
</template>
<script lang="ts">
import { mapActions, mapGetters } from 'vuex'
import InputParser from '../utils/InputParser'
import RangeConstraintPatternDefinition from '../utils/RangeConstraintPatternDefinition'
import RangeConstraintTokenDefinition from '../utils/RangeConstraintTokenDefinition'
import appIcon from './app-icon.vue'

const parser = new InputParser(
  RangeConstraintTokenDefinition.tokenDefinitions,
  RangeConstraintPatternDefinition.acceptedPatterns
)

export default {
  name: 'app-range',
  props: ['model'],
  mounted() {
    this.$nextTick(() => {
      window.addEventListener('click', this.closeInput)
    })
  },
  beforeDestroy() {
    window.removeEventListener('click', this.closeInput)
  },
  data() {
    return {
      tokens: [],
      inputVisible: false,
      tagId: 0,
      isActive: false,
    }
  },
  watch: {
    'model.props.value': {
      handler(newValue) {
        this.assignToTokens(newValue)
      },
      immediate: true,
    },
  },
  methods: {
    ...mapActions(['updateConstraintValue']),
    assignToTokens(newValue) {
      this.tokens = []
      newValue.forEach(element => {
        if (element && element.op === 'invalid_op') {
          this.addFailFilter(element.value)
        } else if (element && element.and) {
          this.addTag(this.rebuildFromAndFilter(element).text)
        } else {
          this.addTag(this.rebuildFromSimpleFilter(element).text)
        }
      })
    },
    addFilter(text, oFilter) {
      const addThis = {
        text,
        oFilter,
        valid: true,
        id: this.tagId,
      }
      this.tokens.push(addThis)
      this.tagId++
    },
    addFailFilter(text) {
      const addThis = {
        text,
        valid: false,
        id: this.tagId,
      }
      this.tokens.push(addThis)
      this.tagId++
    },
    async openInput() {
      this.inputVisible = true
      await this.$nextTick()
      this.$refs.textControl.focus()
      this.isActive = true
    },
    getClass(item) {
      return ['MriPaToken', item.valid ? 'MriPaValidToken' : 'MriPaFailToken']
    },
    closeInput(event) {
      if (this.inputVisible && !this.$refs.container.contains(event.target)) {
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
    mapFilters() {
      // map invalid token to {op: 'invalid_op', value: x.text}
      return this.tokens.map(x => x.oFilter || { op: 'invalid_op', value: x.text })
    },
    addTagEvent(event) {
      const sUnvalidatedFilterString = event.target.value
      parser.parseInput(sUnvalidatedFilterString, this.addTag.bind(this), this.addFailFilter.bind(this))
      const payload = {
        constraintId: this.model.id,
        value: [...this.mapFilters()],
      }
      this.updateConstraintValue(payload)
      event.target.value = ''
    },
    addTag(sUnvalidatedFilterString: string) {
      parser.parseInput(sUnvalidatedFilterString, this.addFilter.bind(this), this.addFailFilter.bind(this))
    },
    removeTag(item) {
      this.tokens.splice(this.tokens.indexOf(item), 1)
      const payload = {
        constraintId: this.model.id,
        value: [...this.mapFilters()],
      }
      this.updateConstraintValue(payload)
    },
    tagClickHandler(item, e) {
      if (this.$refs.textControl) {
        this.$refs.textControl.blur()
      }
    },
    tagKeyUpHandler(item, e) {
      const prevItemIndex =
        this.tokens.findIndex(t => {
          return t.id === item.id
        }) - 1
      this.removeTag(item)
      if (prevItemIndex >= 0) {
        this.$nextTick(() => {
          const prevRefId = `item-${this.tokens[prevItemIndex].id}`
          this.$refs[prevRefId][0].focus()
        })
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

      text = `${text}${oFilter.value}`

      return {
        text,
        oFilter,
      }
    },
    rangeNavHandler(item, event) {
      const itemIndex = this.tokens.findIndex(t => {
        return t.id === item.id
      })
      let targetIndex = itemIndex
      if (event.code === 'ArrowRight' || event.keyCode === 39) {
        targetIndex = itemIndex + 1
      }
      if (event.code === 'ArrowLeft' || event.keyCode === 37) {
        targetIndex = itemIndex - 1
      }
      if (targetIndex < this.tokens.length || targetIndex >= 0) {
        const targetItemRefId = `item-${this.tokens[targetIndex].id}`
        this.$refs[targetItemRefId][0].focus()
      }
    },
  },
  components: {
    appIcon,
  },
}
</script>
